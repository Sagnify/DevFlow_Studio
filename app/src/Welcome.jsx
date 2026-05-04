import React, { useState, useEffect } from "react";
import { FolderOpen, AlertTriangle, MoreHorizontal, Trash2, Plus } from "lucide-react";
import { api } from "./api";

export default function Welcome({ onOpen }) {
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
    width: "100vw", height: "100vh",
    background: "#0f1117",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  card: {
    background: "#1a1d27",
    border: "1px solid #2e303a",
    borderRadius: 12,
    padding: "48px 56px",
    width: 480,
    boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
    textAlign: "center",
  },
  logo: { fontSize: 48, marginBottom: 12 },
  title: { margin: "0 0 8px", fontSize: 28, fontWeight: 600, color: "#f3f4f6", letterSpacing: -0.5 },
  subtitle: { margin: "0 0 36px", fontSize: 14, color: "#6b7280" },
  section: { textAlign: "left", marginBottom: 24 },
  label: { margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 },
  row: { display: "flex", gap: 8 },
  input: {
    flex: 1, padding: "8px 12px", borderRadius: 6,
    border: "1px solid #2e303a", background: "#0f1117",
    color: "#f3f4f6", fontSize: 14, outline: "none",
  },
  btn: {
    padding: "8px 18px", borderRadius: 6, border: "none",
    background: "#7c3aed", color: "#fff", fontSize: 14,
    cursor: "pointer", fontWeight: 500,
    display: "flex", alignItems: "center",
  },
  error: { margin: "6px 0 0", fontSize: 12, color: "#f87171" },
  list: { display: "flex", flexDirection: "column", gap: 4 },
  projectRow: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "10px 12px", borderRadius: 8,
    cursor: "pointer", transition: "background 0.15s",
    background: "#0f1117", border: "1px solid #2e303a",
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
