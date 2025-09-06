'use client'

import { useState, useEffect } from 'react';
import { UserButton } from "@civic/auth-web3/react";

interface VerifiedUser {
  id: string;
  walletAddress: string;
  redditUsername?: string;
  redditData?: {
    totalKarma: number;
    commentKarma: number;
    linkKarma: number;
    accountAge: string;
    verified: boolean;
  };
  isVerified: boolean;
  createdAt: string;
}

export default function VerifierDashboard({ user }: { user: any }) {
  const [verifiedUsers, setVerifiedUsers] = useState<VerifiedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    redditConnected: 0,
    avgKarma: 0
  });

  useEffect(() => {
    fetchVerifiedUsers();
  }, []);

  const fetchVerifiedUsers = async () => {
    try {
      const response = await fetch('/api/verifier/users');
      if (response.ok) {
        const data = await response.json();
        setVerifiedUsers(data.users);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching verified users:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '24px', background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>
                Verifier Dashboard
              </h1>
              <p style={{ opacity: 0.7 }}>
                Welcome back, {user.name || user.email || 'Verifier'}
              </p>
            </div>
            <UserButton />
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px', 
          marginBottom: '24px' 
        }}>
          <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#60a5fa', marginBottom: '8px' }}>
              {stats.totalUsers}
            </div>
            <div style={{ opacity: 0.8 }}>Total Verified Users</div>
          </div>
          
          <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
              {stats.redditConnected}
            </div>
            <div style={{ opacity: 0.8 }}>Reddit Connected</div>
          </div>
          
          <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ff6b35', marginBottom: '8px' }}>
              {Math.round(stats.avgKarma)}
            </div>
            <div style={{ opacity: 0.8 }}>Avg Reddit Karma</div>
          </div>
        </div>

        {/* Users Table */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px' }}>
            Verified Users
          </h2>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                border: '4px solid rgba(255,255,255,0.3)', 
                borderTop: '4px solid white', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}></div>
              <p style={{ opacity: 0.8 }}>Loading verified users...</p>
            </div>
          ) : verifiedUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', opacity: 0.7 }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📊</div>
              <p>No verified users found</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', opacity: 0.7 }}>Wallet</th>
                    <th style={{ padding: '12px', textAlign: 'left', opacity: 0.7 }}>Reddit</th>
                    <th style={{ padding: '12px', textAlign: 'left', opacity: 0.7 }}>Karma</th>
                    <th style={{ padding: '12px', textAlign: 'left', opacity: 0.7 }}>Account Age</th>
                    <th style={{ padding: '12px', textAlign: 'left', opacity: 0.7 }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', opacity: 0.7 }}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {verifiedUsers.map((verifiedUser) => (
                    <tr key={verifiedUser.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                        {verifiedUser.walletAddress.slice(0, 6)}...{verifiedUser.walletAddress.slice(-4)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {verifiedUser.redditUsername ? (
                          <span style={{ color: '#ff6b35' }}>u/{verifiedUser.redditUsername}</span>
                        ) : (
                          <span style={{ opacity: 0.5 }}>Not connected</span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {verifiedUser.redditData ? (
                          <span style={{ color: '#60a5fa' }}>
                            {verifiedUser.redditData.totalKarma.toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ opacity: 0.5 }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {verifiedUser.redditData?.accountAge || '-'}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem',
                          backgroundColor: verifiedUser.isVerified ? 'rgba(34, 197, 94, 0.2)' : 'rgba(156, 163, 175, 0.2)',
                          color: verifiedUser.isVerified ? '#86efac' : '#9ca3af'
                        }}>
                          {verifiedUser.isVerified ? '✓ Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', opacity: 0.7, fontSize: '0.9rem' }}>
                        {new Date(verifiedUser.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}