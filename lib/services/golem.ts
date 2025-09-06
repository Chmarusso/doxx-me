import { getBytes } from 'ethers';
import {
  AccountData,
  Annotation,
  createClient,
  GolemBaseCreate,
  Tagged,
} from 'golem-base-sdk';

const encoder = new TextEncoder();

export interface GolemTestData {
  testData?: string;
}

export interface GolemEntityReceipt {
  entityKey: string;
  expirationBlock: string;
}

export interface GolemTestResult {
  currentBlock: string;
  receipts: GolemEntityReceipt[];
  entitiesCreated: number;
}

export class GolemService {
  private static readonly CHAIN_ID = 60138453025;
  private static readonly RPC_URL = 'https://kaolin.holesky.golem-base.io/rpc';
  private static readonly WS_URL = 'wss://kaolin.holesky.golem-base.io/rpc/ws';

  static async createTestEntities(data: GolemTestData): Promise<GolemTestResult> {
    if (!process.env.GOLEM_PRIVATE_KEY) {
      throw new Error('GOLEM_PRIVATE_KEY environment variable not set');
    }

    // Create account key from private key
    const key: AccountData = new Tagged('privatekey', getBytes(process.env.GOLEM_PRIVATE_KEY));

    // Create client connection
    const client = await createClient(
      this.CHAIN_ID,
      key,
      this.RPC_URL,
      this.WS_URL
    );

    // Get current block number
    const block = await client.getRawClient().httpClient.getBlockNumber();

    // Create test entities
    const creates: GolemBaseCreate[] = [
      {
        data: encoder.encode('Doxx Me Test Data'),
        btl: 25,
        stringAnnotations: [
          new Annotation('platform', 'Reddit'),
          new Annotation('verification_type', 'karma_proof'),
          new Annotation('test_data', data.testData || 'sample test'),
        ],
        numericAnnotations: [
          new Annotation('timestamp', Date.now()),
          new Annotation('karma_score', 1500),
        ],
      },
      {
        data: encoder.encode('User Verification Record'),
        btl: 25,
        stringAnnotations: [
          new Annotation('wallet_address', '0x1234567890123456789012345678901234567890'),
          new Annotation('status', 'verified'),
          new Annotation('method', 'signature_verification'),
        ],
        numericAnnotations: [
          new Annotation('created_at', Date.now()),
          new Annotation('verification_score', 100),
        ],
      },
    ];

    const receipts = await client.createEntities(creates);

    return {
      currentBlock: block.toString(),
      receipts: receipts.map(receipt => ({
        entityKey: receipt.entityKey.toString(),
        expirationBlock: receipt.expirationBlock.toString(),
      })),
      entitiesCreated: creates.length,
    };
  }

  static async storeVerificationData(
    walletAddress: string,
    platform: string,
    verificationData: any
  ): Promise<GolemEntityReceipt> {
    if (!process.env.GOLEM_PRIVATE_KEY) {
      throw new Error('GOLEM_PRIVATE_KEY environment variable not set');
    }

    const key: AccountData = new Tagged('privatekey', getBytes(process.env.GOLEM_PRIVATE_KEY));
    
    const client = await createClient(
      this.CHAIN_ID,
      key,
      this.RPC_URL,
      this.WS_URL
    );

    const create: GolemBaseCreate = {
      data: encoder.encode(JSON.stringify(verificationData)),
      btl: 365, // Store for 1 year
      stringAnnotations: [
        new Annotation('wallet_address', walletAddress),
        new Annotation('platform', platform),
        new Annotation('verification_type', 'social_proof'),
        new Annotation('data_hash', this.hashData(verificationData)),
      ],
      numericAnnotations: [
        new Annotation('timestamp', Date.now()),
        new Annotation('block_height', Number(await client.getRawClient().httpClient.getBlockNumber())),
      ],
    };

    const receipts = await client.createEntities([create]);
    
    return {
      entityKey: receipts[0].entityKey.toString(),
      expirationBlock: receipts[0].expirationBlock.toString(),
    };
  }

  private static hashData(data: any): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }
}