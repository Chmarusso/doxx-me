import { NextRequest, NextResponse } from 'next/server';
import { GolemService } from '@/lib/services/golem';

/**
 * POST /api/golem/attestations/create - Create attestation both on blockchain and in database
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, userId, verificationData, attestationType } = body;

    // Validation
    if (!platform || !userId || !verificationData) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: platform, userId, verificationData' 
        },
        { status: 400 }
      );
    }

    console.log('Creating full Golem attestation:', { platform, userId, attestationType: attestationType || 'profile' });

    let result;

    if (platform === 'reddit') {
      result = await GolemService.createRedditAttestation(
        userId,
        verificationData.redditData,
        verificationData.subredditKarma
      );
    } else if (platform === 'github') {
      result = await GolemService.createGitHubAttestation(
        userId,
        verificationData.githubData,
        verificationData.repositoryContributions
      );
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unsupported platform. Currently supports: reddit, github' 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      blockchain: result.blockchain,
      database: {
        ...result.database,
        expirationBlock: result.database.expirationBlock.toString(),
        rawApiData: JSON.parse(result.database.rawApiData),
        processedData: result.database.processedData ? JSON.parse(result.database.processedData) : null,
      }
    });

  } catch (error) {
    console.error('Error creating full Golem attestation:', error);
    
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