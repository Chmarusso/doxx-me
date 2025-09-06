import { NextRequest, NextResponse } from 'next/server';
import { GolemService } from '@/lib/services/golem';

export async function GET() {
  try {
    return NextResponse.json({
      message: 'Golem DB test endpoint',
      usage: 'Send POST request with optional { "testData": "your test data" }',
      requirements: [
        'GOLEM_PRIVATE_KEY environment variable',
        'golem-base-sdk, ethers dependencies'
      ]
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to provide endpoint info' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await GolemService.createTestEntities(body);

    console.log('Golem DB test completed:', {
      currentBlock: result.currentBlock,
      entitiesCreated: result.entitiesCreated,
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to Golem DB and created test entities',
      data: result
    });

  } catch (error) {
    console.error('Golem DB test error:', error);
    
    const statusCode = error instanceof Error && error.message.includes('environment') ? 500 : 500;
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to connect to Golem DB or create entities',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: statusCode }
    );
  }
}