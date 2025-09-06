import { NextRequest, NextResponse } from 'next/server';
import { RedditService } from '@/lib/services/reddit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, userId } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    console.log('Reddit OAuth request:', { hasCode: !!code, userId });

    const result = await RedditService.authenticateUser(code, userId);

    // Log the raw data to see what's available
    console.log('Raw Reddit user data:', JSON.stringify(result.userData, null, 2));

    // Calculate account age
    const accountCreatedDate = new Date(result.userData.created_utc * 1000);
    const now = new Date();
    const ageInYears = Math.floor((now.getTime() - accountCreatedDate.getTime()) / (1000 * 60 * 60 * 24 * 365));
    const ageInMonths = Math.floor((now.getTime() - accountCreatedDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    let accountAge: string;
    if (ageInYears > 0) {
      accountAge = `${ageInYears} year${ageInYears > 1 ? 's' : ''}`;
    } else if (ageInMonths > 0) {
      accountAge = `${ageInMonths} month${ageInMonths > 1 ? 's' : ''}`;
    } else {
      const ageInDays = Math.floor((now.getTime() - accountCreatedDate.getTime()) / (1000 * 60 * 60 * 24));
      accountAge = `${ageInDays} day${ageInDays > 1 ? 's' : ''}`;
    }

    // Return processed user data
    const processedUserData = {
      username: result.userData.name,
      id: result.userData.id,
      totalKarma: result.userData.total_karma || 0,
      commentKarma: result.userData.comment_karma || 0,
      linkKarma: result.userData.link_karma || 0,
      accountAge: accountAge,
      createdAt: accountCreatedDate.toISOString(),
      verified: result.userData.has_verified_email || false,
      isPremium: result.userData.is_gold || false,
      avatarUrl: result.userData.icon_img ? result.userData.icon_img.split('?')[0] : null,
      profileVerified: result.userData.verified || false,
      dbUserId: result.user.id,
      dbRedditDataId: null, // Will be set by service after creation
    };

    return NextResponse.json({
      success: true,
      user: processedUserData,
      accessToken: result.accessToken,
    });

  } catch (error) {
    console.error('Reddit OAuth error:', error);
    
    const statusCode = error instanceof Error && error.message.includes('already linked') ? 409 :
                      error instanceof Error && error.message.includes('not found') ? 404 :
                      error instanceof Error && error.message.includes('configuration') ? 500 : 500;
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error during Reddit authentication' },
      { status: statusCode }
    );
  }
}