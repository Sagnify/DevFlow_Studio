const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const pty  = require("node-pty");
const fs   = require("fs");
const os   = require("os");
const { autoFix } = require("./buildfix.cjs");

const isDev = process.env.NODE_ENV === "development";

let mainWindow = null;
let ptyProcess = null;
let buildProcess = null;
let fsWatcher = null;

function patchFlaskMigrateEnvPy(projectPath, send) {
  const envPyPath = path.join(projectPath, "migrations", "env.py");
  if (!fs.existsSync(envPyPath)) return;

  let content = fs.readFileSync(envPyPath, "utf-8");
  const original = content;

  // Avoid passing render_as_batch both explicitly and through **conf_args.
  content = content.replace(/\r?\n\s*render_as_batch=True,/g, "");

  const confArgsLine = "conf_args = current_app.extensions['migrate'].configure_args";
  if (!content.includes('conf_args.setdefault("render_as_batch", True)')) {
    content = content.replace(
      confArgsLine,
      `${confArgsLine}\n    conf_args.setdefault("render_as_batch", True)`
    );
  }

  if (content !== original) {
    fs.writeFileSync(envPyPath, content, "utf-8");
    send("log", "  ✓ Patched env.py for SQLite batch mode");
  }
}

ipcMain.handle("pick-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory", "createDirectory"],
    title: "Choose project location",
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("build-project", async (_, { projectPath, framework, graph, settings }) => {
  const allLogs = [];
  const send = (type, data) => {
    mainWindow?.webContents.send("build-progress", { type, data });
    if (type === "log" || type === "error") allLogs.push(data);
  };

  try {
    // Always reload codegen fresh
    const codegenPath = require.resolve("./codegen.cjs");
    delete require.cache[codegenPath];
    const { generate } = require("./codegen.cjs");

    // ── Step 1: Analyse graph ──────────────────────────────────────────────
    send("step", "Analysing graph...");
    const endpointNodes = (graph?.nodes || []).filter((n) => n.type === "endpoint");
    const logicNodes    = (graph?.nodes || []).filter((n) => n.type === "logic");
    const dbNodes       = (graph?.nodes || []).filter((n) => n.type === "db");
    send("log", `  ${graph?.nodes?.length ?? 0} nodes  •  ${endpointNodes.length} endpoint(s)  •  ${logicNodes.length} logic  •  ${dbNodes.length} DB`);
    send("log", `  Framework: ${framework}  •  DB: ${settings?.database || "sqlite"}  •  ORM: ${settings?.orm || "none"}`);

    // ── Step 2: Generate code ──────────────────────────────────────────────
    send("step", "Generating project files...");
    const files = generate(graph, settings || { framework, orm: "None" });
    if (!Object.keys(files).length) {
      send("error", `Code generation for ${framework} is not yet supported.`);
      return { ok: false };
    }

    // ── Step 3: Write files ────────────────────────────────────────────────
    send("step", "Writing project files...");
    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(projectPath, filename);
      const fileDir  = path.dirname(filePath);
      if (!fs.existsSync(fileDir)) fs.mkdirSync(fileDir, { recursive: true });
      const existed = fs.existsSync(filePath);
      fs.writeFileSync(filePath, content, "utf-8");
      send("log", `  ${existed ? "↺ Rewrote" : "✎ Created"}  ${filename}`);
    }

    send("step", "Installing dependencies...");
    await new Promise((resolve, reject) => {
      if (buildProcess) { buildProcess.kill(); buildProcess = null; }
      const bShell = os.platform() === "win32" ? "cmd.exe" : (process.env.SHELL || "bash");
      const bArgs  = os.platform() === "win32" ? ["/c", "pip install -r requirements.txt"] : ["-c", "pip install -r requirements.txt"];
      buildProcess = pty.spawn(bShell, bArgs, { name: "xterm-color", cols: 120, rows: 30, cwd: projectPath, env: process.env, useConpty: false });
      buildProcess.onData((data) => {
        const clean = data.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "").replace(/\x1b\][^\x07]*\x07/g, "").replace(/[\x00-\x09\x0b-\x1f\x7f]/g, "").trim();
        if (clean) send("log", `  ${clean}`);
      });
      buildProcess.onExit(({ exitCode }) => {
        buildProcess = null;
        exitCode === 0 ? resolve() : reject(new Error(`pip install failed (exit ${exitCode})`));
      });
    });
    send("log", "  ✓ Dependencies ready");

    // ── Step 5: Database migrations ───────────────────────────────────────
    if (framework === "Django") {
      send("step", "Running database migrations...");
      const djangoEnv = { ...process.env };
      const envFile = path.join(projectPath, ".env");
      if (fs.existsSync(envFile)) {
        fs.readFileSync(envFile, "utf-8").split("\n").forEach((line) => {
          const eq = line.indexOf("=");
          if (eq > 0 && !line.startsWith("#")) djangoEnv[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
        });
      }
      await new Promise((resolve, reject) => {
        const bShell = os.platform() === "win32" ? "cmd.exe" : (process.env.SHELL || "bash");
        const bArgs  = os.platform() === "win32" ? ["/c", "python manage.py makemigrations && python manage.py migrate"] : ["-c", "python manage.py makemigrations && python manage.py migrate"];
        const proc = pty.spawn(bShell, bArgs, { cwd: projectPath, env: djangoEnv, cols: 120, rows: 30, useConpty: false });
        proc.onData((d) => { const clean = d.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "").replace(/\x1b\][^\x07]*\x07/g, "").replace(/[\x00-\x09\x0b-\x1f\x7f]/g, "").trim(); if (clean) send("log", `  ${clean}`); });
        proc.onExit(({ exitCode }) => exitCode === 0 ? resolve() : reject(new Error("Django migrate failed")));
      });
      send("log", "  ✓ Migrations applied");
    }

    if (framework === "Flask" && settings?.orm === "SQLAlchemy") {
      send("step", "Setting up database migrations...");
      const envFile = path.join(projectPath, ".env");
      const envVars = { ...process.env, FLASK_APP: "app.py" };
      if (fs.existsSync(envFile)) {
        fs.readFileSync(envFile, "utf-8").split("\n").forEach((line) => {
          const eq = line.indexOf("=");
          if (eq > 0 && !line.startsWith("#")) envVars[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
        });
      }
      if (!envVars.DATABASE_URL && settings?.database === "sqlite")
        envVars.DATABASE_URL = `sqlite:///${path.join(projectPath, "app.db")}`;

      const runMigrateCmd = async (cmd) => new Promise((resolve, reject) => {
        const bShell = os.platform() === "win32" ? "cmd.exe" : (process.env.SHELL || "bash");
        const bArgs  = os.platform() === "win32" ? ["/c", cmd] : ["-c", cmd];
        const proc = pty.spawn(bShell, bArgs, { cwd: projectPath, env: envVars, cols: 120, rows: 30, useConpty: false });
        proc.onData((d) => { const clean = d.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "").replace(/\x1b\][^\x07]*\x07/g, "").replace(/[\x00-\x09\x0b-\x1f\x7f]/g, "").trim(); if (clean) send("log", `  ${clean}`); });
        proc.onExit(({ exitCode }) => exitCode === 0 ? resolve() : reject(new Error(`Migration command failed: ${cmd} (exit ${exitCode})`)));
      });

      const migrationsDir = path.join(projectPath, "migrations");
      const versionsDir   = path.join(migrationsDir, "versions");

      if (fs.existsSync(versionsDir)) {
        const old = fs.readdirSync(versionsDir).filter((f) => f.endsWith(".py"));
        old.forEach((f) => fs.unlinkSync(path.join(versionsDir, f)));
        if (old.length) send("log", `  ✗ Cleared ${old.length} stale migration file(s)`);
      }

      if (!fs.existsSync(migrationsDir)) {
        send("log", "  Initialising migrations folder...");
        await runMigrateCmd("flask db init");
        send("log", "  ✓ Migrations folder created");
      }

      patchFlaskMigrateEnvPy(projectPath, send);

      const envPyPath = path.join(migrationsDir, "env.py");
      if (fs.existsSync(envPyPath)) {
        let envPyContent = fs.readFileSync(envPyPath, "utf-8");
        if (!envPyContent.includes("render_as_batch")) {
          envPyContent = envPyContent.replace(
            "target_metadata=get_metadata(),",
            "target_metadata=get_metadata(),\n            render_as_batch=True,"
          );
          fs.writeFileSync(envPyPath, envPyContent, "utf-8");
          send("log", "  ✓ Patched env.py for SQLite batch mode");
        }
      }

      send("log", "  Resetting migration state...");
      await runMigrateCmd("flask db stamp base --purge");
      send("log", "  Generating migration from models...");
      await runMigrateCmd('flask db migrate -m "initial"');
      send("log", "  Applying migration to database...");
      await runMigrateCmd("flask db upgrade");
      send("log", "  ✓ Database schema up to date");
    }

    send("state", "READY");
    send("done", "✓ Build complete! Your project is ready.");
    return { ok: true };
  } catch (err) {
    send("error", err.message);
    // Attempt auto-fix based on collected logs
    send("log", "");
    send("log", "⚡ Attempting auto-fix...");
    const fixed = await autoFix({ logs: allLogs, projectPath, framework, settings, send });
    if (fixed) {
      send("state", "READY");
      send("done", "✓ Build complete after auto-fix!");
      return { ok: true };
    }
    send("error", "Auto-fix could not resolve the issue. Check the logs above.");
    return { ok: false, error: err.message };
  }
});

ipcMain.handle("migrate-project", async (_, { projectPath, framework, settings }) => {
  const allLogs = [];
  const send = (type, data) => {
    mainWindow?.webContents.send("build-progress", { type, data });
    if (type === "log" || type === "error") allLogs.push(data);
  };
  const isWin = os.platform() === "win32";
  const shell = isWin ? "cmd.exe" : (process.env.SHELL || "bash");

  try {
    send("step", `Running migrations for ${framework}...`);

    const envFile = path.join(projectPath, ".env");
    const envVars = { ...process.env, FLASK_APP: "app.py" };
    if (fs.existsSync(envFile)) {
      fs.readFileSync(envFile, "utf-8").split("\n").forEach((line) => {
        const eq = line.indexOf("=");
        if (eq > 0 && !line.startsWith("#")) envVars[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
      });
    }
    if (!envVars.DATABASE_URL && settings?.database === "sqlite")
      envVars.DATABASE_URL = `sqlite:///${path.join(projectPath, "app.db")}`;

    const runCmd = (cmd, cwd) => new Promise((resolve, reject) => {
      const args = isWin ? ["/c", cmd] : ["-c", cmd];
      const proc = pty.spawn(shell, args, { cwd, env: envVars, cols: 120, rows: 30, useConpty: false });
      proc.onData((d) => {
        const clean = d.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "").replace(/\x1b\][^\x07]*\x07/g, "").replace(/[\x00-\x09\x0b-\x1f\x7f]/g, "").trim();
        if (clean) send("log", `  ${clean}`);
      });
      proc.onExit(({ exitCode }) => exitCode === 0 ? resolve() : reject(new Error(`Command failed: ${cmd} (exit ${exitCode})`)));
    });

    if (framework === "Flask") {
      const migrationsDir = path.join(projectPath, "migrations");
      if (!fs.existsSync(migrationsDir)) {
        send("log", "  Initialising migrations folder...");
        await runCmd("flask db init", projectPath);
        send("log", "  ✓ Migrations folder created");
      }
      send("log", "  Generating migration from models...");
      await runCmd("flask db migrate -m \"auto\"", projectPath);
      send("log", "  Applying migration to database...");
      await runCmd("flask db upgrade", projectPath);
      send("log", "  ✓ Database schema up to date");
    }

    if (framework === "FastAPI") {
      const alembicIni = path.join(projectPath, "alembic.ini");
      if (!fs.existsSync(alembicIni)) {
        send("log", "  Initialising Alembic...");
        await runCmd("alembic init migrations", projectPath);
        const envPy = path.join(projectPath, "migrations", "env.py");
        if (fs.existsSync(envPy)) {
          let envContent = fs.readFileSync(envPy, "utf-8");
          envContent = "import os\nfrom models import Base\n" + envContent;
          envContent = envContent.replace("target_metadata = None", "target_metadata = Base.metadata");
          envContent = envContent.replace(/config\.get_main_option\("sqlalchemy\.url"\)/g, `os.getenv("DATABASE_URL", config.get_main_option("sqlalchemy.url"))`);
          fs.writeFileSync(envPy, envContent, "utf-8");
          send("log", "  ✓ Patched alembic env.py");
        }
      }
      send("log", "  Generating migration...");
      await runCmd("alembic revision --autogenerate -m \"auto\"", projectPath);
      send("log", "  Applying migration...");
      await runCmd("alembic upgrade head", projectPath);
      send("log", "  ✓ Database schema up to date");
    }

    if (framework === "Django") {
      send("log", "  Running makemigrations...");
      await runCmd("python manage.py makemigrations", projectPath);
      send("log", "  Applying migrations...");
      await runCmd("python manage.py migrate", projectPath);
      send("log", "  ✓ Database schema up to date");
    }

    send("state", "READY");
    send("done", "✓ Migration complete!");
    return { ok: true };
  } catch (err) {
    send("error", err.message);
    send("log", "");
    send("log", "⚡ Attempting auto-fix...");
    const fixed = await autoFix({ logs: allLogs, projectPath, framework, settings, send });
    if (fixed) {
      send("state", "READY");
      send("done", "✓ Migration complete after auto-fix!");
      return { ok: true };
    }
    send("error", "Auto-fix could not resolve the issue. Check the logs above.");
    return { ok: false, error: err.message };
  }
});

ipcMain.on("watch-dir", (_, dirPath) => {
  if (fsWatcher) { fsWatcher.close(); fsWatcher = null; }
  try {
    fsWatcher = fs.watch(dirPath, { recursive: true }, (event, filename) => {
      mainWindow?.webContents.send("fs-change", { event, filename });
    });
  } catch (_) {}
});

ipcMain.on("unwatch-dir", () => {
  if (fsWatcher) { fsWatcher.close(); fsWatcher = null; }
});

ipcMain.on("pty-start", (_, cwd) => {
  if (ptyProcess) { ptyProcess.kill(); ptyProcess = null; }
  const shell = os.platform() === "win32" ? "cmd.exe" : (process.env.SHELL || "bash");
  ptyProcess = pty.spawn(shell, [], {
    name: "xterm-color",
    cols: 80, rows: 24,
    cwd: cwd || os.homedir(),
    env: process.env,
    useConpty: false,
  });
  ptyProcess.onData((data) => mainWindow?.webContents.send("pty-data", data));
  ptyProcess.onExit(() => mainWindow?.webContents.send("pty-exit"));
});

ipcMain.on("pty-input", (_, data) => ptyProcess?.write(data));

ipcMain.on("pty-resize", (_, { cols, rows }) => ptyProcess?.resize(cols, rows));

ipcMain.on("pty-kill", () => { ptyProcess?.kill(); ptyProcess = null; });

function createWindow() {
  const preloadPath = path.join(__dirname, "preload.cjs");
  console.log("[preload path]", preloadPath);
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: preloadPath,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else mainWindow?.focus();
});
