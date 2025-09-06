import { NextRequest, NextResponse } from 'next/server';
import { getUser } from "@civic/auth-web3/nextjs";
import { db } from '@/lib/db';

export async function GET(_request: NextRequest) {
  try {
    // Verify the user is authenticated with Civic
    const civicUser = await getUser();
    
    if (!civicUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in with Civic.' },
        { status: 401 }
      );
    }

    // Fetch all users with their Reddit data
    const users = await db.user.findMany({
      include: {
        redditData: {
          include: {
            subredditKarma: true
          }
        },
        verifications: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate stats
    const totalUsers = users.length;
    const redditConnected = users.filter(user => user.redditData).length;
    const avgKarma = users
      .filter(user => user.redditData?.totalKarma)
      .reduce((acc, user) => acc + (user.redditData?.totalKarma || 0), 0) / 
      Math.max(redditConnected, 1);

    // Transform users for frontend
    const transformedUsers = users.map(user => ({
      id: user.id,
      walletAddress: user.walletAddress,
      redditUsername: user.redditUsername,
      redditData: user.redditData ? {
        totalKarma: user.redditData.totalKarma,
        commentKarma: user.redditData.commentKarma,
        linkKarma: user.redditData.linkKarma,
        accountAge: user.redditData.accountAge,
        verified: user.redditData.verified,
      } : null,
      isVerified: user.isVerified,
      createdAt: user.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      users: transformedUsers,
      stats: {
        totalUsers,
        redditConnected,
        avgKarma
      },
      verifier: {
        name: civicUser.name || civicUser.email,
        accessedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching users for verifier:', error);
    
    return NextResponse.json(
      { error: 'Internal server error while fetching user data' },
      { status: 500 }
    );
  }
}