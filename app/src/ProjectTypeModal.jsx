import React, { useState } from "react";
import { Layers, Server, Monitor } from "lucide-react";

const OPTIONS = [
  { key: "fullstack", label: "Full Stack", desc: "Frontend + Backend + Database", icon: Layers, color: "#7c3aed" },
  { key: "backend", label: "Backend Only", desc: "APIs, services, databases", icon: Server, color: "#059669" },
  { key: "frontend", label: "Frontend Only", desc: "UI, components, state", icon: Monitor, color: "#0ea5e9" },
];

export default function ProjectTypeModal({ onSelect }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 200,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#111318", border: "1px solid #2e303a",
        borderRadius: 16, padding: "48px 56px", width: 560,
        boxShadow: "0 32px 64px rgba(0,0,0,0.6)",
        textAlign: "center",
      }}>
        <div style={{ fontSize: 11, color: "#4b5563", fontWeight: 600, textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>New Project</div>
        <h2 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 600, color: "#f3f4f6", letterSpacing: -0.5 }}>What are you building?</h2>
        <p style={{ margin: "0 0 36px", fontSize: 13, color: "#4b5563" }}>This helps DevFlow suggest the right nodes and structure.</p>

        <div style={{ display: "flex", gap: 12 }}>
          {OPTIONS.map(({ key, label, desc, icon: Icon, color }) => {
            const isHovered = hovered === key;
            return (
              <div
                key={key}
                onClick={() => onSelect(key)}
                onMouseEnter={() => setHovered(key)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  flex: 1, padding: "20px 16px", borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${isHovered ? color : "#2e303a"}`,
                  background: isHovered ? `${color}11` : "#0f1117",
                  transition: "all 0.15s", textAlign: "center",
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 8, background: isHovered ? `${color}22` : "#1a1d27", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                  <Icon size={18} color={isHovered ? color : "#4b5563"} strokeWidth={1.8} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: isHovered ? "#f3f4f6" : "#9ca3af", marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 11, color: "#4b5563", lineHeight: 1.5 }}>{desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
