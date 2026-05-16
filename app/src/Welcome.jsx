import React, { useState, useEffect } from "react";
import { FolderOpen, AlertTriangle, MoreHorizontal, Trash2, Plus, FolderInput } from "lucide-react";
import { api } from "./api";
import { AnimatedBackground, GradientOrb } from "./Backgrounds";

export default function Welcome({ onOpen, onOpenExisting }) {
  const [projects, setProjects] = useState([]);
  const [missingPaths, setMissingPaths] = useState(new Set());
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [hoveredPath, setHoveredPath] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => {
    const list = api.listProjects();
    setProjects(list);
    const missing = new Set(list.filter((p) => !api.pathExists(p.path)).map((p) => p.path));
    setMissingPaths(missing);
  }, []);

  useEffect(() => {
    const close = () => setOpenMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const deleteProject = (e, path) => {
    e.stopPropagation();
    api.deleteProject(path);
    setProjects((prev) => prev.filter((p) => p.path !== path));
    setOpenMenu(null);
  };

  const create = async () => {
    const name = newName.trim();
    if (!name) return setError("Project name cannot be empty.");
    if (projects.find((p) => p.name === name)) return setError("A project with that name already exists.");
    const folderPath = await api.pickFolder();
    if (!folderPath) return;
    const proj = await api.createProject(name, folderPath);
    onOpen(proj);
  };

  return (
    <div style={styles.wrapper}>
      <AnimatedBackground />
      <GradientOrb style={{ top: "-20%", left: "-10%", width: 600, height: 600 }} />
      <GradientOrb style={{ bottom: "-30%", right: "-15%", width: 700, height: 700 }} />
      {/* Window Controls */}
      <div style={{ position: "absolute", top: 16, right: 16, display: 'flex', alignItems: 'center', gap: 10, WebkitAppRegion: 'no-drag', zIndex: 100 }}>
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

      <div style={styles.card}>
        <div style={styles.logo}><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5"><polygon points="12 2 21.39 6.5 21.39 17.5 12 22 2.61 17.5 2.61 6.5"/></svg></div>
        <h1 style={styles.title}>DevFlow Studio</h1>
        <p style={styles.subtitle}>Visual code flow designer for developers</p>

        <div style={styles.section}>
          <p style={styles.label}>New Project</p>
          <div style={styles.row}>
            <input
              style={styles.input}
              placeholder="Project name..."
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
            <button style={styles.btn} onClick={create}><Plus size={14} strokeWidth={2} style={{ marginRight: 4 }} />Create</button>
            <button style={styles.btnSecondary} onClick={async () => {
              const folderPath = await api.pickFolder();
              if (folderPath && onOpenExisting) {
                onOpenExisting(folderPath);
              }
            }}><FolderInput size={14} strokeWidth={2} style={{ marginRight: 4 }} />Open Existing</button>
          </div>
          {error && <p style={styles.error}>{error}</p>}
        </div>

        {projects.length > 0 && (
          <div style={styles.section}>
            <p style={styles.label}>Recent Projects</p>
            <div style={styles.list}>
              {projects.map((p) => {
                const missing = missingPaths.has(p.path);
                return (
                  <div key={p.path}
                    style={{ ...styles.projectRow, opacity: missing ? 0.5 : 1, cursor: missing ? "not-allowed" : "pointer", position: "relative" }}
                    onClick={() => !missing && onOpen(p)}
                    onMouseEnter={() => setHoveredPath(p.path)}
                    onMouseLeave={() => setHoveredPath(null)}>
                    <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                      {missing
                        ? <AlertTriangle size={18} color="#f87171" strokeWidth={1.8} />
                        : <FolderOpen size={18} color="#6b7280" strokeWidth={1.8} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={styles.projectName}>{p.name}</div>
                      <div style={styles.projectDate}>
                        {p.lastOpened
                          ? new Date(p.lastOpened).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                          : ""}
                      </div>
                      <div style={{ ...styles.projectPath, color: missing ? "#f87171" : "#4b5563" }}>
                        {missing ? "Directory not found" : p.path}
                      </div>
                    </div>
                    {hoveredPath === p.path && (
                      <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
                        <button
                          style={styles.menuBtn}
                          onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === p.path ? null : p.path); }}>
                          <MoreHorizontal size={16} color="#6b7280" strokeWidth={1.8} />
                        </button>
                        {openMenu === p.path && (
                          <div style={styles.dropdown}>
                            <div style={styles.dropdownItem} onClick={(e) => deleteProject(e, p.path)}>
                              <Trash2 size={13} strokeWidth={1.8} style={{ marginRight: 6 }} />Remove from list
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {projects.length === 0 && (
          <p style={styles.empty}>No projects yet. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    width: "100%", height: "100vh",
    background: "#0f1117",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxSizing: "border-box", overflow: "hidden",
    WebkitAppRegion: "drag",
  },
  card: {
    background: "rgba(26, 29, 39, 0.7)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    padding: "48px 56px",
    width: 480,
    boxShadow: "0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(124, 58, 237, 0.1)",
    textAlign: "center",
    WebkitAppRegion: "no-drag",
    position: "relative",
    zIndex: 1,
  },
  logo: { 
    fontSize: 48, marginBottom: 20,
    width: 72, height: 72, borderRadius: 20,
    background: "linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(37, 99, 235, 0.1))",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 24px",
    border: "1px solid rgba(124, 58, 237, 0.1)"
  },
  title: { margin: "0 0 8px", fontSize: 28, fontWeight: 600, color: "#f3f4f6", letterSpacing: -0.5 },
  subtitle: { margin: "0 0 36px", fontSize: 14, color: "#6b7280" },
  section: { textAlign: "left", marginBottom: 24 },
  label: { margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 },
  row: { display: "flex", gap: 8 },
  input: {
    flex: 1, padding: "10px 14px", borderRadius: 8,
    border: "1px solid rgba(255, 255, 255, 0.08)", background: "rgba(15, 17, 23, 0.6)",
    color: "#f3f4f6", fontSize: 14, outline: "none",
    transition: "border-color 0.2s"
  },
  btn: {
    padding: "8px 18px", borderRadius: 8, border: "none",
    background: "linear-gradient(135deg, #7c3aed, #2563eb)", color: "#fff", fontSize: 14,
    cursor: "pointer", fontWeight: 500,
    display: "flex", alignItems: "center",
    boxShadow: "0 4px 16px rgba(124, 58, 237, 0.2)",
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  btnSecondary: {
    padding: "8px 18px", borderRadius: 8, border: "1px solid rgba(255, 255, 255, 0.08)",
    background: "rgba(26, 29, 39, 0.5)", color: "#9ca3af", fontSize: 14,
    cursor: "pointer", fontWeight: 500,
    display: "flex", alignItems: "center",
    transition: "all 0.15s",
  },
  error: { margin: "6px 0 0", fontSize: 12, color: "#f87171" },
  list: { 
    display: "flex", flexDirection: "column", gap: 4, 
    maxHeight: "35vh", overflowY: "auto", paddingRight: 4 
  },
  projectRow: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 14px", borderRadius: 10,
    cursor: "pointer", transition: "all 0.2s",
    background: "rgba(15, 17, 23, 0.4)", border: "1px solid rgba(255, 255, 255, 0.03)",
  },
  projectIcon: { fontSize: 20 },
  projectName: { fontSize: 14, color: "#f3f4f6", fontWeight: 500 },
  projectDate: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  projectPath: { fontSize: 11, color: "#4b5563", marginTop: 1 },
  menuBtn: {
    background: "none", border: "none", color: "#6b7280",
    fontSize: 18, cursor: "pointer", padding: "0 4px", lineHeight: 1,
    borderRadius: 4,
  },
  dropdown: {
    position: "absolute", right: 0, top: "100%", marginTop: 4,
    background: "#1a1d27", border: "1px solid #2e303a",
    borderRadius: 6, zIndex: 100, minWidth: 150,
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  },
  dropdownItem: {
    padding: "8px 14px", fontSize: 13, color: "#f87171",
    cursor: "pointer", borderRadius: 6,
    display: "flex", alignItems: "center",
  },
  empty: { fontSize: 13, color: "#4b5563", marginTop: 8 },
};
