import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAddress } from 'viem';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress || !isAddress(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { 
        walletAddress: walletAddress.toLowerCase()
      },
      include: {
        redditData: true,
        verifications: true
      }
    });

    if (user) {
      const userData = {
        id: user.id,
        walletAddress: user.walletAddress,
        isVerified: user.isVerified,
        redditConnected: !!user.redditData,
        redditUsername: user.redditData?.username,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      return NextResponse.json({
        success: true,
        userExists: true,
        user: userData
      });
    } else {
      return NextResponse.json({
        success: true,
        userExists: false
      });
    }
  } catch (error) {
    console.error('Error checking user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}