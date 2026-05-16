import React, { useState, useEffect, useRef, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { File, X, Save, Code2 } from "lucide-react";

const languageMap = {
  py: "python",
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  html: "html",
  css: "css",
  sql: "sql",
  md: "markdown",
  yaml: "yaml",
  yml: "yaml",
  txt: "plaintext",
};

export default function CodeEditor({ visible, onClose, onSave, openFiles = [], selectedFile: propSelectedFile, onFileSelect, onCloseFile }) {
  const [selectedFile, setSelectedFile] = useState(propSelectedFile || null);
  const [fileContents, setFileContents] = useState({});
  const [fileOriginal, setFileOriginal] = useState({});
  const [fileDirty, setFileDirty] = useState({});
  const [hoveredTab, setHoveredTab] = useState(null);
  const [closeHovered, setCloseHovered] = useState(null);
  const editorRef = useRef(null);

  // Sync with props
  useEffect(() => {
    if (propSelectedFile) setSelectedFile(propSelectedFile);
  }, [propSelectedFile]);

  // Load file content when selected
  useEffect(() => {
    if (!selectedFile || !window.electronAPI?.readFile) return;
    if (fileContents[selectedFile.path]) {
      return; // Already loaded
    }
    try {
      const content = window.electronAPI.readFile(selectedFile.path);
      setFileContents(prev => ({ ...prev, [selectedFile.path]: content }));
      setFileOriginal(prev => ({ ...prev, [selectedFile.path]: content }));
      setFileDirty(prev => ({ ...prev, [selectedFile.path]: false }));
    } catch (e) {
      console.error("Failed to read file:", e);
    }
  }, [selectedFile, fileContents]);

  const handleSave = useCallback(() => {
    if (!selectedFile || !window.electronAPI?.writeFile) return;
    try {
      const content = fileContents[selectedFile.path];
      window.electronAPI.writeFile(selectedFile.path, content);
      setFileOriginal(prev => ({ ...prev, [selectedFile.path]: content }));
      setFileDirty(prev => ({ ...prev, [selectedFile.path]: false }));
      if (onSave) onSave(selectedFile.path);
    } catch (e) {
      console.error("Failed to save file:", e);
    }
  }, [selectedFile, fileContents, onSave]);

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  const handleEditorBeforeMount = (monaco) => {
    monaco.editor.defineTheme('devflow-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'c678dd' }, // Vibrant purple
        { token: 'string', foreground: 'a5d6ff' }, // Soft blue
        { token: 'number', foreground: 'd19a66' }, // Orange
        { token: 'type', foreground: '56b6c2' }, // Cyan
        { token: 'function', foreground: '61afef' }, // Blue
        { token: 'variable', foreground: 'e5c07b' }, // Yellow
        { token: 'operator', foreground: '89ddff' }, // Light cyan
      ],
      colors: {
        'editor.background': '#0b0d12',
        'editor.foreground': '#d1d5db',
        'editor.lineHighlightBackground': '#1e203080',
        'editorLineNumber.foreground': '#4b5563',
        'editorLineNumber.activeForeground': '#a78bfa',
        'editorIndentGuide.background': '#1e2030',
        'editorIndentGuide.activeBackground': '#38bdf8',
        'editorSuggestWidget.background': '#111318',
        'editorSuggestWidget.border': '#2e303a',
        'editorSuggestWidget.foreground': '#d1d5db',
        'editorSuggestWidget.selectedBackground': '#7c3aed40',
        'editor.selectionBackground': '#7c3aed40',
        'editorCursor.foreground': '#a78bfa',
        'scrollbarSlider.background': '#2e303a80',
        'scrollbarSlider.hoverBackground': '#4b556380',
        'scrollbarSlider.activeBackground': '#7c3aed80',
      }
    });
  };

  const handleTabSwitch = (file) => {
    setSelectedFile(file);
    if (onFileSelect) onFileSelect(file);
  };

  const handleTabClose = (file, e) => {
    e.stopPropagation();
    onCloseFile?.(file.path);
    if (selectedFile?.path === file.path) {
      const remaining = openFiles.filter(f => f.path !== file.path);
      if (remaining.length > 0) {
        handleTabSwitch(remaining[0]);
      } else {
        setSelectedFile(null);
      }
    }
  };

  const ext = selectedFile?.name?.split(".").pop() || "txt";
  const language = languageMap[ext] || "plaintext";
  const currentContent = selectedFile ? fileContents[selectedFile.path] || "" : "";
  const isDirty = selectedFile ? fileDirty[selectedFile.path] || false : false;

  // Keyboard shortcut for save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (selectedFile && isDirty) {
          handleSave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFile, isDirty, handleSave]);

  if (!visible) return null;

  return (
    <div style={styles.container}>
      {/* Tabs Bar */}
      <div style={styles.tabsBar}>
        {openFiles.length === 0 ? (
          <div style={styles.noTabs}>Workspace is empty</div>
        ) : (
          <>
            {openFiles.map((file) => {
              const isSelected = selectedFile?.path === file.path;
              const isHovered = hoveredTab === file.path;
              const isCloseHovered = closeHovered === file.path;
              const dirty = fileDirty[file.path];
              
              return (
                <div
                  key={file.path}
                  onClick={() => handleTabSwitch(file)}
                  onMouseEnter={() => setHoveredTab(file.path)}
                  onMouseLeave={() => setHoveredTab(null)}
                  style={{
                    ...styles.tab,
                    background: isSelected 
                      ? "linear-gradient(180deg, rgba(124, 58, 237, 0.1) 0%, rgba(124, 58, 237, 0.02) 100%)" 
                      : isHovered 
                        ? "rgba(255,255,255,0.03)" 
                        : "transparent",
                    color: isSelected ? "#f3f4f6" : isHovered ? "#d1d5db" : "#8b949e",
                    borderTop: isSelected ? "1px solid #7c3aed" : "1px solid transparent",
                    borderBottom: isSelected ? "1px solid transparent" : "1px solid rgba(255,255,255,0.03)",
                  }}
                >
                  <File size={13} color={isSelected ? "#a78bfa" : "#6b7280"} strokeWidth={isSelected ? 2 : 1.5} />
                  <span style={{ ...styles.tabName, fontWeight: isSelected ? 500 : 400 }}>{file.name}</span>
                  {dirty && <span style={styles.modifiedDot} />}
                  <button
                    style={{
                      ...styles.closeTabBtn,
                      opacity: isSelected || isHovered ? 1 : 0,
                      color: isCloseHovered ? "#f87171" : "#6b7280",
                      background: isCloseHovered ? "rgba(248, 113, 113, 0.1)" : "transparent"
                    }}
                    onMouseEnter={() => setCloseHovered(file.path)}
                    onMouseLeave={() => setCloseHovered(null)}
                    onClick={(e) => handleTabClose(file, e)}
                    title="Close tab"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}
            <div style={styles.tabsSpacer} />
            {isDirty && (
              <button 
                style={styles.saveBtn} 
                onClick={handleSave} 
                title="Save (Ctrl+S)"
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(52, 211, 153, 0.15)"; e.currentTarget.style.transform = "scale(1.05)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(52, 211, 153, 0.1)"; e.currentTarget.style.transform = "scale(1)"; }}
              >
                <Save size={14} strokeWidth={2.5} />
                <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 4 }}>Save</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Main Editor Area */}
      <div style={styles.editorSection}>
        {selectedFile ? (
          <div style={styles.editorContent}>
            <Editor
              height="100%"
              language={language}
              value={currentContent}
              onChange={(value) => {
                const newContent = value || "";
                setFileContents(prev => ({ ...prev, [selectedFile.path]: newContent }));
                setFileDirty(prev => ({ ...prev, [selectedFile.path]: newContent !== fileOriginal[selectedFile.path] }));
              }}
              onMount={handleEditorMount}
              beforeMount={handleEditorBeforeMount}
              theme="devflow-dark"
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
                minimap: { enabled: true, side: "right", scale: 0.75, renderCharacters: false },
                scrollBeyondLastLine: false,
                wordWrap: "on",
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                renderWhitespace: "none",
                bracketPairColorization: { enabled: true },
                padding: { top: 20, bottom: 20 },
                smoothScrolling: true,
                cursorSmoothCaretAnimation: "on",
                cursorBlinking: "smooth",
                hideCursorInOverviewRuler: true,
                overviewRulerBorder: false,
                showUnused: true,
                fontLigatures: true,
                renderLineHighlight: "all",
                lineNumbersMinChars: 4,
              }}
            />
          </div>
        ) : (
          <div style={styles.emptyState}>
            <div style={styles.emptyGlow} />
            <div style={styles.emptyContent}>
              <div style={styles.emptyIconContainer}>
                <div style={styles.iconCircle}>
                  <Code2 size={36} color="#a78bfa" strokeWidth={1.5} />
                </div>
              </div>
              <h2 style={styles.emptyTitle}>DevFlow Code Editor</h2>
              <p style={styles.emptyDescription}>Select a file from the explorer on the left<br/>to start building.</p>
              
              <div style={styles.shortcutHint}>
                <kbd style={styles.kbd}>Ctrl</kbd> + <kbd style={styles.kbd}>E</kbd> to toggle explorer
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: "absolute",
    inset: 0,
    background: "#0b0d12",
    borderRadius: 14,
    zIndex: 30,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.03)",
  },
  tabsBar: {
    height: 44,
    background: "#0f1117",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    display: "flex",
    alignItems: "flex-end", // Align tabs to the bottom of the bar
    overflowX: "auto",
    overflowY: "hidden",
    padding: "0 8px",
    gap: 2,
    flexShrink: 0,
  },
  noTabs: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    color: "#6b7280",
    height: "100%",
    textTransform: "uppercase",
    letterSpacing: 1,
    fontWeight: 600,
  },
  tab: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    height: 36,
    padding: "0 14px",
    cursor: "pointer",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    fontSize: 12,
    minWidth: "fit-content",
    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    position: "relative",
  },
  tabName: {
    maxWidth: 140,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tabsSpacer: {
    flex: 1,
    minWidth: 16,
  },
  modifiedDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#f59e0b",
    boxShadow: "0 0 6px rgba(245, 158, 11, 0.6)",
    flexShrink: 0,
  },
  closeTabBtn: {
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
    borderRadius: 4,
    transition: "all 0.15s",
    marginLeft: 2,
  },
  editorSection: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "#0b0d12",
    position: "relative",
  },
  saveBtn: {
    height: 28,
    padding: "0 12px",
    background: "rgba(52, 211, 153, 0.1)",
    border: "1px solid rgba(52, 211, 153, 0.2)",
    borderRadius: 6,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#34d399",
    transition: "all 0.2s",
    marginBottom: 8,
    marginRight: 8,
  },
  editorContent: {
    flex: 1,
    overflow: "hidden",
    background: "#0b0d12",
  },
  emptyState: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0b0d12",
    padding: "40px 20px",
    position: "relative",
  },
  emptyGlow: {
    position: "absolute",
    width: 400,
    height: 400,
    background: "radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, rgba(11, 13, 18, 0) 70%)",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
  emptyContent: {
    textAlign: "center",
    maxWidth: 340,
    zIndex: 1,
  },
  emptyIconContainer: {
    marginBottom: 24,
    display: "flex",
    justifyContent: "center",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "rgba(124, 58, 237, 0.05)",
    border: "1px solid rgba(124, 58, 237, 0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 32px rgba(124, 58, 237, 0.1)",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#f3f4f6",
    margin: "0 0 12px 0",
    letterSpacing: "-0.3px",
  },
  emptyDescription: {
    fontSize: 13,
    color: "#9ca3af",
    margin: "0 0 24px 0",
    lineHeight: 1.6,
  },
  shortcutHint: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 12,
    color: "#6b7280",
  },
  kbd: {
    background: "#1e2030",
    border: "1px solid #2e303a",
    borderRadius: 4,
    padding: "2px 6px",
    fontSize: 11,
    color: "#d1d5db",
    fontFamily: "monospace",
    boxShadow: "0 2px 0 rgba(0,0,0,0.2)",
  }
};
