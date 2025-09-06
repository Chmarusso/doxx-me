'use client'

import { useEffect, useState } from 'react';

interface RedditClientProps {
  mode: 'connect' | 'oauth-callback';
  userId?: string;
  code?: string;
  error?: string;
  state?: string;
}

export default function RedditClient({ mode, userId, code, error }: RedditClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'oauth-callback' && code && userId) {
      handleOAuthCallback(code, userId);
    }
  }, [mode, code, userId]);

  const handleOAuthCallback = async (code: string, userId: string) => {
    setIsLoading(true);
    try {
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

      if (data.success && data.user && data.accessToken) {
        // Now fetch subreddit karma data
        console.log('Fetching subreddit karma data...');
        const karmaResponse = await fetch('/api/reddit/subreddit-karma', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            accessToken: data.accessToken, 
            userId: userId 
          }),
        });

        if (karmaResponse.ok) {
          console.log('Subreddit karma data fetched successfully');
        } else {
          console.warn('Failed to fetch subreddit karma data, but proceeding with auth');
        }

        // Redirect to reddit page to show the data
        window.location.href = '/reddit';
      } else {
        throw new Error('Invalid response from Reddit authentication');
      }
    } catch (err) {
      console.error('Reddit OAuth error:', err);
      setOauthError(err instanceof Error ? err.message : 'Failed to authenticate with Reddit');
    } finally {
      setIsLoading(false);
    }
  };

  const initiateRedditOAuth = () => {
    const clientId = process.env.NEXT_PUBLIC_REDDIT_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.NEXT_PUBLIC_REDDIT_REDIRECT_URI || `${window.location.origin}/reddit`);
    const scope = 'identity mysubreddits';
    
    console.log('Initiating Reddit OAuth with userId:', userId);
    
    // Include userId in state to preserve it through OAuth redirect
    const stateData = {
      random: Math.random().toString(36).substring(7),
      userId: userId
    };
    const stateParam = encodeURIComponent(JSON.stringify(stateData));
    
    if (!clientId) {
      setOauthError('Reddit client ID not configured. Please check your environment variables.');
      return;
    }
    
    const authUrl = `https://www.reddit.com/api/v1/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `state=${stateParam}&` +
      `redirect_uri=${redirectUri}&` +
      `duration=temporary&` +
      `scope=${scope}`;

    console.log('Reddit OAuth URL:', authUrl);
    window.location.href = authUrl;
  };

  if (mode === 'oauth-callback') {
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
                Processing your Reddit verification
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (oauthError || error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❌</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '8px' }}>
              Authentication Failed
            </h2>
            <p style={{ opacity: 0.8, marginBottom: '24px' }}>
              {oauthError || error}
            </p>
            <a href="/reddit" style={{ textDecoration: 'none' }}>
              <button className="glass-button" style={{ width: '100%', marginBottom: '16px' }}>
                Try Again
              </button>
            </a>
            <a href="/" style={{ textDecoration: 'none' }}>
              <button className="glass-button" style={{ width: '100%' }}>
                Back to Home
              </button>
            </a>
          </div>
        </div>
      );
    }

    return null; // Should redirect before reaching here
  }

  // Connect mode
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
          
          {oauthError && (
            <div className="glass-card" style={{ 
              padding: '16px', 
              marginBottom: '24px',
              borderColor: 'rgba(239, 68, 68, 0.3)', 
              background: 'rgba(239, 68, 68, 0.1)' 
            }}>
              <p style={{ color: '#fca5a5', fontSize: '0.9rem' }}>
                {oauthError}
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
          
          <a href="/" style={{ textDecoration: 'none' }}>
            <button className="glass-button" style={{ width: '100%' }}>
              Back to Home
            </button>
          </a>
        </div>

        <div style={{ fontSize: '0.85rem', opacity: 0.6, textAlign: 'center' }}>
          <p>We'll only access basic profile information to verify your account authenticity.</p>
        </div>
      </div>
    </div>
  );
}