import { NextRequest, NextResponse } from 'next/server';
import { GitHubService } from '@/lib/services/github';

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

    console.log('GitHub OAuth request:', { hasCode: !!code, userId });

    const result = await GitHubService.authenticateUser(code, userId);

    // Log the raw data to see what's available
    console.log('Raw GitHub user data:', JSON.stringify(result.userData, null, 2));

    // Calculate account age
    const accountCreatedDate = new Date(result.userData.created_at);
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
      username: result.userData.login,
      name: result.userData.name,
      id: result.userData.id,
      email: result.userData.email,
      bio: result.userData.bio,
      company: result.userData.company,
      location: result.userData.location,
      blog: result.userData.blog,
      followers: result.userData.followers || 0,
      following: result.userData.following || 0,
      publicRepos: result.userData.public_repos || 0,
      accountAge: accountAge,
      createdAt: accountCreatedDate.toISOString(),
      avatarUrl: result.userData.avatar_url,
      dbUserId: result.user.id,
      dbGitHubDataId: result.user.githubData?.id || null,
    };

    return NextResponse.json({
      success: true,
      user: processedUserData,
      accessToken: result.accessToken,
    });

  } catch (error) {
    console.error('GitHub OAuth error:', error);
    
    const statusCode = error instanceof Error && error.message.includes('already linked') ? 409 :
                      error instanceof Error && error.message.includes('not found') ? 404 :
                      error instanceof Error && error.message.includes('configuration') ? 500 : 500;
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error during GitHub authentication' },
      { status: statusCode }
    );
  }
}