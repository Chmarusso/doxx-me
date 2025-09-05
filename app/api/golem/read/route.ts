import { NextResponse } from 'next/server';
import { getBytes } from 'ethers';
import {
    AccountData,
    createClient,
    Tagged,
} from 'golem-base-sdk';


export async function GET() {
  try {
    const key: AccountData = new Tagged('privatekey', getBytes(process.env.GOLEM_PRIVATE_KEY as string));
    const client = await createClient(
      60138453025,
      key,
      'https://kaolin.holesky.golem-base.io/rpc',
      'wss://kaolin.holesky.golem-base.io/rpc/ws'
    );
    const metadata = await client.getEntityMetaData("0x3fa0d4e983d40f8c25cb1921ce911ac3f5d2dd89f9af20ad45595bb72987da5c")
    console.log(metadata)

    return NextResponse.json({
      success: true,
      metadata
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