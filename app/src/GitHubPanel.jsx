import React, { useState, useEffect } from "react";
import { GitBranch, GitPullRequest, Plus, RefreshCw, Check, AlertCircle, Settings, LogOut, Cloud, CloudOff, ChevronDown, ChevronRight, FileCode, PlusCircle, MinusCircle } from "lucide-react";

function LocalChangesPanel({ projectPath }) {
  const [localChanges, setLocalChanges] = useState([]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!projectPath) return;

    const loadLocalChanges = () => {
      let changes = [];

      if (window.electronAPI?.readConfig) {
        const config = window.electronAPI.readConfig();
        if (config?.localChanges?.[projectPath]) {
          changes = config.localChanges[projectPath];
        }
      }

      const lsKey = `devflow_local_changes_${projectPath.replace(/[\\/]/g, '_')}`;
      const lsChanges = localStorage.getItem(lsKey);
      if (lsChanges && changes.length === 0) {
        try { changes = JSON.parse(lsChanges); } catch {}
      }

      setLocalChanges(changes.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20));
    };

    loadLocalChanges();
  }, [projectPath]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={localStyles.section}>
      <div style={localStyles.sectionHeader} onClick={() => setExpanded(!expanded)}>
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span style={localStyles.sectionTitle}>Local Changes</span>
        <span style={localStyles.badge}>{localChanges.length}</span>
      </div>

      {expanded && (
        <div style={localStyles.sectionContent}>
          {localChanges.length === 0 ? (
            <div style={localStyles.emptyState}>
              No changes recorded yet. Changes will be tracked automatically on build/update.
            </div>
          ) : (
            <div style={localStyles.changesList}>
              {localChanges.map((change, idx) => (
                <div key={idx} style={localStyles.changeItem}>
                  <div style={localStyles.changeHeader}>
                    <span style={localStyles.changeTime}>{formatTime(change.timestamp)}</span>
                    <span style={localStyles.changeType}>{change.message}</span>
                  </div>
                  <div style={localStyles.changeDetails}>
                    {change.diff?.added?.length > 0 && (
                      <div style={localStyles.diffLine}><PlusCircle size={10} color="#34d399" /><span>+{change.diff.added.length}</span></div>
                    )}
                    {change.diff?.modified?.length > 0 && (
                      <div style={localStyles.diffLine}><RefreshCw size={10} color="#d97706" /><span>~{change.diff.modified.length}</span></div>
                    )}
                    {change.diff?.deleted?.length > 0 && (
                      <div style={localStyles.diffLine}><MinusCircle size={10} color="#f87171" /><span>-{change.diff.deleted.length}</span></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GitHubPanel({ projectPath }) {
  const [githubToken, setGithubToken] = useState("");
  const [githubOwner, setGithubOwner] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState("disconnected");
  const [branches, setBranches] = useState([]);
  const [currentBranch, setCurrentBranch] = useState("main");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTokenHelp, setShowTokenHelp] = useState(false);

  useEffect(() => {
    const loadGitHubConfig = async () => {
      if (window.electronAPI?.readConfig) {
        const config = window.electronAPI.readConfig();
        if (config?.githubToken) {
          setGithubToken(config.githubToken);
          setGithubOwner(config.githubOwner || "");
          setGithubRepo(config.githubRepo || "");
          if (config.githubToken && config.githubOwner && config.githubRepo) {
            setIsConnected(true);
            setStatus("connected");
          }
        }
      }
    };
    loadGitHubConfig();
  }, []);

  useEffect(() => {
    if (isConnected && githubToken && githubOwner && githubRepo) {
      fetchBranches();
    }
  }, [isConnected, githubToken, githubOwner, githubRepo]);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/branches`, {
        headers: { Authorization: `token ${githubToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setBranches(data.map(b => b.name));
      }
    } catch (e) {
      console.error("Failed to fetch branches:", e);
    }
    setLoading(false);
  };

  const connectGitHub = async () => {
    if (!githubToken.trim()) {
      setStatus("error");
      return;
    }

    setIsConnecting(true);
    setStatus("connecting");

    try {
      const response = await fetch("https://api.github.com/user", {
        headers: { Authorization: `token ${githubToken}` },
      });

      if (response.ok) {
        const user = await response.json();
        setGithubOwner(user.login);

        const config = { githubToken, githubOwner: user.login, githubRepo: githubRepo || "my-devflow-project" };

        if (window.electronAPI?.saveConfig) {
          window.electronAPI.saveConfig(config);
        }

        setIsConnected(true);
        setStatus("connected");
        setShowSettings(false);
      } else {
        setStatus("error");
      }
    } catch (e) {
      setStatus("error");
    }

    setIsConnecting(false);
  };

  const disconnectGitHub = () => {
    setIsConnected(false);
    setStatus("disconnected");
    setGithubToken("");
    setGithubOwner("");
    setGithubRepo("");

    if (window.electronAPI?.saveConfig) {
      const config = window.electronAPI.readConfig() || {};
      delete config.githubToken;
      delete config.githubOwner;
      delete config.githubRepo;
      window.electronAPI.saveConfig(config);
    }
  };

  // Connect prompt
  if (!isConnected && !showSettings) {
    return (
      <div style={styles.connectPrompt}>
        <LocalChangesPanel projectPath={projectPath} />
        <div style={styles.promptDivider} />

        <div style={{ textAlign: "center", padding: "20px 12px" }}>
          <div style={{ marginBottom: 16 }}>
            <GitBranch size={36} color="#7c3aed" strokeWidth={1.5} />
          </div>
          <h3 style={styles.promptTitle}>Source Control</h3>
          <p style={styles.promptDesc}>
            Connect to GitHub to sync your changes and collaborate with others.
          </p>

          <button style={styles.connectBtn} onClick={() => setShowSettings(true)}>
            <GitBranch size={16} /> Connect Repository
          </button>

          <p style={{ fontSize: 11, color: "#4b5563", marginTop: 16, lineHeight: 1.5 }}>
            Already have a local Git repository? We'll connect to it automatically.
          </p>
        </div>
      </div>
    );
  }

  // Settings panel
  if (showSettings) {
    return (
      <div style={styles.settingsPanel}>
        <LocalChangesPanel projectPath={projectPath} />
        <div style={styles.promptDivider} />

        <div style={styles.settingsHeader}>
          <h3>Connect to GitHub</h3>
          <button onClick={() => setShowSettings(false)} style={styles.closeBtn}>×</button>
        </div>

        <p style={styles.settingsDesc}>
          Enter a Personal Access Token (PAT) to connect to GitHub. This is required for source control features.
        </p>

        <div style={styles.formGroup}>
          <label style={styles.label}>Personal Access Token</label>
          <input
            type="password"
            style={styles.input}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            value={githubToken}
            onChange={(e) => { setGithubToken(e.target.value); setStatus("disconnected"); }}
          />
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Repository Name <span style={{ color: "#4b5563", fontWeight: 400 }}>(optional)</span></label>
          <input
            style={styles.input}
            placeholder="my-project (will be created if doesn't exist)"
            value={githubRepo}
            onChange={(e) => setGithubRepo(e.target.value)}
          />
        </div>

        {status === "error" && (
          <div style={styles.errorBox}>
            <AlertCircle size={14} /> Invalid token. Please check and try again.
          </div>
        )}

        <div style={styles.actions}>
          <button style={styles.connectBtn} onClick={connectGitHub} disabled={isConnecting || !githubToken.trim()}>
            {isConnecting ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Cloud size={14} />}
            {isConnecting ? "Connecting..." : "Connect"}
          </button>
          <button style={styles.cancelBtn} onClick={() => setShowSettings(false)}>Cancel</button>
        </div>

        <div style={styles.helpSection}>
          <button style={styles.helpToggle} onClick={() => setShowTokenHelp(!showTokenHelp)}>
            {showTokenHelp ? "Hide" : "Show"} how to get a token
          </button>
          {showTokenHelp && (
            <div style={styles.helpContent}>
              <ol style={{ paddingLeft: 16, margin: "8px 0", lineHeight: 1.8 }}>
                <li>Go to <strong style={{ color: "#38bdf8" }}>github.com</strong> → Settings → Developer settings</li>
                <li>Click <strong>Personal access tokens</strong> → <strong>Tokens (classic)</strong></li>
                <li>Click <strong>Generate new token</strong></li>
                <li>Select scopes: <code style={{ background: "#0f1117", padding: "2px 6px", borderRadius: 4 }}>repo</code>, <code style={{ background: "#0f1117", padding: "2px 6px", borderRadius: 4 }}>workflow</code></li>
                <li>Copy the generated token and paste it above</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Connected state
  return (
    <div style={styles.panel}>
      <LocalChangesPanel projectPath={projectPath} />
      <div style={styles.promptDivider} />

      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <GitBranch size={18} color="#7c3aed" />
          <span style={styles.headerTitle}>{githubOwner}/{githubRepo}</span>
        </div>
        <button style={styles.settingsIcon} onClick={() => setShowSettings(true)}>
          <Settings size={14} />
        </button>
      </div>

      <div style={styles.branchSection}>
        <div style={styles.branchLabel}><GitBranch size={14} /> Current Branch</div>
        <select style={styles.branchSelect} value={currentBranch} onChange={(e) => setCurrentBranch(e.target.value)}>
          {branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div style={styles.quickActions}>
        <button style={styles.actionBtn}><Plus size={14} /> Commit</button>
        <button style={styles.actionBtn}><GitPullRequest size={14} /> Pull</button>
        <button style={styles.actionBtn}><Cloud size={14} /> Push</button>
      </div>

      <div style={styles.disconnectSection}>
        <button style={styles.disconnectBtn} onClick={disconnectGitHub}><LogOut size={14} /> Disconnect</button>
      </div>
    </div>
  );
}

const localStyles = {
  section: { marginBottom: 8 },
  sectionHeader: { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", cursor: "pointer", borderRadius: 6, background: "#0f1117" },
  sectionTitle: { flex: 1, fontSize: 13, fontWeight: 600, color: "#f3f4f6" },
  badge: { fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#7c3aed33", color: "#c4b5fd", fontWeight: 500 },
  sectionContent: { padding: "8px 0" },
  emptyState: { fontSize: 12, color: "#4b5563", textAlign: "center", padding: "12px 8px", lineHeight: 1.5 },
  changesList: { display: "flex", flexDirection: "column", gap: 8 },
  changeItem: { padding: "10px 12px", background: "#0f1117", borderRadius: 8, border: "1px solid #2e303a" },
  changeHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  changeTime: { fontSize: 11, color: "#4b5563" },
  changeType: { fontSize: 12, color: "#9ca3af", fontWeight: 500 },
  changeDetails: { display: "flex", gap: 12, flexWrap: "wrap" },
  diffLine: { display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#6b7280" },
};

const styles = {
  connectPrompt: { padding: 12 },
  promptDivider: { height: 1, background: "#2e303a", margin: "16px 0" },
  promptTitle: { margin: "0 0 8px", fontSize: 16, fontWeight: 600, color: "#f3f4f6" },
  promptDesc: { margin: "0 0 20px", fontSize: 13, color: "#6b7280", lineHeight: 1.5 },
  connectBtn: { display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #7c3aed, #2563eb)", color: "#fff", fontSize: 14, cursor: "pointer", fontWeight: 500 },
  settingsPanel: { padding: 12 },
  settingsHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  settingsDesc: { fontSize: 12, color: "#6b7280", lineHeight: 1.6, marginBottom: 16 },
  closeBtn: { background: "none", border: "none", color: "#6b7280", fontSize: 20, cursor: "pointer" },
  formGroup: { marginBottom: 14 },
  label: { display: "block", fontSize: 12, fontWeight: 500, color: "#9ca3af", marginBottom: 6 },
  input: { width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #2e303a", background: "#0f1117", color: "#f3f4f6", fontSize: 13, boxSizing: "border-box" },
  errorBox: { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 6, background: "#1f1616", border: "1px solid #dc262644", color: "#f87171", fontSize: 12, marginBottom: 16 },
  actions: { display: "flex", gap: 10, marginTop: 16 },
  cancelBtn: { padding: "10px 16px", borderRadius: 6, border: "1px solid #2e303a", background: "transparent", color: "#6b7280", fontSize: 13, cursor: "pointer" },
  helpSection: { marginTop: 20, borderTop: "1px solid #2e303a", paddingTop: 12 },
  helpToggle: { background: "none", border: "none", color: "#38bdf8", fontSize: 12, cursor: "pointer", padding: 0 },
  helpContent: { marginTop: 10, fontSize: 12, color: "#6b7280" },
  panel: { padding: 12 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#0f1117", borderRadius: 8, marginBottom: 16 },
  headerLeft: { display: "flex", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 13, color: "#f3f4f6", fontWeight: 500 },
  settingsIcon: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: 4 },
  branchSection: { marginBottom: 16 },
  branchLabel: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#6b7280", marginBottom: 8 },
  branchSelect: { width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #2e303a", background: "#0f1117", color: "#f3f4f6", fontSize: 13, boxSizing: "border-box" },
  quickActions: { display: "flex", gap: 8, marginBottom: 16 },
  actionBtn: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px", borderRadius: 6, border: "1px solid #2e303a", background: "#0f1117", color: "#9ca3af", fontSize: 12, cursor: "pointer" },
  disconnectSection: { borderTop: "1px solid #2e303a", paddingTop: 12 },
  disconnectBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "8px 12px", borderRadius: 6, border: "none", background: "transparent", color: "#f87171", fontSize: 12, cursor: "pointer" },
};

export default GitHubPanel;