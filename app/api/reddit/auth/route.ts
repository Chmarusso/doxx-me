import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

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
    const { code, userId } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Authorization code is required' },
        { status: 400 }
      );
    }

    console.log('Reddit OAuth request:', { hasCode: !!code, userId });

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

    // Store user and Reddit data in database
    try {
      // Create a hash of the raw data for integrity verification
      const rawDataString = JSON.stringify(userData);
      const proofHash = crypto.createHash('sha256').update(rawDataString).digest('hex');

      // Find user - prioritize provided userId, fallback to Reddit ID
      let user;
      
      if (userId) {
        // Link Reddit to existing wallet user
        user = await db.user.findUnique({
          where: { id: userId }
        });
        
        if (!user) {
          return NextResponse.json(
            { error: 'User not found. Please register with wallet first.' },
            { status: 404 }
          );
        }
        
        // Check if Reddit account is already linked to a different user
        const existingRedditUser = await db.user.findFirst({
          where: { 
            redditId: userData.id,
            id: { not: userId }
          }
        });
        
        if (existingRedditUser) {
          return NextResponse.json(
            { error: 'This Reddit account is already linked to another wallet.' },
            { status: 409 }
          );
        }
        
        // Update existing user with Reddit data
        user = await db.user.update({
          where: { id: userId },
          data: {
            redditId: userData.id,
            redditUsername: userData.name,
            redditVerified: userData.has_verified_email || false,
            isVerified: userData.has_verified_email || false, // Could be more sophisticated logic
          },
        });
        
        console.log('✅ Linked Reddit account to existing user:', { userId, redditId: userData.id });
        
      } else {
        // Fallback: Create Reddit-only user (legacy behavior)
        user = await db.user.upsert({
          where: { redditId: userData.id },
          update: {
            redditUsername: userData.name,
            redditVerified: userData.has_verified_email || false,
            isVerified: userData.has_verified_email || false,
          },
          create: {
            redditId: userData.id,
            redditUsername: userData.name,
            redditVerified: userData.has_verified_email || false,
            isVerified: userData.has_verified_email || false,
          },
        });
        
        console.log('⚠️ Created Reddit-only user (no wallet):', { userId: user.id, redditId: userData.id });
      }

      // Store Reddit data with web proof
      const redditData = await db.redditData.upsert({
        where: { userId: user.id },
        update: {
          username: userData.name,
          totalKarma: totalKarma,
          commentKarma: commentKarma,
          linkKarma: linkKarma,
          accountAge: accountAge,
          createdUtc: accountCreatedDate,
          verified: userData.has_verified_email || false,
          isPremium: userData.is_premium || false,
          avatarUrl: userData.icon_img ? userData.icon_img.split('?')[0] : null,
          rawApiResponse: rawDataString, // Store raw API response as proof
          proofTimestamp: new Date(),
          proofHash: proofHash,
        },
        create: {
          userId: user.id,
          redditId: userData.id,
          username: userData.name,
          totalKarma: totalKarma,
          commentKarma: commentKarma,
          linkKarma: linkKarma,
          accountAge: accountAge,
          createdUtc: accountCreatedDate,
          verified: userData.has_verified_email || false,
          isPremium: userData.is_premium || false,
          avatarUrl: userData.icon_img ? userData.icon_img.split('?')[0] : null,
          rawApiResponse: rawDataString, // Store raw API response as proof
          proofTimestamp: new Date(),
          proofHash: proofHash,
        },
      });

      console.log('✅ Stored Reddit data in database:', { userId: user.id, redditDataId: redditData.id });

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
        avatarUrl: userData.icon_img ? userData.icon_img.split('?')[0] : null,
        profileVerified: userData.verified || false,
        dbUserId: user.id, // Include database user ID
        dbRedditDataId: redditData.id, // Include database Reddit data ID
      };

      return NextResponse.json({
        success: true,
        user: processedUserData,
        accessToken: tokenData.access_token,
      });

    } catch (dbError) {
      console.error('Database storage error:', dbError);
      
      // Still return the user data even if database storage fails
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
        avatarUrl: userData.icon_img ? userData.icon_img.split('?')[0] : null,
        profileVerified: userData.verified || false,
        dbError: 'Failed to store in database',
      };

      return NextResponse.json({
        success: true,
        user: processedUserData,
        accessToken: tokenData.access_token,
        warning: 'User authenticated but database storage failed',
      });
    }

  } catch (error) {
    console.error('Reddit OAuth error:', error);
    return NextResponse.json(
      { error: 'Internal server error during Reddit authentication' },
      { status: 500 }
    );
  }
}