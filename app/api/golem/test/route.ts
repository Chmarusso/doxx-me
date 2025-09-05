import { NextResponse } from 'next/server';
import { getBytes } from 'ethers';
import {
    AccountData,
    Annotation,
    createClient,
    GolemBaseCreate,
    Tagged,
} from 'golem-base-sdk';

const encoder = new TextEncoder();

export async function GET() {
  try {
    const key: AccountData = new Tagged('privatekey', getBytes(process.env.GOLEM_PRIVATE_KEY as string));

    // Step 2: Create a client that connects to a GolemDB node
    const client = await createClient(
      60138453025,
      key,
      'https://kaolin.holesky.golem-base.io/rpc',
      'wss://kaolin.holesky.golem-base.io/rpc/ws'
    );

    // Try connecting to the client - get current block number
    const block = await client.getRawClient().httpClient.getBlockNumber();
    console.log('Current block number:', block);

    // Step 3: Create test entities and store them
    const creates: GolemBaseCreate[] = [
      {
        data: encoder.encode('Doxx Me Test Data'),
        btl: 25,
        stringAnnotations: [
          new Annotation('platform', 'Reddit'),
          new Annotation('verification_type', 'karma_proof'),
          new Annotation('test_data', 'sample test'),
        ],
        numericAnnotations: [
          new Annotation('timestamp', Date.now()),
          new Annotation('karma_score', 1500),
        ],
      },
    ];

    const receipts = await client.createEntities(creates);
    console.log('Receipts from create (entity key and expiration block):', receipts);

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Golem DB and created test entities',
      data: {
        currentBlock: block.toString(),
        receipts: receipts.map(receipt => ({
          entityKey: receipt.entityKey.toString(),
          expirationBlock: receipt.expirationBlock.toString(),
        })),
        entitiesCreated: creates.length,
      }
    });

  } catch (error) {
    console.error('Golem DB test error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to connect to Golem DB or create entities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}