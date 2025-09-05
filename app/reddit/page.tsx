'use client'

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function RedditOAuthContent() {
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [subredditKarma, setSubredditKarma] = useState<any>(null);
  const [loadingSubreddits, setLoadingSubreddits] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Handle OAuth callback
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');
    const state = searchParams.get('state');
    
    let userId = searchParams.get('userId'); // Direct userId from URL
    
    // Try to get userId from state parameter (preserved through OAuth)
    if (state && !userId) {
      try {
        const stateData = JSON.parse(decodeURIComponent(state));
        userId = stateData.userId;
        console.log('Extracted userId from state:', userId);
      } catch (e) {
        console.warn('Could not parse state parameter:', e);
      }
    }
    
    console.log('OAuth callback received:', { 
      hasCode: !!code, 
      hasError: !!errorParam, 
      userId,
      state 
    });
    
    if (errorParam) {
      setError(`OAuth error: ${errorParam}`);
    } else if (code) {
      handleOAuthCallback(code, userId);
    }
  }, [searchParams]);

  const handleOAuthCallback = async (code: string, userId?: string | null) => {
    setIsLoading(true);
    try {
      console.log('Sending Reddit auth request:', { code: code.substring(0, 10) + '...', userId });
      
      const response = await fetch('/api/reddit/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, userId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to authenticate with Reddit');
      }

      if (data.success && data.user) {
        setUserInfo(data.user);
        
        // Fetch subreddit karma with access token and user ID
        if (data.accessToken && data.user.dbUserId) {
          fetchSubredditKarma(data.accessToken, data.user.dbUserId);
        }
      } else {
        throw new Error('Invalid response from Reddit authentication');
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Reddit OAuth error:', err);
      setError(err instanceof Error ? err.message : 'Failed to authenticate with Reddit');
      setIsLoading(false);
    }
  };

  const fetchSubredditKarma = async (accessToken: string, userId?: string) => {
    setLoadingSubreddits(true);
    try {
      const response = await fetch('/api/reddit/subreddit-karma', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessToken, userId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSubredditKarma(data);
      } else {
        console.error('Failed to fetch subreddit karma:', {
          status: response.status,
          error: data.error,
          fullResponse: data
        });
        setError(`Subreddit karma error: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error fetching subreddit karma:', err);
    } finally {
      setLoadingSubreddits(false);
    }
  };

  const initiateRedditOAuth = () => {
    const clientId = process.env.NEXT_PUBLIC_REDDIT_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.NEXT_PUBLIC_REDDIT_REDIRECT_URI || `${window.location.origin}/reddit`);
    const scope = 'identity mysubreddits';
    
    // Get userId from URL parameters to preserve it through OAuth flow
    const userId = searchParams.get('userId');
    console.log('Initiating Reddit OAuth with userId:', userId);
    
    // Include userId in state to preserve it through OAuth redirect
    const stateData = {
      random: Math.random().toString(36).substring(7),
      userId: userId
    };
    const state = encodeURIComponent(JSON.stringify(stateData));
    
    if (!clientId) {
      setError('Reddit client ID not configured. Please check your environment variables.');
      return;
    }
    
    const authUrl = `https://www.reddit.com/api/v1/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `state=${state}&` +
      `redirect_uri=${redirectUri}&` +
      `duration=temporary&` +
      `scope=${scope}`;

    console.log('Reddit OAuth URL:', authUrl);
    window.location.href = authUrl;
  };

  const goBack = () => {
    window.history.back();
  };

  if (isLoading) {
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
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>
              Authenticating...
            </h2>
            <p style={{ opacity: 0.8 }}>
              Verifying your Reddit account
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (userInfo) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>✅</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>
              Reddit Verified!
            </h2>
            <p style={{ opacity: 0.8 }}>
              Successfully authenticated with Reddit
            </p>
          </div>

          <div className="glass-card" style={{ padding: '16px', marginBottom: '24px' }}>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: 500 }}>Username: </span>
              <span style={{ fontWeight: 600 }}>u/{userInfo.username}</span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: 500 }}>Total Karma: </span>
              <span style={{ fontWeight: 600, color: '#ff6b35' }}>
                {userInfo.totalKarma !== undefined ? userInfo.totalKarma.toLocaleString() : 'N/A'}
              </span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: 500 }}>Comment Karma: </span>
              <span style={{ fontWeight: 600, color: '#60a5fa' }}>
                {userInfo.commentKarma !== undefined ? userInfo.commentKarma.toLocaleString() : 'N/A'}
              </span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: 500 }}>Link Karma: </span>
              <span style={{ fontWeight: 600, color: '#f59e0b' }}>
                {userInfo.linkKarma !== undefined ? userInfo.linkKarma.toLocaleString() : 'N/A'}
              </span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: 500 }}>Account Age: </span>
              <span style={{ fontWeight: 600 }}>{userInfo.accountAge}</span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: 500 }}>Email Verified: </span>
              <span style={{ fontWeight: 600, color: userInfo.verified ? '#86efac' : '#fca5a5' }}>
                {userInfo.verified ? '✓ Yes' : '✗ No'}
              </span>
            </div>
            {userInfo.isPremium && (
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: 500 }}>Premium: </span>
                <span style={{ fontWeight: 600, color: '#fbbf24' }}>✨ Reddit Premium</span>
              </div>
            )}
            <div>
              <span style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: 500 }}>Account ID: </span>
              <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8rem' }}>{userInfo.id}</span>
            </div>
          </div>

          {/* Subreddit Karma Breakdown */}
          <div className="glass-card" style={{ padding: '16px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px' }}>
              Top Subreddits by Karma
            </h3>
            
            {loadingSubreddits ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  border: '2px solid rgba(255,255,255,0.3)', 
                  borderTop: '2px solid white', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 8px'
                }}></div>
                <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>Loading subreddit karma...</p>
              </div>
            ) : subredditKarma?.subredditKarma?.length > 0 ? (
              <div>
                {subredditKarma.subredditKarma.map((karma: any) => (
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
                    <div style={{ fontSize: '0.8rem', opacity: 0.7, display: 'flex', gap: '12px' }}>
                      <span>📝 Link Karma: {karma.linkKarma.toLocaleString()}</span>
                      <span>💬 Comment Karma: {karma.commentKarma.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                
                <div style={{ marginTop: '16px', padding: '12px', fontSize: '0.85rem', opacity: 0.6, textAlign: 'center' }}>
                  Total subreddits with karma: {subredditKarma.totalSubreddits || subredditKarma.subredditKarma?.length}
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.9rem', opacity: 0.7, textAlign: 'center', padding: '20px' }}>
                No subreddit karma data available
              </p>
            )}
          </div>

          <button 
            onClick={goBack}
            className="glass-button"
            style={{ width: '100%' }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔗</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '16px' }}>
            Connect Reddit
          </h1>
          <p style={{ opacity: 0.8, fontSize: '1.1rem', marginBottom: '24px' }}>
            Verify your Reddit account to prove your online presence and activity
          </p>
          
          {error && (
            <div className="glass-card" style={{ 
              padding: '16px', 
              marginBottom: '24px',
              borderColor: 'rgba(239, 68, 68, 0.3)', 
              background: 'rgba(239, 68, 68, 0.1)' 
            }}>
              <p style={{ color: '#fca5a5', fontSize: '0.9rem' }}>
                {error}
              </p>
            </div>
          )}
        </div>

        <div style={{ marginBottom: '24px' }}>
          <button 
            onClick={initiateRedditOAuth}
            className="glass-button-primary"
            style={{ width: '100%', marginBottom: '16px' }}
          >
            Connect with Reddit
          </button>
          
          <button 
            onClick={goBack}
            className="glass-button"
            style={{ width: '100%' }}
          >
            Back to Home
          </button>
        </div>

        <div style={{ fontSize: '0.85rem', opacity: 0.6, textAlign: 'center' }}>
          <p>We'll only access basic profile information to verify your account authenticity.</p>
        </div>
      </div>
    </div>
  );
}

export default function RedditOAuth() {
  return (
    <Suspense fallback={
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
          <p style={{ opacity: 0.8 }}>Loading...</p>
        </div>
      </div>
    }>
      <RedditOAuthContent />
    </Suspense>
  );
}