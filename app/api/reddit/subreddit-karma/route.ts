import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

interface RedditPost {
  subreddit: string;
  score: number;
  title: string;
  created_utc: number;
  permalink: string;
  num_comments: number;
}

interface RedditComment {
  subreddit: string;
  score: number;
  body: string;
  created_utc: number;
  permalink: string;
}

interface SubredditKarma {
  subreddit: string;
  postKarma: number;
  commentKarma: number;
  totalKarma: number;
  postCount: number;
  commentCount: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, userId } = body;

    console.log('Subreddit karma request received:', { hasAccessToken: !!accessToken, userId });

    if (!accessToken) {
      console.error('No access token provided');
      return NextResponse.json(
        { error: 'Access token is required' },
        { status: 400 }
      );
    }

    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': 'DoxxMe/1.0.0',
    };

    console.log('Fetching subreddit karma from Reddit...');

    // Fetch user's subreddit karma using the dedicated endpoint
    const karmaResponse = await fetch('https://oauth.reddit.com/api/v1/me/karma', {
      headers,
    });

    console.log('Reddit karma API response status:', karmaResponse.status);

    if (!karmaResponse.ok) {
      const karmaError = await karmaResponse.text();
      console.error('Karma fetch failed:', karmaError);
      return NextResponse.json(
        { error: `Failed to fetch karma: ${karmaError}` },
        { status: 400 }
      );
    }

    const karmaData = await karmaResponse.json();

    // Log the full karma response from Reddit
    console.log('=== REDDIT KARMA RESPONSE ===');
    console.log(JSON.stringify(karmaData, null, 2));

    // Process the karma data
    const subredditKarmaArray = karmaData.data?.map((item: any) => ({
      subreddit: item.sr,
      commentKarma: item.comment_karma || 0,
      linkKarma: item.link_karma || 0,
      totalKarma: (item.comment_karma || 0) + (item.link_karma || 0),
      postCount: 0, // Not available from karma endpoint
      commentCount: 0, // Not available from karma endpoint
    })) || [];

    // Sort by total karma and take top 10
    const sortedKarmaArray = subredditKarmaArray
      .filter((karma: any) => karma.totalKarma > 0)
      .sort((a: any, b: any) => b.totalKarma - a.totalKarma)
      .slice(0, 15); // Top 15 subreddits

    console.log('Final subreddit karma data:', {
      subredditsFound: sortedKarmaArray.length,
      totalSubreddits: subredditKarmaArray.length,
    });

    // Store subreddit karma data in database if userId is provided
    if (userId && sortedKarmaArray.length > 0) {
      try {
        // Find the user's Reddit data
        const redditData = await db.redditData.findFirst({
          where: { userId: userId }
        });

        if (redditData) {
          // Create hash of karma data for integrity
          const karmaDataString = JSON.stringify(karmaData);
          
          // Store each subreddit's karma data
          for (const karma of sortedKarmaArray) {
            await db.subredditKarma.upsert({
              where: {
                redditDataId_subreddit: {
                  redditDataId: redditData.id,
                  subreddit: karma.subreddit
                }
              },
              update: {
                commentKarma: karma.commentKarma,
                linkKarma: karma.linkKarma,
                totalKarma: karma.totalKarma,
                rawKarmaData: karmaDataString,
                proofTimestamp: new Date(),
              },
              create: {
                redditDataId: redditData.id,
                subreddit: karma.subreddit,
                commentKarma: karma.commentKarma,
                linkKarma: karma.linkKarma,
                totalKarma: karma.totalKarma,
                rawKarmaData: karmaDataString,
                proofTimestamp: new Date(),
              },
            });
          }

          console.log('✅ Stored subreddit karma data in database:', { 
            redditDataId: redditData.id, 
            subredditsStored: sortedKarmaArray.length 
          });
        }
      } catch (dbError) {
        console.error('Database storage error for subreddit karma:', dbError);
        // Continue without failing the request
      }
    }

    return NextResponse.json({
      success: true,
      subredditKarma: sortedKarmaArray,
      totalPosts: 0, // Not available from karma endpoint
      totalComments: 0, // Not available from karma endpoint
      totalSubreddits: subredditKarmaArray.length,
      storedInDb: !!userId,
    });

  } catch (error) {
    console.error('Reddit subreddit karma error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching subreddit karma' },
      { status: 500 }
    );
  }
}