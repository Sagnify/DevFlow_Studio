import React, { useEffect, useRef, useCallback } from "react";
import { Trash2, X } from "lucide-react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";

export default function Terminal({ open, height, onDragStart, onClose, projectPath, rightOffset = 40, sidebarPanel }) {
  const containerRef = useRef(null);
  const termRef = useRef(null);
  const fitRef = useRef(null);

  const fit = useCallback(() => {
    if (!fitRef.current) return;
    try {
      fitRef.current.fit();
      const pty = window.electronAPI?.pty;
      if (pty && termRef.current) pty.resize(termRef.current.cols, termRef.current.rows);
    } catch (_) {}
  }, []);

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

    // fit after paint
    requestAnimationFrame(() => {
      fitAddon.fit();
      const pty = window.electronAPI?.pty;
      if (pty) {
        pty.offData(); pty.offExit();
        pty.onData((data) => { term.write(data); window.__xtermWrite = (d) => term.write(d); window.dispatchEvent(new CustomEvent("pty-data", { detail: data })); });
        window.__xtermWrite = (d) => term.write(d);
        pty.onExit(() => term.write("\r\n\x1b[31m[process exited]\x1b[0m\r\n"));
        term.onData((data) => pty.input(data));
        pty.start(projectPath);
      } else {
        term.write("\x1b[33m⚠ PTY not available in browser mode\x1b[0m\r\n");
      }
    });

    return () => {
      window.electronAPI?.pty?.offData();
      window.electronAPI?.pty?.offExit();
      window.electronAPI?.pty?.kill();
      term.dispose();
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => { fit(); termRef.current?.focus(); }, 50);
    return () => clearTimeout(t);
  }, [open, height, rightOffset, fit]);

  useEffect(() => {
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit]);

  return (
    <div style={{
      position: "fixed", left: 0, right: rightOffset, bottom: 0,
      height: height,
      transform: open ? "translateY(0)" : "translateY(100%)",
      transition: "transform 0.2s cubic-bezier(0.4,0,0.2,1)",
      background: "#0c0e14",
      borderTop: "1px solid #1e2030",
      display: "flex", flexDirection: "column",
      zIndex: 50,
    }}>
      {/* Drag handle */}
      <div
        onMouseDown={onDragStart}
        style={{ height: 3, flexShrink: 0, cursor: "ns-resize", transition: "background 0.15s" }}
        onMouseEnter={(e) => e.currentTarget.style.background = "#7c3aed"}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
      />
      {/* Header */}
      <div style={{ height: 36, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 16px", gap: 8, borderBottom: "1px solid #1e2030" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7c3aed" }} />
          <span style={{ fontSize: 11, color: "#4b5563", fontWeight: 500, letterSpacing: 0.5 }}>bash</span>
          <span style={{ fontSize: 11, color: "#2e303a" }}>·</span>
          <span style={{ fontSize: 11, color: "#2e303a", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projectPath}</span>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
          <button
            onClick={() => { window.electronAPI?.pty?.kill(); window.electronAPI?.pty?.start(projectPath); termRef.current?.clear(); }}
            style={hdrBtn} title="Clear terminal">
            <Trash2 size={13} strokeWidth={1.5} />
          </button>
          <button onClick={onClose} style={hdrBtn} title="Close">
            <X size={13} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      {/* Xterm */}
      <div
        ref={containerRef}
        onClick={() => termRef.current?.focus()}
        style={{ flex: 1, minHeight: 0, padding: "4px 0" }}
      />
    </div>
  );
}

const hdrBtn = {
  background: "none", border: "none", color: "#6b7280",
  cursor: "pointer", padding: "4px", borderRadius: 4,
  display: "flex", alignItems: "center", justifyContent: "center",
  transition: "color 0.15s",
};
