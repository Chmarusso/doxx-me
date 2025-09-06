import { NextRequest, NextResponse } from 'next/server';
import { GitHubService } from '@/lib/services/github';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, userId, owner, repo, username } = body;

    if (!accessToken || !userId || !owner || !repo || !username) {
      return NextResponse.json(
        { error: 'Missing required parameters: accessToken, userId, owner, repo, username' },
        { status: 400 }
      );
    }

    console.log('GitHub repository contributions request:', { 
      hasAccessToken: !!accessToken, 
      userId, 
      owner, 
      repo, 
      username 
    });

    const result = await GitHubService.fetchAndStoreRepositoryContributions(
      accessToken, 
      userId, 
      owner, 
      repo, 
      username
    );

    console.log('GitHub repository contributions result:', {
      repositoryName: `${owner}/${repo}`,
      metrics: result.metrics
    });

    return NextResponse.json({
      success: true,
      repositoryName: `${owner}/${repo}`,
      contributions: result.repositoryContribution,
      metrics: result.metrics,
      summary: {
        repository: `${owner}/${repo}`,
        totalPRs: result.metrics.prsCreated,
        mergedPRs: result.metrics.prsMerged,
        commits: result.metrics.commitsCount,
        linesChanged: result.metrics.linesAdded + result.metrics.linesDeleted,
        issues: result.metrics.issuesOpened
      }
    });

  } catch (error) {
    console.error('GitHub repository contributions error:', error);
    
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 :
                      error instanceof Error && error.message.includes('access denied') ? 403 :
                      error instanceof Error && error.message.includes('configuration') ? 500 : 500;
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error during GitHub repository analysis' },
      { status: statusCode }
    );
  }
}