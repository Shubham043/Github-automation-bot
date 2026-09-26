import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { Modal } from '../components/Modal';
import { 
  Sliders, 
  PlusCircle, 
  Trash2, 
  Sparkles, 
  Tag, 
  MessageSquare, 
  Bell, 
  CheckCircle2, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Code2
} from 'lucide-react';

export function RulesPage() {
  const { activeRepo } = useAuth();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);

  // New Rule Form State
  const [formData, setFormData] = useState({
    name: '',
    event_type: 'issues',
    field: 'title',
    operator: 'contains',
    value: 'bug',
    action_type: 'add_label',
    label_name: 'bug',
    comment_body: '🤖 **Bot Auto-Response**: Thank you for reporting this bug. Our team will review shortly.',
    slack_template: '🐛 New bug opened: *{{title}}* by @{{author}}',
    apply_ai_labels: true,
    post_ai_comment: true,
  });

  const loadRules = async () => {
    setLoading(true);
    try {
      const url = activeRepo ? `/api/rules?repo_id=${activeRepo.id}` : '/api/rules';
      const data = await api.get(url);
      setRules(data.rules || []);
    } catch (err) {
      setError(err.message || 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, [activeRepo]);

  const handleCreateRule = async (e) => {
    e.preventDefault();
    if (!activeRepo) {
      setError('Please select or connect a repository first.');
      return;
    }

    try {
      const conditions = {
        match_all: [
          {
            field: formData.field,
            operator: formData.operator,
            value: formData.value,
          },
        ],
      };

      const actions = [];
      if (formData.action_type === 'add_label') {
        actions.push({ type: 'add_label', label: formData.label_name });
      } else if (formData.action_type === 'post_comment') {
        actions.push({ type: 'post_comment', body: formData.comment_body });
      } else if (formData.action_type === 'slack_notify') {
        actions.push({ type: 'slack_notify', message_template: formData.slack_template });
      } else if (formData.action_type === 'ai_triage') {
        actions.push({ 
          type: 'ai_triage', 
          apply_suggested_labels: formData.apply_ai_labels, 
          post_ai_comment: formData.post_ai_comment 
        });
      }

      await api.post('/api/rules', {
        repo_id: activeRepo.id,
        name: formData.name,
        event_type: formData.event_type,
        conditions,
        actions,
        is_active: true,
      });

      setIsModalOpen(false);
      loadRules();
    } catch (err) {
      setError(err.message || 'Failed to save rule');
    }
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    try {
      await api.delete(`/api/rules/${id}`);
      loadRules();
    } catch (err) {
      setError(err.message || 'Failed to delete rule');
    }
  };

  const handleToggleRule = async (rule) => {
    try {
      await api.put(`/api/rules/${rule.id}`, { is_active: !rule.is_active });
      loadRules();
    } catch (err) {
      setError(err.message || 'Failed to update rule');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Automation Rules</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Configure event filters, labels, comments, Slack alerts, and Gemini AI triage
          </p>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary btn-sm"
          disabled={!activeRepo}
        >
          <PlusCircle size={16} />
          <span>New Rule</span>
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '0.75rem', padding: '1rem', color: '#fb7185', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Rules List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {rules.length === 0 ? (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
            <Sliders size={32} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem auto' }} />
            <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 600 }}>No Automation Rules Configured</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.25rem auto 1.5rem auto' }}>
              Create a rule to auto-label issues containing keywords or enable Gemini AI triage on incoming PRs.
            </p>
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="btn btn-primary btn-sm"
              disabled={!activeRepo}
            >
              Create First Rule
            </button>
          </div>
        ) : (
          rules.map((rule) => {
            const conditions = typeof rule.conditions === 'string' ? JSON.parse(rule.conditions) : rule.conditions;
            const actions = typeof rule.actions === 'string' ? JSON.parse(rule.actions) : rule.actions;

            return (
              <div key={rule.id} className="glass-panel glass-panel-hover" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>{rule.name}</h4>
                    <span className="badge badge-info" style={{ fontSize: '0.6875rem' }}>
                      {rule.event_type}
                    </span>
                    {rule.is_active ? (
                      <span className="badge badge-success" style={{ fontSize: '0.6875rem' }}>Active</span>
                    ) : (
                      <span className="badge badge-neutral" style={{ fontSize: '0.6875rem' }}>Paused</span>
                    )}
                  </div>

                  {/* Conditions & Actions Summary */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.8125rem' }}>
                    <div style={{ color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '0.25rem 0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border-color)' }}>
                      <strong>IF:</strong> {conditions?.match_all?.map(c => `${c.field} ${c.operator} "${c.value}"`).join(' AND ') || 'Always matches'}
                    </div>

                    <span style={{ color: 'var(--text-muted)' }}>➔</span>

                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                      {actions?.map((act, i) => (
                        <span key={i} className="badge badge-neutral" style={{ fontSize: '0.6875rem', textTransform: 'none' }}>
                          {act.type === 'ai_triage' && <Sparkles size={12} color="#c084fc" />}
                          {act.type === 'add_label' && <Tag size={12} color="#38bdf8" />}
                          {act.type === 'post_comment' && <MessageSquare size={12} color="#34d399" />}
                          {act.type === 'slack_notify' && <Bell size={12} color="#fb7185" />}
                          {act.type} {act.label ? `("${act.label}")` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button 
                    onClick={() => handleToggleRule(rule)}
                    className="btn btn-secondary btn-sm"
                    title={rule.is_active ? 'Pause rule' : 'Activate rule'}
                  >
                    {rule.is_active ? <ToggleRight size={18} color="#10b981" /> : <ToggleLeft size={18} color="var(--text-muted)" />}
                  </button>
                  <button 
                    onClick={() => handleDeleteRule(rule.id)}
                    className="btn btn-danger btn-sm"
                    title="Delete rule"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Rule Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Create Automation Rule"
        maxWidth="650px"
      >
        <form onSubmit={handleCreateRule} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Rule Name</label>
            <input 
              type="text" 
              className="input" 
              placeholder="e.g., Auto-label Bug Issues & Slack Alert" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Event Trigger</label>
              <select 
                className="select"
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
              >
                <option value="issues">Issues (issues)</option>
                <option value="pull_request">Pull Request (pull_request)</option>
                <option value="push">Code Push (push)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Payload Field</label>
              <select 
                className="select"
                value={formData.field}
                onChange={(e) => setFormData({ ...formData, field: e.target.value })}
              >
                <option value="title">Title</option>
                <option value="body">Body / Description</option>
                <option value="author">Author Username</option>
                <option value="action">Action (e.g. opened)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Condition Operator</label>
              <select 
                className="select"
                value={formData.operator}
                onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
              >
                <option value="contains">Contains (case-insensitive)</option>
                <option value="equals">Equals</option>
                <option value="not_contains">Does Not Contain</option>
                <option value="starts_with">Starts With</option>
                <option value="matches_regex">Matches Regex</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Match Value</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. bug, fix, hotfix"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Primary Action</label>
            <select 
              className="select"
              value={formData.action_type}
              onChange={(e) => setFormData({ ...formData, action_type: e.target.value })}
            >
              <option value="add_label">GitHub: Add Label</option>
              <option value="post_comment">GitHub: Post Comment</option>
              <option value="slack_notify">Slack: Send BlockKit Alert</option>
              <option value="ai_triage">AI Stretch: Gemini Smart Triage</option>
            </select>
          </div>

          {/* Conditional Action Config Fields */}
          {formData.action_type === 'add_label' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Label Name</label>
              <input 
                type="text" 
                className="input" 
                value={formData.label_name}
                onChange={(e) => setFormData({ ...formData, label_name: e.target.value })}
                required
              />
            </div>
          )}

          {formData.action_type === 'post_comment' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Markdown Comment Body</label>
              <textarea 
                className="textarea" 
                rows="3"
                value={formData.comment_body}
                onChange={(e) => setFormData({ ...formData, comment_body: e.target.value })}
                required
              />
            </div>
          )}

          {formData.action_type === 'slack_notify' && (
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>Slack Message Template (Supports {'{{title}}'}, {'{{author}}'})</label>
              <input 
                type="text" 
                className="input" 
                value={formData.slack_template}
                onChange={(e) => setFormData({ ...formData, slack_template: e.target.value })}
                required
              />
            </div>
          )}

          {formData.action_type === 'ai_triage' && (
            <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '0.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c084fc', fontWeight: 600, fontSize: '0.875rem' }}>
                <Sparkles size={16} /> Gemini AI Auto-Triage Enabled
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.apply_ai_labels}
                  onChange={(e) => setFormData({ ...formData, apply_ai_labels: e.target.checked })}
                />
                Auto-apply suggested labels from Gemini classification
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8125rem', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={formData.post_ai_comment}
                  onChange={(e) => setFormData({ ...formData, post_ai_comment: e.target.checked })}
                />
                Post AI summary and triage notes as issue/PR comment
              </label>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Automation Rule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
