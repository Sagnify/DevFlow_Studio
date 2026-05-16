import React, { useState, useEffect, useRef } from 'react';
import { Wand2 } from 'lucide-react';

const MENU_DATA = {
  File: [
    { label: 'New Project', action: 'new-project', shortcut: 'Ctrl+N' },
    { label: 'Open Project...', action: 'open-project', shortcut: 'Ctrl+O' },
    { label: 'Save Project', action: 'save-project', shortcut: 'Ctrl+S' },
    { label: 'Close Project', action: 'close-project' },
    { type: 'separator' },
    { label: 'Preferences', action: 'preferences', shortcut: 'Ctrl+,' },
    { type: 'separator' },
    { label: 'Exit', action: 'exit', shortcut: 'Alt+F4' }
  ],
  Edit: [
    { label: 'Undo', action: 'undo', shortcut: 'Ctrl+Z' },
    { label: 'Redo', action: 'redo', shortcut: 'Ctrl+Y' },
    { type: 'separator' },
    { label: 'Find', action: 'find', shortcut: 'Ctrl+F', dependsOn: 'codeMode' },
    { label: 'Replace', action: 'replace', shortcut: 'Ctrl+H', dependsOn: 'codeMode' },
    { type: 'separator' },
    { label: 'Configure Selected Node', action: 'configure-node', shortcut: 'Enter' },
    { label: 'Group Nodes', action: 'group-nodes', shortcut: 'Ctrl+G' },
    { label: 'Ungroup Nodes', action: 'ungroup-nodes', shortcut: 'Ctrl+Shift+G' },
    { label: 'Reverse Selected Edge', action: 'reverse-edge', shortcut: 'Ctrl+R', dependsOn: 'singleEdge' }
  ],
  Insert: [
    { label: 'Endpoint Node', action: 'insert-endpoint' },
    { label: 'Logic Node', action: 'insert-logic' },
    { label: 'Database Node', action: 'insert-db' }
  ],
  View: [
    { label: 'Terminal', action: 'toggle-terminal', checkable: true, stateKey: 'termOpen' },
    { label: 'Code Mode', action: 'toggle-code-mode', checkable: true, stateKey: 'isCodeMode', dependsOn: 'hasCodeFiles' },
    { label: 'File Explorer', action: 'toggle-explorer', checkable: true, stateKey: 'explorerOpen' },
    { label: 'Source Control', action: 'toggle-source-control', checkable: true, stateKey: 'sourceControlOpen' },
    { type: 'separator' },
    { label: 'Zoom In', action: 'zoom-in', shortcut: 'Ctrl++' },
    { label: 'Zoom Out', action: 'zoom-out', shortcut: 'Ctrl+-' },
    { label: 'Reset Zoom', action: 'zoom-reset', shortcut: 'Ctrl+0' }
  ],
  Run: [
    { label: 'Build Project', action: 'build-project', shortcut: 'Ctrl+B' },
    { label: 'Migrate Database', action: 'migrate-db', shortcut: 'Ctrl+M' },
    { label: 'Run Server', action: 'run-server', shortcut: 'F5' },
    { label: 'Stop Server', action: 'stop-server', shortcut: 'Shift+F5' },
    { type: 'separator' },
    { label: 'Test Selected Endpoint', action: 'test-endpoint' }
  ],
  Agents: [
    { label: 'Configure Autofixer Agent', action: 'config-agent-autofixer', icon: Wand2, iconColor: '#d97706' },
    { label: 'Configure Graph Editor Agent', action: 'config-agent-graph', icon: Wand2, iconColor: '#7c3aed' },
    { label: 'Configure Change Brief Agent', action: 'config-agent-brief', icon: Wand2, iconColor: '#059669' }
  ],
  Help: [
    { label: 'Welcome Screen', action: 'welcome-screen' },
    { label: 'About DevFlow Studio', action: 'about' }
  ]
};

export default function TitleBar({ onAction, appState }) {
  const [activeMenu, setActiveMenu] = useState(null);
  const barRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isEnabled = (item) => {
    if (item.dependsOn === 'codeMode') return appState.isCodeMode;
    if (item.dependsOn === 'hasCodeFiles') return appState.hasCodeFiles;
    if (item.dependsOn === 'singleEdge') return appState.selectedEdgeCount === 1;
    return true;
  };

  const handleAction = (action) => {
    setActiveMenu(null);
    if (action === 'exit') {
      window.electronAPI?.windowControls?.close();
    } else {
      onAction(action);
    }
  };

  const handleMenuEnter = (menuName) => {
    if (activeMenu !== null && activeMenu !== menuName) {
      setActiveMenu(menuName);
    }
  };

  return (
    <div 
      ref={barRef}
      style={{
        height: 36,
        background: 'rgba(15, 17, 23, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(46, 48, 58, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        WebkitAppRegion: 'drag', // Makes it draggable
        userSelect: 'none',
        zIndex: 9999,
        position: 'relative',
        flexShrink: 0
      }}
    >
      {/* Left side: Logo + Menus */}
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingLeft: 12 }}>
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: 8, marginRight: 16,
          fontFamily: 'system-ui, sans-serif', fontWeight: 700, fontSize: 13,
          background: 'linear-gradient(135deg, #7c3aed, #38bdf8)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>
          DevFlow
        </div>

        {Object.entries(MENU_DATA).map(([menuName, items]) => (
          <div 
            key={menuName}
            style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}
            onMouseEnter={() => handleMenuEnter(menuName)}
          >
            <div 
              onClick={() => setActiveMenu(activeMenu === menuName ? null : menuName)}
              style={{
                padding: '0 10px',
                height: 'calc(100% - 8px)',
                display: 'flex', alignItems: 'center',
                margin: '0 2px',
                borderRadius: 6,
                fontSize: 12,
                color: activeMenu === menuName ? '#f3f4f6' : '#9ca3af',
                background: activeMenu === menuName ? 'rgba(255,255,255,0.1)' : 'transparent',
                cursor: 'default',
                WebkitAppRegion: 'no-drag',
                transition: 'color 0.15s, background 0.15s'
              }}
              onMouseEnter={(e) => {
                if (activeMenu !== menuName) {
                  e.currentTarget.style.color = '#f3f4f6';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeMenu !== menuName) {
                  e.currentTarget.style.color = '#9ca3af';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {menuName}
            </div>

            {/* Dropdown */}
            {activeMenu === menuName && (
              <div style={{
                position: 'absolute', top: 34, left: 0,
                background: 'rgba(20, 22, 31, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(46, 48, 58, 0.8)',
                borderRadius: 8,
                padding: '6px 0',
                minWidth: 220,
                boxShadow: '0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(124, 58, 237, 0.1)',
                WebkitAppRegion: 'no-drag',
                display: 'flex', flexDirection: 'column'
              }}>
                {items.map((item, i) => {
                  if (item.type === 'separator') {
                    return <div key={i} style={{ height: 1, background: 'rgba(46, 48, 58, 0.5)', margin: '4px 0' }} />;
                  }
                  const enabled = isEnabled(item);
                  return (
                    <div 
                      key={i}
                      onClick={() => enabled && handleAction(item.action)}
                      style={{
                        padding: '6px 14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        color: enabled ? '#d1d5db' : '#4b5563',
                        fontSize: 12,
                        cursor: enabled ? 'pointer' : 'default',
                        margin: '0 6px', borderRadius: 5,
                        transition: 'background 0.1s'
                      }}
                      onMouseEnter={(e) => { if (enabled) e.currentTarget.style.background = 'rgba(124, 58, 237, 0.15)'; }}
                      onMouseLeave={(e) => { if (enabled) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {item.checkable && (
                          <div style={{ width: 12, display: 'flex', justifyContent: 'center' }}>
                            {appState[item.stateKey] && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#7c3aed' }} />}
                          </div>
                        )}
                        {item.icon && <item.icon size={12} color={enabled ? item.iconColor : '#4b5563'} />}
                        <span>{item.label}</span>
                      </div>
                      {item.shortcut && (
                        <span style={{ fontSize: 11, color: enabled ? '#6b7280' : '#374151', fontFamily: 'monospace' }}>
                          {item.shortcut}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right side: Window Controls */}
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', gap: 10, paddingRight: 16, WebkitAppRegion: 'no-drag' }}>
        <button 
          title="Minimize"
          onClick={() => window.electronAPI?.windowControls?.minimize()}
          style={{ width: 13, height: 13, borderRadius: '50%', background: '#4b5563', border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#febb2e'; e.currentTarget.style.boxShadow = '0 0 6px rgba(254,187,46,0.5)'; e.currentTarget.firstChild.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#4b5563'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.firstChild.style.opacity = '0'; }}
        >
          <svg width="7" height="7" viewBox="0 0 7 7" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0, transition: 'opacity 0.2s' }}>
            <path d="M1 3.5H6" stroke="#995700" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
        <button 
          title="Maximize"
          onClick={() => window.electronAPI?.windowControls?.maximize()}
          style={{ width: 13, height: 13, borderRadius: '50%', background: '#4b5563', border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#28c840'; e.currentTarget.style.boxShadow = '0 0 6px rgba(40,200,64,0.5)'; e.currentTarget.firstChild.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#4b5563'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.firstChild.style.opacity = '0'; }}
        >
          <svg width="7" height="7" viewBox="0 0 7 7" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0, transition: 'opacity 0.2s' }}>
            <path d="M3.5 1V6M1 3.5H6" stroke="#006500" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
        <button 
          title="Close"
          onClick={() => window.electronAPI?.windowControls?.close()}
          style={{ width: 13, height: 13, borderRadius: '50%', background: '#4b5563', border: 'none', cursor: 'pointer', transition: 'all 0.2s', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#ff5f57'; e.currentTarget.style.boxShadow = '0 0 6px rgba(255,95,87,0.5)'; e.currentTarget.firstChild.style.opacity = '1'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#4b5563'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.firstChild.style.opacity = '0'; }}
        >
          <svg width="7" height="7" viewBox="0 0 7 7" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0, transition: 'opacity 0.2s' }}>
            <path d="M1.5 1.5L5.5 5.5M5.5 1.5L1.5 5.5" stroke="#4c0000" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
