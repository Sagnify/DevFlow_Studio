/**
 * DevFlow Studio — Deterministic Code Generator
 * Step 2 (redesigned): Each endpoint = one cohesive route function.
 * Logic nodes are inlined as sequential code blocks, not separate functions.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const TEMPLATE_ROOT = path.join(__dirname, "templates");

function renderTemplate(relPath, values) {
  const fullPath = path.join(TEMPLATE_ROOT, relPath);
  let content = fs.readFileSync(fullPath, "utf-8");
  Object.entries(values).forEach(([key, value]) => {
    content = content.replace(new RegExp(`{{${key}}}`, "g"), value ?? "");
  });
  return content;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function snakeCase(str) {
  return (str || "").toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function className(str) {
  return (str || "model").split(/[\s_-]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

function resolveValue(valObj, fallback = "None", resultVars = {}) {
  if (!valObj) return fallback;
  if (valObj.mode === "upstream") {
    const field = snakeCase(valObj.val) || fallback;
    // If we know which result var this field comes from, use dict access
    if (resultVars[field]) return `${resultVars[field]}.get("${field}")`;
    return field;
  }
  const v = valObj.val;
  if (v === "" || v === undefined) return fallback;
  return isNaN(v) ? `"${v}"` : v;
}

function indent(lines, n = 4) {
  const pad = " ".repeat(n);
  return lines.map((l) => (l.trim() ? pad + l : l));
}

// ─── Graph traversal — ordered logic nodes for an endpoint ──────────────────
// Walks edges from the endpoint outward (downstream) to collect logic nodes
// in execution order, then appends upstream logic nodes (response providers).

function getOrderedLogicNodes(endpointNode, allNodes, edges) {
  const visited = new Set();
  const ordered = [];

  function walk(nodeId) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = allNodes.find((n) => n.id === nodeId);
    if (node && node.type === "logic") ordered.push(node);

    edges.forEach((e) => {
      const dir = e.data?.flowDir;
      // For a "reverse" edge, data flows from target→source, so follow target→source
      // For a "forward" (or default) edge, data flows source→target, so follow source→target
      let next = null;
      if (dir === "reverse") {
        if (e.target === nodeId) next = e.source;
      } else {
        if (e.source === nodeId) next = e.target;
      }
      if (next && !visited.has(next)) walk(next);
    });
  }

  // Start from endpoint: follow edges where endpoint is the data-flow origin
  edges.forEach((e) => {
    const dir = e.data?.flowDir;
    let next = null;
    if (dir === "reverse") {
      if (e.target === endpointNode.id) next = e.source;
    } else {
      if (e.source === endpointNode.id) next = e.target;
    }
    if (next) walk(next);
  });

  // Also pick up nodes that feed back INTO the endpoint (response providers)
  edges.forEach((e) => {
    const dir = e.data?.flowDir;
    let prev = null;
    if (dir === "reverse") {
      if (e.target === endpointNode.id) prev = e.source;
    } else {
      if (e.target === endpointNode.id) prev = e.source;
    }
    if (prev && !visited.has(prev)) {
      const node = allNodes.find((n) => n.id === prev);
      if (node?.type === "logic") { visited.add(prev); ordered.push(node); }
    }
  });

  return ordered;
}

// ─── Logic node → inline code block ─────────────────────────────────────────
// Returns an array of code lines (no def, no indentation prefix — caller indents)

function logicBlock(logicNode, allNodes, edges, dbNodes, resultVars = {}, prevResultVar = null) {
  const op     = logicNode.data.operation;
  const label  = snakeCase(logicNode.data.label || "step");

  // Find connected DB node
  const connectedDbIds = new Set(
    edges.filter((e) => e.source === logicNode.id || e.target === logicNode.id)
         .map((e) => e.source === logicNode.id ? e.target : e.source)
  );
  const dbNode  = dbNodes.find((n) => connectedDbIds.has(n.id));
  const modelCls = dbNode ? className(dbNode.data.label || "Model") : "Model";

  // ── fetch ──
  if (op === "fetch") {
    const cfg        = logicNode.data.fetchCfg || {};
    const filters    = cfg.filters || [];
    const returnMany = cfg.returnMany;

    const lines = [`# ${label}: fetch from ${modelCls}`, `query = ${modelCls}.query`];
    filters.forEach((f) => {
      const val = resolveValue(f.value, `""`, resultVars);
      // Only apply filter if the value is not None
      if (f.op === "contains")
        lines.push(`if ${val}:`, `    query = query.filter(${modelCls}.${snakeCase(f.field)}.contains(${val}))`);
      else {
        const pyOp = { "is": "==", "is not": "!=", "greater than": ">", "less than": "<" }[f.op] || "==";
        lines.push(`if ${val} is not None:`, `    query = query.filter(${modelCls}.${snakeCase(f.field)} ${pyOp} ${val})`);
      }
    });
    lines.push(returnMany
      ? `${label}_result = [r.to_dict() for r in query.all()]`
      : `${label}_result = query.first_or_404().to_dict()`
    );
    return lines;
  }

  // ── save ──
  if (op === "save") {
    const cfg     = logicNode.data.saveCfg || {};
    const mapping = cfg.mapping || {};
    const saveOp  = cfg.saveOp || "create";
    const pkField = dbNode?.data?.fields?.find((f) => f.primaryKey);
    const pkVar   = pkField ? snakeCase(pkField.name) : "id";

    const lines = [`# ${label}: save to ${modelCls}`];
    if (saveOp === "update")
      lines.push(`${label}_record = ${modelCls}.query.get_or_404(${pkVar})`);
    else if (saveOp === "create_update")
      lines.push(`${label}_record = ${modelCls}.query.get(${pkVar})`, `${label}_record = ${label}_record if ${label}_record else ${modelCls}()`);
    else
      lines.push(`${label}_record = ${modelCls}()`);

    Object.entries(mapping).forEach(([field, valObj]) => {
      const pyField = snakeCase(field);
      const resolved = resolveValue(valObj, "None");
      if (pyField.includes("date") || pyField.endsWith("_at")) {
        lines.push(`${label}_record.${pyField} = parse_datetime_field(${resolved}, "${pyField}", required=False, no_past=${pyField === "due_date" ? "True" : "False"})`);
      } else {
        lines.push(`${label}_record.${pyField} = ${resolved}`);
      }
    });
    if (Object.keys(mapping).some((field) => snakeCase(field) === "status") && fieldsForDb(dbNode).includes("completed_at")) {
      lines.push(`if ${label}_record.status == "completed" and not ${label}_record.completed_at:`, `    ${label}_record.completed_at = datetime.utcnow()`);
      lines.push(`if ${label}_record.status != "completed":`, `    ${label}_record.completed_at = None`);
    }
    lines.push(`db.session.add(${label}_record)`, `db.session.commit()`, `${label}_result = ${label}_record.to_dict()`);
    return lines;
  }

  // ── delete ──
  if (op === "delete") {
    const cfg     = logicNode.data.deleteCfg || {};
    const filters = cfg.filters || [];
    const lines   = [`# ${label}: delete from ${modelCls}`, `query = ${modelCls}.query`];
    filters.forEach((f) => {
      const val  = resolveValue(f.value, `""`);
      const pyOp = { "is": "==", "is not": "!=", "greater than": ">", "less than": "<" }[f.op] || "==";
      lines.push(`query = query.filter(${modelCls}.${snakeCase(f.field)} ${pyOp} ${val})`);
    });
    lines.push(
      `${label}_record = query.first_or_404()`,
      `db.session.delete(${label}_record)`,
      `db.session.commit()`,
      `${label}_result = {"deleted": True}`
    );
    return lines;
  }

  // ── validate ──
  if (op === "validate") {
    const cfg   = logicNode.data.validateCfg || {};
    const field = snakeCase(cfg.field || "value");
    const rules = cfg.rules || [];
    const lines = [`# ${label}: validate ${field}`];
    rules.forEach((r) => {
      if (r.type === "required")
        lines.push(`if not ${field}:`, `    return error_response("${r.onFail || "Required"}", "VALIDATION_ERROR", 400)`);
      else if (r.type === "is email")
        lines.push(`if "@" not in str(${field}):`, `    return error_response("${r.onFail || "Invalid email"}", "VALIDATION_ERROR", 400)`);
      else if (r.type === "is number") {
        if (field.includes("date") || field.endsWith("_at")) {
          lines.push(
            `try:`,
            `    ${field} = parse_datetime_field(${field}, "${field}", required=False, no_past=${field === "due_date" ? "True" : "False"})`,
            `except ValueError as exc:`,
            `    return error_response(str(exc), "VALIDATION_ERROR", 400)`
          );
        } else {
          lines.push(`if not str(${field}).lstrip("-").replace(".", "", 1).isdigit():`, `    return error_response("${r.onFail || "Not a number"}", "VALIDATION_ERROR", 400)`);
        }
      }
      else if (r.type === "min length")
        lines.push(`if len(str(${field})) < ${r.ruleVal || 0}:`, `    return error_response("${r.onFail || "Too short"}", "VALIDATION_ERROR", 400)`);
      else if (r.type === "max length")
        lines.push(`if len(str(${field})) > ${r.ruleVal || 255}:`, `    return error_response("${r.onFail || "Too long"}", "VALIDATION_ERROR", 400)`);
      else if (r.type === "is URL")
        lines.push(`if not str(${field}).startswith(("http://", "https://")):`, `    return error_response("${r.onFail || "Invalid URL"}", "VALIDATION_ERROR", 400)`);
      else if (r.type === "matches pattern")
        lines.push(`if not re.match(r"${r.ruleVal || ".*"}", str(${field})):`, `    return error_response("${r.onFail || "Pattern mismatch"}", "VALIDATION_ERROR", 400)`);
    });
    lines.push(`${label}_result = {"${field}": ${field}, "${field}_valid": True}`);
    return lines;
  }

  // ── auth_basic ──
  if (op === "auth_basic") {
    const cfg = logicNode.data.authBasicCfg || {};
    const uField = snakeCase(cfg.usernameField || "username");
    const pField = snakeCase(cfg.passwordField || "password");
    const lines = [
      `# ${label}: basic auth`,
      `${label}_user = ${modelCls}.query.filter_by(username=${uField}).first()`,
      `if not ${label}_user or ${label}_user.password != ${pField}:`,
      `    return error_response("Invalid credentials", "INVALID_CREDENTIALS", 401)`,
      `${label}_result = {"token": str(${label}_user.id), "user": ${label}_user.to_dict()}`,
    ];
    if (cfg.tokenField)
      lines.push(
        `# protect: verify token`,
        `_token = ${snakeCase(cfg.tokenField)}`,
        `if not _token or not ${modelCls}.query.get(_token):`,
        `    return error_response("Unauthorized", "UNAUTHORIZED", 401)`
      );
    if (cfg.logoutField)
      lines.push(
        `# logout: invalidate session`,
        `${snakeCase(cfg.logoutField)} = None`
      );
    return lines;
  }

  // ── auth_advanced ──
  if (op === "auth_advanced") {
    const cfg   = logicNode.data.authAdvCfg || {};
    const lines = [`# ${label}: advanced auth`];
    if (cfg.hashField)
      lines.push(`hashed_password = bcrypt.hashpw(${snakeCase(cfg.hashField)}.encode(), bcrypt.gensalt()).decode()`);
    if (cfg.verifyPlainField)
      lines.push(`password_match = bcrypt.checkpw(${snakeCase(cfg.verifyPlainField)}.encode(), ${snakeCase(cfg.verifyHashedField || "hashed")}.encode())`);
    if (cfg.jwtPayloadFields?.length) {
      const expiry = cfg.jwtExpiry === "custom" ? (cfg.jwtExpiryCustom || "1h") : (cfg.jwtExpiry || "1h");
      const expSeconds = { "1h": 3600, "24h": 86400, "7d": 604800, "30d": 2592000 }[expiry];
      const expLine = expSeconds
        ? `"exp": __import__("datetime").datetime.utcnow() + __import__("datetime").timedelta(seconds=${expSeconds})`
        : `"exp": __import__("datetime").datetime.utcnow() + __import__("datetime").timedelta(hours=1)`;
      const payload = `{${cfg.jwtPayloadFields.map((f) => `"${f}": ${snakeCase(f)}`).join(", ")}, ${expLine}}`;
      lines.push(`jwt_token = jwt.encode(${payload}, os.getenv("SECRET_KEY", "secret"), algorithm="HS256")`);
    }
    if (cfg.verifyJwtField)
      lines.push(
        `try:`,
        `    jwt.decode(${snakeCase(cfg.verifyJwtField)}, os.getenv("SECRET_KEY", "secret"), algorithms=["HS256"])`,
        `except Exception:`,
        `    return error_response("Invalid or expired token", "INVALID_TOKEN", 401)`
      );
    if (cfg.decodeJwtField)
      lines.push(`${snakeCase(cfg.decodeJwtOutput || "decoded")} = jwt.decode(${snakeCase(cfg.decodeJwtField)}, os.getenv("SECRET_KEY", "secret"), algorithms=["HS256"])`);
    const resultFields = [
      cfg.hashField          ? `"hashedPassword": hashed_password` : "",
      cfg.verifyPlainField   ? `"passwordMatch": password_match` : "",
      cfg.jwtPayloadFields?.length ? `"jwt": jwt_token` : "",
      cfg.decodeJwtField     ? `"${snakeCase(cfg.decodeJwtOutput || "decoded")}": ${snakeCase(cfg.decodeJwtOutput || "decoded")}` : "",
    ].filter(Boolean).join(", ");
    lines.push(`${label}_result = {${resultFields}}`);
    return lines;
  }

  // ── transform ──
  if (op === "transform") {
    const rows  = logicNode.data.transformCfg?.rows || [];
    const lines = [`# ${label}: transform`];
    rows.forEach((r) => {
      const inp = snakeCase(r.inputField || "value");
      const out = snakeCase(r.outputName || "result");
      if (r.op === "Rename") {
        if (out === "completed_at" && inp === "status")
          lines.push(`${out} = datetime.utcnow() if ${inp} == "completed" else None`);
        else
          lines.push(`${out} = ${inp}`);
      }
      if (r.op === "Uppercase")   lines.push(`${out} = str(${inp}).upper()`);
      if (r.op === "Lowercase")   lines.push(`${out} = str(${inp}).lower()`);
      if (r.op === "Combine")     lines.push(`${out} = str(${inp}) + str(${snakeCase(r.opConfig || "")})`);
      if (r.op === "Format date") lines.push(`${out} = datetime.strptime(str(${inp}), "${r.opConfig || "%Y-%m-%d"}").strftime("${r.opConfig || "%Y-%m-%d"}")`);
      if (r.op === "Extract")     lines.push(`_m = re.search(r"${r.opConfig || ".*"}", str(${inp}))`, `${out} = _m.group(0) if _m else None`);
    });
    const resultFields = rows.map((r) => `"${snakeCase(r.outputName)}": ${snakeCase(r.outputName)}`).join(", ");
    lines.push(`${label}_result = {${resultFields}}`);
    return lines;
  }

  // ── utility ──
  if (op === "utility") {
    const cfg = logicNode.data.utilityCfg || {};
    const sub = cfg.subType;
    const inputVar = prevResultVar || "_items";
    if (sub === "Paginate") {
      const pageField = snakeCase(cfg.pageField || "page");
      const sizeVal   = resolveValue(cfg.pageSize, "10");
      return [
        `# ${label}: paginate`,
        `${label}_items = ${inputVar} if isinstance(${inputVar}, list) else [${inputVar}] if ${inputVar} else []`,
        `_page = int(${pageField} or 1)`,
        `_per_page = int(${sizeVal})`,
        `${label}_result = {"items": ${label}_items[(_page-1)*_per_page:_page*_per_page], "page": _page, "total": len(${label}_items)}`,
      ];
    }
    if (sub === "Sort") {
      const sortField = snakeCase(cfg.sortField || "due_date");
      const reverse   = cfg.sortDir === "Desc" ? "True" : "False";
      return [
        `# ${label}: sort by ${sortField}`,
        `${label}_items = ${inputVar} if isinstance(${inputVar}, list) else [${inputVar}] if ${inputVar} else []`,
        `${label}_result = {"sorted": sorted(${label}_items, key=lambda x: x.get("${sortField}") if isinstance(x, dict) else getattr(x, "${sortField}", None), reverse=${reverse})}`,
      ];
    }
    if (sub === "Filter list") {
      const filterField = snakeCase(cfg.filterField || "key");
      const filterVal   = resolveValue(cfg.filterValue, `""`);
      return [
        `# ${label}: filter list`,
        `${label}_items = ${inputVar} if isinstance(${inputVar}, list) else [${inputVar}] if ${inputVar} else []`,
        `${label}_result = {"filtered": [x for x in ${label}_items if isinstance(x, dict) and x.get("${filterField}") == ${filterVal}]}`,
      ];
    }
    if (sub === "Count") {
      return [
        `# ${label}: count`,
        `${label}_items = ${inputVar} if isinstance(${inputVar}, list) else [${inputVar}] if ${inputVar} else []`,
        `${label}_result = {"count": len(${label}_items)}`,
      ];
    }
  }

  if (op === "http_request") {
    const cfg     = logicNode.data.httpReqCfg || {};
    const method  = cfg.method || "GET";
    const urlVal  = resolveValue(cfg.url, `"https://example.com/api"`);
    const outName = snakeCase(cfg.outputName || "api_response");
    const headers = cfg.headers || [];
    const bodyFields = cfg.bodyFields || [];
    const lines   = [`# ${label}: http request`, `import urllib.request, json as _json`];
    if (headers.length || bodyFields.length) {
      lines.push(`_headers = {${headers.map((h) => `"${h.key}": ${resolveValue(h.value, `""`)}`).join(", ")}}`);
    }
    if (bodyFields.length) {
      const bodyDict = `{${bodyFields.map((f) => `"${f.key}": ${resolveValue(f.value, "None")}`).join(", ")}}`;
      lines.push(
        `_body = _json.dumps(${bodyDict}).encode()`,
        `_req = urllib.request.Request(${urlVal}, data=_body, headers={**_headers, "Content-Type": "application/json"}, method="${method}")`,
      );
    } else {
      lines.push(`_req = urllib.request.Request(${urlVal}, headers=_headers if _headers else {}, method="${method}")`);
    }
    lines.push(
      `with urllib.request.urlopen(_req) as _res:`,
      `    ${outName} = _json.loads(_res.read())`,
      `    ${outName}_status = _res.status`,
    );
    return lines;
  }

  if (op === "email") {
    const cfg      = logicNode.data.emailCfg || {};
    const provider = cfg.provider || "SMTP";
    const to       = resolveValue(cfg.to, `"recipient@example.com"`);
    const frm      = resolveValue(cfg.from, `"sender@example.com"`);
    const subject  = resolveValue(cfg.subject, `"No Subject"`);
    const body     = (cfg.body || "").replace(/{{(\w+)}}/g, (_, k) => `{${snakeCase(k)}}`);
    const bodyType = cfg.bodyType || "text";
    const lines    = [`# ${label}: send email via ${provider}`];

    if (provider === "SMTP") {
      lines.push(
        `import smtplib, os`,
        `from email.mime.${bodyType === "html" ? "multipart" : "text"} import MIME${bodyType === "html" ? "Multipart" : "Text"}`,
        `_msg = MIMEText(f"""${body}""", "${bodyType}")`,
        `_msg["Subject"] = ${subject}`,
        `_msg["From"] = ${frm}`,
        `_msg["To"] = ${to}`,
        `with smtplib.SMTP("${cfg.smtpHost || "smtp.gmail.com"}", ${cfg.smtpPort || 587}) as _smtp:`,
        `    _smtp.starttls()`,
        `    _smtp.login("${cfg.smtpUser || ""}", os.getenv("SMTP_PASSWORD", ""))`,
        `    _smtp.send_message(_msg)`,
      );
    } else if (provider === "SendGrid") {
      lines.push(
        `import urllib.request, json as _json, os`,
        `_sg_data = _json.dumps({"personalizations": [{"to": [{"email": ${to}}]}], "from": {"email": ${frm}}, "subject": ${subject}, "content": [{"type": "text/${bodyType}", "value": f"""${body}"""}]}).encode()`,
        `_sg_req = urllib.request.Request("https://api.sendgrid.com/v3/mail/send", data=_sg_data, headers={"Authorization": f"Bearer {os.getenv('${cfg.apiKey || "SENDGRID_API_KEY"}')}", "Content-Type": "application/json"}, method="POST")`,
        `urllib.request.urlopen(_sg_req)`,
      );
    } else if (provider === "Mailgun") {
      lines.push(
        `import urllib.request, urllib.parse, os`,
        `_mg_data = urllib.parse.urlencode({"from": ${frm}, "to": ${to}, "subject": ${subject}, "text": f"""${body}"""}).encode()`,
        `_mg_req = urllib.request.Request(f"https://api.mailgun.net/v3/{os.getenv('MAILGUN_DOMAIN', 'example.com')}/messages", data=_mg_data, method="POST")`,
        `_mg_req.add_header("Authorization", f"Basic " + __import__("base64").b64encode(f"api:{os.getenv('${cfg.apiKey || "MAILGUN_API_KEY"}')}".encode()).decode())`,
        `urllib.request.urlopen(_mg_req)`,
      );
    } else if (provider === "Resend") {
      lines.push(
        `import urllib.request, json as _json, os`,
        `_rs_data = _json.dumps({"from": ${frm}, "to": [${to}], "subject": ${subject}, "${cfg.bodyType === "html" ? "html" : "text"}": f"""${body}"""}).encode()`,
        `_rs_req = urllib.request.Request("https://api.resend.com/emails", data=_rs_data, headers={"Authorization": f"Bearer {os.getenv('${cfg.apiKey || "RESEND_API_KEY"}')}", "Content-Type": "application/json"}, method="POST")`,
        `urllib.request.urlopen(_rs_req)`,
      );
    } else {
      lines.push(`# ${provider} email — configure via env vars and provider SDK`);
    }
    lines.push(`${label}_result = {"email_sent": True}`);
    return lines;
  }

  if (op === "authorize") {
    const cfg      = logicNode.data.authorizeCfg || {};
    const roleField = snakeCase(cfg.roleField || "role");
    const rules    = cfg.rules || [];
    const denyMsg  = cfg.denyMessage || "Forbidden";
    const lines    = [`# ${label}: authorize`];
    rules.forEach((r) => {
      if (r.type === "role_is" || !r.type)
        lines.push(`if ${roleField} != "${r.value || ""}": return error_response("${denyMsg}", "FORBIDDEN", 403)`);
      else if (r.type === "role_not")
        lines.push(`if ${roleField} == "${r.value || ""}": return error_response("${denyMsg}", "FORBIDDEN", 403)`);
      else if (r.type === "role_in")
        lines.push(`if ${roleField} not in [${(r.value || "").split(",").map((v) => `"${v.trim()}"`).join(", ")}]: return error_response("${denyMsg}", "FORBIDDEN", 403)`);
      else if (r.type === "field_equals")
        lines.push(`if ${snakeCase(r.field || "field")} != "${r.value || ""}": return error_response("${denyMsg}", "FORBIDDEN", 403)`);
    });
    lines.push(`${label}_result = {"authorized": True}`);
    return lines;
  }

  return [`# ${label}: not configured`];
}

// ─── models.py ───────────────────────────────────────────────────────────────

const SQL_TYPE_MAP = {
  VARCHAR: "db.String(255)", TEXT: "db.Text", INT: "db.Integer",
  BIGINT: "db.BigInteger", FLOAT: "db.Float", DECIMAL: "db.Numeric",
  BOOLEAN: "db.Boolean", DATE: "db.Date", DATETIME: "db.DateTime",
  TIMESTAMP: "db.DateTime", UUID: "db.String(36)", JSON: "db.JSON", BLOB: "db.LargeBinary",
};

function fieldsForDb(dbNode) {
  return (dbNode?.data?.fields || []).map((f) => snakeCase(f.name));
}

function flaskModel(node, edges, allNodes) {
  const label  = node.data.label || "Model";
  const cls    = className(label);
  const table  = snakeCase(node.data.tableName || label);
  const fields = node.data.fields || [];
  const indexes = node.data.indexes || [];

  const cols = fields.map((f) => {
    const colType = SQL_TYPE_MAP[f.type] || "db.String(255)";
    const parts   = [`db.Column(${colType}`];
    if (f.isForeignKey && f.fkRef)  parts.push(`db.ForeignKey("${f.fkRef}", name="fk_${table}_${snakeCase(f.name)}")`);
    if (f.primaryKey)               parts.push("primary_key=True");
    if (f.unique && !f.primaryKey)  parts.push("unique=True");
    if (f.required)                 parts.push("nullable=False");
    if (snakeCase(f.name) === "created_at" && ["DATETIME", "TIMESTAMP"].includes(f.type)) parts.push("default=datetime.utcnow");
    else if (snakeCase(f.name) === "updated_at" && ["DATETIME", "TIMESTAMP"].includes(f.type)) {
      parts.push("default=datetime.utcnow");
      parts.push("onupdate=datetime.utcnow");
    } else if (f.defaultValue) {
      parts.push(`default=${JSON.stringify(f.defaultValue)}`);
    }
    return `    ${snakeCase(f.name)} = ${parts.join(", ")})`;
  });

  // __table_args__ for indexes
  const indexArgs = indexes
    .filter((ix) => ix.fields && ix.fields.length > 0)
    .map((ix) => {
      const ixFields = ix.fields.map((fn) => `"${snakeCase(fn)}"`).join(", ");
      if (ix.type === "UNIQUE") return `db.UniqueConstraint(${ixFields})`;
      if (ix.type === "PRIMARY") return `db.PrimaryKeyConstraint(${ixFields})`;
      return `db.Index("ix_${table}_${ix.fields.map(snakeCase).join("_")}", ${ixFields})`;
    });

  const dictFields = fields.map((f) => {
    const name = snakeCase(f.name);
    if (["DATE", "DATETIME", "TIMESTAMP"].includes(f.type)) {
      return `"${name}": self.${name}.isoformat() if self.${name} else None`;
    }
    return `"${name}": self.${name}`;
  }).join(", ");

  return [
    `class ${cls}(db.Model):`,
    `    __tablename__ = "${table}"`,
    ...cols,
    ...(indexArgs.length ? [`    __table_args__ = (${indexArgs.join(", ")},)`] : []),
    ``,
    `    def to_dict(self):`,
    `        return {${dictFields}}`,
  ].join("\n");
}

// ─── Safe Python function name ───────────────────────────────────────────────
// Ensures the name is a valid, non-reserved, unique Python identifier

const PYTHON_RESERVED = new Set([
  "and","as","assert","async","await","break","class","continue","def",
  "del","elif","else","except","false","finally","for","from","global",
  "if","import","in","is","lambda","none","nonlocal","not","or","pass",
  "raise","return","true","try","while","with","yield",
  // common builtins that would cause silent bugs
  "list","dict","set","type","id","input","print","filter","map","range",
  "len","str","int","float","bool","bytes","object","super","open",
]);

function safeFnName(label, usedNames) {
  let name = snakeCase(label || "endpoint") || "endpoint";
  // Prefix with underscore if starts with digit
  if (/^[0-9]/.test(name)) name = `_${name}`;
  // Suffix with _ if reserved
  if (PYTHON_RESERVED.has(name)) name = `${name}_`;
  // Deduplicate
  if (usedNames) {
    const base = name;
    let i = 2;
    while (usedNames.has(name)) name = `${base}_${i++}`;
    usedNames.add(name);
  }
  return name;
}

// ─── app.py — one cohesive route per endpoint ────────────────────────────────

function buildRoute(endpointNode, allNodes, edges, dbNodes, usedNames) {
  const method     = (endpointNode.data.method || "GET").toUpperCase();
  const route      = (endpointNode.data.route || "/").replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "<$1>");
  const fnName     = safeFnName(endpointNode.data.label, usedNames);
  const inputs     = (endpointNode.data.input || []).filter((r) => r.key);
  const pathParams = inputs.filter((r) => r.source === "path");
  const paramList  = pathParams.map((r) => snakeCase(r.key)).join(", ");

  const logicNodes = getOrderedLogicNodes(endpointNode, allNodes, edges);

  // Determine response variable — last logic node's result
  const lastLogic   = logicNodes[logicNodes.length - 1];
  const responseVar = lastLogic ? `${snakeCase(lastLogic.data.label || "step")}_result` : null;

  // Collect selected response fields from endpoint config
  const selectedOutput = endpointNode.data.outputFields || [];

  const body = [];

  // Parse inputs — treat missing source as "query" by default
  const bodyParams   = inputs.filter((r) => r.source === "body");
  const queryParams  = inputs.filter((r) => !r.source || r.source === "query");
  const headerParams = inputs.filter((r) => r.source === "header");

  if (bodyParams.length) {
    body.push(`data = request.get_json() or {}`);
    bodyParams.forEach((r) => body.push(`${snakeCase(r.key)} = data.get("${r.key}")`));
  }
  queryParams.forEach((r)  => {
    const castFn = r.val === "integer" ? "int" : r.val === "number" ? "float" : "";
    body.push(castFn
      ? `${snakeCase(r.key)} = ${castFn}(request.args.get("${r.key}")) if request.args.get("${r.key}") is not None else None`
      : `${snakeCase(r.key)} = request.args.get("${r.key}")`
    );
  });
  headerParams.forEach((r) => body.push(`${snakeCase(r.key)} = request.headers.get("${r.key}")`));

  if (body.length) body.push("");

  // Inline each logic node's code block, tracking which fields each result provides
  const resultVars = {};
  logicNodes.forEach((ln, i) => {
    const prevLogic = i > 0 ? logicNodes[i - 1] : null;
    const prevResultVar = prevLogic ? `${snakeCase(prevLogic.data.label || "step")}_result` : null;
    const block = logicBlock(ln, allNodes, edges, dbNodes, resultVars, prevResultVar);
    body.push(...block);
    if (i < logicNodes.length - 1) body.push("");
    // Register this node's output fields into resultVars for downstream nodes
    const lLabel = snakeCase(ln.data.label || "step");
    const cfg = ln.data.fetchCfg || ln.data.saveCfg || {};
    const fields = [
      ...(ln.data.fetchCfg?.fetchFields || []),
      ...Object.keys(ln.data.saveCfg?.mapping || {}),
    ];
    fields.forEach((f) => { resultVars[snakeCase(f)] = `${lLabel}_result`; });
    // Also register the PK of the connected DB node
    const connectedDbIds = new Set(
      edges.filter((e) => e.source === ln.id || e.target === ln.id)
           .map((e) => e.source === ln.id ? e.target : e.source)
    );
    const dbNode = dbNodes.find((n) => connectedDbIds.has(n.id));
    if (dbNode) {
      (dbNode.data.fields || []).forEach((f) => {
        resultVars[snakeCase(f.name)] = `${lLabel}_result`;
      });
    }
  });

  if (logicNodes.length) body.push("");

  // Build return statement
  if (responseVar && lastLogic?.data?.operation === "fetch" && lastLogic?.data?.fetchCfg?.returnMany) {
    body.push(`return success_response(${responseVar}, "${method === "POST" ? "Created" : "OK"}", ${method === "POST" ? 201 : 200})`);
  } else if (responseVar && selectedOutput.length) {
    const fields = selectedOutput.map((f) => `"${f}": ${responseVar}.get("${f}")`).join(", ");
    body.push(`return success_response({${fields}}, "${method === "POST" ? "Created" : "OK"}", ${method === "POST" ? 201 : 200})`);
  } else if (responseVar) {
    body.push(`return success_response(${responseVar}, "${method === "POST" ? "Created" : "OK"}", ${method === "POST" ? 201 : 200})`);
  } else {
    body.push(`return success_response(None, "${method === "POST" ? "Created" : "OK"}", ${method === "POST" ? 201 : 200})`);
  }

  return [
    `@app.route("${route}", methods=["${method}"])`,
    `def ${fnName}(${paramList}):`,
    ...indent(body),
  ].join("\n");
}

// ─── Top-level imports detection ─────────────────────────────────────────────

function detectExtraImports(logicNodes) {
  const imports = new Set();
  logicNodes.forEach((n) => {
    const op = n.data.operation;
    if (op === "auth_advanced")  { imports.add("import bcrypt"); imports.add("import jwt"); imports.add("import os"); }
    if (op === "email")          { imports.add("import os"); }
    if (op === "transform") {
      const rows = n.data.transformCfg?.rows || [];
      if (rows.some((r) => r.op === "Format date")) imports.add("from datetime import datetime");
      if (rows.some((r) => r.op === "Extract"))     imports.add("import re");
    }
    if (op === "validate") {
      const rules = n.data.validateCfg?.rules || [];
      if (rules.some((r) => r.type === "matches pattern")) imports.add("import re");
    }
  });
  return [...imports];
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

function dbDriver(database) {
  if (database === "postgres") return "psycopg2-binary";
  if (database === "mongodb")  return "pymongo";
  return null; // sqlite — stdlib
}

function defaultDbUrl(database) {
  if (database === "postgres") return "postgresql://user:password@localhost:5432/mydb";
  if (database === "mongodb")  return "mongodb://localhost:27017/mydb";
  return "sqlite:///app.db";
}

// ─── requirements.txt ────────────────────────────────────────────────────────

const ORM_PACKAGES = {
  "SQLAlchemy": ["flask", "flask-sqlalchemy", "flask-migrate"],
  "Peewee":     ["flask", "peewee"],
  "PonyORM":    ["flask", "pony"],
  "None":       ["flask"],
};

function buildRequirements(orm, logicNodes, database) {
  const pkgs = new Set(ORM_PACKAGES[orm] || ["flask"]);
  pkgs.add("flask-cors");
  const driver = dbDriver(database);
  if (driver) pkgs.add(driver);
  logicNodes.forEach((n) => {
    if (n.data.operation === "auth_advanced") { pkgs.add("bcrypt"); pkgs.add("pyjwt"); }
  });
  return [...pkgs].join("\n") + "\n";
}

// ─── Main entry ──────────────────────────────────────────────────────────────

function generate(graph, settings) {
  const { nodes, edges } = graph;
  const framework = settings.framework || "Flask";
  const orm       = settings.orm || "SQLAlchemy";
  const database  = settings.database || "sqlite";
  const dbUrl     = settings.dbUrl || defaultDbUrl(database);

  const dbNodes       = nodes.filter((n) => n.type === "db");
  const endpointNodes = nodes.filter((n) => n.type === "endpoint");
  const logicNodes    = nodes.filter((n) => n.type === "logic");

  if (framework === "Flask") {
    const hasDb      = dbNodes.length > 0 && orm !== "None";
    const useMigrate = hasDb && orm === "SQLAlchemy";

    // N:M junction tables for Flask
    const nmEdges = edges.filter((e) => e.data?.relation === "N:M");
    const junctionModels = nmEdges.map((e) => {
      const srcNode = dbNodes.find((n) => n.id === e.source);
      const tgtNode = dbNodes.find((n) => n.id === e.target);
      if (!srcNode || !tgtNode) return "";
      const srcTable = snakeCase(srcNode.data.tableName || srcNode.data.label);
      const tgtTable = snakeCase(tgtNode.data.tableName || tgtNode.data.label);
      const srcPK = (srcNode.data.fields || []).find((f) => f.primaryKey);
      const tgtPK = (tgtNode.data.fields || []).find((f) => f.primaryKey);
      const jTable = `${srcTable}_${tgtTable}`;
      return [
        `${jTable} = db.Table("${jTable}", db.metadata,`,
        `    db.Column("${srcTable}_id", db.Integer, db.ForeignKey("${srcTable}.${srcPK?.name || "id"}")),`,
        `    db.Column("${tgtTable}_id", db.Integer, db.ForeignKey("${tgtTable}.${tgtPK?.name || "id"}")),`,
        `)`,
      ].join("\n");
    }).filter(Boolean);

    const modelsBody = [
      ...dbNodes.map((n) => flaskModel(n, edges, dbNodes)),
      ...(junctionModels.length ? ["", ...junctionModels] : []),
    ].join("\n\n");

    const modelsFile = hasDb
      ? renderTemplate("flask_sqlalchemy/models.py.tpl", { models: modelsBody })
      : null;

    const extraImports = detectExtraImports(logicNodes);
    const importLines  = [
      "from flask import Flask, jsonify, request",
      "from flask_cors import CORS",
      "from datetime import datetime",
      "import os",
      "from pathlib import Path",
      ...extraImports,
      hasDb       ? `from models import db, ${dbNodes.map((n) => className(n.data.label || "Model")).join(", ")}` : "",
      useMigrate  ? "from flask_migrate import Migrate" : "",
    ].filter(Boolean);

    const configLines = hasDb ? [
      database === "sqlite"
        ? `app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///" + str(Path(__file__).parent / "app.db"))`
        : `app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "${dbUrl}")`,
      `app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False`,
    ] : [];

    const initLines = hasDb ? [
      "db.init_app(app)",
      ...(useMigrate ? ["migrate = Migrate(app, db)"] : ["with app.app_context():", "    db.create_all()"]),
    ] : [];

    const routes = endpointNodes.length
      ? endpointNodes.map(((usedNames) => (n) => buildRoute(n, nodes, edges, dbNodes, usedNames))(new Set())).join("\n\n")
      : `@app.route("/")\ndef index():\n    return success_response({"service": "DevFlow API"}, "Hello from DevFlow")`;

    const appFile = renderTemplate("flask_sqlalchemy/app.py.tpl", {
      imports: importLines.join("\n"),
      config: configLines.join("\n"),
      init: initLines.join("\n"),
      routes,
      host: settings.host || "127.0.0.1",
      port: settings.port || 5000,
      debug: settings.debug ? "True" : "False",
    });

    return {
      "app.py":           appFile,
      "requirements.txt": renderTemplate("flask_sqlalchemy/requirements.txt.tpl", {
        packages: buildRequirements(orm, logicNodes, database).trim(),
      }),
      ...(modelsFile ? { "models.py": modelsFile } : {}),
    };
  }

  // FastAPI
  if (framework === "FastAPI") {
    const hasDb = dbNodes.length > 0 && orm !== "None";

    // models.py — SQLAlchemy declarative models
    const fastapiSqlTypeMap = {
      VARCHAR: "String", TEXT: "Text", INT: "Integer", BIGINT: "BigInteger",
      FLOAT: "Float", DECIMAL: "Numeric", BOOLEAN: "Boolean", DATE: "Date",
      DATETIME: "DateTime", TIMESTAMP: "DateTime", UUID: "String", JSON: "JSON", BLOB: "LargeBinary",
    };

    const hasFkFields = dbNodes.some((n) => (n.data.fields || []).some((f) => f.isForeignKey));
    // N:M junction tables for FastAPI
    const fastapiNmEdges = edges.filter((e) => e.data?.relation === "N:M");
    const fastapiJunctions = fastapiNmEdges.map((e) => {
      const srcNode = dbNodes.find((n) => n.id === e.source);
      const tgtNode = dbNodes.find((n) => n.id === e.target);
      if (!srcNode || !tgtNode) return "";
      const srcTable = snakeCase(srcNode.data.tableName || srcNode.data.label);
      const tgtTable = snakeCase(tgtNode.data.tableName || tgtNode.data.label);
      const srcPK = (srcNode.data.fields || []).find((f) => f.primaryKey);
      const tgtPK = (tgtNode.data.fields || []).find((f) => f.primaryKey);
      const jTable = `${srcTable}_${tgtTable}`;
      return [
        `${jTable} = Table("${jTable}", Base.metadata,`,
        `    Column("${srcTable}_id", Integer, ForeignKey("${srcTable}.${srcPK?.name || "id"}")),`,
        `    Column("${tgtTable}_id", Integer, ForeignKey("${tgtTable}.${tgtPK?.name || "id"}")),`,
        `)`,
      ].join("\n");
    }).filter(Boolean);

    // Also need Table, Index, UniqueConstraint, PrimaryKeyConstraint in imports if used
    const needsTableImport = fastapiJunctions.length > 0;
    const needsIndexImport = dbNodes.some((n) => (n.data.indexes || []).length > 0);
    const extraSaImports = [...(needsTableImport ? ["Table"] : []), ...(needsIndexImport ? ["Index", "UniqueConstraint", "PrimaryKeyConstraint"] : [])];

    const modelsFile = hasDb ? [
      "from sqlalchemy import " + [...new Set(dbNodes.flatMap((n) => (n.data.fields || []).map((f) => fastapiSqlTypeMap[f.type] || "String")))].join(", ") + ", Column" + (hasFkFields ? ", ForeignKey" : "") + (extraSaImports.length ? ", " + extraSaImports.join(", ") : ""),
      "from sqlalchemy.orm import DeclarativeBase",
      "",
      "class Base(DeclarativeBase):",
      "    pass",
      "",
      ...dbNodes.map((n) => {
        const cls    = className(n.data.label || "Model");
        const table  = snakeCase(n.data.tableName || n.data.label || "model");
        const fields = n.data.fields || [];
        const cols   = fields.map((f) => {
          const t     = fastapiSqlTypeMap[f.type] || "String";
          const parts = [`Column(${t}`];
          if (f.isForeignKey && f.fkRef)  parts.push(`ForeignKey("${f.fkRef}")`);
          if (f.primaryKey)               parts.push("primary_key=True");
          if (f.unique && !f.primaryKey)  parts.push("unique=True");
          if (f.required)                 parts.push("nullable=False");
          if (f.defaultValue)             parts.push(`default=${JSON.stringify(f.defaultValue)}`);
          return `    ${snakeCase(f.name)} = ${parts.join(", ")})`;
        });
        const ixArgs = (n.data.indexes || [])
          .filter((ix) => ix.fields && ix.fields.length > 0)
          .map((ix) => {
            const ixFields = ix.fields.map((fn) => `"${snakeCase(fn)}"`).join(", ");
            if (ix.type === "UNIQUE") return `UniqueConstraint(${ixFields})`;
            if (ix.type === "PRIMARY") return `PrimaryKeyConstraint(${ixFields})`;
            return `Index("ix_${table}_${ix.fields.map(snakeCase).join("_")}", ${ixFields})`;
          });
        const dictFields = fields.map((f) => `"${snakeCase(f.name)}": self.${snakeCase(f.name)}`).join(", ");
        return [
          `class ${cls}(Base):`,
          `    __tablename__ = "${table}"`,
          ...cols,
          ...(ixArgs.length ? [`    __table_args__ = (${ixArgs.join(", ")},)`] : []),
          ``,
          `    def to_dict(self):`,
          `        return {${dictFields}}`,
        ].join("\n");
      }),
      ...(fastapiJunctions.length ? ["", ...fastapiJunctions] : []),
    ].join("\n") : null;

    // database.py — session setup
    const fastapiDbUrl = dbUrl || defaultDbUrl(database);
    const connectArgs  = database === "sqlite" ? ", connect_args={\"check_same_thread\": False}" : "";
    const fastapiDbUrlLine = database === "sqlite"
      ? `DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///" + str(Path(__file__).parent / "app.db"))`
      : `DATABASE_URL = os.getenv("DATABASE_URL", "${fastapiDbUrl}")`;
    const databaseFile = hasDb ? [
      "from sqlalchemy import create_engine",
      "from sqlalchemy.orm import sessionmaker, Session",
      "import os",
      "from pathlib import Path",
      "from models import Base",
      "",
      fastapiDbUrlLine,
      "",
      `engine = create_engine(DATABASE_URL${connectArgs})`,
      "SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)",
      "",
      "Base.metadata.create_all(bind=engine)",
      "",
      "def get_db():",
      "    db = SessionLocal()",
      "    try:",
      "        yield db",
      "    finally:",
      "        db.close()",
    ].join("\n") : null;

    // Pydantic schemas for request bodies
    const pydanticTypeMap = {
      VARCHAR: "str", TEXT: "str", INT: "int", BIGINT: "int", FLOAT: "float",
      DECIMAL: "float", BOOLEAN: "bool", DATE: "str", DATETIME: "str",
      TIMESTAMP: "str", UUID: "str", JSON: "dict", BLOB: "str",
    };
    const paramTypeMap = { string: "str", number: "float", integer: "int", boolean: "bool", array: "list", object: "dict", file: "str" };

    // Build Pydantic schemas for endpoints that have body params
    const schemas = [];
    endpointNodes.forEach((ep) => {
      const bodyParams = (ep.data.input || []).filter((r) => r.source === "body" && r.key);
      if (!bodyParams.length) return;
      const schemaName = className(ep.data.label || "endpoint") + "Body";
      schemas.push(
        `class ${schemaName}(BaseModel):`,
        ...bodyParams.map((r) => `    ${snakeCase(r.key)}: ${paramTypeMap[r.val] || "str"}`),
        ""
      );
    });

    // FastAPI inline logic block — same ops, different DB/error style
    function fastapiLogicBlock(logicNode, allNodes, edges, dbNodes) {
      const op    = logicNode.data.operation;
      const label = snakeCase(logicNode.data.label || "step");

      const connectedDbIds = new Set(
        edges.filter((e) => e.source === logicNode.id || e.target === logicNode.id)
             .map((e) => e.source === logicNode.id ? e.target : e.source)
      );
      const dbNode   = dbNodes.find((n) => connectedDbIds.has(n.id));
      const modelCls = dbNode ? className(dbNode.data.label || "Model") : "Model";

      if (op === "fetch") {
        const cfg        = logicNode.data.fetchCfg || {};
        const filters    = cfg.filters || [];
        const returnMany = cfg.returnMany;
        const lines      = [`# ${label}: fetch from ${modelCls}`, `query = db.query(${modelCls})`];
        filters.forEach((f) => {
          const val  = resolveValue(f.value, `""`);
          const pyOp = { "is": "==", "is not": "!=", "greater than": ">", "less than": "<" }[f.op] || "==";
          if (f.op === "contains")
            lines.push(`query = query.filter(${modelCls}.${snakeCase(f.field)}.contains(${val}))`);
          else
            lines.push(`query = query.filter(${modelCls}.${snakeCase(f.field)} ${pyOp} ${val})`);
        });
        if (returnMany)
          lines.push(`${label}_result = [r.to_dict() for r in query.all()]`);
        else
          lines.push(
            `${label}_record = query.first()`,
            `if not ${label}_record:`,
            `    raise HTTPException(status_code=404, detail="${modelCls} not found")`,
            `${label}_result = ${label}_record.to_dict()`
          );
        return lines;
      }

      if (op === "save") {
        const cfg     = logicNode.data.saveCfg || {};
        const mapping = cfg.mapping || {};
        const saveOp  = cfg.saveOp || "create";
        const pkField = dbNode?.data?.fields?.find((f) => f.primaryKey);
        const pkVar   = pkField ? snakeCase(pkField.name) : "id";
        const lines   = [`# ${label}: save to ${modelCls}`];
        if (saveOp === "update")
          lines.push(`${label}_record = db.query(${modelCls}).filter(${modelCls}.${pkVar} == ${pkVar}).first()`, `if not ${label}_record:`, `    raise HTTPException(status_code=404, detail="Not found")`);
        else if (saveOp === "create_update")
          lines.push(`${label}_record = db.query(${modelCls}).filter(${modelCls}.${pkVar} == ${pkVar}).first() or ${modelCls}()`);
        else
          lines.push(`${label}_record = ${modelCls}()`);
        Object.entries(mapping).forEach(([field, valObj]) =>
          lines.push(`${label}_record.${snakeCase(field)} = ${resolveValue(valObj, "None")}`)
        );
        lines.push(`db.add(${label}_record)`, `db.commit()`, `db.refresh(${label}_record)`, `${label}_result = ${label}_record.to_dict()`);
        return lines;
      }

      if (op === "delete") {
        const cfg     = logicNode.data.deleteCfg || {};
        const filters = cfg.filters || [];
        const lines   = [`# ${label}: delete from ${modelCls}`, `query = db.query(${modelCls})`];
        filters.forEach((f) => {
          const val  = resolveValue(f.value, `""`);
          const pyOp = { "is": "==", "is not": "!=", "greater than": ">", "less than": "<" }[f.op] || "==";
          lines.push(`query = query.filter(${modelCls}.${snakeCase(f.field)} ${pyOp} ${val})`);
        });
        lines.push(
          `${label}_record = query.first()`,
          `if not ${label}_record:`,
          `    raise HTTPException(status_code=404, detail="Not found")`,
          `db.delete(${label}_record)`,
          `db.commit()`,
          `${label}_result = {"deleted": True}`
        );
        return lines;
      }

      if (op === "validate") {
        const cfg   = logicNode.data.validateCfg || {};
        const field = snakeCase(cfg.field || "value");
        const rules = cfg.rules || [];
        const lines = [`# ${label}: validate ${field}`];
        rules.forEach((r) => {
          if (r.type === "required")
            lines.push(`if not ${field}:`, `    raise HTTPException(status_code=400, detail="${r.onFail || "Required"}")`);
          else if (r.type === "is email")
            lines.push(`if "@" not in str(${field}):`, `    raise HTTPException(status_code=400, detail="${r.onFail || "Invalid email"}")`);
          else if (r.type === "is number")
            lines.push(`if not str(${field}).lstrip("-").replace(".", "", 1).isdigit():`, `    raise HTTPException(status_code=400, detail="${r.onFail || "Not a number"}")`);
          else if (r.type === "min length")
            lines.push(`if len(str(${field})) < ${r.ruleVal || 0}:`, `    raise HTTPException(status_code=400, detail="${r.onFail || "Too short"}")`);
          else if (r.type === "max length")
            lines.push(`if len(str(${field})) > ${r.ruleVal || 255}:`, `    raise HTTPException(status_code=400, detail="${r.onFail || "Too long"}")`);
          else if (r.type === "is URL")
            lines.push(`if not str(${field}).startswith(("http://", "https://")):`, `    raise HTTPException(status_code=400, detail="${r.onFail || "Invalid URL"}")`);
          else if (r.type === "matches pattern")
            lines.push(`if not re.match(r"${r.ruleVal || ".*"}", str(${field})):`, `    raise HTTPException(status_code=400, detail="${r.onFail || "Pattern mismatch"}")`);
        });
        lines.push(`${label}_result = {"${field}": ${field}, "${field}_valid": True}`);
        return lines;
      }

      if (op === "auth_basic") {
        const cfg    = logicNode.data.authBasicCfg || {};
        const uField = snakeCase(cfg.usernameField || "username");
        const pField = snakeCase(cfg.passwordField || "password");
        const lines = [
          `# ${label}: basic auth`,
          `${label}_user = db.query(${modelCls}).filter(${modelCls}.username == ${uField}).first()`,
          `if not ${label}_user or ${label}_user.password != ${pField}:`,
          `    raise HTTPException(status_code=401, detail="Invalid credentials")`,
          `${label}_result = {"token": str(${label}_user.id), "user": ${label}_user.to_dict()}`,
        ];
        if (cfg.tokenField)
          lines.push(
            `_token = ${snakeCase(cfg.tokenField)}`,
            `if not _token or not db.query(${modelCls}).get(_token):`,
            `    raise HTTPException(status_code=401, detail="Unauthorized")`
          );
        return lines;
      }

      if (op === "auth_advanced") {
        const cfg   = logicNode.data.authAdvCfg || {};
        const lines = [`# ${label}: advanced auth`];
        if (cfg.hashField)
          lines.push(`hashed_password = bcrypt.hashpw(${snakeCase(cfg.hashField)}.encode(), bcrypt.gensalt()).decode()`);
        if (cfg.verifyPlainField)
          lines.push(`password_match = bcrypt.checkpw(${snakeCase(cfg.verifyPlainField)}.encode(), ${snakeCase(cfg.verifyHashedField || "hashed")}.encode())`);
        if (cfg.jwtPayloadFields?.length) {
          const expiry = cfg.jwtExpiry === "custom" ? (cfg.jwtExpiryCustom || "1h") : (cfg.jwtExpiry || "1h");
          const expSeconds = { "1h": 3600, "24h": 86400, "7d": 604800, "30d": 2592000 }[expiry];
          const expLine = expSeconds
            ? `"exp": __import__("datetime").datetime.utcnow() + __import__("datetime").timedelta(seconds=${expSeconds})`
            : `"exp": __import__("datetime").datetime.utcnow() + __import__("datetime").timedelta(hours=1)`;
          const payload = `{${cfg.jwtPayloadFields.map((f) => `"${f}": ${snakeCase(f)}`).join(", ")}, ${expLine}}`;
          lines.push(`jwt_token = jwt.encode(${payload}, os.getenv("SECRET_KEY", "secret"), algorithm="HS256")`);
        }
        if (cfg.verifyJwtField)
          lines.push(
            `try:`,
            `    jwt.decode(${snakeCase(cfg.verifyJwtField)}, os.getenv("SECRET_KEY", "secret"), algorithms=["HS256"])`,
            `except Exception:`,
            `    raise HTTPException(status_code=401, detail="Invalid or expired token")`
          );
        if (cfg.decodeJwtField)
          lines.push(`${snakeCase(cfg.decodeJwtOutput || "decoded")} = jwt.decode(${snakeCase(cfg.decodeJwtField)}, os.getenv("SECRET_KEY", "secret"), algorithms=["HS256"])`);
        const resultFields = [
          cfg.hashField                ? `"hashedPassword": hashed_password` : "",
          cfg.verifyPlainField         ? `"passwordMatch": password_match` : "",
          cfg.jwtPayloadFields?.length ? `"jwt": jwt_token` : "",
          cfg.decodeJwtField           ? `"${snakeCase(cfg.decodeJwtOutput || "decoded")}": ${snakeCase(cfg.decodeJwtOutput || "decoded")}` : "",
        ].filter(Boolean).join(", ");
        lines.push(`${label}_result = {${resultFields}}`);
        return lines;
      }

      // transform + utility — same as Flask
      return logicBlock(logicNode, allNodes, edges, dbNodes);
    }

    // Build one route per endpoint
    function buildFastapiRoute(endpointNode, allNodes, edges, dbNodes, usedNames) {
      const method     = (endpointNode.data.method || "GET").toUpperCase();
      const route      = endpointNode.data.route || "/";
      const fnName     = safeFnName(endpointNode.data.label, usedNames);
      const inputs     = (endpointNode.data.input || []).filter((r) => r.key);
      const pathParams = inputs.filter((r) => r.source === "path");
      const queryParams  = inputs.filter((r) => r.source === "query");
      const headerParams = inputs.filter((r) => r.source === "header");
      const bodyParams   = inputs.filter((r) => r.source === "body");

      const logicNodes    = getOrderedLogicNodes(endpointNode, allNodes, edges);
      const lastLogic     = logicNodes[logicNodes.length - 1];
      const responseVar   = lastLogic ? `${snakeCase(lastLogic.data.label || "step")}_result` : null;
      const selectedOutput = endpointNode.data.outputFields || [];

      // Build function signature params
      const sigParts = [];
      pathParams.forEach((r)  => sigParts.push(`${snakeCase(r.key)}: ${paramTypeMap[r.val] || "str"}`));
      queryParams.forEach((r) => sigParts.push(`${snakeCase(r.key)}: ${paramTypeMap[r.val] || "str"} = Query(None)`));
      headerParams.forEach((r) => sigParts.push(`${snakeCase(r.key)}: ${paramTypeMap[r.val] || "str"} = Header(None)`));
      if (bodyParams.length) {
        const schemaName = className(endpointNode.data.label || "endpoint") + "Body";
        sigParts.push(`body: ${schemaName}`);
      }
      if (hasDb) sigParts.push("db: Session = Depends(get_db)");

      const body = [];

      // Extract body fields
      bodyParams.forEach((r) => body.push(`${snakeCase(r.key)} = body.${snakeCase(r.key)}`));
      if (bodyParams.length) body.push("");

      // Inline logic blocks
      logicNodes.forEach((ln, i) => {
        const block = fastapiLogicBlock(ln, allNodes, edges, dbNodes);
        body.push(...block);
        if (i < logicNodes.length - 1) body.push("");
      });
      if (logicNodes.length) body.push("");

      // Return
      if (responseVar && selectedOutput.length) {
        const fields = selectedOutput.map((f) => `"${f}": ${responseVar}.get("${f}")`).join(", ");
        body.push(`return {${fields}}`);
      } else if (responseVar) {
        body.push(`return ${responseVar}`);
      } else {
        body.push(`return {"message": "ok"}`);
      }

      const decorator = method === "DELETE" ? "delete" : method.toLowerCase();
      return [
        `@app.${decorator}("${route}")`,
        `def ${fnName}(${sigParts.join(", ")}):`,
        ...indent(body),
      ].join("\n");
    }

    const extraImports = detectExtraImports(logicNodes);
    const importLines  = [
      "from fastapi import FastAPI, HTTPException, Depends, Query, Header",
      "from pydantic import BaseModel",
      ...extraImports,
      hasDb ? "from sqlalchemy.orm import Session" : "",
      hasDb ? "from database import get_db" : "",
      hasDb ? `from models import ${dbNodes.map((n) => className(n.data.label || "Model")).join(", ")}` : "",
    ].filter(Boolean);

    const routes = endpointNodes.length
      ? endpointNodes.map(((usedNames) => (n) => buildFastapiRoute(n, nodes, edges, dbNodes, usedNames))(new Set())).join("\n\n")
      : `@app.get("/")\ndef index():\n    return {"message": "Hello from DevFlow"}`;

    const mainFile = [
      ...importLines,
      "",
      "app = FastAPI()",
      "",
      ...(schemas.length ? [...schemas, ""] : []),
      routes,
    ].join("\n");

    const fastapiOrmPkgs = {
      "SQLAlchemy":   ["fastapi", "uvicorn", "sqlalchemy", "alembic"],
      "Tortoise ORM": ["fastapi", "uvicorn", "tortoise-orm"],
      "Beanie":       ["fastapi", "uvicorn", "beanie", "motor"],
      "Prisma":       ["fastapi", "uvicorn", "prisma"],
      "None":         ["fastapi", "uvicorn"],
    };
    const pkgs = new Set(fastapiOrmPkgs[orm] || ["fastapi", "uvicorn"]);
    const fastapiDriver = dbDriver(database);
    if (fastapiDriver) pkgs.add(fastapiDriver);
    logicNodes.forEach((n) => {
      if (n.data.operation === "auth_advanced") { pkgs.add("bcrypt"); pkgs.add("pyjwt"); }
    });

    return {
      "main.py":          mainFile,
      "requirements.txt": [...pkgs].join("\n") + "\n",
      ...(modelsFile   ? { "models.py":   modelsFile   } : {}),
      ...(databaseFile ? { "database.py": databaseFile } : {}),
    };
  }

  // Django
  if (framework === "Django") {
    const hasDb = dbNodes.length > 0 && orm !== "None";

    const djangoTypeMap = {
      VARCHAR: "models.CharField(max_length=255", TEXT: "models.TextField(",
      INT: "models.IntegerField(", BIGINT: "models.BigIntegerField(",
      FLOAT: "models.FloatField(", DECIMAL: "models.DecimalField(max_digits=10, decimal_places=2",
      BOOLEAN: "models.BooleanField(", DATE: "models.DateField(",
      DATETIME: "models.DateTimeField(", TIMESTAMP: "models.DateTimeField(",
      UUID: "models.UUIDField(", JSON: "models.JSONField(", BLOB: "models.BinaryField(",
    };

    // models.py
    const modelsFile = [
      "from django.db import models",
      "",
      ...dbNodes.map((n) => {
        const cls    = className(n.data.label || "Model");
        const fields = n.data.fields || [];
        const cols   = fields.map((f) => {
          if (f.primaryKey) return `    # id is auto-generated by Django`;
          if (f.isForeignKey && f.fkRef) {
            const refTable = f.fkRef.split(".")[0];
            const refCls   = className(refTable);
            const parts    = [`models.ForeignKey("${refCls}", on_delete=models.CASCADE`];
            if (!f.required) parts.push("null=True, blank=True");
            if (f.unique)    parts.push("unique=True");
            return `    ${snakeCase(f.name)} = ${parts.join(", ")})`;
          }
          const base  = djangoTypeMap[f.type] || "models.CharField(max_length=255";
          const parts = [];
          if (!f.required) parts.push("blank=True, null=True");
          if (f.unique)    parts.push("unique=True");
          if (f.defaultValue) parts.push(`default=${JSON.stringify(f.defaultValue)}`);
          const extra = parts.length ? ", " + parts.join(", ") : "";
          return `    ${snakeCase(f.name)} = ${base}${extra})`;
        }).filter((l) => !l.includes("# id"));

        const dictFields = fields.filter((f) => !f.primaryKey).map((f) => `"${snakeCase(f.name)}": self.${snakeCase(f.name)}`).join(", ");
        const djangoIndexes = (n.data.indexes || [])
          .filter((ix) => ix.fields && ix.fields.length > 0)
          .map((ix) => {
            const ixFields = ix.fields.map((fn) => `"${snakeCase(fn)}"`).join(", ");
            if (ix.type === "UNIQUE") return `            models.UniqueConstraint(fields=[${ixFields}], name="uq_${snakeCase(n.data.label)}_${ix.fields.map(snakeCase).join("_")}")` ;
            return `            models.Index(fields=[${ixFields}], name="ix_${snakeCase(n.data.label)}_${ix.fields.map(snakeCase).join("_")}")` ;
          });
        return [
          `class ${cls}(models.Model):`,
          ...cols,
          ``,
          `    def to_dict(self):`,
          `        return {"id": self.pk, ${dictFields}}`,
          ``,
          `    class Meta:`,
          `        db_table = "${snakeCase(n.data.tableName || n.data.label || "model")}"`,
          ...(djangoIndexes.length ? [`        indexes = [`, ...djangoIndexes.map((l) => l + ","), `        ]`] : []),
        ].join("\n");
      }),
    ].join("\n");

    // Django inline logic block
    function djangoLogicBlock(logicNode, allNodes, edges, dbNodes) {
      const op    = logicNode.data.operation;
      const label = snakeCase(logicNode.data.label || "step");

      const connectedDbIds = new Set(
        edges.filter((e) => e.source === logicNode.id || e.target === logicNode.id)
             .map((e) => e.source === logicNode.id ? e.target : e.source)
      );
      const dbNode   = dbNodes.find((n) => connectedDbIds.has(n.id));
      const modelCls = dbNode ? className(dbNode.data.label || "Model") : "Model";

      if (op === "fetch") {
        const cfg        = logicNode.data.fetchCfg || {};
        const filters    = cfg.filters || [];
        const returnMany = cfg.returnMany;
        const filterKwargs = filters.map((f) => {
          const val  = resolveValue(f.value, `""`);
          const suffix = { "is": "", "is not": "__ne", "contains": "__icontains", "greater than": "__gt", "less than": "__lt" }[f.op] || "";
          return `${snakeCase(f.field)}${suffix}=${val}`;
        }).join(", ");
        const lines = [`# ${label}: fetch from ${modelCls}`];
        if (returnMany)
          lines.push(`${label}_result = list(${modelCls}.objects.filter(${filterKwargs}).values())`);
        else
          lines.push(
            `try:`,
            `    ${label}_record = ${modelCls}.objects.get(${filterKwargs})`,
            `except ${modelCls}.DoesNotExist:`,
            `    return JsonResponse({"error": "Not found"}, status=404)`,
            `${label}_result = ${label}_record.to_dict()`
          );
        return lines;
      }

      if (op === "save") {
        const cfg     = logicNode.data.saveCfg || {};
        const mapping = cfg.mapping || {};
        const saveOp  = cfg.saveOp || "create";
        const pkField = dbNode?.data?.fields?.find((f) => f.primaryKey);
        const pkVar   = pkField ? snakeCase(pkField.name) : "id";
        const lines   = [`# ${label}: save to ${modelCls}`];
        const kwargs  = Object.entries(mapping).map(([field, valObj]) => `${snakeCase(field)}=${resolveValue(valObj, "None")}`).join(", ");
        if (saveOp === "create")
          lines.push(`${label}_record = ${modelCls}.objects.create(${kwargs})`);
        else if (saveOp === "update")
          lines.push(
            `try:`,
            `    ${label}_record = ${modelCls}.objects.get(pk=${pkVar})`,
            `except ${modelCls}.DoesNotExist:`,
            `    return JsonResponse({"error": "Not found"}, status=404)`,
            ...Object.entries(mapping).map(([field, valObj]) => `${label}_record.${snakeCase(field)} = ${resolveValue(valObj, "None")}`),
            `${label}_record.save()`
          );
        else
          lines.push(`${label}_record, _ = ${modelCls}.objects.update_or_create(pk=${pkVar}, defaults={${Object.entries(mapping).map(([f, v]) => `"${snakeCase(f)}": ${resolveValue(v, "None")}`).join(", ")}})`);
        lines.push(`${label}_result = ${label}_record.to_dict()`);
        return lines;
      }

      if (op === "delete") {
        const cfg     = logicNode.data.deleteCfg || {};
        const filters = cfg.filters || [];
        const filterKwargs = filters.map((f) => {
          const val    = resolveValue(f.value, `""`);
          const suffix = { "is": "", "contains": "__icontains", "greater than": "__gt", "less than": "__lt" }[f.op] || "";
          return `${snakeCase(f.field)}${suffix}=${val}`;
        }).join(", ");
        return [
          `# ${label}: delete from ${modelCls}`,
          `try:`,
          `    ${label}_record = ${modelCls}.objects.get(${filterKwargs})`,
          `except ${modelCls}.DoesNotExist:`,
          `    return JsonResponse({"error": "Not found"}, status=404)`,
          `${label}_record.delete()`,
          `${label}_result = {"deleted": True}`,
        ];
      }

      if (op === "validate") {
        const cfg   = logicNode.data.validateCfg || {};
        const field = snakeCase(cfg.field || "value");
        const rules = cfg.rules || [];
        const lines = [`# ${label}: validate ${field}`];
        rules.forEach((r) => {
          if (r.type === "required")
            lines.push(`if not ${field}:`, `    return JsonResponse({"error": "${r.onFail || "Required"}"}, status=400)`);
          else if (r.type === "is email")
            lines.push(`if "@" not in str(${field}):`, `    return JsonResponse({"error": "${r.onFail || "Invalid email"}"}, status=400)`);
          else if (r.type === "is number")
            lines.push(`if not str(${field}).lstrip("-").replace(".", "", 1).isdigit():`, `    return JsonResponse({"error": "${r.onFail || "Not a number"}"}, status=400)`);
          else if (r.type === "min length")
            lines.push(`if len(str(${field})) < ${r.ruleVal || 0}:`, `    return JsonResponse({"error": "${r.onFail || "Too short"}"}, status=400)`);
          else if (r.type === "max length")
            lines.push(`if len(str(${field})) > ${r.ruleVal || 255}:`, `    return JsonResponse({"error": "${r.onFail || "Too long"}"}, status=400)`);
          else if (r.type === "is URL")
            lines.push(`if not str(${field}).startswith(("http://", "https://")):`, `    return JsonResponse({"error": "${r.onFail || "Invalid URL"}"}, status=400)`);
          else if (r.type === "matches pattern")
            lines.push(`if not re.match(r"${r.ruleVal || ".*"}", str(${field})):`, `    return JsonResponse({"error": "${r.onFail || "Pattern mismatch"}"}, status=400)`);
        });
        lines.push(`${label}_result = {"${field}": ${field}, "${field}_valid": True}`);
        return lines;
      }

      if (op === "auth_basic") {
        const cfg    = logicNode.data.authBasicCfg || {};
        const uField = snakeCase(cfg.usernameField || "username");
        const pField = snakeCase(cfg.passwordField || "password");
        const lines = [
          `# ${label}: basic auth`,
          `${label}_user = authenticate(request, username=${uField}, password=${pField})`,
          `if not ${label}_user:`,
          `    return JsonResponse({"error": "Invalid credentials"}, status=401)`,
          `${label}_result = {"token": str(${label}_user.pk), "user": {"id": ${label}_user.pk, "username": ${label}_user.username}}`,
        ];
        if (cfg.tokenField)
          lines.push(
            `_token = ${snakeCase(cfg.tokenField)}`,
            `if not _token:`,
            `    return JsonResponse({"error": "Unauthorized"}, status=401)`
          );
        return lines;
      }

      if (op === "auth_advanced") {
        const cfg   = logicNode.data.authAdvCfg || {};
        const lines = [`# ${label}: advanced auth`];
        if (cfg.hashField)
          lines.push(`hashed_password = bcrypt.hashpw(${snakeCase(cfg.hashField)}.encode(), bcrypt.gensalt()).decode()`);
        if (cfg.verifyPlainField)
          lines.push(`password_match = bcrypt.checkpw(${snakeCase(cfg.verifyPlainField)}.encode(), ${snakeCase(cfg.verifyHashedField || "hashed")}.encode())`);
        if (cfg.jwtPayloadFields?.length) {
          const expiry = cfg.jwtExpiry === "custom" ? (cfg.jwtExpiryCustom || "1h") : (cfg.jwtExpiry || "1h");
          const expSeconds = { "1h": 3600, "24h": 86400, "7d": 604800, "30d": 2592000 }[expiry];
          const expLine = expSeconds
            ? `"exp": __import__("datetime").datetime.utcnow() + __import__("datetime").timedelta(seconds=${expSeconds})`
            : `"exp": __import__("datetime").datetime.utcnow() + __import__("datetime").timedelta(hours=1)`;
          const payload = `{${cfg.jwtPayloadFields.map((f) => `"${f}": ${snakeCase(f)}`).join(", ")}, ${expLine}}`;
          lines.push(`jwt_token = jwt.encode(${payload}, os.getenv("SECRET_KEY", "secret"), algorithm="HS256")`);
        }
        if (cfg.verifyJwtField)
          lines.push(
            `try:`,
            `    jwt.decode(${snakeCase(cfg.verifyJwtField)}, os.getenv("SECRET_KEY", "secret"), algorithms=["HS256"])`,
            `except Exception:`,
            `    return JsonResponse({"error": "Invalid or expired token"}, status=401)`
          );
        if (cfg.decodeJwtField)
          lines.push(`${snakeCase(cfg.decodeJwtOutput || "decoded")} = jwt.decode(${snakeCase(cfg.decodeJwtField)}, os.getenv("SECRET_KEY", "secret"), algorithms=["HS256"])`);
        const resultFields = [
          cfg.hashField                ? `"hashedPassword": hashed_password` : "",
          cfg.verifyPlainField         ? `"passwordMatch": password_match` : "",
          cfg.jwtPayloadFields?.length ? `"jwt": jwt_token` : "",
          cfg.decodeJwtField           ? `"${snakeCase(cfg.decodeJwtOutput || "decoded")}": ${snakeCase(cfg.decodeJwtOutput || "decoded")}` : "",
        ].filter(Boolean).join(", ");
        lines.push(`${label}_result = {${resultFields}}`);
        return lines;
      }

      // transform + utility — reuse Flask blocks (framework-agnostic)
      return logicBlock(logicNode, allNodes, edges, dbNodes);
    }

    // views.py — one view function per endpoint
    function buildDjangoView(endpointNode, allNodes, edges, dbNodes, usedNames) {
      const method     = (endpointNode.data.method || "GET").toUpperCase();
      const fnName     = safeFnName(endpointNode.data.label, usedNames);
      const inputs     = (endpointNode.data.input || []).filter((r) => r.key);
      const bodyParams   = inputs.filter((r) => r.source === "body");
      const queryParams  = inputs.filter((r) => r.source === "query");
      const headerParams = inputs.filter((r) => r.source === "header");
      const pathParams   = inputs.filter((r) => r.source === "path");

      const logicNodes    = getOrderedLogicNodes(endpointNode, allNodes, edges);
      const lastLogic     = logicNodes[logicNodes.length - 1];
      const responseVar   = lastLogic ? `${snakeCase(lastLogic.data.label || "step")}_result` : null;
      const selectedOutput = endpointNode.data.outputFields || [];

      const pathArgList = pathParams.map((r) => snakeCase(r.key)).join(", ");
      const fnArgs      = pathArgList ? `request, ${pathArgList}` : "request";

      const body = [
        `if request.method != "${method}":`,
        `    return JsonResponse({"error": "Method not allowed"}, status=405)`,
        "",
      ];

      if (bodyParams.length) {
        body.push(`import json`, `data = json.loads(request.body or "{}")`);
        bodyParams.forEach((r) => body.push(`${snakeCase(r.key)} = data.get("${r.key}")`) );
        body.push("");
      }
      queryParams.forEach((r)  => body.push(`${snakeCase(r.key)} = request.GET.get("${r.key}")`) );
      headerParams.forEach((r) => body.push(`${snakeCase(r.key)} = request.headers.get("${r.key}")`) );
      if (queryParams.length || headerParams.length) body.push("");

      logicNodes.forEach((ln, i) => {
        const block = djangoLogicBlock(ln, allNodes, edges, dbNodes);
        body.push(...block);
        if (i < logicNodes.length - 1) body.push("");
      });
      if (logicNodes.length) body.push("");

      if (responseVar && selectedOutput.length) {
        const fields = selectedOutput.map((f) => `"${f}": ${responseVar}.get("${f}")`).join(", ");
        body.push(`return JsonResponse({${fields}})`);
      } else if (responseVar) {
        body.push(`return JsonResponse(${responseVar})`);
      } else {
        body.push(`return JsonResponse({"message": "ok"})`);
      }

      return [
        `def ${fnName}(${fnArgs}):`,
        ...indent(body),
      ].join("\n");
    }

    const extraImports = detectExtraImports(logicNodes);
    const hasAuthBasic = logicNodes.some((n) => n.data.operation === "auth_basic");
    const viewsFile = [
      "from django.http import JsonResponse",
      "from django.views.decorators.csrf import csrf_exempt",
      ...(hasAuthBasic ? ["from django.contrib.auth import authenticate"] : []),
      ...extraImports,
      hasDb ? `from .models import ${dbNodes.map((n) => className(n.data.label || "Model")).join(", ")}` : "",
      "",
      ...((usedNames) => endpointNodes.map((n) => [
        "@csrf_exempt",
        buildDjangoView(n, nodes, edges, dbNodes, usedNames),
      ].join("\n")))(new Set()),
    ].filter((l) => l !== "").join("\n\n");

    // urls.py
    const urlPatterns = ((usedNames) => endpointNodes.map((n) => {
      const route  = (n.data.route || "/").replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, "<$1>");
      const fnName = safeFnName(n.data.label, usedNames);
      return `    path("${route.replace(/^\//, "")}", views.${fnName}),`;
    }))(new Set());

    const urlsFile = [
      "from django.urls import path",
      "from . import views",
      "",
      "urlpatterns = [",
      ...urlPatterns,
      "]",
    ].join("\n");

    const djangoDbConfig = database === "postgres"
      ? [
          "DATABASES = {",
          "    \"default\": {",
          "        \"ENGINE\": \"django.db.backends.postgresql\",",
          `        "NAME": os.getenv("DB_NAME", "mydb"),`,
          `        "USER": os.getenv("DB_USER", "user"),`,
          `        "PASSWORD": os.getenv("DB_PASSWORD", ""),`,
          `        "HOST": os.getenv("DB_HOST", "localhost"),`,
          `        "PORT": os.getenv("DB_PORT", "5432"),`,
          "    }",
          "}",
        ]
      : [
          "DATABASES = {",
          "    \"default\": {",
          "        \"ENGINE\": \"django.db.backends.sqlite3\",",
          "        \"NAME\": BASE_DIR / \"db.sqlite3\",",
          "    }",
          "}",
        ];

    const settingsFile = [
      "from pathlib import Path",
      "import os",
      "",
      "BASE_DIR = Path(__file__).resolve().parent.parent",
      "SECRET_KEY = os.getenv(\"SECRET_KEY\", \"devflow-secret-key\")",
      "DEBUG = True",
      "ALLOWED_HOSTS = [\"*\"]",
      "",
      "INSTALLED_APPS = [",
      "    \"django.contrib.contenttypes\",",
      "    \"django.contrib.auth\",",
      "    \"api\",",
      "]",
      "",
      ...djangoDbConfig,
      "",
      "DEFAULT_AUTO_FIELD = \"django.db.models.BigAutoField\"",
    ].join("\n");

    // manage.py
    const manageFile = [
      "#!/usr/bin/env python",
      "import os, sys",
      "",
      "def main():",
      "    os.environ.setdefault(\"DJANGO_SETTINGS_MODULE\", \"config.settings\")",
      "    from django.core.management import execute_from_command_line",
      "    execute_from_command_line(sys.argv)",
      "",
      "if __name__ == \"__main__\":",
      "    main()",
    ].join("\n");

    const pkgs = new Set(["django"]);
    if (database === "postgres") pkgs.add("psycopg2-binary");
    logicNodes.forEach((n) => {
      if (n.data.operation === "auth_advanced") { pkgs.add("bcrypt"); pkgs.add("pyjwt"); }
    });

    return {
      "manage.py":          manageFile,
      "api/models.py":      modelsFile,
      "api/views.py":       viewsFile,
      "api/urls.py":        urlsFile,
      "config/settings.py": settingsFile,
      "requirements.txt":   [...pkgs].join("\n") + "\n",
    };
  }

  return {};
}

module.exports = { generate };
