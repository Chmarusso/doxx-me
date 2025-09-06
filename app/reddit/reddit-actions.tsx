'use client'

interface RedditActionsProps {
  userId: string;
}

export default function RedditActions({ userId }: RedditActionsProps) {
  const handleUpdateData = () => {
    // Force a new Reddit OAuth flow to update data
    const clientId = process.env.NEXT_PUBLIC_REDDIT_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.NEXT_PUBLIC_REDDIT_REDIRECT_URI || `${window.location.origin}/reddit`);
    const scope = 'identity mysubreddits';
    
    // Include userId in state to preserve it through OAuth redirect
    const stateData = {
      random: Math.random().toString(36).substring(7),
      userId: userId,
      forceUpdate: true // Flag to indicate this is a data update
    };
    const stateParam = encodeURIComponent(JSON.stringify(stateData));
    
    if (!clientId) {
      alert('Reddit client ID not configured. Please check your environment variables.');
      return;
    }
    
    const authUrl = `https://www.reddit.com/api/v1/authorize?` +
      `client_id=${clientId}&` +
      `response_type=code&` +
      `state=${stateParam}&` +
      `redirect_uri=${redirectUri}&` +
      `duration=temporary&` +
      `scope=${scope}`;

    window.location.href = authUrl;
  };

  return (
    <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
      <button 
        onClick={handleUpdateData}
        className="glass-button"
        style={{ flex: 1 }}
      >
        Update Data
      </button>
    </div>
  );
}