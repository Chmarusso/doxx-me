import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await UserService.createUser(body);

    console.log('✅ User registered/found:', { 
      userId: result.user.id, 
      walletAddress: result.user.walletAddress,
      hasRedditData: result.user.redditConnected,
      verificationCount: result.user.verifications.length
    });

    const response = NextResponse.json({
      success: true,
      ...result
    });

    // Set httpOnly cookie for user session
    response.cookies.set('userId', result.user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('User registration error:', error);
    
    const statusCode = error instanceof Error && error.message.includes('Invalid') ? 400 :
                      error instanceof Error && error.message.includes('signature') ? 401 : 500;
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error during user registration' },
      { status: statusCode }
    );
  }
}