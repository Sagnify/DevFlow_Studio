import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, X, FilePlus, FolderPlus, Pencil, Trash2, Copy, Scissors, Clipboard, FolderTree } from "lucide-react";

// ── File icon colours by extension ──────────────────────────────────────────
const EXT_COLOR = {
  py: "#3b82f6", js: "#f59e0b", jsx: "#38bdf8", ts: "#2563eb", tsx: "#38bdf8",
  json: "#f59e0b", md: "#9ca3af", txt: "#9ca3af", env: "#34d399",
  sql: "#f472b6", html: "#f97316", css: "#a78bfa", sh: "#34d399",
  toml: "#fb923c", cfg: "#9ca3af", ini: "#9ca3af", db: "#059669",
};
const extColor = (name) => EXT_COLOR[name.split(".").pop()?.toLowerCase()] || "#6b7280";

// ── Ignored entries ──────────────────────────────────────────────────────────
const IGNORE = new Set(["__pycache__", ".git", "node_modules", ".devflow"]);

function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// ── Single tree node ─────────────────────────────────────────────────────────
function TreeNode({ node, depth, onCtxMenu, clipboard, onRename, renamingPath, onRenameCommit, onRenameCancel }) {
  const [open, setOpen] = useState(depth === 0);
  const inputRef = useRef(null);
  const isRenaming = renamingPath === node.path;

  useEffect(() => {
    if (isRenaming) setTimeout(() => { inputRef.current?.select(); }, 30);
  }, [isRenaming]);

  const children = node.isDir ? sortEntries((node.children || []).filter((c) => !IGNORE.has(c.name))) : [];

  return (
    <div>
      <div
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onCtxMenu(e, node); }}
        onClick={() => node.isDir && setOpen((o) => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: `2px 8px 2px ${8 + depth * 14}px`,
          cursor: node.isDir ? "pointer" : "default",
          borderRadius: 4, userSelect: "none",
          color: "#d1d5db", fontSize: 12,
          transition: "background 0.1s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
      >
        {/* chevron */}
        <span style={{ width: 12, flexShrink: 0, color: "#4b5563" }}>
          {node.isDir ? (open ? <ChevronDown size={11} strokeWidth={2} /> : <ChevronRight size={11} strokeWidth={2} />) : null}
        </span>
        {/* icon */}
        {node.isDir
          ? (open ? <FolderOpen size={13} color="#f59e0b" strokeWidth={1.8} /> : <Folder size={13} color="#f59e0b" strokeWidth={1.8} />)
          : <File size={13} color={extColor(node.name)} strokeWidth={1.8} />}
        {/* name / rename input */}
        {isRenaming
          ? <input
              ref={inputRef}
              defaultValue={node.name}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") onRenameCommit(node, e.target.value);
                if (e.key === "Escape") onRenameCancel();
              }}
              onBlur={(e) => onRenameCommit(node, e.target.value)}
              style={{ flex: 1, background: "#1e2030", border: "1px solid #7c3aed", borderRadius: 3,
                color: "#f3f4f6", fontSize: 12, padding: "1px 5px", outline: "none" }}
            />
          : <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              opacity: clipboard?.cut && clipboard.node.path === node.path ? 0.4 : 1 }}>
              {node.name}
            </span>
        }
      </div>
      {node.isDir && open && children.map((child) => (
        <TreeNode key={child.path} node={child} depth={depth + 1}
          onCtxMenu={onCtxMenu} clipboard={clipboard}
          onRename={onRename} renamingPath={renamingPath}
          onRenameCommit={onRenameCommit} onRenameCancel={onRenameCancel} />
      ))}
    </div>
  );
}

// ── Context menu ─────────────────────────────────────────────────────────────
function CtxMenu({ x, y, node, onClose, onNewFile, onNewFolder, onRename, onCopy, onCut, onPaste, onDelete, canPaste }) {
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [onClose]);

  const items = [
    { label: "New File", icon: FilePlus, action: onNewFile },
    { label: "New Folder", icon: FolderPlus, action: onNewFolder },
    null,
    { label: "Rename", icon: Pencil, action: onRename },
    { label: "Copy", icon: Copy, action: onCopy },
    { label: "Cut", icon: Scissors, action: onCut },
    { label: "Paste", icon: Clipboard, action: onPaste, disabled: !canPaste },
    null,
    { label: "Delete", icon: Trash2, action: onDelete, danger: true },
  ];

  return (
    <div onMouseDown={(e) => e.stopPropagation()} style={{
      position: "fixed", left: x, top: y, zIndex: 2000,
      background: "rgba(20,22,32,0.97)", backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8,
      padding: 4, minWidth: 180, boxShadow: "0 12px 40px rgba(0,0,0,0.7)",
    }}>
      {items.map((item, i) =>
        item === null
          ? <div key={i} style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "3px 0" }} />
          : (
            <div key={item.label}
              onClick={() => { if (!item.disabled) { item.action(); onClose(); } }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 10px", borderRadius: 5, cursor: item.disabled ? "default" : "pointer",
                color: item.danger ? "#f87171" : item.disabled ? "#374151" : "#d1d5db", fontSize: 12,
              }}
              onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <item.icon size={12} strokeWidth={1.8} />
              {item.label}
            </div>
          )
      )}
    </div>
  );
}

// ── Inline new-name input (for new file/folder) ──────────────────────────────
function NewNameInput({ onCommit, onCancel }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <input ref={ref} placeholder="name..."
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter" && e.target.value.trim()) onCommit(e.target.value.trim());
        if (e.key === "Escape") onCancel();
      }}
      onBlur={(e) => { if (e.target.value.trim()) onCommit(e.target.value.trim()); else onCancel(); }}
      style={{ width: "100%", background: "#1e2030", border: "1px solid #7c3aed", borderRadius: 4,
        color: "#f3f4f6", fontSize: 12, padding: "3px 8px", outline: "none", boxSizing: "border-box" }}
    />
  );
}

// ── Main FileExplorer component ───────────────────────────────────────────────
export default function FileExplorer({ projectPath, visible, onToggle }) {
  const [tree, setTree] = useState([]);
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y, node }
  const [clipboard, setClipboard] = useState(null); // { node, cut }
  const [renamingPath, setRenamingPath] = useState(null);
  const [creating, setCreating] = useState(null); // { parentPath, type: "file"|"folder" }

  const refresh = useCallback(() => {
    if (!projectPath || !window.electronAPI?.readDir) return;
    const entries = window.electronAPI.readDir(projectPath);
    setTree(sortEntries(entries.filter((e) => !IGNORE.has(e.name))));
  }, [projectPath]);

  // Initial load + watch
  useEffect(() => {
    if (!projectPath) return;
    refresh();
    window.electronAPI?.startWatch?.(projectPath);
    window.electronAPI?.watchDir?.(projectPath, () => refresh());
    return () => {
      window.electronAPI?.stopWatch?.();
      window.electronAPI?.unwatchDir?.();
    };
  }, [projectPath, refresh]);

  const rootNode = { name: projectPath?.split(/[\\/]/).pop() || "project", path: projectPath, isDir: true, children: tree };

  // ── Context menu actions ──
  const handleDelete = (node) => {
    try { window.electronAPI?.deleteFile(node.path); refresh(); } catch (_) {}
  };

  const handleRenameCommit = (node, newName) => {
    setRenamingPath(null);
    if (!newName || newName === node.name) return;
    const dir = node.path.substring(0, node.path.length - node.name.length);
    const newPath = dir + newName;
    try { window.electronAPI?.renameFile(node.path, newPath); refresh(); } catch (_) {}
  };

  const handlePaste = (targetNode) => {
    if (!clipboard) return;
    const targetDir = targetNode.isDir ? targetNode.path : targetNode.path.substring(0, targetNode.path.lastIndexOf("\\") || targetNode.path.lastIndexOf("/"));
    const destPath = targetDir + (targetDir.endsWith("\\") || targetDir.endsWith("/") ? "" : "\\") + clipboard.node.name;
    try {
      window.electronAPI?.copyFile(clipboard.node.path, destPath);
      if (clipboard.cut) window.electronAPI?.deleteFile(clipboard.node.path);
      setClipboard(null);
      refresh();
    } catch (_) {}
  };

  const handleCreate = (name) => {
    if (!creating) return;
    const fullPath = creating.parentPath + "\\" + name;
    try {
      if (creating.type === "file") window.electronAPI?.createFile(fullPath);
      else window.electronAPI?.createDir(fullPath);
      refresh();
    } catch (_) {}
    setCreating(null);
  };

  if (!visible) {
    return (
      <button onClick={onToggle} title="File Explorer"
        style={{
          position: "fixed", left: 12, top: "50%", transform: "translateY(-50%)",
          zIndex: 45, width: 32, height: 32, borderRadius: 8,
          background: "rgba(17,19,24,0.85)", backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
        <FolderTree size={15} color="#6b7280" strokeWidth={1.8} />
      </button>
    );
  }

  return (
    <>
      <div style={{
        position: "fixed", left: 12, top: "50%", transform: "translateY(-50%)",
        zIndex: 45, width: 240,
        maxHeight: "calc(100vh - 100px)",
        background: "rgba(13,15,22,0.82)",
        backdropFilter: "blur(20px) saturate(1.4)",
        WebkitBackdropFilter: "blur(20px) saturate(1.4)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 12,
        boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}>
          <FolderTree size={13} color="#7c3aed" strokeWidth={2} />
          <span style={{ flex: 1, fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 0.8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {rootNode.name}
          </span>
          <button onClick={() => setCreating({ parentPath: projectPath, type: "file" })}
            title="New File" style={hdrBtn}><FilePlus size={12} strokeWidth={1.8} /></button>
          <button onClick={() => setCreating({ parentPath: projectPath, type: "folder" })}
            title="New Folder" style={hdrBtn}><FolderPlus size={12} strokeWidth={1.8} /></button>
          <button onClick={onToggle} style={hdrBtn}><X size={12} strokeWidth={1.8} /></button>
        </div>

        {/* New file/folder input */}
        {creating && (
          <div style={{ padding: "6px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <NewNameInput onCommit={handleCreate} onCancel={() => setCreating(null)} />
          </div>
        )}

        {/* Tree */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0 8px" }}>
          {sortEntries(tree).map((node) => (
            <TreeNode key={node.path} node={node} depth={0}
              onCtxMenu={(e, n) => setCtxMenu({ x: e.clientX, y: e.clientY, node: n })}
              clipboard={clipboard}
              renamingPath={renamingPath}
              onRename={(n) => setRenamingPath(n.path)}
              onRenameCommit={handleRenameCommit}
              onRenameCancel={() => setRenamingPath(null)}
            />
          ))}
          {tree.length === 0 && (
            <div style={{ padding: "16px 12px", textAlign: "center", color: "#374151", fontSize: 11 }}>
              No files yet
            </div>
          )}
        </div>
      </div>

      {ctxMenu && (
        <CtxMenu
          x={ctxMenu.x} y={ctxMenu.y} node={ctxMenu.node}
          onClose={() => setCtxMenu(null)}
          onNewFile={() => setCreating({ parentPath: ctxMenu.node.isDir ? ctxMenu.node.path : projectPath, type: "file" })}
          onNewFolder={() => setCreating({ parentPath: ctxMenu.node.isDir ? ctxMenu.node.path : projectPath, type: "folder" })}
          onRename={() => setRenamingPath(ctxMenu.node.path)}
          onCopy={() => setClipboard({ node: ctxMenu.node, cut: false })}
          onCut={() => setClipboard({ node: ctxMenu.node, cut: true })}
          onPaste={() => handlePaste(ctxMenu.node)}
          onDelete={() => handleDelete(ctxMenu.node)}
          canPaste={!!clipboard}
        />
      )}
    </>
  );
}

const hdrBtn = {
  background: "none", border: "none", cursor: "pointer", padding: 3,
  display: "flex", alignItems: "center", justifyContent: "center",
  color: "#4b5563", borderRadius: 4, transition: "color 0.15s",
};
