import React, { useState, useEffect } from 'react';
import { X, Save, Wand2 } from 'lucide-react';

const AGENTS = {
  'config-agent-autofixer': { title: 'Autofixer Agent', desc: 'Automatically detects and fixes build and migration errors.' },
  'config-agent-graph': { title: 'Graph Editor Agent', desc: 'Generates backend architectures from natural language prompts.' },
  'config-agent-brief': { title: 'Change Brief Agent', desc: 'Summarizes node and edge modifications into precise commit messages.' }
};

export default function AgentConfigModal({ agentAction, onClose }) {
  const [config, setConfig] = useState({
    DEVFLOW_AI_API_KEY: '',
    DEVFLOW_AI_ENDPOINT: 'https://api.openai.com/v1/chat/completions',
    DEVFLOW_AI_MODEL: 'gpt-4o'
  });

  const agentInfo = AGENTS[agentAction];

  useEffect(() => {
    // In a real app we might store per-agent config, but for now we use global envs
    const loaded = window.electronAPI?.readConfig?.() || {};
    setConfig((prev) => ({ ...prev, ...loaded }));
  }, []);

  const handleSave = () => {
    window.electronAPI?.saveConfig?.(config);
    onClose();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
         onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ width: 440, background: '#111318', border: '1px solid rgba(124, 58, 237, 0.3)', borderRadius: 12, boxShadow: '0 32px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(124, 58, 237, 0.1)', overflow: 'hidden' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(46, 48, 58, 0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: 'linear-gradient(to bottom, rgba(124, 58, 237, 0.05), transparent)' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(124, 58, 237, 0.1)', border: '1px solid rgba(124, 58, 237, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Wand2 size={18} color="#c4b5fd" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#f3f4f6' }}>{agentInfo?.title} Settings</div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, lineHeight: 1.4 }}>{agentInfo?.desc}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#6b7280' }}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#d1d5db' }}>API Key</label>
            <input 
              type="password"
              placeholder="sk-..."
              value={config.DEVFLOW_AI_API_KEY || ''}
              onChange={(e) => setConfig({ ...config, DEVFLOW_AI_API_KEY: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', background: '#0a0b0f', border: '1px solid #2e303a', borderRadius: 6, color: '#f3f4f6', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
              onBlur={(e) => e.target.style.borderColor = '#2e303a'}
            />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: '#d1d5db' }}>Model</label>
              <input 
                type="text"
                value={config.DEVFLOW_AI_MODEL || ''}
                onChange={(e) => setConfig({ ...config, DEVFLOW_AI_MODEL: e.target.value })}
                style={{ width: '100%', padding: '8px 12px', background: '#0a0b0f', border: '1px solid #2e303a', borderRadius: 6, color: '#f3f4f6', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
                onBlur={(e) => e.target.style.borderColor = '#2e303a'}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#d1d5db' }}>API Endpoint Override (Optional)</label>
            <input 
              type="text"
              placeholder="https://api.openai.com/v1/chat/completions"
              value={config.DEVFLOW_AI_ENDPOINT || ''}
              onChange={(e) => setConfig({ ...config, DEVFLOW_AI_ENDPOINT: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', background: '#0a0b0f', border: '1px solid #2e303a', borderRadius: 6, color: '#f3f4f6', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              onFocus={(e) => e.target.style.borderColor = '#7c3aed'}
              onBlur={(e) => e.target.style.borderColor = '#2e303a'}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(46, 48, 58, 0.5)', background: 'rgba(15, 17, 23, 0.5)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #2e303a', borderRadius: 6, color: '#d1d5db', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: '8px 16px', background: '#7c3aed', border: 'none', borderRadius: 6, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 0 12px rgba(124, 58, 237, 0.4)' }}>
            <Save size={14} /> Save Config
          </button>
        </div>
      </div>
    </div>
  );
}
