import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/services/user';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await UserService.checkUserExists(body);

    const response = NextResponse.json({
      success: true,
      ...result
    });

    // Set httpOnly cookie for user session if user exists
    if (result.userExists && result.user) {
      response.cookies.set('userId', result.user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/'
      });
    }

    return response;
  } catch (error) {
    console.error('Error checking user:', error);
    
    const statusCode = error instanceof Error && error.message.includes('Invalid') ? 400 : 500;
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: statusCode }
    );
  }
}