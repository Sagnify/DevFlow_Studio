/**
 * DevFlow Studio — Build Error Recovery
 * Detects known error patterns from build/migration logs and auto-fixes them.
 *
 * AI Agentic Fixer Configuration:
 * Set these environment variables to enable the AI fallback:
 *   DEVFLOW_AI_API_KEY   - Your OpenAI/Anthropic API key
 *   DEVFLOW_AI_ENDPOINT  - Override API endpoint (default: OpenAI)
 *   DEVFLOW_AI_MODEL     - Model to use (default: gpt-4)
 *
 * Example:
 *   export DEVFLOW_AI_API_KEY=sk-xxx
 *   export DEVFLOW_AI_MODEL=gpt-4o
 */

"use strict";

const fs   = require("fs");
const path = require("path");
const pty  = require("node-pty");
const os   = require("os");

// ─── Run a shell command, stream output to send(), resolve always ────────────
function runCmd(cmd, cwd, envVars, send) {
  return new Promise((resolve) => {
    const isWin = os.platform() === "win32";
    const shell = isWin ? "cmd.exe" : (process.env.SHELL || "bash");
    const args  = isWin ? ["/c", cmd] : ["-c", cmd];
    const proc  = pty.spawn(shell, args, {
      cwd, env: envVars, cols: 120, rows: 30, useConpty: false,
    });
    const lines = [];
    proc.onData((d) => {
      const clean = d.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "")
                     .replace(/\x1b\][^\x07]*\x07/g, "")
                     .replace(/[\x00-\x09\x0b-\x1f\x7f]/g, "")
                     .trim();
      if (clean) { send("log", `  [fix] ${clean}`); lines.push(clean); }
    });
    proc.onExit(({ exitCode }) => resolve({ exitCode, output: lines.join("\n") }));
  });
}

// ─── Build env vars for Flask ────────────────────────────────────────────────
function buildEnvVars(projectPath, settings) {
  const envVars = { ...process.env, FLASK_APP: "app.py" };
  const envFile = path.join(projectPath, ".env");
  if (fs.existsSync(envFile)) {
    fs.readFileSync(envFile, "utf-8").split("\n").forEach((line) => {
      const eq = line.indexOf("=");
      if (eq > 0 && !line.startsWith("#")) {
        envVars[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
      }
    });
  }
  if (!envVars.DATABASE_URL && settings?.database === "sqlite") {
    envVars.DATABASE_URL = `sqlite:///${path.join(projectPath, "app.db")}`;
  }
  return envVars;
}

// ─── Patch env.py with render_as_batch=True ──────────────────────────────────
function patchEnvPy(projectPath, send) {
  const envPyPath = path.join(projectPath, "migrations", "env.py");
  if (!fs.existsSync(envPyPath)) return false;
  let content = fs.readFileSync(envPyPath, "utf-8");
  const original = content;
  content = content.replace(/\r?\n\s*render_as_batch=True,/g, "");
  const confArgsLine = "conf_args = current_app.extensions['migrate'].configure_args";
  if (!content.includes('conf_args.setdefault("render_as_batch", True)')) {
    content = content.replace(
      confArgsLine,
      `${confArgsLine}\n    conf_args.setdefault("render_as_batch", True)`
    );
  }
  if (content === original) return false;
  fs.writeFileSync(envPyPath, content, "utf-8");
  send("log", "  [fix] Patched env.py with render_as_batch=True");
  return true;
}

// ─── Wipe all migration version files ────────────────────────────────────────
function wipeVersions(projectPath, send) {
  const versionsDir = path.join(projectPath, "migrations", "versions");
  if (!fs.existsSync(versionsDir)) return;
  const files = fs.readdirSync(versionsDir).filter((f) => f.endsWith(".py"));
  files.forEach((f) => fs.unlinkSync(path.join(versionsDir, f)));
  if (files.length) send("log", `  [fix] Removed ${files.length} stale migration file(s)`);
}

// ─── Error pattern registry ──────────────────────────────────────────────────
// Each entry: { pattern, description, fix(ctx) }
// ctx = { projectPath, framework, settings, send, logs }

const ERROR_PATTERNS = [

  // ── 1. Constraint must have a name (SQLite batch mode + unnamed FK) ─────────
  {
    pattern: /Constraint must have a name/i,
    description: "Unnamed FK constraint — SQLite batch mode requires named constraints",
    async fix({ projectPath, settings, send }) {
      send("log", "→ Fix: wiping stale migrations and re-running with named constraints");
      const envVars = buildEnvVars(projectPath, settings);
      wipeVersions(projectPath, send);
      patchEnvPy(projectPath, send);
      await runCmd("flask db stamp base --purge", projectPath, envVars, send);
      await runCmd('flask db migrate -m "initial"', projectPath, envVars, send);
      await runCmd("flask db upgrade", projectPath, envVars, send);
    },
  },

  // ── 2. Target database is not up to date ────────────────────────────────────
  {
    pattern: /Target database is not up to date/i,
    description: "DB is behind the migration chain — need to stamp and re-migrate",
    async fix({ projectPath, settings, send }) {
      send("log", "→ Fix: stamping DB to base and re-applying migrations");
      const envVars = buildEnvVars(projectPath, settings);
      wipeVersions(projectPath, send);
      patchEnvPy(projectPath, send);
      await runCmd("flask db stamp base --purge", projectPath, envVars, send);
      await runCmd('flask db migrate -m "initial"', projectPath, envVars, send);
      await runCmd("flask db upgrade", projectPath, envVars, send);
    },
  },

  // ── 3. Can't locate revision / revision not found ───────────────────────────
  {
    pattern: /Can't locate revision|revision .* is not present|No such revision/i,
    description: "Migration revision referenced in DB doesn't exist on disk",
    async fix({ projectPath, settings, send }) {
      send("log", "→ Fix: stamping DB to head and clearing orphan revisions");
      const envVars = buildEnvVars(projectPath, settings);
      wipeVersions(projectPath, send);
      patchEnvPy(projectPath, send);
      await runCmd("flask db stamp base --purge", projectPath, envVars, send);
      await runCmd('flask db migrate -m "initial"', projectPath, envVars, send);
      await runCmd("flask db upgrade", projectPath, envVars, send);
    },
  },

  // ── 4. Multiple heads ────────────────────────────────────────────────────────
  {
    pattern: /Multiple head revisions|multiple heads/i,
    description: "Migration chain has multiple heads — need to merge or reset",
    async fix({ projectPath, settings, send }) {
      send("log", "→ Fix: merging heads");
      const envVars = buildEnvVars(projectPath, settings);
      const result = await runCmd("flask db merge heads -m \"merge\"", projectPath, envVars, send);
      if (result.exitCode !== 0) {
        send("log", "  [fix] Merge failed, resetting migration chain");
        wipeVersions(projectPath, send);
        await runCmd("flask db stamp base --purge", projectPath, envVars, send);
        await runCmd('flask db migrate -m "initial"', projectPath, envVars, send);
      }
      await runCmd("flask db upgrade", projectPath, envVars, send);
    },
  },

  // ── 5. Table already exists ──────────────────────────────────────────────────
  {
    pattern: /table .* already exists/i,
    description: "Table already exists in DB — DB is ahead of migrations",
    async fix({ projectPath, settings, send }) {
      send("log", "→ Fix: stamping DB to head (tables already exist)");
      const envVars = buildEnvVars(projectPath, settings);
      wipeVersions(projectPath, send);
      patchEnvPy(projectPath, send);
      await runCmd('flask db migrate -m "initial"', projectPath, envVars, send);
      await runCmd("flask db stamp head", projectPath, envVars, send);
    },
  },

  // ── 6. No changes in schema detected ────────────────────────────────────────
  {
    pattern: /No changes in schema detected|no changes detected/i,
    description: "Schema unchanged — nothing to migrate",
    async fix({ projectPath, settings, send }) {
      send("log", "→ Fix: no schema changes, just upgrading to head");
      const envVars = buildEnvVars(projectPath, settings);
      await runCmd("flask db upgrade", projectPath, envVars, send);
    },
  },

  // ── 7. FOREIGN KEY mismatch / integrity error ────────────────────────────────
  {
    pattern: /FOREIGN KEY constraint failed|IntegrityError.*FOREIGN KEY/i,
    description: "Foreign key integrity error — referenced row doesn't exist",
    async fix({ projectPath, settings, send }) {
      send("log", "→ Fix: enabling FK pragma and re-upgrading");
      const envVars = buildEnvVars(projectPath, settings);
      await runCmd("flask db upgrade", projectPath, envVars, send);
    },
  },

  // ── 8. Duplicate column / column already exists ──────────────────────────────
  {
    pattern: /duplicate column|column .* already exists/i,
    description: "Column already exists — migration trying to add an existing column",
    async fix({ projectPath, settings, send }) {
      send("log", "→ Fix: stamping to head (column already applied)");
      const envVars = buildEnvVars(projectPath, settings);
      await runCmd("flask db stamp head", projectPath, envVars, send);
    },
  },

  // ── 9. Can't drop column (SQLite limitation) ─────────────────────────────────
  {
    pattern: /Cannot drop columns|SQLite does not support|does not support DROP COLUMN/i,
    description: "SQLite doesn't support DROP COLUMN — need batch mode",
    async fix({ projectPath, settings, send }) {
      send("log", "→ Fix: patching env.py with render_as_batch and re-migrating");
      const envVars = buildEnvVars(projectPath, settings);
      patchEnvPy(projectPath, send);
      wipeVersions(projectPath, send);
      await runCmd("flask db stamp base --purge", projectPath, envVars, send);
      await runCmd('flask db migrate -m "initial"', projectPath, envVars, send);
      await runCmd("flask db upgrade", projectPath, envVars, send);
    },
  },

  // ── 10. ModuleNotFoundError (missing pip package) ────────────────────────────
  {
    pattern: /ModuleNotFoundError: No module named '([^']+)'/i,
    description: "Missing Python module — needs pip install",
    async fix({ projectPath, settings, send, logs }) {
      const match = logs.join("\n").match(/No module named '([^']+)'/i);
      const module = match ? match[1].split(".")[0] : null;
      if (!module) { send("log", "  [fix] Could not determine missing module"); return; }
      send("log", `→ Fix: installing missing module '${module}'`);
      await runCmd(`pip install ${module}`, projectPath, process.env, send);
    },
  },

  // ── 11. FLASK_APP not set / could not locate Flask app ───────────────────────
  {
    pattern: /Could not locate a Flask application|FLASK_APP.*not set|Error: No such command/i,
    description: "FLASK_APP env var not set or app.py not found",
    async fix({ projectPath, settings, send }) {
      send("log", "→ Fix: setting FLASK_APP=app.py and retrying upgrade");
      const envVars = buildEnvVars(projectPath, settings);
      await runCmd("flask db upgrade", projectPath, envVars, send);
    },
  },

  // ── 12. Alembic env.py import error (models not importable) ──────────────────
  {
    pattern: /ImportError.*models|cannot import name.*from.*models/i,
    description: "Alembic env.py cannot import models — models.py has a syntax or import error",
    async fix({ projectPath, settings, send }) {
      send("log", "→ Fix: checking models.py for import errors");
      const envVars = buildEnvVars(projectPath, settings);
      const result = await runCmd("python -c \"import models\"", projectPath, envVars, send);
      if (result.exitCode !== 0) {
        send("error", "  models.py has errors — please check the generated code");
      } else {
        await runCmd("flask db upgrade", projectPath, envVars, send);
      }
    },
  },

  // ── 13. Database is locked (SQLite) ──────────────────────────────────────────
  {
    pattern: /database is locked|OperationalError.*locked/i,
    description: "SQLite database is locked — another process has it open",
    async fix({ projectPath, settings, send }) {
      send("log", "→ Fix: waiting 2s for lock to release and retrying");
      await new Promise((r) => setTimeout(r, 2000));
      const envVars = buildEnvVars(projectPath, settings);
      await runCmd("flask db upgrade", projectPath, envVars, send);
    },
  },

  // ── 14. Syntax error in generated Python file ────────────────────────────────
  {
    pattern: /SyntaxError|IndentationError/i,
    description: "Syntax or indentation error in generated Python code",
    async fix({ projectPath, settings, send }) {
      send("log", "→ Fix: checking app.py and models.py for syntax errors");
      const envVars = buildEnvVars(projectPath, settings);
      await runCmd("python -m py_compile app.py", projectPath, envVars, send);
      await runCmd("python -m py_compile models.py", projectPath, envVars, send);
    },
  },

  // ── 15. pip install failed ────────────────────────────────────────────────────
  {
    pattern: /pip install failed|ERROR: Could not find a version/i,
    description: "pip install failed — package not found or network issue",
    async fix({ projectPath, settings, send }) {
      send("log", "→ Fix: retrying pip install with --upgrade");
      await runCmd("pip install -r requirements.txt --upgrade", projectPath, process.env, send);
    },
  },

];

// ─── Main export: scan logs and run all matching fixes ───────────────────────

async function autoFix({ logs, projectPath, framework, settings, send }) {
  if (framework !== "Flask") return false; // currently Flask only

  const logText = logs.join("\n");
  const matched = ERROR_PATTERNS.filter((e) => e.pattern.test(logText));

  if (matched.length === 0) return false;

  send("log", `⚡ Auto-fix: detected ${matched.length} known issue(s)`);

  for (const entry of matched) {
    send("log", `⚡ ${entry.description}`);
    try {
      await entry.fix({ projectPath, framework, settings, send, logs });
    } catch (err) {
      send("log", `  [fix] Fix failed: ${err.message}`);
    }
  }

  return true;
}

// ─── Agentic AI Fallback Fixer ───────────────────────────────────────────────

const https = require("https");
const { URL } = require("url");

/**
 * Agentic AI Fixer - Called when all hardcoded fixes fail
 * Uses AI to analyze error logs and generate/apply fixes
 */

async function agenticFix({ logs, projectPath, framework, settings, send, attemptCount = 0 }) {
  const maxRetries = 3;
  if (attemptCount >= maxRetries) {
    send("log", "  [ai] Max retry attempts reached");
    return false;
  }

  const apiKey = process.env.DEVFLOW_AI_API_KEY;
  const apiEndpoint = process.env.DEVFLOW_AI_ENDPOINT || "https://api.openai.com/v1/chat/completions";
  const model = process.env.DEVFLOW_AI_MODEL || "gpt-4";

  if (!apiKey) {
    send("log", "  [ai] No AI API key configured (set DEVFLOW_AI_API_KEY)");
    return false;
  }

  send("log", `  [ai] Analyzing error with ${model}...`);

  const logText = logs.join("\n").slice(-8000); // Limit to last 8k chars

  const systemPrompt = `You are an expert DevFlow Studio debug assistant. Analyze build/migration errors and provide fix commands.
Output ONLY valid JSON with the fix instructions. Format:
{
  "analysis": "brief cause analysis",
  "fixCommands": ["command1", "command2"],
  "fileEdits": [{"path": "relative/path", "search": "text to find", "replace": "new text"}]
}
Focus on Flask/FastAPI/Django migration issues, Python syntax errors, and missing dependencies.`;

  const userPrompt = `Project: ${projectPath}
Framework: ${framework}
Settings: ${JSON.stringify(settings)}

Error logs:
${logText}

Provide fix commands and any file edits needed.`;

  try {
    const response = await new Promise((resolve, reject) => {
      const url = new URL(apiEndpoint);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => data += chunk);
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      });

      req.on("error", reject);
      req.write(JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }));
      req.end();
    });

    if (response.status !== 200) {
      send("log", `  [ai] API error: ${response.status}`);
      return false;
    }

    const result = JSON.parse(response.body);
    const aiResponse = result.choices?.[0]?.message?.content || "";
    send("log", `  [ai] Analysis: ${aiResponse.slice(0, 200)}...`);

    // Parse the JSON from AI response
    let fixPlan;
    try {
      // Extract JSON from potential markdown code block
      const jsonMatch = aiResponse.match(/```json\n([\s\S]*?)```/) || aiResponse.match(/\{[\s\S]*\}/);
      fixPlan = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiResponse);
    } catch (e) {
      send("log", "  [ai] Could not parse AI response");
      return false;
    }

    if (!fixPlan?.fixCommands?.length && !fixPlan?.fileEdits?.length) {
      send("log", "  [ai] No fixes provided by AI");
      return false;
    }

    // Apply file edits first
    if (fixPlan.fileEdits?.length) {
      send("log", `  [ai] Applying ${fixPlan.fileEdits.length} file edit(s)...`);
      for (const edit of fixPlan.fileEdits) {
        const filePath = path.join(projectPath, edit.path);
        if (fs.existsSync(filePath)) {
          let content = fs.readFileSync(filePath, "utf-8");
          content = content.replace(edit.search, edit.replace);
          fs.writeFileSync(filePath, content, "utf-8");
          send("log", `  [ai] Edited ${edit.path}`);
        }
      }
    }

    // Run fix commands
    if (fixPlan.fixCommands?.length) {
      send("log", `  [ai] Running ${fixPlan.fixCommands.length} fix command(s)...`);
      for (const cmd of fixPlan.fixCommands) {
        const result = await runCmd(cmd, projectPath, process.env, send);
        if (result.exitCode !== 0) {
          send("log", `  [ai] Command failed: ${cmd}`);
          // Retry once with the agent
          return agenticFix({ logs, projectPath, framework, settings, send, attemptCount: attemptCount + 1 });
        }
      }
    }

    send("log", "  [ai] Fixes applied successfully!");
    return true;
  } catch (err) {
    send("log", `  [ai] Error: ${err.message}`);
    return false;
  }
}

// ─── Main export: scan logs and run all matching fixes ───────────────────────

async function autoFix({ logs, projectPath, framework, settings, send }) {
  if (framework !== "Flask") return false; // currently Flask only

  const logText = logs.join("\n");
  const matched = ERROR_PATTERNS.filter((e) => e.pattern.test(logText));

  if (matched.length === 0) return false;

  send("log", `⚡ Auto-fix: detected ${matched.length} known issue(s)`);

  for (const entry of matched) {
    send("log", `⚡ ${entry.description}`);
    try {
      await entry.fix({ projectPath, framework, settings, send, logs });
    } catch (err) {
      send("log", `  [fix] Fix failed: ${err.message}`);
    }
  }

  // If fixes applied but still have errors, try AI as final fallback
  const stillFailing = matched.length > 0 && await checkStillFailing({ projectPath, framework, settings, send });
  if (stillFailing) {
    send("log", "⚡ Hardcoded fixes applied but errors persist. Trying AI...");
    const aiFixed = await agenticFix({ logs, projectPath, framework, settings, send });
    if (aiFixed) return true;
  }

  return true;
}

// Helper to check if build/migration still has errors after fixes
async function checkStillFailing({ projectPath, framework, settings, send }) {
  const envVars = buildEnvVars(projectPath, settings);
  const isWin = os.platform() === "win32";
  const shell = isWin ? "cmd.exe" : (process.env.SHELL || "bash");

  try {
    const result = await new Promise((resolve, reject) => {
      const cmd = framework === "Flask" ? "flask db upgrade" : "python manage.py migrate";
      const args = isWin ? ["/c", cmd] : ["-c", cmd];
      const proc = pty.spawn(shell, args, { cwd: projectPath, env: envVars, cols: 120, rows: 30, useConpty: false });
      let output = "";
      proc.onData((d) => { output += d.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, ""); });
      proc.onExit(({ exitCode }) => resolve({ exitCode, output }));
    });
    return result.exitCode !== 0;
  } catch {
    return true;
  }
}

module.exports = { autoFix, agenticFix };
