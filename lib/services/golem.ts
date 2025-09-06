import { getBytes } from 'ethers';
import {
  AccountData,
  Annotation,
  createClient,
  GolemBaseCreate,
  Tagged,
} from 'golem-base-sdk';
import { db } from '@/lib/db';
import { createHash } from 'crypto';

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

  // Database attestation management methods
  
  /**
   * Create a database attestation record
   */
  static async createDatabaseAttestation(data: {
    entityKey: string;
    expirationBlock: bigint;
    platform: string;
    attestationType: string;
    rawApiData: any;
    processedData?: any;
    apiEndpoint?: string;
    requestParams?: any;
    responseHeaders?: any;
    userId: string;
  }) {
    try {
      const proofHash = this.generateProofHash(data.rawApiData);
      
      const attestation = await db.golemAttestation.create({
        data: {
          entityKey: data.entityKey,
          expirationBlock: data.expirationBlock,
          platform: data.platform,
          attestationType: data.attestationType,
          rawApiData: JSON.stringify(data.rawApiData),
          processedData: data.processedData ? JSON.stringify(data.processedData) : null,
          proofHash: proofHash,
          apiEndpoint: data.apiEndpoint,
          requestParams: data.requestParams ? JSON.stringify(data.requestParams) : null,
          responseHeaders: data.responseHeaders ? JSON.stringify(data.responseHeaders) : null,
          userId: data.userId,
          status: 'active',
        },
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true,
            }
          }
        }
      });

      console.log(`Created Golem attestation: ${attestation.id} for user ${data.userId}`);
      return attestation;
    } catch (error) {
      console.error('Error creating Golem attestation:', error);
      throw new Error(`Failed to create attestation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get attestations with filtering
   */
  static async getAttestations(filter: {
    userId?: string;
    platform?: string;
    attestationType?: string;
    entityKey?: string;
    status?: string;
    isExpired?: boolean;
  } = {}) {
    try {
      const where: any = {};
      
      if (filter.userId) where.userId = filter.userId;
      if (filter.platform) where.platform = filter.platform;
      if (filter.attestationType) where.attestationType = filter.attestationType;
      if (filter.entityKey) where.entityKey = filter.entityKey;
      if (filter.status) where.status = filter.status;
      
      // Handle expiration filtering
      if (filter.isExpired !== undefined) {
        const currentBlock = BigInt(Math.floor(Date.now() / 1000));
        if (filter.isExpired) {
          where.expirationBlock = { lt: currentBlock };
        } else {
          where.expirationBlock = { gte: currentBlock };
        }
      }

      const attestations = await db.golemAttestation.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              walletAddress: true,
              redditUsername: true,
              githubUsername: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return attestations.map(attestation => ({
        ...attestation,
        expirationBlock: attestation.expirationBlock.toString(), // Convert BigInt to string
        rawApiData: JSON.parse(attestation.rawApiData),
        processedData: attestation.processedData ? JSON.parse(attestation.processedData) : null,
        requestParams: attestation.requestParams ? JSON.parse(attestation.requestParams) : null,
        responseHeaders: attestation.responseHeaders ? JSON.parse(attestation.responseHeaders) : null,
      }));
    } catch (error) {
      console.error('Error fetching Golem attestations:', error);
      throw new Error(`Failed to fetch attestations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create attestation from Reddit data and store on blockchain
   */
  static async createRedditAttestation(userId: string, redditData: any, subredditKarma?: any[]) {
    
    const processedData = {
      username: redditData.username,
      totalKarma: redditData.total_karma,
      commentKarma: redditData.comment_karma,
      linkKarma: redditData.link_karma,
      accountAge: redditData.created_utc,
      verified: redditData.has_verified_email,
      subredditCount: subredditKarma?.length || 0
    };

    // Store on blockchain
    const blockchainReceipt = await this.storeVerificationData(
      `user:${userId}`,
      'reddit',
      { ...processedData, subredditKarma }
    );

    // Store in database
    const dbAttestation = await this.createDatabaseAttestation({
      entityKey: blockchainReceipt.entityKey,
      expirationBlock: BigInt(blockchainReceipt.expirationBlock),
      platform: 'reddit',
      attestationType: 'profile',
      rawApiData: redditData,
      processedData,
      apiEndpoint: 'reddit.com/api/v1/me',
      userId
    });

    return {
      blockchain: blockchainReceipt,
      database: dbAttestation
    };
  }

  /**
   * Create attestation from GitHub data and store on blockchain
   */
  static async createGitHubAttestation(userId: string, githubData: any, repositoryContributions?: any[]) {
    
    const processedData = {
      username: githubData.login,
      name: githubData.name,
      followers: githubData.followers,
      following: githubData.following,
      publicRepos: githubData.public_repos,
      accountAge: githubData.created_at,
      repositoryCount: repositoryContributions?.length || 0
    };

    // Store on blockchain
    const blockchainReceipt = await this.storeVerificationData(
      `user:${userId}`,
      'github',
      { ...processedData, repositoryContributions }
    );

    // Store in database
    const dbAttestation = await this.createDatabaseAttestation({
      entityKey: blockchainReceipt.entityKey,
      expirationBlock: BigInt(blockchainReceipt.expirationBlock),
      platform: 'github',
      attestationType: 'profile',
      rawApiData: githubData,
      processedData,
      apiEndpoint: 'api.github.com/user',
      userId
    });

    return {
      blockchain: blockchainReceipt,
      database: dbAttestation
    };
  }

  /**
   * Generate proof hash for integrity verification
   */
  private static generateProofHash(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Verify proof integrity
   */
  static verifyProofIntegrity(rawApiData: any, expectedHash: string): boolean {
    const calculatedHash = this.generateProofHash(rawApiData);
    return calculatedHash === expectedHash;
  }
}