'use client'

import { UserButton, useUser } from "@civic/auth-web3/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function VerifierLogin() {
  const { user } = useUser();
  const router = useRouter();
  const [error] = useState<string | null>(null);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    console.log('VerifierLogin: User state changed', { user });
    // If user is already logged in, redirect to dashboard
    if (user && !isRedirecting) {
      console.log('Redirecting to dashboard...');
      setIsRedirecting(true);
      router.push('/verifier/dashboard');
    }
  }, [user, router, isRedirecting]);

  if (isRedirecting) {
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
          <p style={{ opacity: 0.8 }}>Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }


  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="glass-card" style={{ maxWidth: '400px', width: '100%', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔐</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '16px' }}>
            Verifier Panel
          </h1>
          <p style={{ opacity: 0.8, fontSize: '1.1rem', marginBottom: '24px' }}>
            Secure access for identity verification administrators
          </p>
        </div>

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

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <UserButton />
        </div>

        <div style={{ fontSize: '0.85rem', opacity: 0.6, textAlign: 'center' }}>
          <p>Protected by Civic Auth</p>
        </div>
      </div>
    </div>
  );
}