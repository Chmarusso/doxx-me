import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyMessage, isAddress } from 'viem';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, signature, message } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!signature || !message) {
      return NextResponse.json(
        { error: 'Signature and message are required for account creation' },
        { status: 400 }
      );
    }

    if (!isAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Verify the signature
    try {
      const isValidSignature = await verifyMessage({
        address: walletAddress as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });

      if (!isValidSignature) {
        return NextResponse.json(
          { error: 'Invalid signature - wallet verification failed' },
          { status: 401 }
        );
      }
    } catch (signatureError) {
      console.error('Signature verification error:', signatureError);
      return NextResponse.json(
        { error: 'Failed to verify signature' },
        { status: 401 }
      );
    }

    console.log('✅ Signature verified successfully for wallet:', walletAddress);

    // Create or find user by wallet address
    const user = await db.user.upsert({
      where: { walletAddress: walletAddress.toLowerCase() },
      update: {
        // Update timestamp to show activity
        updatedAt: new Date(),
      },
      create: {
        walletAddress: walletAddress.toLowerCase(),
        isVerified: false, // Wallet ownership verified, but not identity
      },
      include: {
        redditData: {
          include: {
            subredditKarma: true
          }
        },
        verifications: true,
      },
    });

    console.log('✅ User registered/found:', { 
      userId: user.id, 
      walletAddress: user.walletAddress,
      hasRedditData: !!user.redditData,
      verificationCount: user.verifications.length
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        redditConnected: !!user.redditData,
        redditUsername: user.redditUsername,
        redditVerified: user.redditVerified,
        verifications: user.verifications.map(v => ({
          platform: v.platform,
          username: v.username,
          verifiedAt: v.verifiedAt,
          isActive: v.isActive,
        })),
        redditData: user.redditData ? {
          username: user.redditData.username,
          totalKarma: user.redditData.totalKarma,
          accountAge: user.redditData.accountAge,
          verified: user.redditData.verified,
          isPremium: user.redditData.isPremium,
          subredditCount: user.redditData.subredditKarma.length,
        } : null,
      },
    });

  } catch (error) {
    console.error('User registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error during user registration' },
      { status: 500 }
    );
  }
}