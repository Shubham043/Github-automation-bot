import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEvents } from '../hooks/useEvents';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  GitBranch, 
  Sliders, 
  RefreshCw, 
  ExternalLink,
  Search,
  Filter,
  Eye,
  ShieldCheck
} from 'lucide-react';

export function DashboardPage() {
  const { activeRepo } = useAuth();
  const [stats, setStats] = useState({
    total_events: 0,
    completed_events: 0,
    failed_events: 0,
    processing_events: 0,
    connected_repos: 0,
    active_rules: 0,
  });

  const [statusFilter, setStatusFilter] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [page, setPage] = useState(1);

  const { events, pagination, loading, isRefreshing, refetch } = useEvents(
    activeRepo?.id || '',
    statusFilter,
    page,
    15,
    6000
  );

  const fetchStats = () => {
    api.get('/api/events/stats')
      .then(setStats)
      .catch(console.error);
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Banner / Metrics */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Automation Overview</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Live telemetry and webhook processing health
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              onClick={refetch} 
              className="btn btn-secondary btn-sm"
              disabled={isRefreshing}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Live'}</span>
            </button>

            <NavLink to="/rules" className="btn btn-primary btn-sm">
              <Sliders size={14} />
              <span>Manage Rules</span>
            </NavLink>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Total Deliveries</span>
              <Activity size={18} color="var(--primary)" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff' }}>{stats.total_events}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Idempotent deliveries</p>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Completed</span>
              <CheckCircle2 size={18} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#34d399' }}>{stats.completed_events}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Rules executed successfully</p>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Failed / In DLQ</span>
              <XCircle size={18} color="#f43f5e" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fb7185' }}>{stats.failed_events}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Queued for exponential retry</p>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Active Rules</span>
              <Sliders size={18} color="#8b5cf6" />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#c084fc' }}>{stats.active_rules}</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Listening on webhooks</p>
          </div>
        </div>
      </div>

      {/* Live Event Log Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        {/* Table Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff' }}>Live Event Feed</h3>
            <span className="pulse-dot" style={{ width: '8px', height: '8px' }}></span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'var(--bg-input)', padding: '0.25rem 0.625rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
              <Filter size={14} color="var(--text-muted)" />
              <select 
                value={statusFilter} 
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.8125rem', outline: 'none' }}
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
                <option value="received">Received</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Content */}
        {loading && events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
            <Clock size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto' }} />
            <p>Streaming events from database...</p>
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '0.75rem', border: '1px dashed var(--border-color)' }}>
            <Activity size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem auto' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '0.25rem' }}>No Webhook Events Recorded Yet</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: '460px', margin: '0 auto 1.5rem auto' }}>
              Trigger an event by opening an issue, creating a PR, or pushing code to your connected repository.
            </p>
            <NavLink to="/repos" className="btn btn-primary btn-sm">
              Connect a Repository
            </NavLink>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Event</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Repository</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Summary</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Actions Taken</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => {
                  const summary = typeof ev.payload_summary === 'string' ? JSON.parse(ev.payload_summary) : ev.payload_summary;
                  const actionsTaken = Array.isArray(ev.actions_taken) ? ev.actions_taken : (typeof ev.actions_taken === 'string' ? JSON.parse(ev.actions_taken) : []);

                  return (
                    <tr 
                      key={ev.id} 
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>
                            {ev.event_type}
                          </span>
                          {ev.action && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              .{ev.action}
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {ev.repo_name}
                      </td>

                      <td style={{ padding: '0.875rem 1rem', maxWidth: '300px' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff', fontWeight: 500 }}>
                          {summary?.title || 'Webhook ping / push payload'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          by @{summary?.author || 'system'}
                        </div>
                      </td>

                      <td style={{ padding: '0.875rem 1rem' }}>
                        <StatusBadge status={ev.status} />
                      </td>

                      <td style={{ padding: '0.875rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                          {actionsTaken.length === 0 ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None matched</span>
                          ) : (
                            actionsTaken.map((act, i) => (
                              <span 
                                key={i} 
                                className={`badge ${act.status === 'success' ? 'badge-success' : 'badge-danger'}`}
                                style={{ fontSize: '0.6875rem', textTransform: 'none' }}
                              >
                                {act.type}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '0.875rem 1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>

                      <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                        <button 
                          onClick={() => setSelectedEvent(ev)} 
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.25rem 0.5rem' }}
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            <span>Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="btn btn-secondary btn-sm"
                disabled={pagination.page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                Previous
              </button>
              <button 
                className="btn btn-secondary btn-sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Event Details Inspection Modal */}
      <Modal 
        isOpen={!!selectedEvent} 
        onClose={() => setSelectedEvent(null)}
        title={`Webhook Audit #${selectedEvent?.github_event_id?.slice(0, 8)}`}
        maxWidth="750px"
      >
        {selectedEvent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Delivery ID (Idempotency Key)</span>
                <p className="font-mono" style={{ fontSize: '0.8125rem', color: '#fff', wordBreak: 'break-all' }}>{selectedEvent.github_event_id}</p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Security Check</span>
                <p style={{ fontSize: '0.8125rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.375rem', fontWeight: 600 }}>
                  <ShieldCheck size={16} /> HMAC-SHA256 Signature Verified
                </p>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Dispatched Actions Log</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {(Array.isArray(selectedEvent.actions_taken) ? selectedEvent.actions_taken : JSON.parse(selectedEvent.actions_taken || '[]')).map((a, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
                      <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.8125rem' }}>Action: {a.type}</span>
                      <span className={`badge ${a.status === 'success' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.625rem' }}>
                        {a.status}
                      </span>
                    </div>
                    <pre className="code-block" style={{ fontSize: '0.75rem', margin: 0 }}>
                      {JSON.stringify(a.details || a.error, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Payload Summary</h4>
              <pre className="code-block">
                {JSON.stringify(typeof selectedEvent.payload_summary === 'string' ? JSON.parse(selectedEvent.payload_summary) : selectedEvent.payload_summary, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
