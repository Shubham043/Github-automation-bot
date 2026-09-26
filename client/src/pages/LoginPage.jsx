import React from 'react';
import { Zap, ShieldCheck, Bell, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { GithubIcon } from '../components/GithubIcon';

export function LoginPage() {
  const handleLogin = () => {
    window.location.href = '/api/auth/github';
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '2rem' }}>
      {/* Top Bar */}
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)' }}>
            <Zap size={20} color="#fff" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.025em' }}>GitPulse</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-success">
            <span className="pulse-dot" style={{ width: '6px', height: '6px' }}></span>
            System Live & Ready
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <div className="container" style={{ maxWidth: '1000px', margin: '4rem auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 1rem', borderRadius: '9999px', background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', marginBottom: '1.5rem' }}>
          <Sparkles size={14} color="#818cf8" />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#a5b4fc' }}>
            Event-Driven Automation • Supabase Postgres • Gemini AI
          </span>
        </div>

        <h1 style={{ fontSize: '3.5rem', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.035em', marginBottom: '1.5rem', background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Autonomous GitHub Webhooks.<br />
          <span style={{ background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Zero-fluff triage in real time.
          </span>
        </h1>

        <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', maxWidth: '680px', margin: '0 auto 2.5rem auto', lineHeight: 1.6 }}>
          Listen to issues, PRs, and pushes. Execute custom rules, triage using Gemini AI, write back labels and comments to GitHub, and broadcast to Slack with zero dropped events.
        </p>

        {/* CTA Button */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '4rem' }}>
          <button 
            onClick={handleLogin} 
            className="btn btn-primary"
            style={{ padding: '0.875rem 2rem', fontSize: '1rem', borderRadius: '0.75rem', gap: '0.75rem' }}
          >
            <GithubIcon size={20} />
            <span>Sign in with GitHub</span>
            <ArrowRight size={18} />
          </button>
        </div>

        {/* Architecture Highlights Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', textAlign: 'left' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <ShieldCheck size={22} color="#818cf8" />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>HMAC Signature & Idempotency</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Constant-time SHA-256 verification and delivery ID deduplication protect against replay attacks and duplicate deliveries.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Sparkles size={22} color="#34d399" />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>Gemini AI Smart Triage</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Automated issue summarization, sentiment classification, priority tagging, and instant contextual feedback comments.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <Bell size={22} color="#fb7185" />
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>Slack Alerts & Dead-Letter Queue</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Rich BlockKit notifications to team channels with automatic exponential backoff retries for transient outages.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="container" style={{ textAlign: 'center', padding: '1.5rem 0', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
        Built for Production Resilience • 100% Free-Tier Architecture • Express + React + Supabase
      </div>
    </div>
  );
}
