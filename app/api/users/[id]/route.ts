import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await params;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { 
        id: userId
      },
      include: {
        redditData: {
          include: {
            subredditKarma: true
          }
        },
        verifications: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        isVerified: user.isVerified,
        redditConnected: !!user.redditData,
        redditUsername: user.redditUsername,
        redditVerified: user.redditVerified,
        redditData: user.redditData ? {
          username: user.redditData.username,
          totalKarma: user.redditData.totalKarma,
          commentKarma: user.redditData.commentKarma,
          linkKarma: user.redditData.linkKarma,
          accountAge: user.redditData.accountAge,
          verified: user.redditData.verified,
          isPremium: user.redditData.isPremium,
          subredditKarma: user.redditData.subredditKarma,
        } : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}