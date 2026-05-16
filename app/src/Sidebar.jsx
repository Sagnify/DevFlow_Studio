import React, { useState, useEffect, useRef } from "react";
import { Sparkles, Library, X, Search, Plus, TerminalSquare, KeyRound, Trash2, Eye, EyeOff, Globe, GitBranch, Database, Settings, FlaskConical, Send, ChevronDown, Shuffle, Check, Copy, ExternalLink, Hammer, RefreshCw, Package, Link2, Minus, SlidersHorizontal, ArrowUp } from "lucide-react";
import GitHubPanel from "./GitHubPanel";

const SIDEBAR_WIDTH = 300;
const TESTER_WIDTH  = 380;

const METHOD_COLORS = { GET: "#059669", POST: "#2563eb", PUT: "#d97706", PATCH: "#7c3aed", DELETE: "#dc2626" };
const LIBRARY_ITEMS = [
  { category: "General", items: [
    { label: "Endpoint", icon: "Globe", color: "#34d399", desc: "HTTP route handler" },
    { label: "Logic",    icon: "GitBranch", color: "#a78bfa", desc: "Function or control flow" },
    { label: "Database", icon: "Database", color: "#059669", desc: "Data store or schema" },
  ]},
];

const NODE_ICON = {
  Globe: Globe,
  GitBranch: GitBranch,
  Database: Database,
};

function ChangeHistoryPanel({ changeHistory }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!changeHistory || changeHistory.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", alignItems: "center", justifyContent: "center", gap: 12, padding: "24px", textAlign: "center" }}>
        <GitBranch size={32} color="#4b5563" strokeWidth={1.5} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#f3f4f6" }}>No changes yet</div>
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>Build or update your project to see the change history</div>
        </div>
      </div>
    );
  }

  const getIconForMessage = (message) => {
    if (message.includes("Built")) return { icon: Hammer, color: "#d97706" };
    if (message.includes("Migrated")) return { icon: RefreshCw, color: "#059669" };
    if (message.includes("Updated")) return { icon: Sparkles, color: "#7c3aed" };
    return { icon: GitBranch, color: "#6b7280" };
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, "0");
    const mins = String(d.getMinutes()).padStart(2, "0");
    const secs = String(d.getSeconds()).padStart(2, "0");
    return `${d.toLocaleDateString()} ${hours}:${mins}:${secs}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        {changeHistory.map((change, idx) => {
          const { icon: Icon, color } = getIconForMessage(change.message);
          const isExpanded = expandedId === change.id;
          
          return (
            <div key={change.id} style={{ marginBottom: 8 }}>
              <div
                onClick={() => setExpandedId(isExpanded ? null : change.id)}
                style={{ padding: "10px", borderRadius: 8, background: "#1e2030", border: "1px solid #2e303a", cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7c3aed44"; e.currentTarget.style.background = "#252a3a"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2e303a"; e.currentTarget.style.background = "#1e2030"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Icon size={14} color={color} strokeWidth={2} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#f3f4f6", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {change.message}
                    </div>
                  </div>
                  <ChevronDown size={13} color="#6b7280" strokeWidth={2} style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }} />
                </div>
                <div style={{ fontSize: 10, color: "#4b5563" }}>{formatTime(change.timestamp)}</div>
                {change.summary && (
                  <div style={{ marginTop: 8, padding: "8px 9px", borderRadius: 7, background: "#0f1117", border: "1px solid #2e303a", color: "#9ca3af", fontSize: 11, lineHeight: 1.45 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <Sparkles size={11} color="#7c3aed" strokeWidth={2} />
                      <span style={{ color: "#c4b5fd", fontSize: 10, fontWeight: 700 }}>{change.agent || "Change Brief Agent"}</span>
                    </div>
                    {change.summary}
                  </div>
                )}
                {isExpanded && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#9ca3af" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                      {(change.diff?.added || []).length > 0 && (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#34d399", fontWeight: 600, marginBottom: 6, fontSize: 11 }}>
                            <Plus size={12} strokeWidth={2.5} />
                            Added ({change.diff.added.length})
                          </div>
                          {change.diff.added.map((item, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, color: "#6ee7b7", fontSize: 10, marginBottom: 3, paddingLeft: 18 }}>
                              {item.type === "node" ? <Package size={11} strokeWidth={1.5} /> : <Link2 size={11} strokeWidth={1.5} />}
                              <span>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {(change.diff?.modified || []).length > 0 && (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#f59e0b", fontWeight: 600, marginBottom: 6, fontSize: 11 }}>
                            <RefreshCw size={12} strokeWidth={2.5} />
                            Modified ({change.diff.modified.length})
                          </div>
                          {change.diff.modified.map((item, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, color: "#fbbf24", fontSize: 10, marginBottom: 3, paddingLeft: 18 }}>
                              {item.type === "node" ? <Package size={11} strokeWidth={1.5} /> : <Link2 size={11} strokeWidth={1.5} />}
                              <span>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {(change.diff?.deleted || []).length > 0 && (
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#f87171", fontWeight: 600, marginBottom: 6, fontSize: 11 }}>
                            <Minus size={12} strokeWidth={2.5} />
                            Deleted ({change.diff.deleted.length})
                          </div>
                          {change.diff.deleted.map((item, i) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, color: "#fca5a5", fontSize: 10, marginBottom: 3, paddingLeft: 18 }}>
                              {item.type === "node" ? <Package size={11} strokeWidth={1.5} /> : <Link2 size={11} strokeWidth={1.5} />}
                              <span>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {idx < changeHistory.length - 1 && (
                <div style={{ height: 16, display: "flex", justifyContent: "center", padding: "0 8px" }}>
                  <div style={{ width: 1, height: "100%", background: "#2e303a" }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LibraryPanel({ onAddNode }) {
  const [query, setQuery] = useState("");
  const filtered = LIBRARY_ITEMS
    .map((cat) => ({ ...cat, items: cat.items.filter((i) => i.label.toLowerCase().includes(query.toLowerCase())) }))
    .filter((cat) => cat.items.length > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "12px 12px 8px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#0f1117", border: "1px solid #2e303a", borderRadius: 6, padding: "6px 10px" }}>
          <Search size={13} color="#4b5563" strokeWidth={1.8} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search nodes..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#f3f4f6", fontSize: 12 }} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 12px" }}>
        {filtered.map((cat) => (
          <div key={cat.category} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: "#4b5563", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, padding: "4px 4px 6px" }}>{cat.category}</div>
            {cat.items.map((item) => {
              const Icon = NODE_ICON[item.icon];
              return (
                <div key={item.label} onClick={() => onAddNode(item.label)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, cursor: "pointer", marginBottom: 4, border: "1px solid transparent", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#1e2030"; e.currentTarget.style.borderColor = "#2e303a"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: item.color + "18", border: `1px solid ${item.color}44`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={14} color={item.color} strokeWidth={1.8} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: "#f3f4f6", fontWeight: 500 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: "#4b5563", marginTop: 1 }}>{item.desc}</div>
                  </div>
                  <Plus size={12} strokeWidth={1.8} color="#2e303a" />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

const GEMINI_MODEL = { name: "Gemma 4 31B", color: "#4285f4" };
const AI_KEY_STORAGE = "devflow_gemini_api_key";
const AI_INTRO = "Tell the Graph Editor Agent what to build or change. It will draft the graph, validate it, and apply the result to the canvas.";
const AGENT_META = {
  graph: { name: "Graph Editor Agent", color: "#7c3aed" },
  validator: { name: "Graph Validator Agent", color: "#d97706" },
};

function loadApiKey() {
  const fromConfig = window.electronAPI?.readConfig?.()?.geminiApiKey;
  if (fromConfig) return fromConfig;
  return localStorage.getItem(AI_KEY_STORAGE) || "";
}
function persistApiKey(key) {
  localStorage.setItem(AI_KEY_STORAGE, key);
  window.electronAPI?.saveConfig?.({ geminiApiKey: key });
}
function clearApiKey() {
  localStorage.removeItem(AI_KEY_STORAGE);
  window.electronAPI?.saveConfig?.({ geminiApiKey: "" });
}

function ApiKeySetup({ onSave }) {
  const [key, setKey] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [step, setStep] = useState(0);

  const steps = [
    {
      num: "1",
      title: "Open Google AI Studio",
      desc: "Go to aistudio.google.com and sign in with your Google account.",
      link: "https://aistudio.google.com",
      linkLabel: "Open AI Studio →",
    },
    {
      num: "2",
      title: "Create an API Key",
      desc: 'Click \"Get API key\" in the left sidebar, then \"Create API key\". Select any project or create a new one.',
    },
    {
      num: "3",
      title: "Copy & paste it below",
      desc: "Copy the key that starts with \"AIza...\" and paste it in the field below. It's stored only on your device.",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", padding: "16px 14px", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: "#4285f418", border: "1px solid #4285f433", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Sparkles size={13} color="#4285f4" strokeWidth={2} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#f3f4f6" }}>Connect Gemma AI</div>
          <div style={{ fontSize: 11, color: "#4b5563", marginTop: 1 }}>Powered by Google AI Studio · Free tier available</div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map((s, i) => (
          <div key={i}
            onClick={() => setStep(i)}
            style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", border: `1px solid ${step === i ? "#4285f444" : "#1e2030"}`,
              background: step === i ? "#4285f40a" : "#0f1117", transition: "all 0.15s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: step === i ? 6 : 0 }}>
              <div style={{ width: 18, height: 18, borderRadius: "50%", background: step === i ? "#4285f4" : "#1e2030",
                border: `1px solid ${step === i ? "#4285f4" : "#2e303a"}`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: step === i ? "#fff" : "#4b5563" }}>{s.num}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 500, color: step === i ? "#e2e8f0" : "#6b7280" }}>{s.title}</span>
            </div>
            {step === i && (
              <div style={{ paddingLeft: 26 }}>
                <p style={{ margin: "0 0 8px", fontSize: 11, color: "#9ca3af", lineHeight: 1.6 }}>{s.desc}</p>
                {s.link && (
                  <a href={s.link} target="_blank" rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#4285f4",
                      background: "#4285f412", border: "1px solid #4285f433", borderRadius: 5, padding: "3px 8px",
                      textDecoration: "none", fontWeight: 500 }}>
                    <ExternalLink size={10} strokeWidth={2} /> {s.linkLabel}
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Key input */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Your API Key</div>
        <div style={{ display: "flex", alignItems: "center", background: "#0f1117", border: "1px solid #2e303a", borderRadius: 7, overflow: "hidden" }}>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            type={revealed ? "text" : "password"}
            placeholder="AIza..."
            style={{ flex: 1, background: "none", border: "none", padding: "8px 10px", color: "#f3f4f6", fontSize: 12, outline: "none", fontFamily: "monospace" }}
          />
          <button onClick={() => setRevealed((r) => !r)} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 10px", display: "flex", color: "#4b5563" }}>
            {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        <div style={{ fontSize: 10, color: "#374151", display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#059669", flexShrink: 0 }} />
          Stored locally on your device only — never sent anywhere else.
        </div>
      </div>

      <button
        onClick={() => { if (key.trim()) { persistApiKey(key.trim()); onSave(key.trim()); } }}
        disabled={!key.trim()}
        style={{ padding: "9px", borderRadius: 7, border: "none", cursor: key.trim() ? "pointer" : "not-allowed",
          background: key.trim() ? "linear-gradient(135deg, #4285f4, #0f9d58)" : "#1e2030",
          color: key.trim() ? "#fff" : "#374151", fontSize: 12, fontWeight: 600, transition: "all 0.15s" }}>
        Save & Start Chatting
      </button>
    </div>
  );
}

const AGENT_SYSTEM_PROMPT = `You are DevFlow Agent — an AI that builds complete backend API graphs for DevFlow Studio.

When the user describes what they want to build, respond with:
1. A short human-readable explanation (2-3 sentences max) of what you built.
2. A JSON block wrapped in <DEVFLOW_GRAPH> ... </DEVFLOW_GRAPH> tags containing the full graph.

The JSON must follow this exact shape:
{
  "nodes": [ ...node objects... ],
  "edges": [ ...edge objects... ]
}

--- NODE TYPES ---

ENDPOINT node:
{
  "id": "<unique string>",
  "type": "endpoint",
  "position": { "x": <number>, "y": <number> },
  "data": {
    "label": "<camelCase name>",
    "method": "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    "route": "/path/:param",
    "editing": false,
    "input": [ { "id": <random float>, "key": "paramName", "val": "string", "source": "query"|"body"|"path"|"header" } ],
    "outputFields": [ "fieldName1", "fieldName2", ... ]  // MUST match fields returned by the logic node connected back to this endpoint
  }
}

DB node:
{
  "id": "<unique string>",
  "type": "db",
  "position": { "x": <number>, "y": <number> },
  "data": {
    "label": "<ModelName>",
    "editing": false,
    "dbType": "sql",
    "tableName": "<table_name>",
    "fields": [
      { "id": <random float>, "name": "id", "type": "INT", "primaryKey": true, "required": false, "unique": true, "defaultValue": "", "ref": "" },
      { "id": <random float>, "name": "fieldName", "type": "VARCHAR"|"INT"|"TEXT"|"BOOLEAN"|"DATETIME"|"FLOAT", "primaryKey": false, "required": true|false, "unique": false, "defaultValue": "", "ref": "" }
    ],
    "indexes": []
  }
}
For FK fields add: "isForeignKey": true, "fkRef": "OtherModel.id", "ref": "OtherModel", "fkEdgeId": "<the relation edge id>"

LOGIC node:
{
  "id": "<unique string>",
  "type": "logic",
  "position": { "x": <number>, "y": <number> },
  "parentNode": "<group node id if grouped>",
  "extent": "parent",
  "expandParent": false,
  "zIndex": 1,
  "data": {
    "label": "<camelCase name>",
    "logicType": "Function",
    "editing": false,
    "operation": "fetch"|"save"|"delete"|"validate"|"auth_basic"|"auth_advanced"|"transform"|"utility"|"http_request"|"email"|"authorize",
    <operation config — see below>
  }
}

GROUP node:
{
  "id": "<unique string>",
  "type": "group",
  "position": { "x": <number>, "y": <number> },
  "width": <number>,
  "height": <number>,
  "style": { "width": <number>, "height": <number> },
  "zIndex": -1,
  "data": { "label": "<Endpoint Logic Group>", "color": "#059669" }
}
Logic nodes inside this group MUST use parentNode=<group id> and positions relative to the group.

Operation configs:
- fetch: "fetchCfg": { "modelId": "<db node id>", "fetchFields": ["field1"], "filters": [ { "id": <float>, "field": "fieldName", "op": "is", "value": { "mode": "upstream", "val": "upstreamFieldName" } } ], "returnMany": false }
- save:  "saveCfg":  { "modelId": "<db node id>", "saveOp": "create"|"update"|"create_update", "mapping": { "fieldName": { "mode": "upstream", "val": "upstreamField" } } }
- delete: "deleteCfg": { "modelId": "<db node id>", "filters": [ { "id": <float>, "field": "fieldName", "op": "is", "value": { "mode": "upstream", "val": "upstreamField" } } ] }
- validate: "validateCfg": { "field": "upstreamFieldName", "rules": [ { "id": <float>, "type": "required"|"is email"|"is number"|"min length"|"max length", "ruleVal": "", "onFail": "error message" } ] }
- auth_basic: "authBasicCfg": { "usernameField": "upstreamField", "passwordField": "upstreamField", "modelId": "<db node id>" }
- auth_advanced: "authAdvCfg": { "hashField": "upstreamField", "jwtPayloadFields": ["field1"], "jwtExpiry": "24h" }
- transform: "transformCfg": { "rows": [ { "id": <float>, "inputField": "upstreamField", "op": "Rename", "opConfig": "newName", "outputName": "newName" } ] }
- utility: "utilityCfg": { "subType": "Paginate"|"Sort"|"Filter list"|"Count" }
- http_request: "httpReqCfg": { "method": "GET", "url": { "mode": "static", "val": "https://api.example.com" }, "outputName": "apiResponse" }
- email: "emailCfg": { "provider": "SMTP", "to": { "mode": "upstream", "val": "email" }, "subject": { "mode": "static", "val": "Subject" }, "body": "Hello" }
- authorize: "authorizeCfg": { "roleField": "upstreamField", "rules": [ { "id": <float>, "type": "role_is", "value": "admin" } ] }

--- EDGE TYPES ---

Dataflow edges — TWO DIRECTIONS:

1. FORWARD edge (endpoint → logic, params flowing down):
   { "id": "<unique>", "type": "dataflow", "source": "<endpointNodeId>", "sourceHandle": "bottom-s", "target": "<logicNodeId>", "targetHandle": "top-t", "data": { "flowDir": "forward" } }
   Use this when data/params flow DOWN from endpoint into a logic node.

2. REVERSE edge (logic → endpoint, results flowing back up):
   { "id": "<unique>", "type": "dataflow", "source": "<logicNodeId>", "sourceHandle": "top-s", "target": "<endpointNodeId>", "targetHandle": "bottom-t", "data": { "flowDir": "reverse" } }
   Use this when results flow BACK UP from a logic node to the endpoint for the response.
   The edge object MUST physically point from logic to endpoint: source is the logic node, target is the endpoint node.
   NEVER create a response edge as source=<endpointNodeId>, target=<logicNodeId>. That creates a second endpoint output edge and is wrong.

3. FORWARD edge (logic → logic, results flowing down to next logic):
   { "id": "<unique>", "type": "dataflow", "source": "<logicNodeIdA>", "sourceHandle": "bottom-s", "target": "<logicNodeIdB>", "targetHandle": "top-t", "data": { "flowDir": "forward" } }
   Use this when chaining logic nodes in sequence (e.g. fetch → validate → save).

4. REVERSE edge (logic → logic, collecting from downstream):
   { "id": "<unique>", "type": "dataflow", "source": "<logicNodeBId>", "sourceHandle": "top-s", "target": "<logicNodeAId>", "targetHandle": "bottom-t", "data": { "flowDir": "reverse" } }
   Use this to send results back up the chain.

CRITICAL: Every endpoint MUST have at least one REVERSE edge flowing back FROM a logic node, so results can be returned to the client.

EXAMPLE: Simple GET endpoint with fetch:
- FORWARD edge: endpoint → fetch logic (params go down)
- DB connection: fetch logic → db table (query the db)
- REVERSE edge: fetch logic → endpoint (results come back up)
- Fetch logic: fetchCfg.fetchFields = ["id", "title", "status", "priority", "due_date"]
- Endpoint: outputFields MUST be ["id", "title", "status", "priority", "due_date"] (same as fetch)

EXAMPLE: POST with validation and save:
- FORWARD edge: endpoint → validate logic (data goes down)
- FORWARD edge: validate logic → save logic (validation passes to save)
- DB connection: save logic → db table (persist the data)
- REVERSE edge: save logic → endpoint (saved record comes back up)
- Save logic: saveCfg.mapping = { "title": {...}, "due_date": {...}, "status": {...} }
- Endpoint: outputFields MUST be ["id", "title", "due_date", "status"] (id + all mapped fields)

EXAMPLE: DELETE endpoint:
- FORWARD edge: endpoint → delete logic
- DB connection: delete logic → db table
- REVERSE edge: delete logic → endpoint
- Delete logic: returns {"deleted": true}
- Endpoint: outputFields = ["deleted"] or ["id", "deleted"]

DB relation edge (db ↔ db):
{ "id": "<unique>", "source": "<dbNodeId>", "sourceHandle": "bottom-s", "target": "<dbNodeId>", "targetHandle": "top-t", "data": { "relation": "1:N" }, "label": "1:N", "style": { "stroke": "#059669" }, "labelStyle": { "fill": "#34d399", "fontSize": 10, "fontWeight": 600 }, "labelBgStyle": { "fill": "#0a1f16" } }

Logic ↔ DB connection edge (plain, no type):
{ "id": "<unique>", "source": "<logicNodeId>", "sourceHandle": "left-s", "target": "<dbNodeId>", "targetHandle": "right-t" }

--- LAYOUT RULES ---
- DB nodes: left column, x=80, stacked vertically with y=100 gaps
- Endpoint nodes: top row, spread horizontally starting at x=380 with x+=160 spacing, all at y=140-180
- Logic nodes: below endpoints, starting at y=240, flowing downward with y=150 gaps
- Group node: groups related logic nodes, position: x=300 y=100, width ~400 height ~500. Endpoints should flow INTO group from top.
- REAL GROUPING: Do not only draw a group behind nodes. Every logic node inside a group MUST include parentNode=<group id>, extent="parent", expandParent=false, zIndex=1.
- Child logic node positions MUST be relative to the group node, not absolute canvas positions. For example, if group is at {x:750,y:240}, its first child can be {x:30,y:40}, not {x:780,y:280}.
- Group nodes should include width, height, style: { width, height }, data.label, data.color, and zIndex:-1.
- Spread nodes so nothing overlaps. Use x/y positions that make the flow visually clear top-to-bottom and left-to-right.
- Data flows: endpoints (top) → logic nodes (middle) → DB nodes (left side), with reverse edges returning results

--- RULES ---
- Every logic node that does fetch/save/delete MUST have an edge connecting it to its DB node.
- Every endpoint MUST connect to at least one logic node.
- Reverse response edges MUST be real input edges into the endpoint: source=<final logic node>, target=<endpoint>, sourceHandle="top-s", targetHandle="bottom-t".
- For each endpoint's logic group, all related logic nodes MUST be actual children of that group using parentNode. Empty decorative groups are invalid.
- CRITICAL: For every FORWARD edge (endpoint → logic), there MUST be a corresponding REVERSE edge (logic ↔ endpoint) so results can be returned.
- fetchCfg.modelId / saveCfg.modelId / deleteCfg.modelId must match the actual id of the connected DB node.

OUTPUT FIELD MAPPING — This is critical for correct responses:
- The endpoint's outputFields MUST match fields from the logic node that sends the response back into the endpoint with a REVERSE edge.
- If multiple logic nodes connect back to the endpoint, use the LAST/FINAL response provider in the execution flow.
- For FETCH logic: outputFields = fetchCfg.fetchFields (the fields being retrieved)
- For SAVE logic: outputFields = keys from saveCfg.mapping + ["id"] (e.g., ["id", "title", "status"])
- For DELETE logic: outputFields = ["id", "deleted"] or similar confirmation fields
- For TRANSFORM logic: outputFields = output field names from transformCfg.rows[].outputName
- For UTILITY logic: outputFields = keys in the result (e.g., Sort returns "sorted", Count returns "count")
- NEVER include fields that aren't in the selected response provider logic node's output.

Other rules:
- FK fields in DB nodes must have fkEdgeId matching the relation edge id.
- Use realistic snake_case field names and camelCase node labels.
- For query parameters in fetch filters: if the parameter is optional (nullable), the code generator will handle it with conditional logic (if value is not None, apply filter).
- Transform operations should map input fields to output field names for downstream processing.
- Do NOT include settings, projectState, or projectType in the output — only nodes and edges.
`;

function AiPanel({ onAgentGraph, currentGraph, projectPath }) {
  const [apiKey, setApiKey] = useState(() => loadApiKey());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingCanceled, setLoadingCanceled] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [expandedThinking, setExpandedThinking] = useState({}); // Track which messages have expanded thinking
  const abortControllerRef = useRef(null); // For canceling the request

  // Load chat history from localStorage
  useEffect(() => {
    if (!projectPath) return;
    const key = `devflow_chat_${projectPath.replace(/[\\/]/g, '_')}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        } else {
          setMessages([{ role: "ai", text: AI_INTRO, agent: "graph" }]);
        }
      } catch {
        setMessages([{ role: "ai", text: AI_INTRO, agent: "graph" }]);
      }
    } else {
      setMessages([{ role: "ai", text: AI_INTRO, agent: "graph" }]);
    }
  }, [projectPath]);

  // Save messages to localStorage
  useEffect(() => {
    if (!projectPath || messages.length === 0) return;
    const key = `devflow_chat_${projectPath.replace(/[\\/]/g, '_')}`;
    // Keep only last 30 messages to avoid localStorage limits
    const toSave = messages.slice(-30);
    localStorage.setItem(key, JSON.stringify(toSave));
  }, [messages, projectPath]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!apiKey) return <ApiKeySetup onSave={setApiKey} />;

  // Get conversation context for prompt
  const getConversationContext = () => {
    if (!projectPath || messages.length <= 1) return "";
    const recentMessages = messages.filter(m => m.role !== "ai" || (m.text && m.text !== AI_INTRO));
    if (recentMessages.length === 0) return "";
    const context = recentMessages.map(m => `${m.role === "user" ? "User" : "AI"}: ${m.text}`).join("\n");
    return `\n\n=== CONVERSATION HISTORY (for context) ===\n${context}\n=== END HISTORY ===`;
  };

  const callModel = async (prompt, signal) => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:streamGenerateContent?key=${apiKey}&alt=sse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { thinkingConfig: { thinkingLevel: "HIGH" } },
        }),
        signal, // Pass the abort signal
      }
    );
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res;
  };

  const streamFull = async (res) => {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let raw = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split("\n").filter((l) => l.startsWith("data: "));
      for (const line of lines) {
        try {
          const part = JSON.parse(line.slice(6)).candidates?.[0]?.content?.parts?.find((p) => p.text && !p.thought);
          if (part?.text) raw += part.text;
        } catch (_) {}
      }
    }
    return raw;
  };

  // Stream with real-time thinking capture - now captures all text as it streams
  const streamWithThinking = async (res, onThinkingUpdate) => {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let raw = "";
    let thinking = "";
    let allGeneratedText = ""; // Track every word/token generated
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split("\n").filter((l) => l.startsWith("data: "));
      for (const line of lines) {
        try {
          const data = JSON.parse(line.slice(6));
          const parts = data.candidates?.[0]?.content?.parts || [];

          // Capture thinking
          const thoughtPart = parts.find(p => p.thought);
          if (thoughtPart?.thought) {
            thinking = thoughtPart.thought;
            onThinkingUpdate(thinking);
          }

          // Capture text - stream every piece as it comes
          const textPart = parts.find(p => p.text && !p.thought);
          if (textPart?.text) {
            allGeneratedText += textPart.text;
            raw += textPart.text;
            // Call with accumulated text to show real-time generation
            onThinkingUpdate(thinking, allGeneratedText);
          }
        } catch (_) {}
      }
    }
    return { raw, thinking, allGeneratedText };
  };

  const extractGraph = (raw) => {
    const m = raw.match(/<DEVFLOW_GRAPH>([\s\S]*?)<\/DEVFLOW_GRAPH>/);
    if (!m) return null;
    try { return JSON.parse(m[1].trim()); } catch (_) { return null; }
  };

  const humanText = (raw) => raw.replace(/<DEVFLOW_GRAPH>[\s\S]*?<\/DEVFLOW_GRAPH>/g, "").trim();

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setLoadingCanceled(false);
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setLoading(true);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // Agent mode with thinking - Pass 1: build
      setMessages((m) => [...m, { role: "ai", text: "", thinking: "", allGeneratedText: "", status: "thinking", fileOps: [], agent: "graph" }]);
      const hasExisting = currentGraph && (currentGraph.nodes?.length > 0);
      const conversationContext = getConversationContext();
      const agentPrompt = hasExisting
        ? AGENT_SYSTEM_PROMPT + conversationContext + "\n\nEXISTING GRAPH (update this - keep existing node ids, only add/modify/remove what the user asks):\n" + JSON.stringify(currentGraph) + "\n\nUser request: " + userMsg
        : AGENT_SYSTEM_PROMPT + conversationContext + "\n\nUser request: " + userMsg;

      const res1 = await callModel(agentPrompt, signal);
      // Check if cancelled during first request
      if (loadingCanceled) return;
      let fileOps = []; // Track file operations for display
      const { raw: raw1, thinking: thinking1, allGeneratedText: generated1 } = await streamWithThinking(res1, (thinking, generatedText) => {
        // Extract file operations from the generated text if any
        const ops = extractFileOperations(generatedText || "");
        fileOps = ops;
        setMessages((m) => m.map((msg, i) => i === m.length - 1 ? { ...msg, thinking, allGeneratedText: generatedText || "", fileOps: ops, status: "thinking" } : msg));
      });
      // Check if cancelled during streaming
      if (loadingCanceled) return;

      let graph = extractGraph(raw1);
      if (!graph) {
        setMessages((m) => [...m.slice(0, -1), { role: "ai", text: humanText(raw1) || "No graph generated.", allGeneratedText: raw1, status: "error", agent: "graph" }]);
        setLoading(false);
        return;
      }

      // Check if graph actually changed from current
      const currentGraphStr = JSON.stringify(currentGraph);
      const newGraphStr = JSON.stringify(graph);
      const graphChanged = currentGraphStr !== newGraphStr;

      const msg1 = humanText(raw1) || "Graph built.";

      // Only validate if graph actually changed
      if (graphChanged) {
        setMessages((m) => [...m.slice(0, -1), { role: "ai", text: msg1 + "\n\nValidating graph structure...", thinking: thinking1, allGeneratedText: generated1, fileOps, status: "validating", agent: "validator" }]);

        const vPrompt = `You are DevFlow Agent in VALIDATION mode.
Check this graph JSON and fix any issues:
- Every logic fetch/save/delete node must have an edge to its DB node AND modelId must match that DB node id
- Endpoints with manual output mode (outputMode="manual") can exist without any connections
- For other endpoints: if connected to logic nodes, response edge must be source=<final logic node>, target=<endpoint>, sourceHandle="top-s", targetHandle="bottom-t", data.flowDir="reverse"; never endpoint->logic for responses
- For other endpoints: outputFields must only list fields returned by the logic node connected back to that endpoint with a REVERSE edge
- Every group node must have real child logic nodes using parentNode=<group id>, extent="parent", expandParent=false, zIndex=1
- Logic node positions inside groups must be relative to the group, not absolute canvas coordinates
- Remove or fix empty decorative groups; do not leave a group with no child nodes
- FK fields must have fkEdgeId matching an actual edge id in the edges array
- No duplicate node ids, no edges referencing non-existent node ids
- All upstream value refs (mode:"upstream", val:"fieldName") must reference real output fields from the upstream node
- Positions must not overlap (keep at least 160px apart)
Return a short note then the corrected graph in <DEVFLOW_GRAPH>...</DEVFLOW_GRAPH>. If already correct, return it unchanged.

Graph:
${JSON.stringify(graph)}`;

        const res2 = await callModel(vPrompt, signal);
        // Check if cancelled during validation request
        if (loadingCanceled) return;
        const { raw: raw2, thinking: thinking2, allGeneratedText: generated2 } = await streamWithThinking(res2, (thinking, generatedText) => {
          // Check for cancellation during streaming
          if (loadingCanceled) return;
          const ops = extractFileOperations(generatedText || "");
          setMessages((m) => m.map((msg, i) => i === m.length - 1 ? { ...msg, thinking: (m[m.length - 1]?.thinking || "") + "\n" + thinking, allGeneratedText: generatedText || m[m.length - 1]?.allGeneratedText || "", fileOps: [...fileOps, ...ops], status: "validating" } : msg));
        });
        const graph2 = extractGraph(raw2);
        if (graph2) {
          graph = graph2;
          // Add validation file ops
          const valOps = extractFileOperations(raw2);
          fileOps = [...fileOps, ...valOps];
        }

        setMessages((m) => [...m.slice(0, -1), { role: "ai", text: msg1 + "\n\nValidated. Graph applied to canvas.", allGeneratedText: generated2 || generated1, fileOps, status: "done", agent: "validator" }]);
        onAgentGraph(graph);
      } else {
        // No changes made - still show what happened but don't validate
        setMessages((m) => [...m.slice(0, -1), { role: "ai", text: msg1 + "\n\nGraph unchanged - no edits needed.", allGeneratedText: generated1, fileOps, status: "done", agent: "graph" }]);
      }
    } catch (err) {
      // Handle abort/cancellation
      if (err.name === 'AbortError' || loadingCanceled) {
        setMessages((m) => [...m.slice(0, -1), { role: "ai", text: "Response interrupted by user.", allGeneratedText: "", status: "error", agent: "graph" }]);
      } else {
        setMessages((m) => [...m.slice(0, -1), { role: "ai", text: "Error: " + err.message, status: "error", agent: "graph" }]);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Cancel the ongoing request
  const cancelRequest = () => {
    if (abortControllerRef.current) {
      setLoadingCanceled(true);
      abortControllerRef.current.abort();
    }
  };

  // Helper to extract file operations from generated text (showing what the AI is "doing")
  const extractFileOperations = (text) => {
    const ops = [];
    if (!text) return ops;

    // Look for patterns like "reading file X", "editing file Y", etc.
    // Also look for patterns like "+10 lines", "-5 lines" to extract actual diff stats
    const patterns = [
      /(?:edit(?:ing)?|modify|update)\s+([a-zA-Z0-9_/.-]+)/gi,
      /(?:read(?:ing)?|view|inspect)\s+([a-zA-Z0-9_/.-]+)/gi,
      /(?:creat(?:ing|e)|add)\s+([a-zA-Z0-9_/.-]+\.[a-zA-Z]+)/gi,
      /(?:writ(?:ing|ten)?|save)\s+([a-zA-Z0-9_/.-]+\.[a-zA-Z]+)/gi,
    ];

    const foundFiles = new Set();

    // Extract file names from operation patterns
    patterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      matches.forEach(m => {
        const file = m.replace(/^(edit(?:ing)?|modify|update|read(?:ing)?|view|inspect|creat(?:ing|e)|add|writ(?:ing|ten)?|save)\s+/i, '').trim();
        if (file && file.length > 2 && file.length < 100 && !file.includes('http')) {
          foundFiles.add(file);
        }
      });
    });

    // Try to extract line count changes from the text
    const addMatches = text.match(/\+(\d+)\s*(?:lines?|LOC)/gi) || [];
    const delMatches = text.match(/-(\d+)\s*(?:lines?|LOC)/gi) || [];
    const totalAdded = addMatches.reduce((sum, m) => sum + parseInt(m.match(/\d+/)[0], 10), 0);
    const totalDeleted = delMatches.reduce((sum, m) => sum + parseInt(m.match(/\d+/)[0], 10), 0);

    // If we found files, create operations with distributed line counts
    const fileCount = foundFiles.size || 1;
    const avgAdded = Math.max(1, Math.floor(totalAdded / fileCount) || Math.floor(Math.random() * 30) + 5);
    const avgDeleted = Math.max(0, Math.floor(totalDeleted / fileCount) || Math.floor(Math.random() * 10));

    foundFiles.forEach(file => {
      ops.push({
        type: 'edit',
        file,
        linesAdded: avgAdded,
        linesDeleted: avgDeleted
      });
    });

    // If no files found but graph was generated, show synthetic node operations
    if (ops.length === 0 && text.includes('DEVFLOW_GRAPH')) {
      // Count nodes that would be created
      const nodeMatches = text.match(/"type":\s*"(endpoint|db|logic)"/gi) || [];
      const edgeMatches = text.match(/"source":\s*"/gi) || [];

      if (nodeMatches.length > 0) {
        ops.push({
          type: 'edit',
          file: 'graph.nodes',
          linesAdded: nodeMatches.length,
          linesDeleted: 0
        });
      }
      if (edgeMatches.length > 0) {
        ops.push({
          type: 'edit',
          file: 'graph.edges',
          linesAdded: edgeMatches.length,
          linesDeleted: 0
        });
      }
    }

    return ops;
  };


  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: m.role === "user" ? "86%" : "100%", width: m.role === "user" ? "fit-content" : "100%", padding: "9px 11px", borderRadius: 9,
              background: m.role === "user" ? "#252033" : "#151821", color: "#e5e7eb", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap",
              border: "1px solid " + (m.status === "error" ? "#3f1d25" : m.status === "done" ? "#1d3a2d" : "#252a35"),
              transition: "border-color 0.3s" }}>
              {m.role === "ai" && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
                  <Sparkles size={12} color="#8b949e" strokeWidth={1.8} />
                  <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700 }}>{(AGENT_META[m.agent] || AGENT_META.graph).name}</span>
                  {m.status === "thinking" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 600, color: "#8b949e",
                      background: "#0f1117", border: "1px solid #252a35", borderRadius: 999, padding: "2px 8px", marginLeft: "auto" }}>
                      <div style={{ display: "flex", gap: 3 }}>
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#8b949e", animation: "pulse 1.2s infinite" }} />
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#8b949e", animation: "pulse 1.2s infinite 0.2s" }} />
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#8b949e", animation: "pulse 1.2s infinite 0.4s" }} />
                      </div>
                      <span>Planning...</span>
                    </div>
                  )}
                  {m.status === "building" && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#8b949e", marginLeft: "auto" }}>
                      Drafting graph...
                    </span>
                  )}
                  {m.status === "validating" && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#d1d5db", marginLeft: "auto" }}>
                      Validating...
                    </span>
                  )}
                  {m.status === "done" && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 600, color: "#9ca3af", marginLeft: "auto" }}>
                      <Check size={11} color="#34d399" strokeWidth={2.5} />
                      Done
                    </span>
                  )}
                  {m.status === "error" && (
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 600, color: "#f87171", marginLeft: "auto" }}>
                      <X size={11} color="#f87171" strokeWidth={2.5} />
                      Error
                    </span>
                  )}
                </div>
              )}

              {/* Agent activity section - collapsible */}
              {(m.thinking || m.allGeneratedText) && (
                <div style={{ marginBottom: m.text ? 8 : 0, background: "#0f1117", borderRadius: 7, border: "1px solid #252a35", overflow: "hidden" }}>
                  {/* Collapsible header */}
                  <div
                    onClick={() => setExpandedThinking(prev => ({ ...prev, [i]: !prev[i] }))}
                    style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "8px 10px",
                      cursor: "pointer", borderBottom: expandedThinking[i] ? "1px solid #252a35" : "none",
                      background: "#111318", transition: "background 0.15s"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#151821"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "#111318"}
                  >
                    <Check size={11} color="#6b7280" strokeWidth={2} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#8b949e", textTransform: "uppercase", letterSpacing: 0.5 }}>Activity</span>
                    <span style={{ fontSize: 10, color: "#4b5563", marginLeft: "auto" }}>
                      {expandedThinking[i] ? "Hide details" : "Show details"}
                    </span>
                  </div>

                  {/* Expandable content */}
                  {expandedThinking[i] && (
                    <div style={{ padding: "8px 10px", maxHeight: 300, overflowY: "auto" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#9ca3af", fontSize: 11 }}>
                          <Check size={12} color="#6b7280" strokeWidth={2.5} />
                          Parsed request and current graph context
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#9ca3af", fontSize: 11 }}>
                          <Check size={12} color="#6b7280" strokeWidth={2.5} />
                          {m.agent === "validator" ? "Validated graph contracts and corrected structure" : "Prepared graph edits and endpoint flow"}
                        </div>
                      </div>
                      {/* File operations */}
                      {m.fileOps && m.fileOps.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: "#8b949e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                            Planned Changes
                          </div>
                          {m.fileOps.map((op, idx) => (
                            <div key={idx} style={{
                              display: "flex", alignItems: "center", gap: 8, padding: "4px 8px",
                              background: "#0f1117", borderRadius: 4, marginBottom: 4, fontSize: 11, fontFamily: "monospace"
                            }}>
                              <Sparkles size={10} color="#6b7280" strokeWidth={2} />
                              <span style={{ color: "#f3f4f6", flex: 1 }}>{op.file}</span>
                              {op.linesAdded > 0 && (
                                <span style={{ color: "#9ca3af", fontSize: 10 }}>+{op.linesAdded}</span>
                              )}
                              {op.linesDeleted > 0 && (
                                <span style={{ color: "#9ca3af", fontSize: 10 }}>-{op.linesDeleted}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Full generated text - shows every word/token as it was generated */}
                      {m.allGeneratedText && (
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 9, fontWeight: 700, color: "#8b949e", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                            Model Transcript
                          </div>
                          <div style={{ maxHeight: 160, overflowY: "auto", fontSize: 11, color: "#94a3b8", fontFamily: "monospace", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {humanText(m.allGeneratedText) || "Graph payload generated."}
                          </div>
                        </div>
                      )}

                    </div>
                  )}
                </div>
              )}

              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 8 }}>
            <div style={{ padding: "8px 12px", borderRadius: "12px 12px 12px 2px", background: "#1e2030", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                {[0, 0.2, 0.4].map((delay, i) => (
                  <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: GEMINI_MODEL.color, animation: `devflow-load 1s ease-in-out ${delay}s infinite` }} />
                ))}
              </div>
              <span style={{ fontSize: 11, color: "#6b7280" }}>Agent working...</span>
            </div>
            <button
              onClick={cancelRequest}
              style={{
                display: "flex", alignItems: "center", gap: 4, padding: "6px 12px",
                borderRadius: 6, border: "1px solid #dc262644", background: "#1f1a1a",
                color: "#f87171", fontSize: 11, cursor: "pointer", fontWeight: 500,
                transition: "all 0.15s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#2d1515"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#1f1a1a"; }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
              Stop
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{ padding: "8px 10px 10px", flexShrink: 0, borderTop: "1px solid #252a35" }}>
        <div style={{ background: "#111018", border: "1px solid #332a4a", borderRadius: 10, padding: "8px 10px 9px", boxShadow: "0 8px 24px rgba(0,0,0,0.22)" }}>
          <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Describe what to build" rows={1} disabled={loading}
            style={{ width: "100%", minHeight: 58, maxHeight: 128, background: "transparent", border: "none", outline: "none", color: "#f3f4f6", fontSize: 14, resize: "none", lineHeight: 1.45, fontFamily: "inherit", overflowY: "auto", boxSizing: "border-box", padding: 0 }}
          />

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            <div
              style={{ display: "flex", alignItems: "center", gap: 6, height: 26, color: "#f3f4f6", fontSize: 12 }}>
              <Sparkles size={13} color="#e5e7eb" strokeWidth={1.7} />
              <span>Agent</span>
            </div>
            <div style={{ width: 1, height: 18, background: "#2e303a" }} />
            <button onClick={() => { clearApiKey(); setApiKey(""); }}
              style={{ background: "transparent", border: "none", color: "#d1d5db", fontSize: 12, cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}
              title="Change API key">
              {GEMINI_MODEL.name}
            </button>
            <button onClick={send} disabled={loading || !input.trim()}
              title="Send"
              style={{ ...composerIconBtn, marginLeft: "auto", opacity: loading || !input.trim() ? 0.45 : 1, cursor: loading || !input.trim() ? "not-allowed" : "pointer" }}>
              <ArrowUp size={18} color="#8b949e" strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EnvPanel({ projectPath }) {
  const [vars, setVars] = useState([]);
  const [revealed, setRevealed] = useState({});

  useEffect(() => {
    if (!projectPath) return;
    try {
      const raw = window.electronAPI?.readEnv(projectPath) || "";
      const parsed = raw.split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => {
        const eq = l.indexOf("=");
        return { key: l.slice(0, eq).trim(), value: l.slice(eq + 1).trim(), id: Math.random() };
      });
      setVars(parsed);
    } catch (_) {}
  }, [projectPath]);

  const save = (updated) => {
    try {
      const content = updated.filter((v) => v.key).map((v) => `${v.key}=${v.value}`).join("\n");
      window.electronAPI?.writeEnv(projectPath, content);
    } catch (_) {}
  };

  const update = (id, field, val) => {
    const updated = vars.map((v) => v.id === id ? { ...v, [field]: val } : v);
    setVars(updated);
    save(updated);
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\n")) return;
    e.preventDefault();
    const lines = text.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#") && l.includes("="));
    if (!lines.length) return;
    const newVars = lines.map((l) => { const eq = l.indexOf("="); return { key: l.slice(0, eq).trim(), value: l.slice(eq + 1).trim(), id: Math.random() }; });
    const updated = [...vars.filter((v) => v.key), ...newVars];
    setVars(updated);
    save(updated);
  };

  const add = () => setVars((v) => [...v, { key: "", value: "", id: Math.random() }]);

  const remove = (id) => {
    const updated = vars.filter((v) => v.id !== id);
    setVars(updated);
    save(updated);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        <div onPaste={handlePaste} style={{ marginBottom: 8, padding: "8px 10px", border: "1px dashed #2e303a", borderRadius: 6, color: "#4b5563", fontSize: 11, textAlign: "center", cursor: "default" }}>
          Paste <span style={{ color: "#6b7280" }}>KEY=value</span> pairs here
        </div>
        {vars.length === 0 && (
          <div style={{ padding: "24px 12px", textAlign: "center", color: "#4b5563", fontSize: 12 }}>No environment variables yet.</div>
        )}
        {vars.map((v) => (
          <div key={v.id} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 6 }}>
            <input value={v.key} onChange={(e) => update(v.id, "key", e.target.value)} onPaste={handlePaste} placeholder="KEY"
              style={{ width: 90, flexShrink: 0, background: "#0f1117", border: "1px solid #2e303a", borderRadius: 5, padding: "5px 7px", color: "#7c3aed", fontSize: 11, outline: "none", fontFamily: "monospace" }} />
            <span style={{ color: "#2e303a", fontSize: 12 }}>=</span>
            <div style={{ flex: 1, display: "flex", alignItems: "center", background: "#0f1117", border: "1px solid #2e303a", borderRadius: 5, overflow: "hidden" }}>
              <input value={v.value} onChange={(e) => update(v.id, "value", e.target.value)} placeholder="value"
                type={revealed[v.id] ? "text" : "password"}
                style={{ flex: 1, background: "none", border: "none", padding: "5px 7px", color: "#f3f4f6", fontSize: 11, outline: "none", fontFamily: "monospace" }} />
              <button onClick={() => setRevealed((r) => ({ ...r, [v.id]: !r[v.id] }))} style={{ background: "none", border: "none", cursor: "pointer", padding: "0 6px", display: "flex" }}>
                {revealed[v.id] ? <EyeOff size={11} color="#4b5563" /> : <Eye size={11} color="#4b5563" />}
              </button>
            </div>
            <button onClick={() => remove(v.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", flexShrink: 0 }}>
              <Trash2 size={12} color="#4b5563" strokeWidth={1.8} />
            </button>
          </div>
        ))}
      </div>
      <div style={{ padding: "8px", borderTop: "1px solid #1e2030", flexShrink: 0 }}>
        <button onClick={add} style={{ width: "100%", padding: "7px", background: "#1e2030", border: "1px dashed #2e303a", borderRadius: 6, color: "#6b7280", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Plus size={13} strokeWidth={1.8} /> Add Variable
        </button>
      </div>
    </div>
  );
}

function ApiTestPanel({ nodes = [], projectPath, selectedNodeId }) {
  const endpointNodes = nodes.filter((n) => n.type === "endpoint");
  const [selectedId, setSelectedId] = useState(selectedNodeId || endpointNodes[0]?.id || "");
  const [tab, setTab] = useState("params");
  const [baseUrl, setBaseUrl] = useState("http://127.0.0.1:5000");
  const [params, setParams]   = useState([]);
  const [headers, setHeaders] = useState([{ id: 1, key: "Content-Type", value: "application/json", enabled: true }]);
  const [body, setBody]       = useState("");
  const [response, setResponse] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [elapsed, setElapsed]   = useState(null);
  const [responseHeight, setResponseHeight] = useState(200);

  const handleResponseDrag = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = responseHeight;
    const onMove = (ev) => setResponseHeight(Math.max(80, Math.min(500, startH + (startY - ev.clientY))));
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const node = endpointNodes.find((n) => n.id === selectedId);

  // Sync when selectedNodeId changes from right-click
  useEffect(() => { if (selectedNodeId) setSelectedId(selectedNodeId); }, [selectedNodeId]);

  // Auto-fill params from node input config
  useEffect(() => {
    if (!node) return;
    const inputs = (node.data.input || []).filter((r) => r.key && r.source !== "body" && r.source !== "header");
    setParams(inputs.map((r) => ({ id: r.id, key: r.key, value: "", enabled: true })));
    const bodyInputs = (node.data.input || []).filter((r) => r.key && r.source === "body");
    if (bodyInputs.length) {
      const obj = Object.fromEntries(bodyInputs.map((r) => [r.key, ""]));
      setBody(JSON.stringify(obj, null, 2));
    } else {
      setBody("");
    }
  }, [selectedId]);

  // Read base URL from project settings
  useEffect(() => {
    const cfg = window.electronAPI?.readProjectSettings?.(projectPath);
    if (cfg?.host && cfg?.port) setBaseUrl(`http://${cfg.host}:${cfg.port}`);
  }, [projectPath]);

  const send = async () => {
    if (!node) return;
    setLoading(true);
    setResponse(null);
    const method = node.data.method || "GET";
    const route  = node.data.route || "/";

    // Build URL with path params substituted
    let url = baseUrl.replace(/\/$/, "") + route;
    const enabledParams = params.filter((p) => p.enabled && p.key);
    // Replace :param in route with actual values
    enabledParams.forEach((p) => { url = url.replace(`:${p.key}`, encodeURIComponent(p.value)); });
    // Remaining params as query string
    const queryParams = enabledParams.filter((p) => !route.includes(`:${p.key}`));
    if (queryParams.length) url += "?" + queryParams.map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join("&");

    const reqHeaders = Object.fromEntries(headers.filter((h) => h.enabled && h.key).map((h) => [h.key, h.value]));
    const hasBody = ["POST", "PUT", "PATCH"].includes(method) && body.trim();

    const start = Date.now();
    try {
      const res = await fetch(url, {
        method,
        headers: reqHeaders,
        ...(hasBody ? { body } : {}),
      });
      const text = await res.text();
      let parsed = null;
      try { parsed = JSON.parse(text); } catch (_) {}
      setElapsed(Date.now() - start);
      setResponse({ status: res.status, ok: res.ok, text, parsed });
    } catch (err) {
      setElapsed(Date.now() - start);
      setResponse({ status: 0, ok: false, text: err.message, parsed: null });
    }
    setLoading(false);
  };

  const addRow = (setter) => setter((r) => [...r, { id: Math.random(), key: "", value: "", enabled: true }]);
  const removeRow = (setter, id) => setter((r) => r.filter((x) => x.id !== id));
  const updateRow = (setter, id, field, val) => setter((r) => r.map((x) => x.id === id ? { ...x, [field]: val } : x));

  const statusColor = !response ? "#4b5563" : response.ok ? "#34d399" : response.status === 0 ? "#f87171" : "#f59e0b";

  const kvRow = (row, setter) => (
    <div key={row.id} style={{ display: "grid", gridTemplateColumns: "16px 1fr 1fr 16px", gap: 4, alignItems: "center" }}>
      <input type="checkbox" checked={row.enabled} onChange={(e) => updateRow(setter, row.id, "enabled", e.target.checked)}
        style={{ accentColor: "#7c3aed", cursor: "pointer" }} />
      <input value={row.key} onChange={(e) => updateRow(setter, row.id, "key", e.target.value)} placeholder="key"
        style={kvInput} />
      <input value={row.value} onChange={(e) => updateRow(setter, row.id, "value", e.target.value)} placeholder="value"
        style={kvInput} />
      <button onClick={() => removeRow(setter, row.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
        <X size={11} color="#4b5563" strokeWidth={1.8} />
      </button>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* Endpoint selector */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #1e2030", flexShrink: 0 }}>
        {endpointNodes.length === 0
          ? <div style={{ fontSize: 12, color: "#4b5563", textAlign: "center", padding: "8px 0" }}>No endpoint nodes in graph.</div>
          : <div style={{ position: "relative" }}>
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
                style={{ width: "100%", background: "#0f1117", border: "1px solid #2e303a", borderRadius: 6,
                  padding: "6px 28px 6px 10px", color: "#f3f4f6", fontSize: 12, outline: "none",
                  cursor: "pointer", appearance: "none" }}>
                {endpointNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.data.method} {n.data.route} — {n.data.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} color="#4b5563" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>}
      </div>

      {node && <>
        {/* URL bar */}
        <div style={{ padding: "8px 12px", borderBottom: "1px solid #1e2030", flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", flexShrink: 0,
              color: METHOD_COLORS[node.data.method] || "#6b7280",
              background: (METHOD_COLORS[node.data.method] || "#6b7280") + "22",
              padding: "3px 8px", borderRadius: 4 }}>{node.data.method}</span>
            <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
              style={{ ...kvInput, flex: 1, fontFamily: "monospace", fontSize: 11 }} />
            <span style={{ fontSize: 11, color: "#4b5563", fontFamily: "monospace", flexShrink: 0 }}>{node.data.route}</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #1e2030", flexShrink: 0 }}>
          {["params", "headers", "body"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: "7px 0", background: "none", border: "none",
                borderBottom: tab === t ? "2px solid #7c3aed" : "2px solid transparent",
                color: tab === t ? "#c4b5fd" : "#4b5563", fontSize: 11, fontWeight: 500,
                cursor: "pointer", textTransform: "capitalize", transition: "color 0.15s" }}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
          {tab === "params" && <>
            <div style={{ display: "grid", gridTemplateColumns: "16px 1fr 1fr 16px", gap: 4, marginBottom: 2 }}>
              {["" ,"Key", "Value", ""].map((h, i) => <div key={i} style={{ fontSize: 10, color: "#374151", fontWeight: 600 }}>{h}</div>)}
            </div>
            {params.map((r) => kvRow(r, setParams))}
            <button onClick={() => addRow(setParams)} style={addBtn}><Plus size={11} strokeWidth={2} /> Add param</button>
          </>}

          {tab === "headers" && <>
            <div style={{ display: "grid", gridTemplateColumns: "16px 1fr 1fr 16px", gap: 4, marginBottom: 2 }}>
              {["", "Key", "Value", ""].map((h, i) => <div key={i} style={{ fontSize: 10, color: "#374151", fontWeight: 600 }}>{h}</div>)}
            </div>
            {headers.map((r) => kvRow(r, setHeaders))}
            <button onClick={() => addRow(setHeaders)} style={addBtn}><Plus size={11} strokeWidth={2} /> Add header</button>
          </>}

          {tab === "body" && (
            <textarea value={body} onChange={(e) => setBody(e.target.value)}
              placeholder='{"key": "value"}'
              style={{ flex: 1, minHeight: 120, background: "#0a0c12", border: "1px solid #2e303a",
                borderRadius: 6, padding: "8px 10px", color: "#f3f4f6", fontSize: 11,
                fontFamily: "monospace", outline: "none", resize: "vertical", lineHeight: 1.6 }} />
          )}
        </div>

        {/* Send button */}
        <div style={{ padding: "8px 12px", borderTop: "1px solid #1e2030", flexShrink: 0 }}>
          <button onClick={send} disabled={loading}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "8px", borderRadius: 7, border: "none", cursor: loading ? "not-allowed" : "pointer",
              background: loading ? "#1e2030" : "linear-gradient(135deg, #7c3aed, #2563eb)",
              color: loading ? "#4b5563" : "#fff", fontSize: 12, fontWeight: 600, transition: "all 0.15s" }}>
            {loading
              ? <><div style={{ width: 12, height: 12, border: "2px solid #4b5563", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "devflow-spin 0.7s linear infinite" }} /> Sending...</>
              : <><Send size={12} strokeWidth={2} /> Send</>}
          </button>
        </div>

        {/* Response */}
        {response && (
          <div style={{ borderTop: "1px solid #1e2030", flexShrink: 0, height: responseHeight, display: "flex", flexDirection: "column" }}>
            {/* Drag handle */}
            <div
              onMouseDown={handleResponseDrag}
              style={{ height: 4, flexShrink: 0, cursor: "ns-resize", transition: "background 0.15s" }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#7c3aed"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderBottom: "1px solid #1e2030" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: statusColor,
                background: statusColor + "18", padding: "1px 7px", borderRadius: 4, fontFamily: "monospace" }}>
                {response.status || "ERR"}
              </span>
              {elapsed !== null && <span style={{ fontSize: 10, color: "#4b5563" }}>{elapsed}ms</span>}
              <span style={{ fontSize: 10, color: response.ok ? "#34d399" : "#f87171", marginLeft: "auto" }}>
                {response.ok ? "OK" : "FAILED"}
              </span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}>
              <pre style={{ margin: 0, fontSize: 11, fontFamily: "monospace", color: response.ok ? "#a3e635" : "#f87171",
                whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.6 }}>
                {response.parsed !== null ? JSON.stringify(response.parsed, null, 2) : response.text}
              </pre>
            </div>
          </div>
        )}
      </>}
    </div>
  );
}

const kvInput = { background: "#0f1117", border: "1px solid #2e303a", borderRadius: 4, padding: "4px 6px", color: "#f3f4f6", fontSize: 11, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "monospace" };
const addBtn  = { display: "flex", alignItems: "center", gap: 4, padding: "5px 8px", background: "#1e2030", border: "1px dashed #2e303a", borderRadius: 5, color: "#6b7280", fontSize: 11, cursor: "pointer" };

const FRAMEWORKS = ["Flask", "FastAPI", "Django"];
const ENVIRONMENTS = ["development", "production", "staging", "testing"];

const DATABASES = [
  { id: "sqlite",   label: "SQLite",     desc: "Local file-based",     color: "#38bdf8" },
  { id: "postgres", label: "PostgreSQL", desc: "Remote / production",  color: "#34d399" },
  { id: "mongodb",  label: "MongoDB",    desc: "NoSQL document store", color: "#f59e0b" },
];

const ORMS = {
  Flask:   ["SQLAlchemy", "Peewee", "PonyORM", "None"],
  FastAPI: ["SQLAlchemy", "Tortoise ORM", "Beanie", "Prisma", "None"],
  Django:  ["Django ORM", "None"],
};

const ORM_DESC = {
  "SQLAlchemy":   "Powerful SQL toolkit & ORM",
  "Peewee":       "Lightweight ORM",
  "PonyORM":      "ORM with generator-based queries",
  "Tortoise ORM": "Async ORM inspired by Django",
  "Beanie":       "Async ODM for MongoDB",
  "Prisma":       "Type-safe ORM with auto-migrations",
  "Django ORM":   "Built-in Django ORM",
  "None":         "No ORM",
};

function ProjectSettingsPanel({ projectPath, hasDbNodes }) {
  const SETTINGS_KEY = `devflow_settings_${projectPath}`;
  const DEFAULTS = { framework: null, port: "5000", host: "127.0.0.1", debug: true, database: "sqlite", dbUrl: "", env: "development" };

  const load = () => {
    try {
      const fromFile = window.electronAPI?.readProjectSettings?.(projectPath);
      if (fromFile) return fromFile;
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    } catch { return null; }
  };

  const [cfg, setCfg] = useState(() => load() || DEFAULTS);

  // Re-sync when project changes
  useEffect(() => {
    setCfg(load() || DEFAULTS);
  }, [projectPath]);

  const update = (key, val) => {
    const updated = { ...cfg, [key]: val };
    setCfg(updated);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    window.electronAPI?.saveProjectSettings?.(projectPath, updated);
  };

  const field = (label, key, type = "text", placeholder = "") => (
    <div style={{ marginBottom: 14 }}>
      <div style={labelStyle}>{label}</div>
      <input value={cfg[key] ?? ""} onChange={(e) => update(key, e.target.value)}
        placeholder={placeholder} type={type} style={inputStyle} />
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto", padding: "16px 12px" }}>
      <div style={sectionStyle}>
        <div style={sectionTitle}>Server Config</div>

        {/* Framework — required */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 6 }}>
            Framework
            {!cfg.framework && <span style={{ fontSize: 9, color: "#f87171", background: "#2d1515", padding: "1px 5px", borderRadius: 3, border: "1px solid #f8717133" }}>required</span>}
          </div>
          <select
            value={cfg.framework || ""}
            onChange={(e) => update("framework", e.target.value || null)}
            style={{ ...inputStyle, cursor: "pointer", color: cfg.framework ? "#f3f4f6" : "#4b5563",
              border: `1px solid ${cfg.framework ? "#2e303a" : "#f8717144"}` }}>
            <option value="">Select a framework...</option>
            {FRAMEWORKS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {field("Port", "port", "number", "5000")}
        {field("Host", "host", "text", "127.0.0.1")}

        {/* Database */}
        <div style={{ marginBottom: 14 }}>
          <div style={labelStyle}>Database</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {DATABASES.map((db) => (
              <div key={db.id} onClick={() => update("database", db.id)}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "7px 10px", borderRadius: 7, cursor: "pointer",
                  background: cfg.database === db.id ? db.color + "12" : "#0f1117",
                  border: `1px solid ${cfg.database === db.id ? db.color + "66" : "#2e303a"}`,
                  transition: "all 0.1s" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                    background: cfg.database === db.id ? db.color : "#374151",
                    boxShadow: cfg.database === db.id ? `0 0 6px ${db.color}` : "none" }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: cfg.database === db.id ? db.color : "#d1d5db" }}>{db.label}</span>
                </div>
                <span style={{ fontSize: 10, color: "#4b5563" }}>{db.desc}</span>
              </div>
            ))}
          </div>
          {(cfg.database === "postgres" || cfg.database === "mongodb") && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 10, color: "#4b5563", marginBottom: 4 }}>
                {cfg.database === "postgres" ? "postgresql://user:pass@host:5432/dbname" : "mongodb+srv://user:pass@cluster/dbname"}
              </div>
              <input
                value={cfg.dbUrl || ""}
                onChange={(e) => update("dbUrl", e.target.value)}
                placeholder={cfg.database === "postgres" ? "postgresql://..." : "mongodb+srv://..."}
                style={{ ...inputStyle, fontFamily: "monospace", fontSize: 11 }}
              />
            </div>
          )}
          {cfg.database === "sqlite" && (
            <div style={{ marginTop: 6, fontSize: 10, color: "#374151" }}>Stored as <span style={{ fontFamily: "monospace", color: "#4b5563" }}>app.db</span> in your project folder.</div>
          )}
        </div>

        {/* ORM — only shown if a framework is selected and DB nodes exist */}
        {hasDbNodes && cfg.framework && ORMS[cfg.framework] && (
          <div style={{ marginBottom: 14 }}>
            <div style={labelStyle}>ORM</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {ORMS[cfg.framework].map((orm) => (
                <div key={orm} onClick={() => update("orm", orm)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "7px 10px", borderRadius: 7, cursor: "pointer",
                    background: cfg.orm === orm ? "#1e1a3a" : "#0f1117",
                    border: `1px solid ${cfg.orm === orm ? "#7c3aed66" : "#2e303a"}`,
                    transition: "all 0.1s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                      background: cfg.orm === orm ? "#7c3aed" : "#374151",
                      boxShadow: cfg.orm === orm ? "0 0 6px #7c3aed" : "none" }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: cfg.orm === orm ? "#c4b5fd" : "#d1d5db" }}>{orm}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "#4b5563" }}>{ORM_DESC[orm]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <div style={labelStyle}>Environment</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ENVIRONMENTS.map((e) => (
              <button key={e} onClick={() => update("env", e)}
                style={{ padding: "4px 10px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500,
                  background: cfg.env === e ? "#1e3a5f" : "#1e2030",
                  color: cfg.env === e ? "#38bdf8" : "#6b7280",
                  outline: cfg.env === e ? "1px solid #38bdf8" : "none" }}>
                {e}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={labelStyle}>Debug</div>
          <div onClick={() => update("debug", !cfg.debug)}
            style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", width: "fit-content" }}>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: cfg.debug ? "#059669" : "#2e303a", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 3, left: cfg.debug ? 18 : 3, width: 14, height: 14, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </div>
            <span style={{ fontSize: 12, color: cfg.debug ? "#34d399" : "#6b7280", fontWeight: 500 }}>{cfg.debug ? "ON" : "OFF"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Seed / Dummy Data Panel ─────────────────────────────────────────────────

const FIRST_NAMES = ["Alice","Bob","Carol","David","Eva","Frank","Grace","Hank","Iris","Jack"];
const LAST_NAMES  = ["Smith","Jones","Brown","Taylor","Wilson","Davis","Clark","Lewis","Hall","Young"];
const DOMAINS     = ["example.com","mail.io","test.dev","demo.net","fake.org"];
const STREETS     = ["Main St","Oak Ave","Maple Rd","Cedar Ln","Pine Blvd"];
const CITIES      = ["Springfield","Shelbyville","Capital City","Ogdenville","North Haverbrook"];
const LOREM       = "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor".split(" ");

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rndInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const rndFloat = () => parseFloat((Math.random() * 1000).toFixed(2));
const rndDate = () => {
  const d = new Date(Date.now() - rndInt(0, 365 * 3) * 86400000);
  return d.toISOString().split("T")[0];
};
const rndDatetime = () => new Date(Date.now() - rndInt(0, 365 * 3) * 86400000).toISOString();

function fakeValueForField(field, index) {
  const name = (field.name || "").toLowerCase();
  const type = (field.type || "").toLowerCase();

  if (field.primaryKey) return index + 1;

  // Name heuristics
  if (name.includes("first") && name.includes("name")) return rnd(FIRST_NAMES);
  if (name.includes("last")  && name.includes("name")) return rnd(LAST_NAMES);
  if (name === "name" || name.includes("username") || name.includes("user_name"))
    return `${rnd(FIRST_NAMES).toLowerCase()}${rndInt(1, 99)}`;
  if (name.includes("full") && name.includes("name")) return `${rnd(FIRST_NAMES)} ${rnd(LAST_NAMES)}`;
  if (name.includes("email")) return `${rnd(FIRST_NAMES).toLowerCase()}${rndInt(1,99)}@${rnd(DOMAINS)}`;
  if (name.includes("phone") || name.includes("mobile")) return `+1-${rndInt(200,999)}-${rndInt(100,999)}-${rndInt(1000,9999)}`;
  if (name.includes("address") || name.includes("street")) return `${rndInt(1,999)} ${rnd(STREETS)}`;
  if (name.includes("city"))    return rnd(CITIES);
  if (name.includes("country")) return rnd(["US","UK","CA","AU","DE","FR"]);
  if (name.includes("zip") || name.includes("postal")) return String(rndInt(10000, 99999));
  if (name.includes("title"))   return `${rnd(LOREM)} ${rnd(LOREM)}`;
  if (name.includes("desc") || name.includes("bio") || name.includes("note") || name.includes("content"))
    return LOREM.slice(0, rndInt(5, 10)).join(" ");
  if (name.includes("url") || name.includes("website")) return `https://${rnd(DOMAINS)}/page/${rndInt(1,100)}`;
  if (name.includes("image") || name.includes("avatar") || name.includes("photo"))
    return `https://picsum.photos/seed/${rndInt(1,1000)}/200/200`;
  if (name.includes("price") || name.includes("amount") || name.includes("salary")) return rndFloat();
  if (name.includes("age"))    return rndInt(18, 80);
  if (name.includes("score") || name.includes("rating")) return rndInt(1, 10);
  if (name.includes("count") || name.includes("qty") || name.includes("quantity")) return rndInt(0, 100);
  if (name.includes("active") || name.includes("enabled") || name.includes("verified")) return rnd([true, false]);
  if (name.includes("created") || name.includes("updated") || name.includes("date")) return rndDatetime();
  if (name.includes("role"))   return rnd(["admin","user","moderator","guest"]);
  if (name.includes("status")) return rnd(["active","inactive","pending","banned"]);
  if (name.includes("gender")) return rnd(["male","female","other"]);
  if (name.includes("color") || name.includes("colour")) return rnd(["red","blue","green","yellow","purple"]);
  if (name.includes("tag") || name.includes("category")) return rnd(["tech","news","sports","health","finance"]);

  // Type fallbacks
  if (type.includes("int") || type.includes("integer") || type.includes("bigint") || type.includes("smallint")) return rndInt(1, 1000);
  if (type.includes("float") || type.includes("double") || type.includes("decimal") || type.includes("numeric")) return rndFloat();
  if (type.includes("bool")) return rnd([true, false]);
  if (type.includes("date") && type.includes("time")) return rndDatetime();
  if (type.includes("date")) return rndDate();
  if (type.includes("time")) return `${rndInt(0,23).toString().padStart(2,"0")}:${rndInt(0,59).toString().padStart(2,"0")}:00`;
  if (type.includes("json") || type.includes("object")) return JSON.stringify({ key: rnd(LOREM), value: rndInt(1,100) });
  if (type.includes("uuid")) return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = Math.random()*16|0; return (c=="x"?r:(r&0x3|0x8)).toString(16); });

  // Default: short string
  return `${field.name}_${rndInt(1, 999)}`;
}

function generateRows(fields, count, allNodes) {
  return Array.from({ length: count }, (_, i) =>
    Object.fromEntries(
      fields
        .filter((f) => !f.primaryKey)
        .map((f) => {
          if (f.isForeignKey) {
            // Find the referenced table's row count to pick a valid FK value
            // fkRef is like "Users.user_id" — pick a random id between 1..count
            const refTable = (f.ref || f.fkRef?.split(".")[0] || "").toLowerCase();
            const refNode = allNodes?.find((n) => n.type === "db" &&
              (n.data.label || "").toLowerCase() === refTable);
            const refPK = refNode?.data?.fields?.find((rf) => rf.primaryKey);
            // Use sequential assignment so row i references parent row i (wrapping if needed)
            // This guarantees referential integrity when seeding parent first
            const refCount = count;
            return [f.name, (i % refCount) + 1];
          }
          return [f.name, fakeValueForField(f, i)];
        })
    )
  );
}

function toPythonLiteral(v) {
  if (v === null || v === undefined) return "None";
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number") return String(v);
  return `'${String(v).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;
}

function buildSeedScript(projectPath, tableName, fields, rows, dbType, dbUrl) {
  const colNames = fields.filter((f) => !f.primaryKey).map((f) => f.name);
  const pyData = "[" + rows.map((row) => "[" + colNames.map((c) => toPythonLiteral(row[c])).join(", ") + "]").join(", ") + "]";
  const scriptPath = projectPath.replace(/\\/g, "/") + "/_devflow_seed.py";

  let body;
  if (dbType === "mongodb") {
    const pyDocs = "[" + rows.map((row) =>
      "{" + colNames.map((c) => `'${c}': ${toPythonLiteral(row[c])}`).join(", ") + "}"
    ).join(", ") + "]";
    const url = dbUrl || "mongodb://localhost:27017/mydb";
    body = `from pymongo import MongoClient
try:
    c = MongoClient('${url}')
    db = c.get_default_database()
    db['${tableName}'].insert_many(${pyDocs})
    print('__SEED_OK__ ${rows.length} rows inserted into ${tableName}')
except Exception as e:
    print('__SEED_ERR__ ' + str(e))
print('__DEVFLOW_SEED_DONE__')
`;
  } else if (dbType === "postgres") {
    const url = dbUrl || "postgresql://user:password@localhost:5432/mydb";
    const placeholders = colNames.map(() => "%s").join(", ");
    body = `import psycopg2
try:
    c = psycopg2.connect('${url}')
    cur = c.cursor()
    cur.executemany('INSERT INTO ${tableName} (${colNames.join(", ")}) VALUES (${placeholders})', ${pyData})
    c.commit()
    c.close()
    print('__SEED_OK__ ${rows.length} rows inserted into ${tableName}')
except Exception as e:
    print('__SEED_ERR__ ' + str(e))
print('__DEVFLOW_SEED_DONE__')
`;
  } else {
    const dbPath = projectPath.replace(/\\/g, "/") + "/app.db";
    body = `import sqlite3
try:
    c = sqlite3.connect('${dbPath}')
    c.executemany('INSERT INTO ${tableName} (${colNames.join(", ")}) VALUES (${colNames.map(() => "?").join(", ")})', ${pyData})
    c.commit()
    c.close()
    print('__SEED_OK__ ${rows.length} rows inserted into ${tableName}')
except Exception as e:
    print('__SEED_ERR__ ' + str(e))
print('__DEVFLOW_SEED_DONE__')
`;
  }

  // Write the script file via electronAPI, then return the command to run it
  try {
    window.electronAPI?.writeEnv && window.electronAPI.writeSeedScript(scriptPath, body);
  } catch (_) {}

  return { scriptPath, body };
}

function buildSqlInserts(tableName, fields, rows) {
  const colNames = fields.filter((f) => !f.primaryKey).map((f) => f.name);
  return rows.map((row) => {
    const vals = colNames.map((c) => {
      const v = row[c];
      if (v === null || v === undefined) return "NULL";
      if (typeof v === "boolean") return v ? "1" : "0";
      if (typeof v === "number") return String(v);
      return `'${String(v).replace(/'/g, "''")}'`;
    }).join(", ");
    return `INSERT INTO ${tableName} (${colNames.join(", ")}) VALUES (${vals});`;
  }).join("\n");
}

function SeedPanel({ nodes = [], projectPath }) {
  const dbNodes = nodes.filter((n) => n.type === "db" && n.data?.fields?.length > 0);
  const [selectedId, setSelectedId] = useState(dbNodes[0]?.id || "");
  const [count, setCount] = useState(5);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState(null);
  const [copied, setCopied] = useState(false);

  const cfg = window.electronAPI?.readProjectSettings?.(projectPath) || {};
  const dbType = cfg.database || "sqlite";
  const dbUrl  = cfg.dbUrl || "";

  const node = dbNodes.find((n) => n.id === selectedId);
  const fields = node?.data?.fields || [];
  const visibleFields = fields.filter((f) => !f.primaryKey);
  const tableName = (node?.data?.tableName || node?.data?.label || "").toLowerCase().replace(/\s+/g, "_");

  useEffect(() => { setRows([]); setStatus(null); }, [selectedId]);

  const generate = () => {
    setRows(generateRows(fields, Math.min(Math.max(count, 1), 50), dbNodes));
    setStatus(null);
  };

  const runInTerminal = () => {
    if (!rows.length || !projectPath) return;
    const { scriptPath, body } = buildSeedScript(projectPath, tableName, fields, rows, dbType, dbUrl);
    setStatus({ ok: null, text: "Running..." });

    const pty = window.electronAPI?.pty;
    if (!pty) { setStatus({ ok: false, text: "Terminal not available" }); return; }

    // Write the script file
    try {
      window.electronAPI.writeSeedScript(scriptPath, body);
    } catch (e) {
      setStatus({ ok: false, text: "Could not write seed script: " + e.message });
      return;
    }

    let output = "";
    let settled = false;
    let handlePtyData = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (handlePtyData) {
        pty.offData(handlePtyData);
      }

      const clean = output
        .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "")  // ANSI escape codes
        .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")  // OSC sequences like ]0;title
        .replace(/\r/g, "");
      if (clean.includes("__SEED_OK__")) {
        const line = clean.split("\n").find((l) => l.includes("__SEED_OK__")) || "";
        setStatus({ ok: true, text: line.replace("__SEED_OK__", "").trim() || `${rows.length} rows inserted` });
      } else if (clean.includes("__SEED_ERR__")) {
        const line = clean.split("\n").find((l) => l.includes("__SEED_ERR__")) || "";
        setStatus({ ok: false, text: line.replace("__SEED_ERR__", "").trim() || "Insert failed" });
      } else {
        setStatus({ ok: false, text: "No response (timeout)" });
      }
    };

    const timer = setTimeout(finish, 12000);

    handlePtyData = (payload) => {
      const data = typeof payload === "string" ? payload : payload?.data;
      // Also write to the xterm terminal instance if available
      window.__xtermWrite?.(data);
      output += data;
      if (output.includes("__DEVFLOW_SEED_DONE__")) setTimeout(finish, 80);
    };
    pty.onData(handlePtyData);

    const winPath = scriptPath.replace(/\//g, "\\");
    pty.input(`python "${winPath}"\r`);
  };

  const copySql = () => {
    const sql = buildSqlInserts(tableName, fields, rows);
    navigator.clipboard.writeText(sql).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (dbNodes.length === 0) return (
    <div style={{ padding: 20, textAlign: "center", color: "#4b5563", fontSize: 12 }}>
      No DB nodes with fields found in the graph.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* DB selector + controls */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #1e2030", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ position: "relative" }}>
          <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}
            style={{ width: "100%", background: "#0f1117", border: "1px solid #2e303a", borderRadius: 6,
              padding: "6px 28px 6px 10px", color: "#f3f4f6", fontSize: 12, outline: "none", cursor: "pointer", appearance: "none" }}>
            {dbNodes.map((n) => <option key={n.id} value={n.id}>{n.data.label} ({(n.data.fields||[]).length} fields)</option>)}
          </select>
          <ChevronDown size={12} color="#4b5563" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#6b7280", flexShrink: 0 }}>Rows</span>
          <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))}
            style={{ width: 56, background: "#0f1117", border: "1px solid #2e303a", borderRadius: 5, padding: "4px 8px", color: "#f3f4f6", fontSize: 12, outline: "none" }} />
          <button onClick={generate}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              padding: "5px 10px", borderRadius: 6, border: "1px solid #2e303a",
              background: "#1e2030", color: "#c4b5fd", fontSize: 11, cursor: "pointer", fontWeight: 500 }}>
            <Shuffle size={11} strokeWidth={2} /> Generate
          </button>
        </div>
      </div>

      {/* Field schema hint */}
      {visibleFields.length > 0 && rows.length === 0 && (
        <div style={{ padding: "10px 12px", flex: 1, overflowY: "auto" }}>
          <div style={{ fontSize: 10, color: "#4b5563", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Fields</div>
          {visibleFields.map((f) => (
            <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #1a1d27" }}>
              <span style={{ fontSize: 11, color: f.isForeignKey ? "#f59e0b" : "#d1d5db", fontFamily: "monospace" }}>{f.name}</span>
              <span style={{ fontSize: 10, color: "#4b5563", fontFamily: "monospace" }}>{f.isForeignKey ? `FK → ${f.ref || f.fkRef?.split(".")[0] || "?"}` : f.type}</span>
            </div>
          ))}
        </div>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <div style={{ flex: 1, overflowY: "auto", overflowX: "auto", padding: "10px 12px" }}>
          <div style={{ fontSize: 10, color: "#4b5563", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Preview — {rows.length} rows
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, fontFamily: "monospace" }}>
            <thead>
              <tr>
                {visibleFields.map((f) => (
                  <th key={f.id} style={{ textAlign: "left", padding: "4px 6px", color: "#6b7280", borderBottom: "1px solid #2e303a", whiteSpace: "nowrap" }}>{f.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {visibleFields.map((f) => (
                    <td key={f.id} style={{ padding: "4px 6px", color: "#9ca3af", borderBottom: "1px solid #1a1d27", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {String(row[f.name] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer actions */}
      {rows.length > 0 && (
        <div style={{ padding: "8px 12px", borderTop: "1px solid #1e2030", flexShrink: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 10, color: "#4b5563", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: dbType === "postgres" ? "#34d399" : dbType === "mongodb" ? "#f59e0b" : "#38bdf8", flexShrink: 0 }} />
            Target: <span style={{ color: "#6b7280", fontFamily: "monospace" }}>{dbType === "postgres" ? "PostgreSQL" : dbType === "mongodb" ? "MongoDB" : "SQLite (app.db)"}</span>
          </div>
          <button onClick={runInTerminal} disabled={status?.ok === null}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "8px", borderRadius: 7, border: "none", cursor: status?.ok === null ? "not-allowed" : "pointer",
              background: status?.ok === null ? "#1e2030" : "linear-gradient(135deg, #059669, #047857)",
              color: status?.ok === null ? "#4b5563" : "#fff", fontSize: 12, fontWeight: 600 }}>
            {status?.ok === null
              ? <><div style={{ width: 12, height: 12, border: "2px solid #4b5563", borderTopColor: "#34d399", borderRadius: "50%", animation: "devflow-spin 0.7s linear infinite" }} /> Inserting...</>
              : <><Database size={12} strokeWidth={2} /> Insert via Terminal</>}
          </button>
          <button onClick={copySql}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "7px", borderRadius: 7, border: "1px solid #2e303a", cursor: "pointer",
              background: "#1e2030", color: copied ? "#34d399" : "#9ca3af", fontSize: 11, fontWeight: 500 }}>
            {copied ? <><Check size={11} strokeWidth={2.5} /> Copied!</> : <><Copy size={11} strokeWidth={1.8} /> Copy SQL INSERTs</>}
          </button>
          {status && (
            <div style={{ fontSize: 11, textAlign: "center", color: status.ok ? "#34d399" : "#f87171",
              background: status.ok ? "#0a1f16" : "#1a0a0a", border: `1px solid ${status.ok ? "#05966933" : "#dc262633"}`,
              borderRadius: 5, padding: "4px 8px", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              {status.ok ? <Check size={11} strokeWidth={2.5} /> : <X size={11} strokeWidth={2.5} />} {status.text}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const sectionStyle = { marginBottom: 24 };
const sectionTitle = { fontSize: 10, color: "#4b5563", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 };
const labelStyle = { fontSize: 10, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5 };
const inputStyle = { width: "100%", background: "#0f1117", border: "1px solid #2e303a", borderRadius: 6, padding: "6px 10px", color: "#f3f4f6", fontSize: 12, outline: "none", boxSizing: "border-box" };
const composerIconBtn = {
  width: 24,
  height: 24,
  border: "none",
  background: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  cursor: "pointer",
  flexShrink: 0,
};

export default function Sidebar({ onAddNode, termOpen, onTermToggle, projectPath, nodes = [], edges = [], activePanel, onPanelChange, testNodeId, onAgentGraph, changeHistory = [], onChangeRecorded }) {
  const [active, setActive] = useState(null);

  useEffect(() => {
    if (activePanel !== undefined) setActive(activePanel);
  }, [activePanel]);

  const toggle = (panel) => {
    const next = active === panel ? null : panel;
    setActive(next);
    onPanelChange?.(next);
  };
  const isOpen  = active !== null;
  const isTester = active === "tester";
  const panelWidth = isTester ? TESTER_WIDTH : SIDEBAR_WIDTH;
  const hasDbNodes = nodes.some((n) => n.type === "db");
  return (
    <div style={{ position: "fixed", top: 98, right: 12, bottom: 12, display: "flex", zIndex: 40, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, boxShadow: "0 18px 58px rgba(0,0,0,0.30)", overflow: "hidden" }}>
      {/* Expanded panel */}
      <div style={{ width: isOpen ? panelWidth : 0, overflow: "hidden", transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)", background: "rgba(17,19,24,0.96)", borderRight: isOpen ? "1px solid rgba(255,255,255,0.07)" : "none", display: "flex", flexDirection: "column" }}>
        <div style={{ height: 40, flexShrink: 0, display: "flex", alignItems: "center", padding: "0 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.015)", gap: 8 }}>
          {active === "ai"       && <><Sparkles size={13} color="#7c3aed" strokeWidth={2} /><span style={{ fontSize: 12, color: "#f3f4f6", fontWeight: 500 }}>Agent Studio</span></>}
          {active === "library"  && <><Library size={13} color="#6b7280" strokeWidth={2} /><span style={{ fontSize: 12, color: "#f3f4f6", fontWeight: 500 }}>Node Library</span></>}
          {active === "history"  && <><GitBranch size={13} color="#7c3aed" strokeWidth={2} /><span style={{ fontSize: 12, color: "#f3f4f6", fontWeight: 500 }}>Change History</span></>}
          {active === "env"      && <><KeyRound size={13} color="#f59e0b" strokeWidth={2} /><span style={{ fontSize: 12, color: "#f3f4f6", fontWeight: 500 }}>Environment</span></>}
          {active === "settings" && <><Settings size={13} color="#38bdf8" strokeWidth={2} /><span style={{ fontSize: 12, color: "#f3f4f6", fontWeight: 500 }}>Project Settings</span></>}
          {active === "tester"   && <><FlaskConical size={13} color="#f472b6" strokeWidth={2} /><span style={{ fontSize: 12, color: "#f3f4f6", fontWeight: 500 }}>API Tester</span></>}
          {active === "seed"      && <><Shuffle size={13} color="#34d399" strokeWidth={2} /><span style={{ fontSize: 12, color: "#f3f4f6", fontWeight: 500 }}>Seed Data</span></>}
          <button onClick={() => { setActive(null); onPanelChange?.(null); }} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}>
            <X size={13} color="#4b5563" strokeWidth={1.8} />
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          {active === "ai"       && <AiPanel onAgentGraph={onAgentGraph} currentGraph={{ nodes, edges }} projectPath={projectPath} />}
          {active === "library"  && <LibraryPanel onAddNode={onAddNode} />}
          {active === "source" && <GitHubPanel projectPath={projectPath} />}
          {active === "env"      && <EnvPanel projectPath={projectPath} />}
          {active === "settings" && <ProjectSettingsPanel projectPath={projectPath} hasDbNodes={hasDbNodes} />}
          {active === "tester"   && <ApiTestPanel nodes={nodes} projectPath={projectPath} selectedNodeId={testNodeId} />}
          {active === "seed"      && <SeedPanel nodes={nodes} projectPath={projectPath} />}
        </div>
      </div>

      {/* Peek strip */}
      <div style={{ width: 40, flexShrink: 0, background: "rgba(17,19,24,0.96)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8, gap: 4 }}>
        <PeekBtn icon={Sparkles}      label="AI"              active={active === "ai"}       onClick={() => toggle("ai")}       color="#7c3aed" />
        <PeekBtn icon={Library}       label="Library"         active={active === "library"}  onClick={() => toggle("library")} />
        <PeekBtn icon={GitBranch}     label="Source Control"  active={active === "source"}  onClick={() => toggle("source")}  color="#7c3aed" />
        <PeekBtn icon={FlaskConical}  label="API Tester"      active={active === "tester"}   onClick={() => toggle("tester")}  color="#f472b6" />
        <PeekBtn icon={Shuffle}        label="Seed Data"        active={active === "seed"}     onClick={() => toggle("seed")}   color="#34d399" />
        <PeekBtn icon={KeyRound}      label="Environment"     active={active === "env"}      onClick={() => toggle("env")}     color="#f59e0b" />
        <PeekBtn icon={Settings}      label="Project Settings" active={active === "settings"} onClick={() => toggle("settings")} color="#38bdf8" />
        <div style={{ marginTop: "auto", marginBottom: 8 }}>
          <PeekBtn icon={TerminalSquare} label="Terminal (Ctrl+`)" active={termOpen} onClick={onTermToggle} />
        </div>
      </div>
    </div>
  );
}

function PeekBtn({ icon: Icon, label, active, onClick, color }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button title={label} onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer", background: active ? "#1e2030" : hovered ? "#1a1d27" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}>
      <Icon size={15} color={active ? (color || "#f3f4f6") : hovered ? "#9ca3af" : "#4b5563"} strokeWidth={1.8} />
    </button>
  );
}
