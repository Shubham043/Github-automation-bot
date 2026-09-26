import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../lib/api';
import { 
  Activity, 
  GitBranch, 
  Sliders, 
  LogOut, 
  Radio, 
  PlusCircle, 
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { GithubIcon } from './GithubIcon';

export function Layout() {
  const { user, logout, activeRepo, setActiveRepo } = useAuth();
  const [repos, setRepos] = useState([]);
  const location = useLocation();

  useEffect(() => {
    api.get('/api/repos')
      .then((data) => {
        setRepos(data.repositories || []);
        if (data.repositories?.length > 0 && !activeRepo) {
          setActiveRepo(data.repositories[0]);
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar Navigation */}
      <aside 
        style={{ 
          width: '260px', 
          background: 'rgba(11, 15, 25, 0.95)', 
          borderRight: '1px solid var(--border-color)', 
          display: 'flex', 
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          zIndex: 40,
          backdropFilter: 'blur(20px)'
        }}
      >
        {/* Brand */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            width: '36px', 
            height: '36px', 
            borderRadius: '10px', 
            background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)'
          }}>
            <Zap size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.025em', color: '#fff' }}>GitPulse</h1>
            <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span className="pulse-dot" style={{ width: '6px', height: '6px' }}></span>
              Webhook Engine v1.0
            </p>
          </div>
        </div>

        {/* Repository Switcher */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
          <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Active Repository
          </label>
          <select 
            className="select" 
            style={{ fontSize: '0.8125rem', padding: '0.5rem 0.625rem' }}
            value={activeRepo?.id || ''}
            onChange={(e) => {
              const selected = repos.find(r => r.id === e.target.value);
              setActiveRepo(selected || null);
            }}
          >
            {repos.length === 0 ? (
              <option value="">No Repos Connected</option>
            ) : (
              repos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.full_name}
                </option>
              ))
            )}
          </select>
        </div>

        {/* Navigation Links */}
        <nav style={{ padding: '1rem 0.75rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <NavLink 
            to="/dashboard" 
            className={({ isActive }) => `btn btn-secondary ${isActive ? 'btn-primary' : ''}`}
            style={{ justifyContent: 'flex-start', padding: '0.625rem 0.875rem', border: 'none', background: location.pathname === '/dashboard' ? 'var(--primary)' : 'transparent' }}
          >
            <Activity size={18} />
            <span>Event Activity Log</span>
          </NavLink>

          <NavLink 
            to="/rules" 
            className={({ isActive }) => `btn btn-secondary ${isActive ? 'btn-primary' : ''}`}
            style={{ justifyContent: 'flex-start', padding: '0.625rem 0.875rem', border: 'none', background: location.pathname === '/rules' ? 'var(--primary)' : 'transparent' }}
          >
            <Sliders size={18} />
            <span>Automation Rules</span>
          </NavLink>

          <NavLink 
            to="/repos" 
            className={({ isActive }) => `btn btn-secondary ${isActive ? 'btn-primary' : ''}`}
            style={{ justifyContent: 'flex-start', padding: '0.625rem 0.875rem', border: 'none', background: location.pathname === '/repos' ? 'var(--primary)' : 'transparent' }}
          >
            <GitBranch size={18} />
            <span>Connected Repos</span>
          </NavLink>
        </nav>

        {/* User Card & Logout */}
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', overflow: 'hidden' }}>
              <img 
                src={user?.avatar_url || 'https://github.com/ghost.png'} 
                alt={user?.github_login} 
                style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border-color)' }}
              />
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {user?.github_login}
                </p>
                <p style={{ fontSize: '0.6875rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <ShieldCheck size={12} /> OAuth Session
                </p>
              </div>
            </div>
            <button 
              onClick={logout} 
              title="Log out"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ marginLeft: '260px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <header style={{ height: '64px', borderBottom: '1px solid var(--border-color)', background: 'rgba(9, 13, 22, 0.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {activeRepo ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GithubIcon size={18} color="var(--text-muted)" />
                <a 
                  href={`https://github.com/${activeRepo.full_name}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                >
                  {activeRepo.full_name}
                  <ExternalLink size={14} color="var(--text-muted)" />
                </a>
              </div>
            ) : (
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Select or connect a repository</span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <NavLink to="/repos" className="btn btn-secondary btn-sm">
              <PlusCircle size={14} /> Connect Repo
            </NavLink>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ padding: '2rem', flex: 1 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
