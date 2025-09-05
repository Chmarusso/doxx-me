'use client'

import { sdk } from "@farcaster/frame-sdk";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useSignMessage } from "wagmi";
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
  const { signMessage, isPending: isSigningPending } = useSignMessage();
  const [needsSignature, setNeedsSignature] = useState(false);

  useEffect(() => {
    if (isConnected && address && !user && !isRegistering) {
      checkUserOrRequestSignature(address);
    }
  }, [isConnected, address, user, isRegistering]);

  const checkUserOrRequestSignature = async (walletAddress: string) => {
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
    return (
      <div>
        <p style={{ marginBottom: '24px', fontSize: '0.95rem', opacity: 0.8, textAlign: 'center' }}>
          Connect your wallet to get started
        </p>
        <button 
          type="button" 
          onClick={() => connect({ connector: connectors[0] })}
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
    return <UserDashboard user={user} />;
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: '#fca5a5', marginBottom: '16px' }}>
        Failed to setup account. Please try again.
      </p>
      <button 
        onClick={() => checkUserOrRequestSignature(address!)}
        className="glass-button"
        style={{ width: '100%' }}
      >
        Retry
      </button>
    </div>
  );
}

function UserDashboard({ user }: any) {
  return (
    <div>
      <div className="glass-card" style={{ padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Your Account</h3>
          <div style={{ 
            padding: '4px 8px', 
            borderRadius: '12px', 
            backgroundColor: user.isVerified ? 'rgba(34, 197, 94, 0.2)' : 'rgba(156, 163, 175, 0.2)',
            fontSize: '0.75rem',
            fontWeight: 500,
          }}>
            {user.isVerified ? '✓ Verified' : 'Unverified'}
          </div>
        </div>
        <div style={{ fontSize: '0.85rem', opacity: 0.7, fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {user.walletAddress}
        </div>
        {user.redditConnected && (
          <div style={{ marginTop: '12px', fontSize: '0.9rem' }}>
            <span style={{ opacity: 0.7 }}>Reddit: </span>
            <span style={{ fontWeight: 500 }}>u/{user.redditUsername}</span>
          </div>
        )}
      </div>

      <div style={{ marginBottom: '24px' }}>
        {user.redditConnected ? (
          <Link href="/reddit" style={{ textDecoration: 'none' }}>
            <button className="glass-button" style={{ width: '100%', marginBottom: '16px' }}>
              📊 View Reddit Data
            </button>
          </Link>
        ) : (
          <Link href={`/reddit?userId=${user.id}`} style={{ textDecoration: 'none' }}>
            <button className="glass-button-primary" style={{ width: '100%', marginBottom: '16px' }}>
              🔗 Connect Reddit Account
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}

