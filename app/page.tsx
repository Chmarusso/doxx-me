'use client'

import { sdk } from "@farcaster/frame-sdk";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import Link from "next/link";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '16px' }}>
            Doxx Me
          </h1>
          <p style={{ opacity: 0.8, fontSize: '1.1rem' }}>
            prove online stuff to others
          </p>
        </div>
        
        <WalletFirstFlow user={user} setUser={setUser} isRegistering={isRegistering} setIsRegistering={setIsRegistering} />
      </div>
    </div>
  );
}

function WalletFirstFlow({ user, setUser, isRegistering, setIsRegistering }: any) {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessage, isPending: isSigningPending } = useSignMessage();
  const [needsSignature, setNeedsSignature] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);

  useEffect(() => {
    if (isConnected && address && !user && !isRegistering) {
      checkUserOrRequestSignature(address);
    }
  }, [isConnected, address, user, isRegistering]);

  const checkUserOrRequestSignature = async (walletAddress: string) => {
    setIsCheckingUser(true);
    try {
      const response = await fetch('/api/users/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await response.json();

      if (response.ok && data.userExists) {
        setUser(data.user);
        console.log('✅ User loaded:', data.user);
      } else {
        setNeedsSignature(true);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setNeedsSignature(true);
    } finally {
      setIsCheckingUser(false);
    }
  };

  const handleSignAndRegister = async () => {
    if (!address) return;
    
    const message = `Welcome to Doxx Me!\n\nPlease sign this message to verify wallet ownership and create your account.\n\nWallet: ${address}\nTimestamp: ${new Date().toISOString()}`;
    
    try {
      await signMessage({ message }, {
        onSuccess: async (signature) => {
          await handleUserRegistration(address, message, signature);
        },
        onError: (error) => {
          console.error('Error signing message:', error);
        }
      });
    } catch (error) {
      console.error('Error signing message:', error);
    }
  };

  const handleUserRegistration = async (walletAddress: string, message: string, signature: string) => {
    setIsRegistering(true);
    try {
      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress, message, signature }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.user);
        setNeedsSignature(false);
        console.log('✅ User registered/loaded:', data.user);
      } else {
        console.error('User registration failed:', data.error);
      }
    } catch (error) {
      console.error('Error registering user:', error);
    } finally {
      setIsRegistering(false);
    }
  };

  if (!isConnected) {
    const handleConnect = () => {
      // Try to find injected connector first (MetaMask, etc.)
      const injectedConnector = connectors.find(c => c.type === 'injected');
      const connectorToUse = injectedConnector || connectors[0];
      
      console.log('Available connectors:', connectors.map(c => ({ name: c.name, type: c.type })));
      console.log('Using connector:', { name: connectorToUse.name, type: connectorToUse.type });
      
      connect({ connector: connectorToUse });
    };

    return (
      <div>
        <button 
          type="button" 
          onClick={handleConnect}
          className="glass-button-primary"
          style={{ width: '100%', fontWeight: 600 }}
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  if (needsSignature) {
    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ marginBottom: '24px', fontSize: '0.95rem', opacity: 0.8 }}>
          Please sign a message to verify wallet ownership and create your account.
        </p>
        <button 
          onClick={handleSignAndRegister}
          disabled={isSigningPending}
          className="glass-button-primary"
          style={{ width: '100%', fontWeight: 600 }}
        >
          {isSigningPending ? "Signing..." : "Sign & Create Account"}
        </button>
      </div>
    );
  }

  if (isCheckingUser) {
    return (
      <div style={{ textAlign: 'center', padding: '24px' }}>
        <div style={{ 
          width: '48px', 
          height: '48px', 
          border: '4px solid rgba(255,255,255,0.3)', 
          borderTop: '4px solid white', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }}></div>
        <p style={{ opacity: 0.8 }}>Checking account...</p>
      </div>
    );
  }

  if (isRegistering) {
    return (
      <div style={{ textAlign: 'center', padding: '24px' }}>
        <div style={{ 
          width: '48px', 
          height: '48px', 
          border: '4px solid rgba(255,255,255,0.3)', 
          borderTop: '4px solid white', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }}></div>
        <p style={{ opacity: 0.8 }}>Creating your account...</p>
      </div>
    );
  }

  if (user) {
    return <UserDashboard user={user} disconnect={disconnect} setUser={setUser} />;
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: '#fca5a5', marginBottom: '16px' }}>
        Failed to setup account. Please try again.
      </p>
      <button 
        onClick={() => checkUserOrRequestSignature(address!)}
        disabled={isCheckingUser}
        className="glass-button"
        style={{ width: '100%' }}
      >
        {isCheckingUser ? 'Checking...' : 'Retry'}
      </button>
    </div>
  );
}

function UserDashboard({ user, disconnect, setUser }: any) {
  const handleLogout = async () => {
    try {
      // Call logout API to clear httpOnly cookie
      await fetch('/api/users/logout', {
        method: 'POST'
      });
      
      disconnect();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still disconnect and clear user state even if API fails
      disconnect();
      setUser(null);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        {user.redditConnected ? (
          <Link href="/reddit" style={{ textDecoration: 'none' }}>
            <button 
              className="glass-button" 
              style={{ 
                width: '100%', 
                marginBottom: '16px',
                background: 'linear-gradient(135deg, #FF6B35, #FF4500)',
                border: '1px solid rgba(255, 107, 53, 0.3)',
                color: 'white'
              }}
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="currentColor" 
                style={{ marginRight: '8px', verticalAlign: 'middle' }}
              >
                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
              </svg>
              Prove Reddit karma
            </button>
          </Link>
        ) : (
          <Link href={`/reddit?userId=${user.id}`} style={{ textDecoration: 'none' }}>
            <button className="glass-button-primary" style={{ width: '100%', marginBottom: '16px' }}>
              🔗 Connect Reddit Account
            </button>
          </Link>
        )}

        <Link href={`/github?userId=${user.id}`} style={{ textDecoration: 'none' }}>
          <button 
            className="glass-button" 
            style={{ 
              width: '100%', 
              marginBottom: '16px',
              background: 'linear-gradient(135deg, #333, #24292e)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: 'white'
            }}
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              style={{ marginRight: '8px', verticalAlign: 'middle' }}
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Prove GitHub contributions
          </button>
        </Link>
      </div>

      <div className="glass-card" style={{ padding: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.85rem', opacity: 0.7, fontFamily: 'monospace' }}>
            {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
          </div>
          <button 
            onClick={handleLogout}
            className="glass-button"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

