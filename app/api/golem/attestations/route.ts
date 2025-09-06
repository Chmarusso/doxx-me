import { NextRequest, NextResponse } from 'next/server';
import { GolemService } from '@/lib/services/golem';

/**
 * GET /api/golem/attestations - Get attestations with filtering
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filter = {
      userId: searchParams.get('userId') || undefined,
      platform: searchParams.get('platform') || undefined,
      attestationType: searchParams.get('attestationType') || undefined,
      entityKey: searchParams.get('entityKey') || undefined,
      status: searchParams.get('status') || undefined,
      isExpired: searchParams.get('isExpired') ? searchParams.get('isExpired') === 'true' : undefined,
    };

    // Remove undefined values
    Object.keys(filter).forEach(key => {
      if (filter[key as keyof typeof filter] === undefined) {
        delete filter[key as keyof typeof filter];
      }
    });

    console.log('Fetching attestations with filter:', filter);

    const attestations = await GolemService.getAttestations(filter);

    // Convert BigInt values to strings for JSON serialization
    const serializedAttestations = attestations.map(attestation => ({
      ...attestation,
      expirationBlock: attestation.expirationBlock.toString(),
    }));

    return NextResponse.json({
      success: true,
      attestations: serializedAttestations,
      count: attestations.length,
    });

  } catch (error) {
    console.error('Error fetching Golem attestations:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error while fetching attestations' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/golem/attestations - Create a new attestation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      entityKey, 
      expirationBlock, 
      platform, 
      attestationType, 
      rawApiData, 
      processedData,
      apiEndpoint,
      requestParams,
      responseHeaders,
      userId 
    } = body;

    // Validation
    if (!entityKey || !expirationBlock || !platform || !attestationType || !rawApiData || !userId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: entityKey, expirationBlock, platform, attestationType, rawApiData, userId' 
        },
        { status: 400 }
      );
    }

    console.log('Creating Golem attestation:', { entityKey, platform, attestationType, userId });

    const attestation = await GolemService.createDatabaseAttestation({
      entityKey,
      expirationBlock: BigInt(expirationBlock),
      platform,
      attestationType,
      rawApiData,
      processedData,
      apiEndpoint,
      requestParams,
      responseHeaders,
      userId
    });

    return NextResponse.json({
      success: true,
      attestation: {
        ...attestation,
        expirationBlock: attestation.expirationBlock.toString(),
        rawApiData: JSON.parse(attestation.rawApiData),
        processedData: attestation.processedData ? JSON.parse(attestation.processedData) : null,
      }
    });

  } catch (error) {
    console.error('Error creating Golem attestation:', error);
    
    const statusCode = error instanceof Error && error.message.includes('required') ? 400 : 500;
    
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error while creating attestation' 
      },
      { status: statusCode }
    );
  }
}