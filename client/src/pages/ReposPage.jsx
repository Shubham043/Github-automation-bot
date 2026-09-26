import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { 
  GitBranch, 
  PlusCircle, 
  CheckCircle2, 
  Trash2, 
  ExternalLink, 
  Lock, 
  Globe, 
  RefreshCw, 
  AlertCircle,
  Radio,
  Sliders
} from 'lucide-react';

export function ReposPage() {
  const { setActiveRepo } = useAuth();
  const [connectedRepos, setConnectedRepos] = useState([]);
  const [availableRepos, setAvailableRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState(null);
  const [disconnectingId, setDisconnectingId] = useState(null);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [connData, availData] = await Promise.all([
        api.get('/api/repos'),
        api.get('/api/repos/available'),
      ]);
      setConnectedRepos(connData.repositories || []);
      setAvailableRepos(availData.repositories || []);
    } catch (err) {
      setError(err.message || 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConnect = async (repo) => {
    setConnectingId(repo.id);
    setError(null);
    try {
      const res = await api.post('/api/repos/connect', {
        full_name: repo.full_name,
        github_repo_id: repo.id,
      });
      await loadData();
      if (res.repository) {
        setActiveRepo(res.repository);
      }
    } catch (err) {
      setError(err.message || 'Failed to connect repository. Check permissions.');
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnect = async (repoId) => {
    if (!window.confirm('Are you sure you want to disconnect this repository? Automation webhooks will be removed from GitHub.')) {
      return;
    }
    setDisconnectingId(repoId);
    try {
      await api.post(`/api/repos/${repoId}/disconnect`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to disconnect repository.');
    } finally {
      setDisconnectingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Connected Repositories</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Repositories actively configured with automated GitHub webhooks
          </p>
        </div>
        <button onClick={loadData} className="btn btn-secondary btn-sm" disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '0.75rem', padding: '1rem 1.25rem', color: '#fb7185', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Connected Repositories Grid */}
      <div>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Radio size={18} color="#10b981" />
          <span>Active Webhooks ({connectedRepos.length})</span>
        </h3>

        {connectedRepos.length === 0 ? (
          <div className="glass-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <GitBranch size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem auto' }} />
            <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600 }}>No Active Repositories Connected</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.25rem auto 1rem auto' }}>
              Select a repository from your GitHub account below to auto-inject webhooks and start automating.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem' }}>
            {connectedRepos.map((repo) => (
              <div key={repo.id} className="glass-panel glass-panel-hover" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <a 
                      href={`https://github.com/${repo.full_name}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                    >
                      {repo.full_name}
                      <ExternalLink size={14} color="var(--text-muted)" />
                    </a>
                    <span className="badge badge-success" style={{ marginTop: '0.375rem', fontSize: '0.6875rem' }}>
                      <CheckCircle2 size={12} /> Webhook Active
                    </span>
                  </div>

                  <button 
                    onClick={() => handleDisconnect(repo.id)}
                    disabled={disconnectingId === repo.id}
                    className="btn btn-danger btn-sm"
                    title="Disconnect and remove webhook"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  <div>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{repo.rules_count || 0}</span> Rules
                  </div>
                  <div>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{repo.events_count || 0}</span> Events Processed
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Repositories to Connect */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
          Available GitHub Repositories
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
            <RefreshCw size={20} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
            <p>Fetching repositories from GitHub API...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {availableRepos.map((repo) => {
              const isConnected = repo.is_connected;
              const isConnecting = connectingId === repo.id;

              return (
                <div 
                  key={repo.id} 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.625rem', border: '1px solid var(--border-color)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {repo.private ? <Lock size={16} color="var(--accent-amber)" /> : <Globe size={16} color="var(--accent-cyan)" />}
                    <div>
                      <p style={{ fontWeight: 600, color: '#fff', fontSize: '0.9375rem' }}>{repo.full_name}</p>
                      {repo.description && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '500px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {repo.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    {isConnected ? (
                      <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                        Connected
                      </span>
                    ) : (
                      <button 
                        onClick={() => handleConnect(repo)}
                        disabled={isConnecting}
                        className="btn btn-primary btn-sm"
                      >
                        {isConnecting ? (
                          <>
                            <RefreshCw size={12} className="animate-spin" />
                            <span>Injecting Hook...</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle size={14} />
                            <span>Connect Bot</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
