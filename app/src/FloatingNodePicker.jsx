import React, { useState, useEffect, useRef } from "react";
import { Search, Globe, GitBranch, Database } from "lucide-react";

const LIBRARY_ITEMS = [
  { category: "General", items: [
    { label: "Endpoint", icon: Globe,      color: "#34d399", desc: "HTTP route handler" },
    { label: "Logic",    icon: GitBranch,  color: "#a78bfa", desc: "Function or control flow" },
    { label: "Database", icon: Database,   color: "#059669", desc: "Data store or schema" },
  ]},
];

const ALL_ITEMS = LIBRARY_ITEMS.flatMap((cat) => cat.items.map((i) => ({ ...i, category: cat.category })));

export default function FloatingNodePicker({ onAdd }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef(null);
  const mousePos = useRef({ x: 0, y: 0 });

  const filtered = ALL_ITEMS.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => setHighlighted(0), [query]);

  useEffect(() => {
    const track = (e) => { mousePos.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", track);
    return () => window.removeEventListener("mousemove", track);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.shiftKey && e.code === "Space") {
        e.preventDefault();
        setPos({ x: mousePos.current.x || window.innerWidth / 2, y: mousePos.current.y || window.innerHeight / 2 });
        setQuery("");
        setVisible(true);
        setTimeout(() => inputRef.current?.focus(), 30);
      }
      if (e.key === "Escape") setVisible(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pick = (label) => { onAdd(label, pos); setVisible(false); setQuery(""); };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    if (e.key === "Enter" && filtered[highlighted]) pick(filtered[highlighted].label);
  };

  if (!visible) return null;

  const W = 260;
  const left = Math.min(pos.x, window.innerWidth - W - 16);
  const top  = Math.min(pos.y, window.innerHeight - 240);

  return (
    <>
      <div onClick={() => setVisible(false)} style={{ position: "fixed", inset: 0, zIndex: 999 }} />
      <div style={{ position: "fixed", left, top, width: W, zIndex: 1000, background: "#111318", border: "1px solid #2e303a", borderRadius: 10, boxShadow: "0 16px 48px rgba(0,0,0,0.6)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid #1e2030" }}>
          <Search size={13} color="#4b5563" strokeWidth={1.8} />
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown}
            placeholder="Search nodes..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#f3f4f6", fontSize: 12 }} />
          <span style={{ fontSize: 10, color: "#374151", background: "#1a1d27", padding: "2px 5px", borderRadius: 4 }}>Shift+Space</span>
        </div>
        <div style={{ padding: "6px" }}>
          {filtered.length === 0 && (
            <div style={{ padding: "16px", textAlign: "center", color: "#4b5563", fontSize: 12 }}>No results</div>
          )}
          {filtered.map((item, idx) => {
            const Icon = item.icon;
            const isHl = idx === highlighted;
            return (
              <div key={item.label} onMouseDown={() => pick(item.label)} onMouseEnter={() => setHighlighted(idx)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 7, cursor: "pointer", background: isHl ? "#1e2030" : "transparent", transition: "background 0.1s" }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: item.color + "18", border: `1px solid ${item.color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={13} color={item.color} strokeWidth={1.8} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: isHl ? "#f3f4f6" : "#d1d5db", fontWeight: 500 }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: "#4b5563" }}>{item.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
