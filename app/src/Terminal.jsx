import React, { useState, useEffect, useRef, useCallback } from "react";
import { Trash2, X, Plus, TerminalSquare } from "lucide-react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

function TermInstance({ id, isActive, projectPath, onRefReady }) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitRef = useRef(null);

  useEffect(() => {
    const term = new XTerm({
      theme: {
        background: "#0f1117",
        foreground: "#f3f4f6",
        cursor: "#7c3aed",
        selectionBackground: "#7c3aed55",
        black: "#0f1117",     brightBlack: "#4b5563",
        red: "#f87171",       brightRed: "#fca5a5",
        green: "#34d399",     brightGreen: "#6ee7b7",
        yellow: "#fbbf24",    brightYellow: "#fde68a",
        blue: "#60a5fa",      brightBlue: "#93c5fd",
        magenta: "#a78bfa",   brightMagenta: "#c4b5fd",
        cyan: "#22d3ee",      brightCyan: "#67e8f9",
        white: "#f3f4f6",     brightWhite: "#ffffff",
      },
      fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
      fontSize: 13,
      lineHeight: 1.5,
      cursorBlink: true,
      cursorStyle: "block",
      scrollback: 1000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    termRef.current = term;
    fitRef.current = fitAddon;

    onRefReady(id, { term, fitAddon });

    // Initialize backend PTY for this session
    requestAnimationFrame(() => {
      const pty = window.electronAPI?.pty;
      if (pty) {
        pty.start(projectPath, id);
        term.onData((data) => pty.input(data, id));
      } else {
        term.write("\x1b[33m⚠ PTY not available in browser mode\x1b[0m\r\n");
      }
    });

    return () => {
      window.electronAPI?.pty?.kill(id);
      term.dispose();
      onRefReady(id, null);
    };
  }, [id, projectPath]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: isActive ? "block" : "none",
        padding: "4px 0 4px 12px",
        boxSizing: "border-box"
      }}
      onClick={() => isActive && termRef.current?.focus()}
    />
  );
}

export default function Terminal({ open, height, onDragStart, onClose, projectPath, rightOffset = 52, bottomOffset = 12 }) {
  const [sessions, setSessions] = useState([{ id: "1", title: "bash" }]);
  const [activeId, setActiveId] = useState("1");
  const nextId = useRef(2);
  const xtermRefs = useRef({});

  // Global PTY Event Routing
  useEffect(() => {
    const pty = window.electronAPI?.pty;
    if (!pty) return;

    const handlePtyData = (payload) => {
      const id = payload?.id || "1";
      const data = typeof payload === "string" ? payload : payload.data;
      const ref = xtermRefs.current[id];
      if (ref) ref.term.write(data);
    };

    const handlePtyExit = (payload) => {
      const id = payload?.id || "1";
      const ref = xtermRefs.current[id];
      if (ref) ref.term.write("\r\n\x1b[31m[process exited]\x1b[0m\r\n");
    };

    pty.onData(handlePtyData);
    pty.onExit(handlePtyExit);

    return () => {
      pty.offData();
      pty.offExit();
    };
  }, []);

  // Global Context Bindings
  useEffect(() => {
    // Tell preload which session is active so legacy calls target it
    window.electronAPI?.pty?.setActive?.(activeId);

    // Maintain global __xtermWrite fallback to current active terminal
    window.__xtermWrite = (d) => {
      const ref = xtermRefs.current[activeId];
      if (ref) ref.term.write(d);
    };
  }, [activeId]);

  // Fit on resize or show/activate
  useEffect(() => {
    const fitActive = () => {
      if (!open) return;
      const ref = xtermRefs.current[activeId];
      if (ref) {
        try {
          ref.fitAddon.fit();
          ref.term.focus();
          window.electronAPI?.pty?.resize?.(ref.term.cols, ref.term.rows, activeId);
        } catch (_) {}
      }
    };
    
    const t = setTimeout(fitActive, 50);
    window.addEventListener("resize", fitActive);
    
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", fitActive);
    };
  }, [activeId, open, height]);

  const handleRefReady = useCallback((id, ref) => {
    if (ref) {
      xtermRefs.current[id] = ref;
      if (id === activeId && open) {
        setTimeout(() => { try { ref.fitAddon.fit(); ref.term.focus(); } catch(_) {} }, 50);
      }
    } else {
      delete xtermRefs.current[id];
    }
  }, [activeId, open]);

  const handleAddSession = () => {
    const id = String(nextId.current++);
    setSessions(s => [...s, { id, title: "bash" }]);
    setActiveId(id);
  };

  const handleRemoveSession = (id, e) => {
    e.stopPropagation();
    window.electronAPI?.pty?.kill(id);
    const newSessions = sessions.filter(s => s.id !== id);
    if (newSessions.length === 0) {
      // If closing the last session, just recreate one and close the panel
      setSessions([{ id: String(nextId.current++), title: "bash" }]);
      onClose();
    } else {
      setSessions(newSessions);
      if (activeId === id) setActiveId(newSessions[newSessions.length - 1].id);
    }
  };

  const handleClearActive = () => {
    const ref = xtermRefs.current[activeId];
    if (ref) {
      window.electronAPI?.pty?.kill(activeId);
      window.electronAPI?.pty?.start(projectPath, activeId);
      ref.term.clear();
    }
  };

  return (
    <div style={{
      position: "fixed", left: 12, right: rightOffset, bottom: bottomOffset,
      height: height,
      transform: open ? "translateY(0)" : "translateY(calc(100% + 24px))",
      transition: "transform 0.18s cubic-bezier(0.4,0,0.2,1)",
      background: "rgba(10,12,18,0.98)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 14,
      boxShadow: "0 18px 58px rgba(0,0,0,0.34)",
      display: "flex", flexDirection: "column",
      zIndex: 36,
      overflow: "hidden",
    }}>
      {/* Drag handle */}
      <div
        onMouseDown={onDragStart}
        style={{ height: 3, flexShrink: 0, cursor: "ns-resize", transition: "background 0.15s" }}
        onMouseEnter={(e) => e.currentTarget.style.background = "#7c3aed"}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
      />
      
      {/* Header */}
      <div style={{ height: 36, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 16px", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c3aed", boxShadow: "0 0 8px rgba(124,58,237,0.6)" }} />
          <span style={{ fontSize: 12, color: "#e5e7eb", fontWeight: 600, letterSpacing: 0.3 }}>Terminal</span>
          <span style={{ fontSize: 11, color: "#30363d", margin: "0 4px" }}>|</span>
          <span style={{ fontSize: 11, color: "#6b7280", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projectPath}</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
          <button onClick={handleClearActive} style={hdrBtn} title="Clear terminal"><Trash2 size={13} strokeWidth={1.5} /></button>
          <button onClick={onClose} style={hdrBtn} title="Close Panel"><X size={13} strokeWidth={1.5} /></button>
        </div>
      </div>

      {/* Body: Sidebar + Xterm Area */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        
        {/* Main Xterm Area */}
        <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
          {sessions.map(s => (
            <TermInstance 
              key={s.id} 
              id={s.id} 
              isActive={activeId === s.id} 
              projectPath={projectPath} 
              onRefReady={handleRefReady} 
            />
          ))}
        </div>

        {/* VS Code Style Sidebar */}
        <div style={{ 
          width: 140, flexShrink: 0, borderLeft: "1px solid rgba(255,255,255,0.05)", 
          background: "rgba(255,255,255,0.01)", display: "flex", flexDirection: "column" 
        }}>
          {/* Sidebar Tools */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "4px 8px", borderBottom: "1px solid rgba(255,255,255,0.02)" }}>
            <button onClick={handleAddSession} style={hdrBtn} title="New Terminal">
              <Plus size={14} strokeWidth={2} color="#a78bfa" />
            </button>
          </div>
          {/* Session List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
            {sessions.map(s => {
              const isActive = activeId === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  style={{
                    display: "flex", alignItems: "center", padding: "6px 12px", cursor: "pointer",
                    background: isActive ? "rgba(124, 58, 237, 0.1)" : "transparent",
                    borderLeft: `2px solid ${isActive ? "#7c3aed" : "transparent"}`,
                    transition: "all 0.1s"
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.03)" }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent" }}
                >
                  <TerminalSquare size={13} color={isActive ? "#a78bfa" : "#6b7280"} style={{ marginRight: 8, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: isActive ? "#e5e7eb" : "#8b949e", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.title}
                  </span>
                  <button 
                    onClick={(e) => handleRemoveSession(s.id, e)} 
                    style={{ ...hdrBtn, padding: 2, opacity: isActive ? 1 : 0.4 }} 
                    title="Kill Terminal"
                  >
                    <Trash2 size={12} strokeWidth={1.5} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        
      </div>
    </div>
  );
}

const hdrBtn = {
  background: "none", border: "none", color: "#6b7280",
  cursor: "pointer", padding: "4px", borderRadius: 4,
  display: "flex", alignItems: "center", justifyContent: "center",
  transition: "all 0.15s",
};

