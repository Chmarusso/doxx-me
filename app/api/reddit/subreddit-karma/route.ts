import { NextRequest, NextResponse } from 'next/server';
import { RedditService } from '@/lib/services/reddit';

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

    if (!userId) {
      console.error('No user ID provided');
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('Fetching subreddit karma from Reddit...');

    const result = await RedditService.fetchAndStoreKarmaData(accessToken, userId);

    console.log('Final subreddit karma data:', {
      subredditsFound: result.subredditKarma.length,
      totalSubreddits: result.totalSubreddits,
    });

    return NextResponse.json({
      success: true,
      subredditKarma: result.subredditKarma,
      totalPosts: 0, // Not available from karma endpoint
      totalComments: 0, // Not available from karma endpoint
      totalSubreddits: result.totalSubreddits,
      storedInDb: true,
    });

  } catch (error) {
    console.error('Reddit subreddit karma error:', error);
    
    const statusCode = error instanceof Error && error.message.includes('required') ? 400 : 500;
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error while fetching subreddit karma' },
      { status: statusCode }
    );
  }
}