'use client'

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface GitHubUser {
  username: string;
  name: string;
  id: string;
  email?: string;
  bio?: string;
  company?: string;
  location?: string;
  followers: number;
  following: number;
  publicRepos: number;
  accountAge: string;
  avatarUrl?: string;
  dbUserId: string;
  dbGitHubDataId?: string;
}

interface RepositoryContribution {
  repository: string;
  totalPRs: number;
  mergedPRs: number;
  commits: number;
  linesChanged: number;
  issues: number;
}

interface GitHubClientProps {
  mode: 'display-data' | 'oauth-callback' | 'connect';
  initialData?: {
    githubUser: GitHubUser;
    contributions: RepositoryContribution[];
  };
  code?: string;
  userId?: string;
  error?: string;
}

export default function GitHubClient({ mode, initialData, code, userId, error }: GitHubClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(error || null);
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(initialData?.githubUser || null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [repositoryInput, setRepositoryInput] = useState('');
  const [contributions, setContributions] = useState<RepositoryContribution[]>(initialData?.contributions || []);

  useEffect(() => {
    if (mode === 'oauth-callback' && code) {
      handleGitHubCallback(code, userId);
    }
  }, [mode, code, userId]);

  const handleGitHubLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) {
      setErrorMessage('GitHub client ID not configured');
      return;
    }

    const redirectUri = `${window.location.origin}/github`;
    const scope = 'read:user,repo,user:email';
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
    
    window.location.href = githubAuthUrl;
  };

  const handleGitHubCallback = async (code: string, userId: string | null = null) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/github/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          code,
          userId: userId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'GitHub authentication failed');
      }

      // If we already have GitHub user data, just update the access token
      if (githubUser) {
        setAccessToken(data.accessToken);
        setNeedsReconnect(false);
        setErrorMessage(null);
      } else {
        setGithubUser(data.user);
        setAccessToken(data.accessToken);
      }
      
      // Clean up URL and redirect to show data
      window.history.replaceState({}, document.title, '/github');
      router.refresh(); // Refresh to show the new data
    } catch (error) {
      console.error('GitHub authentication error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRepository = async () => {
    if (!repositoryInput.trim() || !githubUser) {
      setErrorMessage('Please enter a repository and ensure you are logged in');
      return;
    }

    // If we don't have an access token, we need to get one first
    if (!accessToken) {
      setNeedsReconnect(true);
      setErrorMessage('Please reconnect your GitHub account to add more repositories');
      return;
    }

    // Parse repository input (owner/repo format)
    const repoMatch = repositoryInput.trim().match(/^([^/]+)\/([^/]+)$/);
    if (!repoMatch) {
      setErrorMessage('Please enter repository in format: owner/repository (e.g., facebook/react)');
      return;
    }

    const [, owner, repo] = repoMatch;
    setVerifying(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/github/repository-contributions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken,
          userId: githubUser.dbUserId,
          owner,
          repo,
          username: githubUser.username
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Repository verification failed');
      }

      // Add to contributions list
      const newContribution: RepositoryContribution = data.summary;
      setContributions(prev => {
        const existing = prev.find(c => c.repository === newContribution.repository);
        if (existing) {
          return prev.map(c => c.repository === newContribution.repository ? newContribution : c);
        }
        return [...prev, newContribution];
      });

      setRepositoryInput('');
      router.refresh(); // Refresh to show updated data
    } catch (error) {
      console.error('Repository verification error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Repository verification failed');
    } finally {
      setVerifying(false);
    }
  };

  if (mode === 'oauth-callback' && loading) {
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
          <p style={{ opacity: 0.8 }}>Authenticating with GitHub...</p>
        </div>
      </div>
    );
  }

  if (mode === 'connect' || !githubUser) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🐙</div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '16px' }}>
              Verify GitHub Contributions
            </h1>
            <p style={{ opacity: 0.8, fontSize: '1.1rem', lineHeight: '1.6' }}>
              Connect your GitHub account to prove your contributions to specific repositories. 
              Perfect for demonstrating your involvement in high-profile open source projects.
            </p>
          </div>

          {errorMessage && (
            <div className="glass-card" style={{ 
              padding: '16px', 
              marginBottom: '24px',
              borderColor: 'rgba(239, 68, 68, 0.3)', 
              background: 'rgba(239, 68, 68, 0.1)' 
            }}>
              <p style={{ color: '#fca5a5', fontSize: '0.9rem' }}>
                {errorMessage}
              </p>
            </div>
          )}

          <button 
            onClick={handleGitHubLogin}
            className="glass-button-primary"
            style={{ width: '100%', marginBottom: '24px' }}
          >
            🔗 Connect GitHub Account
          </button>

          <div style={{ fontSize: '0.85rem', opacity: 0.6, textAlign: 'center' }}>
            <p>We'll analyze your contributions to repositories you specify</p>
            <p style={{ fontSize: '0.8rem', marginTop: '8px' }}>
              Requires read access to public repositories and profile data
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Display existing data
  return (
    <div style={{ minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* User Profile Card */}
        <div className="glass-card" style={{ padding: '32px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
            {githubUser.avatarUrl && (
              <img 
                src={githubUser.avatarUrl} 
                alt="GitHub Avatar"
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%',
                  border: '3px solid rgba(255,255,255,0.2)'
                }}
              />
            )}
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>
                {githubUser.name || githubUser.username}
              </h1>
              <p style={{ opacity: 0.8, fontSize: '1.1rem', marginBottom: '8px' }}>
                @{githubUser.username}
              </p>
              {githubUser.bio && (
                <p style={{ opacity: 0.7, fontSize: '0.95rem' }}>
                  {githubUser.bio}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{githubUser.followers}</div>
              <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Followers</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{githubUser.following}</div>
              <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Following</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{githubUser.publicRepos}</div>
              <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Public Repos</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{githubUser.accountAge}</div>
              <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Account Age</div>
            </div>
          </div>
        </div>

        {/* Repository Verification */}
        <div className="glass-card" style={{ padding: '32px', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>
            🔍 Add Repository Contributions
          </h2>
          
          {errorMessage && (
            <div className="glass-card" style={{ 
              padding: '16px', 
              marginBottom: '24px',
              borderColor: 'rgba(239, 68, 68, 0.3)', 
              background: 'rgba(239, 68, 68, 0.1)' 
            }}>
              <p style={{ color: '#fca5a5', fontSize: '0.9rem' }}>
                {errorMessage}
              </p>
            </div>
          )}

          {needsReconnect && (
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <button 
                onClick={handleGitHubLogin}
                className="glass-button-primary"
                style={{ marginBottom: '16px' }}
              >
                🔄 Refresh GitHub Access
              </button>
              <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
                Refresh your GitHub access token to add more repositories
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <input
              type="text"
              value={repositoryInput}
              onChange={(e) => setRepositoryInput(e.target.value)}
              placeholder="owner/repository (e.g., facebook/react)"
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                fontSize: '0.95rem'
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleVerifyRepository()}
            />
            <button 
              onClick={handleVerifyRepository}
              disabled={verifying || !repositoryInput.trim()}
              className="glass-button-primary"
              style={{ minWidth: '120px' }}
            >
              {verifying ? 'Verifying...' : 'Verify'}
            </button>
          </div>

          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>
            Enter a repository to analyze your contributions (PRs, commits, issues)
          </p>
        </div>

        {/* Contributions List */}
        {contributions.length > 0 && (
          <div className="glass-card" style={{ padding: '32px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>
              📊 Your Verified Contributions
            </h2>

            <div style={{ display: 'grid', gap: '16px' }}>
              {contributions.map((contribution) => (
                <div 
                  key={contribution.repository}
                  className="glass-card"
                  style={{ padding: '20px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                      {contribution.repository}
                    </h3>
                    <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>
                      {contribution.totalPRs} PRs • {contribution.commits} commits
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#10b981' }}>{contribution.mergedPRs}</div>
                      <div style={{ opacity: 0.7, fontSize: '0.8rem' }}>Merged PRs</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{contribution.totalPRs}</div>
                      <div style={{ opacity: 0.7, fontSize: '0.8rem' }}>Total PRs</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{contribution.commits}</div>
                      <div style={{ opacity: 0.7, fontSize: '0.8rem' }}>Commits</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{contribution.linesChanged}</div>
                      <div style={{ opacity: 0.7, fontSize: '0.8rem' }}>Lines Changed</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{contribution.issues}</div>
                      <div style={{ opacity: 0.7, fontSize: '0.8rem' }}>Issues</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}