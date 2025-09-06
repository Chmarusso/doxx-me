'use client'

import { useState, useEffect } from 'react';
import { UserButton } from "@civic/auth-web3/react";

interface GolemAttestation {
  id: string;
  entityKey: string;
  expirationBlock: string;
  platform: string;
  attestationType: string;
  status: string;
  issuedAt: string;
  createdAt: string;
  proofHash: string;
  apiEndpoint?: string;
  user: {
    id: string;
    walletAddress: string;
    redditUsername?: string;
    githubUsername?: string;
  };
  rawApiData: any;
  processedData?: any;
}

interface AttestationStats {
  totalAttestations: number;
  redditAttestations: number;
  githubAttestations: number;
  activeAttestations: number;
}

export default function AttestationsPanel() {
  const [attestations, setAttestations] = useState<GolemAttestation[]>([]);
  const [filteredAttestations, setFilteredAttestations] = useState<GolemAttestation[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AttestationStats>({
    totalAttestations: 0,
    redditAttestations: 0,
    githubAttestations: 0,
    activeAttestations: 0
  });
  
  // Filter states
  const [platformFilter, setPlatformFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Detail modal
  const [selectedAttestation, setSelectedAttestation] = useState<GolemAttestation | null>(null);

  useEffect(() => {
    fetchAttestations();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [attestations, platformFilter, statusFilter, typeFilter, searchTerm]);

  const fetchAttestations = async () => {
    try {
      const response = await fetch('/api/golem/attestations');
      if (response.ok) {
        const data = await response.json();
        setAttestations(data.attestations);
        
        // Calculate stats
        const stats: AttestationStats = {
          totalAttestations: data.attestations.length,
          redditAttestations: data.attestations.filter((a: GolemAttestation) => a.platform === 'reddit').length,
          githubAttestations: data.attestations.filter((a: GolemAttestation) => a.platform === 'github').length,
          activeAttestations: data.attestations.filter((a: GolemAttestation) => a.status === 'active').length,
        };
        setStats(stats);
      }
    } catch (error) {
      console.error('Error fetching attestations:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = attestations;

    if (platformFilter) {
      filtered = filtered.filter(a => a.platform === platformFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(a => a.status === statusFilter);
    }

    if (typeFilter) {
      filtered = filtered.filter(a => a.attestationType === typeFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(a => 
        a.entityKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.user.walletAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.user.redditUsername && a.user.redditUsername.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.user.githubUsername && a.user.githubUsername.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredAttestations(filtered);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'reddit': return '🤖';
      case 'github': return '🐙';
      default: return '📊';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#86efac';
      case 'expired': return '#fbbf24';
      case 'revoked': return '#fca5a5';
      default: return '#9ca3af';
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '24px', background: 'linear-gradient(135deg, #1a1a2e, #16213e)' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>
                🔗 Golem Attestations
              </h1>
              <p style={{ opacity: 0.7 }}>
                Monitor and verify blockchain-stored attestations
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <a href="/verifier/dashboard" style={{ textDecoration: 'none' }}>
                <button className="glass-button">
                  ← Dashboard
                </button>
              </a>
              <UserButton />
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px', 
          marginBottom: '24px' 
        }}>
          <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#60a5fa', marginBottom: '8px' }}>
              {stats.totalAttestations}
            </div>
            <div style={{ opacity: 0.8 }}>Total Attestations</div>
          </div>
          
          <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#ff6b35', marginBottom: '8px' }}>
              {stats.redditAttestations}
            </div>
            <div style={{ opacity: 0.8 }}>Reddit Attestations</div>
          </div>
          
          <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#86efac', marginBottom: '8px' }}>
              {stats.githubAttestations}
            </div>
            <div style={{ opacity: 0.8 }}>GitHub Attestations</div>
          </div>

          <div className="glass-card" style={{ padding: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fbbf24', marginBottom: '8px' }}>
              {stats.activeAttestations}
            </div>
            <div style={{ opacity: 0.8 }}>Active Attestations</div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card" style={{ padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '16px' }}>
            Filters
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', opacity: 0.8 }}>
                Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Entity key, wallet address, username..."
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', opacity: 0.8 }}>
                Platform
              </label>
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              >
                <option value="">All Platforms</option>
                <option value="reddit">Reddit</option>
                <option value="github">GitHub</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', opacity: 0.8 }}>
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="revoked">Revoked</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', opacity: 0.8 }}>
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              >
                <option value="">All Types</option>
                <option value="profile">Profile</option>
                <option value="subreddit_karma">Subreddit Karma</option>
                <option value="repository_contributions">Repository Contributions</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                setPlatformFilter('');
                setStatusFilter('');
                setTypeFilter('');
                setSearchTerm('');
              }}
              className="glass-button"
            >
              Clear Filters
            </button>
            <button
              onClick={fetchAttestations}
              className="glass-button-primary"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Attestations Table */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px' }}>
            Attestations ({filteredAttestations.length})
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
              <p style={{ opacity: 0.8 }}>Loading attestations...</p>
            </div>
          ) : filteredAttestations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', opacity: 0.7 }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔗</div>
              <p>No attestations found</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '12px', textAlign: 'left', opacity: 0.7 }}>Platform</th>
                    <th style={{ padding: '12px', textAlign: 'left', opacity: 0.7 }}>Entity Key</th>
                    <th style={{ padding: '12px', textAlign: 'left', opacity: 0.7 }}>User</th>
                    <th style={{ padding: '12px', textAlign: 'left', opacity: 0.7 }}>Type</th>
                    <th style={{ padding: '12px', textAlign: 'left', opacity: 0.7 }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', opacity: 0.7 }}>Created</th>
                    <th style={{ padding: '12px', textAlign: 'left', opacity: 0.7 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttestations.map((attestation) => (
                    <tr key={attestation.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '1.2rem' }}>
                            {getPlatformIcon(attestation.platform)}
                          </span>
                          <span style={{ textTransform: 'capitalize' }}>
                            {attestation.platform}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {attestation.entityKey.length > 30 
                          ? `${attestation.entityKey.substring(0, 30)}...`
                          : attestation.entityKey
                        }
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontSize: '0.85rem' }}>
                          <div style={{ fontFamily: 'monospace' }}>
                            {attestation.user.walletAddress.slice(0, 6)}...{attestation.user.walletAddress.slice(-4)}
                          </div>
                          {attestation.platform === 'reddit' && attestation.user.redditUsername && (
                            <div style={{ color: '#ff6b35', fontSize: '0.8rem' }}>
                              u/{attestation.user.redditUsername}
                            </div>
                          )}
                          {attestation.platform === 'github' && attestation.user.githubUsername && (
                            <div style={{ color: '#86efac', fontSize: '0.8rem' }}>
                              @{attestation.user.githubUsername}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem',
                          backgroundColor: 'rgba(96, 165, 250, 0.2)',
                          color: '#60a5fa',
                          textTransform: 'capitalize'
                        }}>
                          {attestation.attestationType.replace('_', ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.75rem',
                          backgroundColor: `${getStatusColor(attestation.status)}20`,
                          color: getStatusColor(attestation.status),
                          textTransform: 'capitalize'
                        }}>
                          {attestation.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', opacity: 0.7, fontSize: '0.9rem' }}>
                        {formatDate(attestation.createdAt)}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => setSelectedAttestation(attestation)}
                          className="glass-button"
                          style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Attestation Details Modal */}
        {selectedAttestation && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '24px'
          }}>
            <div className="glass-card" style={{
              maxWidth: '800px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              padding: '24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  Attestation Details
                </h3>
                <button
                  onClick={() => setSelectedAttestation(null)}
                  className="glass-button"
                >
                  ✕
                </button>
              </div>

              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <strong>Entity Key:</strong>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', opacity: 0.8, marginTop: '4px' }}>
                    {selectedAttestation.entityKey}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <strong>Platform:</strong>
                    <div style={{ marginTop: '4px' }}>
                      {getPlatformIcon(selectedAttestation.platform)} {selectedAttestation.platform}
                    </div>
                  </div>
                  <div>
                    <strong>Type:</strong>
                    <div style={{ marginTop: '4px' }}>
                      {selectedAttestation.attestationType.replace('_', ' ')}
                    </div>
                  </div>
                  <div>
                    <strong>Status:</strong>
                    <div style={{ marginTop: '4px', color: getStatusColor(selectedAttestation.status) }}>
                      {selectedAttestation.status}
                    </div>
                  </div>
                </div>

                <div>
                  <strong>User:</strong>
                  <div style={{ marginTop: '4px', fontSize: '0.9rem' }}>
                    <div>Wallet: {selectedAttestation.user.walletAddress}</div>
                    {selectedAttestation.user.redditUsername && (
                      <div style={{ color: '#ff6b35' }}>Reddit: u/{selectedAttestation.user.redditUsername}</div>
                    )}
                    {selectedAttestation.user.githubUsername && (
                      <div style={{ color: '#86efac' }}>GitHub: @{selectedAttestation.user.githubUsername}</div>
                    )}
                  </div>
                </div>

                <div>
                  <strong>Proof Hash:</strong>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', opacity: 0.8, marginTop: '4px', wordBreak: 'break-all' }}>
                    {selectedAttestation.proofHash}
                  </div>
                </div>

                {selectedAttestation.apiEndpoint && (
                  <div>
                    <strong>API Endpoint:</strong>
                    <div style={{ opacity: 0.8, marginTop: '4px' }}>
                      {selectedAttestation.apiEndpoint}
                    </div>
                  </div>
                )}

                {selectedAttestation.processedData && (
                  <div>
                    <strong>Processed Data:</strong>
                    <pre style={{
                      background: 'rgba(0,0,0,0.3)',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      overflow: 'auto',
                      maxHeight: '200px',
                      marginTop: '8px'
                    }}>
                      {JSON.stringify(selectedAttestation.processedData, null, 2)}
                    </pre>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', fontSize: '0.9rem' }}>
                  <div>
                    <strong>Created:</strong>
                    <div style={{ opacity: 0.8, marginTop: '4px' }}>
                      {formatDate(selectedAttestation.createdAt)}
                    </div>
                  </div>
                  <div>
                    <strong>Issued:</strong>
                    <div style={{ opacity: 0.8, marginTop: '4px' }}>
                      {formatDate(selectedAttestation.issuedAt)}
                    </div>
                  </div>
                  <div>
                    <strong>Expiration Block:</strong>
                    <div style={{ opacity: 0.8, marginTop: '4px', fontFamily: 'monospace' }}>
                      {selectedAttestation.expirationBlock}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}