import { NextRequest, NextResponse } from 'next/server';

interface RedditTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface RedditUserData {
  id: string;
  name: string;
  created_utc: number;
  comment_karma: number;
  link_karma: number;
  total_karma: number;
  verified: boolean;
  has_verified_email: boolean;
  is_premium: boolean;
  icon_img: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    const clientId = process.env.NEXT_PUBLIC_REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    const redirectUri = process.env.NEXT_PUBLIC_REDDIT_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        { error: 'Reddit OAuth configuration is incomplete' },
        { status: 500 }
      );
    }

    // Step 1: Exchange code for access token
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
    });

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
        'User-Agent': 'DoxxMe/1.0.0',
      },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Reddit token exchange failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to exchange code for token' },
        { status: 400 }
      );
    }

    const tokenData: RedditTokenResponse = await tokenResponse.json();

    // Step 2: Get user data using access token
    const userResponse = await fetch('https://oauth.reddit.com/api/v1/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'User-Agent': 'DoxxMe/1.0.0',
      },
    });

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('Reddit user data fetch failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch user data from Reddit' },
        { status: 400 }
      );
    }

    const userData: RedditUserData = await userResponse.json();

    // Log the raw data to see what's available
    console.log('Raw Reddit user data:', JSON.stringify(userData, null, 2));

    // Calculate account age
    const accountCreatedDate = new Date(userData.created_utc * 1000);
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

    // Handle karma values with fallbacks
    const commentKarma = userData.comment_karma || 0;
    const linkKarma = userData.link_karma || 0;
    const totalKarma = userData.total_karma || (commentKarma + linkKarma);

    // Return processed user data
    const processedUserData = {
      username: userData.name,
      id: userData.id,
      totalKarma: totalKarma,
      commentKarma: commentKarma,
      linkKarma: linkKarma,
      accountAge: accountAge,
      createdAt: accountCreatedDate.toISOString(),
      verified: userData.has_verified_email || false,
      isPremium: userData.is_premium || false,
      avatarUrl: userData.icon_img ? userData.icon_img.split('?')[0] : null, // Remove query params
      profileVerified: userData.verified || false,
      rawData: userData, // Include raw data for debugging
    };

    return NextResponse.json({
      success: true,
      user: processedUserData,
      accessToken: tokenData.access_token, // Include access token for additional API calls
    });

  } catch (error) {
    console.error('Reddit OAuth error:', error);
    return NextResponse.json(
      { error: 'Internal server error during Reddit authentication' },
      { status: 500 }
    );
  }
}