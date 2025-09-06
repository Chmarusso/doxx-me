'use client'

import { useEffect, useState } from 'react';

export default function VerifierDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    // Check if the Civic Auth API route is accessible
    const checkApiRoute = async () => {
      try {
        const response = await fetch('/api/auth/civicauth');
        console.log('API Route response:', response);
        setDebugInfo(prev => ({
          ...prev,
          apiRoute: {
            status: response.status,
            accessible: response.ok || response.status !== 404
          }
        }));
      } catch (error) {
        console.error('API Route error:', error);
        setDebugInfo(prev => ({
          ...prev,
          apiRoute: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }));
      }
    };

    checkApiRoute();

    // Check window location and other debug info
    setDebugInfo(prev => ({
      ...prev,
      windowLocation: {
        href: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname
      },
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    }));
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="glass-card" style={{ maxWidth: '800px', width: '100%', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🐛</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '16px' }}>
            Civic Auth Debug
          </h1>
          <p style={{ opacity: 0.8, fontSize: '1.1rem' }}>
            Debug information for troubleshooting authentication issues
          </p>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '16px' }}>
            Debug Information:
          </h3>
          
          <pre style={{ 
            background: 'rgba(0,0,0,0.3)', 
            padding: '16px', 
            borderRadius: '8px', 
            fontSize: '0.9rem',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace'
          }}>
            {debugInfo ? JSON.stringify(debugInfo, null, 2) : 'Loading debug info...'}
          </pre>
        </div>

        <div style={{ textAlign: 'center' }}>
          <a href="/verifier/login" style={{ textDecoration: 'none' }}>
            <button className="glass-button-primary" style={{ marginRight: '12px' }}>
              Back to Login
            </button>
          </a>
          <button 
            onClick={() => window.location.reload()}
            className="glass-button"
          >
            Refresh Debug
          </button>
        </div>

        <div style={{ fontSize: '0.85rem', opacity: 0.6, textAlign: 'center', marginTop: '24px' }}>
          <p>Open browser DevTools Console for more detailed logs</p>
        </div>
      </div>
    </div>
  );
}