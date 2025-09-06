import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { Suspense } from 'react';
import GitHubClient from './github-client';

async function getGitHubData(userId: string) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        githubData: {
          include: {
            repositoryContributions: true
          }
        }
      }
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      githubConnected: !!user.githubData,
      githubUsername: user.githubUsername,
      githubVerified: user.githubVerified,
      githubData: user.githubData ? {
        username: user.githubData.username,
        name: user.githubData.name || user.githubData.username,
        id: user.githubData.githubId,
        email: user.githubData.email || undefined,
        bio: user.githubData.bio || undefined,
        company: user.githubData.company || undefined,
        location: user.githubData.location || undefined,
        blog: user.githubData.blog || undefined,
        avatarUrl: user.githubData.avatarUrl || undefined,
        followers: user.githubData.followers,
        following: user.githubData.following,
        publicRepos: user.githubData.publicRepos,
        accountAge: user.githubData.accountAge || 'Unknown',
        dbUserId: user.githubData.userId,
        dbGitHubDataId: user.githubData.id,
        createdAt: user.githubData.createdUtc?.toISOString() || user.githubData.createdAt.toISOString(),
        repositoryContributions: user.githubData.repositoryContributions.map(repo => ({
          repository: `${repo.repositoryOwner}/${repo.repositoryName}`,
          totalPRs: repo.prsCreated,
          mergedPRs: repo.prsMerged,
          commits: repo.commitsCount,
          linesChanged: repo.linesAdded + repo.linesDeleted,
          issues: repo.issuesOpened,
          lastUpdated: repo.proofTimestamp
        }))
      } : null
    };
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    return null;
  }
}

function LoadingSpinner({ message }: { message: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '32px', textAlign: 'center' }}>
        <div style={{ 
          width: '48px', 
          height: '48px', 
          border: '4px solid rgba(255,255,255,0.3)', 
          borderTop: '4px solid white', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }}></div>
        <p style={{ opacity: 0.8 }}>{message}</p>
      </div>
    </div>
  );
}

export default async function GitHubPage({ searchParams }: { 
  searchParams: Promise<{ code?: string; error?: string; state?: string; userId?: string }> 
}) {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get('userId');
  const params = await searchParams;
  
  // Get userId from URL param or cookie
  const userId = params.userId || userIdCookie?.value;
  
  // Handle OAuth callback
  if (params.code) {
    return (
      <Suspense fallback={<LoadingSpinner message="Processing GitHub authentication..." />}>
        <GitHubClient 
          mode="oauth-callback" 
          code={params.code}
          userId={userId}
          error={params.error}
        />
      </Suspense>
    );
  }
  
  // Handle OAuth error
  if (params.error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❌</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>
            OAuth Error
          </h2>
          <p style={{ opacity: 0.8, marginBottom: '24px' }}>
            {params.error}
          </p>
          <a href="/" style={{ textDecoration: 'none' }}>
            <button className="glass-button-primary" style={{ width: '100%' }}>
              Go to Home
            </button>
          </a>
        </div>
      </div>
    );
  }
  
  if (!userId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>
            Authentication Required
          </h2>
          <p style={{ opacity: 0.8, marginBottom: '24px' }}>
            Please connect your wallet first to access GitHub verification.
          </p>
          <a href="/" style={{ textDecoration: 'none' }}>
            <button className="glass-button-primary" style={{ width: '100%' }}>
              Go to Home
            </button>
          </a>
        </div>
      </div>
    );
  }

  // Get user data from database
  const userData = await getGitHubData(userId);
  
  if (!userData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❌</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>
            User Not Found
          </h2>
          <p style={{ opacity: 0.8, marginBottom: '24px' }}>
            Could not find your account. Please try connecting your wallet again.
          </p>
          <a href="/" style={{ textDecoration: 'none' }}>
            <button className="glass-button-primary" style={{ width: '100%' }}>
              Go to Home
            </button>
          </a>
        </div>
      </div>
    );
  }

  // If user has GitHub data, show it
  if (userData.githubConnected && userData.githubData) {
    return (
      <GitHubClient 
        mode="display-data"
        initialData={{
          githubUser: userData.githubData,
          contributions: userData.githubData.repositoryContributions
        }}
      />
    );
  }

  // If no GitHub data, show connect flow
  return (
    <GitHubClient 
      mode="connect"
      userId={userId}
    />
  );
}