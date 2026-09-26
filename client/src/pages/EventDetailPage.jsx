import React, { useState, useEffect } from 'react';
import { useParams, NavLink } from 'react-router-dom';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import { ArrowLeft, Clock, ShieldCheck, Tag, MessageSquare, Bell, Sparkles, ExternalLink, RefreshCw } from 'lucide-react';

export function EventDetailPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/events/${id}`)
      .then((data) => setEvent(data.event))
      .catch((err) => setError(err.message || 'Failed to load event details'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
        <Clock size={24} className="animate-spin" style={{ margin: '0 auto 0.75rem auto' }} />
        <p>Loading webhook audit logs...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <p style={{ color: '#fb7185', marginBottom: '1rem' }}>{error || 'Event not found'}</p>
        <NavLink to="/dashboard" className="btn btn-secondary btn-sm">
          <ArrowLeft size={14} /> Back to Dashboard
        </NavLink>
      </div>
    );
  }

  const summary = typeof event.payload_summary === 'string' ? JSON.parse(event.payload_summary) : event.payload_summary;
  const actionsTaken = Array.isArray(event.actions_taken) ? event.actions_taken : JSON.parse(event.actions_taken || '[]');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Back button & Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <NavLink to="/dashboard" className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} /> Back
          </NavLink>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
              Delivery Audit: {event.event_type} {event.action ? `(${event.action})` : ''}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Recorded on {new Date(event.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <StatusBadge status={event.status} />
      </div>

      {/* Security & Delivery Summary Card */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Repository</span>
          <p style={{ fontWeight: 600, color: '#fff', marginTop: '0.25rem' }}>{event.repo_name}</p>
        </div>

        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Delivery ID</span>
          <p className="font-mono" style={{ fontSize: '0.8125rem', color: '#38bdf8', marginTop: '0.25rem' }}>{event.github_event_id}</p>
        </div>

        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security Validation</span>
          <p style={{ fontSize: '0.8125rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: '0.25rem', fontWeight: 600 }}>
            <ShieldCheck size={16} /> HMAC-SHA256 Matched
          </p>
        </div>
      </div>

      {/* Dispatched Actions History */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
          Action Execution History ({actionsTaken.length})
        </h3>

        {actionsTaken.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No rule matched the conditions of this event.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {actionsTaken.map((act, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {act.type === 'ai_triage' && <Sparkles size={16} color="#c084fc" />}
                    {act.type === 'add_label' && <Tag size={16} color="#38bdf8" />}
                    {act.type === 'post_comment' && <MessageSquare size={16} color="#34d399" />}
                    {act.type === 'slack_notify' && <Bell size={16} color="#fb7185" />}
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.875rem' }}>{act.rule_name || act.type}</span>
                  </div>
                  <StatusBadge status={act.status} />
                </div>
                <pre className="code-block" style={{ margin: 0, fontSize: '0.75rem' }}>
                  {JSON.stringify(act.details || act.error, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payload Summary Inspector */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
          Event Payload Summary
        </h3>
        <pre className="code-block">
          {JSON.stringify(summary, null, 2)}
        </pre>
      </div>
    </div>
  );
}
