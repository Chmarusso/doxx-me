import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { Suspense } from 'react';
import RedditClient from './reddit-client';
import RedditActions from './reddit-actions';

async function getRedditData(userId: string) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        redditData: {
          include: {
            subredditKarma: true
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
      redditConnected: !!user.redditData,
      redditUsername: user.redditUsername,
      redditVerified: user.redditVerified,
      redditData: user.redditData ? {
        username: user.redditData.username,
        totalKarma: user.redditData.totalKarma,
        commentKarma: user.redditData.commentKarma,
        linkKarma: user.redditData.linkKarma,
        accountAge: user.redditData.accountAge,
        verified: user.redditData.verified,
        isPremium: user.redditData.isPremium,
        subredditKarma: user.redditData.subredditKarma,
      } : null
    };
  } catch (error) {
    console.error('Error fetching Reddit data:', error);
    return null;
  }
}

export default async function RedditPage({ searchParams }: { 
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
      <Suspense fallback={<LoadingSpinner message="Processing Reddit authentication..." />}>
        <RedditClient 
          mode="oauth-callback" 
          code={params.code}
          userId={userId}
          error={params.error}
          state={params.state}
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
            Access Required
          </h2>
          <p style={{ opacity: 0.8, marginBottom: '24px' }}>
            Please connect your wallet first to verify Reddit account.
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
  
  // Fetch user's Reddit data server-side
  const userData = await getRedditData(userId);
  
  if (!userData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❌</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>
            User Not Found
          </h2>
          <p style={{ opacity: 0.8, marginBottom: '24px' }}>
            Your session may have expired. Please connect your wallet again.
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
  
  // If user has Reddit data, show it
  if (userData.redditConnected && userData.redditData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>
              Reddit Connected!
            </h2>
            <p style={{ opacity: 0.8 }}>
              Your Reddit data is ready to prove
            </p>
          </div>

          <div className="glass-card" style={{ padding: '16px', marginBottom: '24px' }}>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: 500 }}>Username: </span>
              <span style={{ fontWeight: 600 }}>u/{userData.redditData.username}</span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: 500 }}>Total Karma: </span>
              <span style={{ fontWeight: 600, color: '#ff6b35' }}>
                {userData.redditData.totalKarma.toLocaleString()}
              </span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: 500 }}>Comment Karma: </span>
              <span style={{ fontWeight: 600, color: '#60a5fa' }}>
                {userData.redditData.commentKarma.toLocaleString()}
              </span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: 500 }}>Link Karma: </span>
              <span style={{ fontWeight: 600, color: '#f59e0b' }}>
                {userData.redditData.linkKarma.toLocaleString()}
              </span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: 500 }}>Account Age: </span>
              <span style={{ fontWeight: 600 }}>{userData.redditData.accountAge}</span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: 500 }}>Email Verified: </span>
              <span style={{ fontWeight: 600, color: userData.redditData.verified ? '#86efac' : '#fca5a5' }}>
                {userData.redditData.verified ? '✓ Yes' : '✗ No'}
              </span>
            </div>
            {userData.redditData.isPremium && (
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: 500 }}>Premium: </span>
                <span style={{ fontWeight: 600, color: '#fbbf24' }}>✨ Reddit Premium</span>
              </div>
            )}
          </div>

          {/* Subreddit Karma Breakdown */}
          {userData.redditData.subredditKarma && userData.redditData.subredditKarma.length > 0 && (
            <div className="glass-card" style={{ padding: '16px', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>
                Top Subreddits by Karma
              </h3>
              <div>
                {userData.redditData.subredditKarma.slice(0, 10).map((karma: any) => (
                  <div 
                    key={karma.subreddit} 
                    style={{ 
                      marginBottom: '12px', 
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                        r/{karma.subreddit}
                      </span>
                      <span style={{ fontWeight: 600, color: '#ff6b35' }}>
                        {karma.totalKarma.toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span>📝 Link Karma: {karma.linkKarma.toLocaleString()}</span>
                      <span>💬 Comment Karma: {karma.commentKarma.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <RedditActions userId={userData.id} />
          
          <a href="/" style={{ textDecoration: 'none' }}>
            <button className="glass-button" style={{ width: '100%' }}>
              Back to Home
            </button>
          </a>
        </div>
      </div>
    );
  }
  
  // If no Reddit data, show connect flow
  return (
    <RedditClient 
      mode="connect" 
      userId={userId}
    />
  );
}

function LoadingSpinner({ message }: { message: string }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '32px', textAlign: 'center' }}>
        <div style={{ marginBottom: '24px' }}>
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
    </div>
  );
}