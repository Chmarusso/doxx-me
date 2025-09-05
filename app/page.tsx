'use client'

import { sdk } from "@farcaster/frame-sdk";
import { useEffect } from "react";
import { useAccount, useConnect, useSignMessage } from "wagmi";
import Link from "next/link";

export default function Home() {
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
        
        <div style={{ marginBottom: '24px' }}>
          <Link href="/reddit" style={{ textDecoration: 'none' }}>
            <button className="glass-button-primary" style={{ width: '100%', marginBottom: '16px' }}>
              🔗 Connect Reddit Account
            </button>
          </Link>
        </div>
        
        <ConnectMenu />
      </div>
    </div>
  );
}

function ConnectMenu() {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();

  if (isConnected) {
    return (
      <div style={{ marginBottom: '24px' }}>
        <div className="glass-card" style={{ padding: '16px', marginBottom: '16px' }}>
          <p style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: 500, marginBottom: '8px' }}>Connected Account</p>
          <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', wordBreak: 'break-all' }}>
            {address}
          </p>
        </div>
        <SignButton />
      </div>
    );
  }

  return (
    <button 
      type="button" 
      onClick={() => connect({ connector: connectors[0] })}
      className="glass-button"
      style={{ width: '100%', fontWeight: 600 }}
    >
      Connect Wallet
    </button>
  );
}

function SignButton() {
  const { signMessage, isPending, data, error } = useSignMessage();

  return (
    <div>
      <button 
        type="button" 
        onClick={() => signMessage({ message: "hello world" })} 
        disabled={isPending}
        className="glass-button-primary"
        style={{ width: '100%', marginBottom: '16px' }}
      >
        {isPending ? "Signing..." : "Sign Message"}
      </button>
      
      {data && (
        <div className="glass-card" style={{ padding: '16px', marginBottom: '16px' }}>
          <p style={{ fontSize: '0.9rem', color: '#86efac', fontWeight: 500, marginBottom: '8px' }}>✓ Signature</p>
          <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all', opacity: 0.9 }}>
            {data}
          </p>
        </div>
      )}
      
      {error && (
        <div className="glass-card" style={{ 
          padding: '16px', 
          borderColor: 'rgba(239, 68, 68, 0.3)', 
          background: 'rgba(239, 68, 68, 0.1)' 
        }}>
          <p style={{ fontSize: '0.9rem', color: '#fca5a5', fontWeight: 500, marginBottom: '8px' }}>⚠ Error</p>
          <p style={{ color: 'rgba(252, 165, 165, 0.9)', fontSize: '0.9rem' }}>
            {error.message}
          </p>
        </div>
      )}
    </div>
  );
}
