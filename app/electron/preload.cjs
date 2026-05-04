const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs");
const path = require("path");
const os = require("os");

const REGISTRY = path.join(os.homedir(), "DevFlowStudio", "projects.json");
const CONFIG   = path.join(os.homedir(), "DevFlowStudio", "config.json");

function loadConfig() {
  ensureDir(path.join(os.homedir(), "DevFlowStudio"));
  return fs.existsSync(CONFIG) ? JSON.parse(fs.readFileSync(CONFIG, "utf-8")) : {};
}

function saveConfig(data) {
  ensureDir(path.join(os.homedir(), "DevFlowStudio"));
  fs.writeFileSync(CONFIG, JSON.stringify(data, null, 2));
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadRegistry() {
  ensureDir(path.join(os.homedir(), "DevFlowStudio"));
  return fs.existsSync(REGISTRY) ? JSON.parse(fs.readFileSync(REGISTRY, "utf-8")) : [];
}

function saveRegistry(list) {
  fs.writeFileSync(REGISTRY, JSON.stringify(list, null, 2));
}

contextBridge.exposeInMainWorld("electronAPI", {
  readConfig: () => loadConfig(),
  saveConfig: (data) => saveConfig({ ...loadConfig(), ...data }),

  pickFolder: () => ipcRenderer.invoke("pick-folder"),

  listProjects: () => {
    return loadRegistry().sort((a, b) => (b.lastOpened || 0) - (a.lastOpened || 0));
  },

  createProject: (name, folderPath) => {
    const dir = path.join(folderPath, name);
    ensureDir(dir);
    const graphPath = path.join(dir, ".devflow");
    fs.writeFileSync(graphPath, JSON.stringify({ nodes: [], edges: [] }, null, 2));
    const registry = loadRegistry();
    registry.push({ name, path: dir, lastOpened: Date.now() });
    saveRegistry(registry);
    return { name, path: dir };
  },

  openProject: (projectPath) => {
    const registry = loadRegistry();
    const idx = registry.findIndex((p) => p.path === projectPath);
    if (idx !== -1) { registry[idx].lastOpened = Date.now(); saveRegistry(registry); }
    const graphPath = path.join(projectPath, ".devflow");
    return fs.existsSync(graphPath) ? JSON.parse(fs.readFileSync(graphPath, "utf-8")) : { nodes: [], edges: [] };
  },

  saveGraph: (projectPath, data) => {
    ensureDir(projectPath);
    const graphPath = path.join(projectPath, ".devflow");
    const existing = fs.existsSync(graphPath) ? JSON.parse(fs.readFileSync(graphPath, "utf-8")) : {};
    const { projectState, ...graphOnly } = data;
    // Never persist BUILDING state — if app crashes mid-build it would be stuck
    const stateToSave = projectState === 1 ? undefined : projectState;
    const merged = stateToSave !== undefined ? { ...existing, ...graphOnly, projectState: stateToSave } : { ...existing, ...graphOnly };
    fs.writeFileSync(graphPath, JSON.stringify(merged, null, 2));
  },

  saveProjectType: (projectPath, projectType) => {
    const graphPath = path.join(projectPath, ".devflow");
    const data = fs.existsSync(graphPath) ? JSON.parse(fs.readFileSync(graphPath, "utf-8")) : { nodes: [], edges: [] };
    fs.writeFileSync(graphPath, JSON.stringify({ ...data, projectType }, null, 2));
  },

  saveProjectSettings: (projectPath, settings) => {
    const graphPath = path.join(projectPath, ".devflow");
    const data = fs.existsSync(graphPath) ? JSON.parse(fs.readFileSync(graphPath, "utf-8")) : { nodes: [], edges: [] };
    fs.writeFileSync(graphPath, JSON.stringify({ ...data, settings }, null, 2));
  },

  readProjectSettings: (projectPath) => {
    const graphPath = path.join(projectPath, ".devflow");
    if (!fs.existsSync(graphPath)) return null;
    const data = JSON.parse(fs.readFileSync(graphPath, "utf-8"));
    return data.settings || null;
  },

  detectProjectState: (projectPath) => {
    const hasCode = ["app.py", "main.py", "manage.py"].some((f) => fs.existsSync(path.join(projectPath, f)));
    const hasReqs = fs.existsSync(path.join(projectPath, "requirements.txt"));
    if (hasCode && hasReqs) return 2; // READY
    return 0; // EMPTY
  },

  buildProject: (projectPath, framework, graph, settings) =>
    ipcRenderer.invoke("build-project", { projectPath, framework, graph, settings }),

  migrateProject: (projectPath, framework, settings) =>
    ipcRenderer.invoke("migrate-project", { projectPath, framework, settings }),

  onBuildProgress: (cb) => {
    ipcRenderer.removeAllListeners("build-progress");
    ipcRenderer.on("build-progress", (_, data) => cb(data));
  },
  offBuildProgress: () => ipcRenderer.removeAllListeners("build-progress"),
  onBuildOpenTerminal: (cb) => ipcRenderer.on("build-open-terminal", () => cb()),
  offBuildOpenTerminal: () => ipcRenderer.removeAllListeners("build-open-terminal"),

  createFile: () => fs.writeFileSync("test.py", "print('Hello')"),
  pathExists: (p) => fs.existsSync(p),
  readEnv: (projectPath) => {
    const envPath = path.join(projectPath, ".env");
    return fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
  },
  writeEnv: (projectPath, content) => {
    fs.writeFileSync(path.join(projectPath, ".env"), content, "utf-8");
  },
  writeSeedScript: (scriptPath, content) => {
    fs.writeFileSync(scriptPath, content, "utf-8");
  },

  // File Explorer APIs
  readDir: (dirPath) => {
    const walk = (p) => {
      try {
        const entries = fs.readdirSync(p, { withFileTypes: true });
        return entries.map((e) => ({
          name: e.name,
          path: path.join(p, e.name),
          isDir: e.isDirectory(),
          children: e.isDirectory() ? walk(path.join(p, e.name)) : null,
        }));
      } catch { return []; }
    };
    return walk(dirPath);
  },
  deleteFile: (filePath) => {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) fs.rmSync(filePath, { recursive: true, force: true });
    else fs.unlinkSync(filePath);
  },
  renameFile: (oldPath, newPath) => fs.renameSync(oldPath, newPath),
  copyFile: (src, dest) => {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      const copyDir = (s, d) => {
        fs.mkdirSync(d, { recursive: true });
        fs.readdirSync(s).forEach((f) => copyDir(path.join(s, f), path.join(d, f)));
      };
      // fallback for files inside
      const copyRecursive = (s, d) => {
        if (fs.statSync(s).isDirectory()) {
          fs.mkdirSync(d, { recursive: true });
          fs.readdirSync(s).forEach((f) => copyRecursive(path.join(s, f), path.join(d, f)));
        } else { fs.copyFileSync(s, d); }
      };
      copyRecursive(src, dest);
    } else { fs.copyFileSync(src, dest); }
  },
  createFile: (filePath) => fs.writeFileSync(filePath, "", "utf-8"),
  createDir: (dirPath) => fs.mkdirSync(dirPath, { recursive: true }),
  readFile: (filePath) => fs.readFileSync(filePath, "utf-8"),
  writeFile: (filePath, content) => fs.writeFileSync(filePath, content, "utf-8"),
  watchDir: (dirPath, cb) => ipcRenderer.on("fs-change", (_, data) => cb(data)),
  unwatchDir: () => ipcRenderer.removeAllListeners("fs-change"),
  startWatch: (dirPath) => ipcRenderer.send("watch-dir", dirPath),
  stopWatch: () => ipcRenderer.send("unwatch-dir"),

  deleteProject: (projectPath) => {
    const registry = loadRegistry();
    saveRegistry(registry.filter((p) => p.path !== projectPath));
  },

  pty: {
    start: (cwd) => ipcRenderer.send("pty-start", cwd),
    input: (data) => ipcRenderer.send("pty-input", data),
    resize: (cols, rows) => ipcRenderer.send("pty-resize", { cols, rows }),
    kill: () => ipcRenderer.send("pty-kill"),
    onData: (cb) => ipcRenderer.on("pty-data", (_, data) => cb(data)),
    onExit: (cb) => ipcRenderer.on("pty-exit", () => cb()),
    offData: () => ipcRenderer.removeAllListeners("pty-data"),
    offExit: () => ipcRenderer.removeAllListeners("pty-exit"),
  },
});
