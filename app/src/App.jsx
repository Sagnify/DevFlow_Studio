import React, { useState, useCallback, useEffect, useRef } from "react";
import { ArrowLeft, Database, Globe, GitBranch, X, Layers, Play, Square, Package, CheckCircle2, Hammer, Undo2, Redo2, RefreshCw } from "lucide-react";

const PROJECT_STATE = { EMPTY: 0, BUILDING: 1, READY: 2, RUNNING: 3 };

const STATE_META = [
  { key: "EMPTY",    label: "Empty",    desc: "No code yet",            color: "#4b5563" },
  { key: "BUILDING", label: "Building", desc: "Generating & installing", color: "#d97706" },
  { key: "READY",    label: "Ready",    desc: "Project is ready",        color: "#059669", icon: Package },
  { key: "RUNNING",  label: "Running",  desc: "Server is live",          color: "#34d399", icon: CheckCircle2 },
];
import ReactFlow, {
  Background,
  Controls,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  getBezierPath,
} from "reactflow";
import "reactflow/dist/style.css";
import "./App.css";
import Welcome from "./Welcome";
import Terminal from "./Terminal";
import Sidebar from "./Sidebar";
import FloatingNodePicker from "./FloatingNodePicker";
import NodeConfigModal from "./NodeConfigModal";
import FileExplorer from "./FileExplorer";
import { api } from "./api";

const onRenameRef = { current: null };
const dragOverGroupRef = { current: null };

function MultiHandleNode({ id, data, selected }) {
  const [editing, setEditing] = useState(data.editing ?? false);
  const [value, setValue] = useState(data.label ?? "");
  const inputRef = useRef(null);

  useEffect(() => { if (!editing) setValue(data.label); }, [data.label, editing]);
  useEffect(() => {
    if (editing) setTimeout(() => inputRef.current?.focus(), 50);
  }, [editing]);

  const commit = () => {
    setEditing(false);
    onRenameRef.current?.(id, value.trim() || "Node");
  };

  return (
    <div style={{ padding: "8px 16px", background: "#1e2030", border: `1px solid ${selected ? "#7c3aed" : "#2e303a"}`, borderRadius: 6, color: "#f3f4f6", boxShadow: selected ? "0 0 0 2px #7c3aed44" : "none", transition: "border-color 0.15s, box-shadow 0.15s" }}>
      <Handle type="source" position={Position.Top} id="top-s" />
      <Handle type="target" position={Position.Top} id="top-t" style={{ left: "35%" }} />
      <Handle type="source" position={Position.Bottom} id="bottom-s" />
      <Handle type="target" position={Position.Bottom} id="bottom-t" style={{ left: "35%" }} />
      <Handle type="source" position={Position.Left} id="left-s" />
      <Handle type="target" position={Position.Left} id="left-t" style={{ top: "35%" }} />
      <Handle type="source" position={Position.Right} id="right-s" />
      <Handle type="target" position={Position.Right} id="right-t" style={{ top: "35%" }} />
      {editing ? (
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") commit(); }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ width: 80, fontSize: 12, background: "#0f1117", color: "#f3f4f6", border: "1px solid #7c3aed", borderRadius: 4, padding: "2px 6px" }}
        />
      ) : (
        <span onDoubleClick={() => setEditing(true)}>{data.label}</span>
      )}
    </div>
  );
}

const GROUP_COLORS = ["#7c3aed", "#059669", "#2563eb", "#d97706", "#dc2626", "#0891b2", "#db2777", "#65a30d"];

const onGroupColorRef = { current: null };

function GroupNode({ id, data, selected }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(data.label ?? "Group");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [, rerender] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => { if (!editing) setValue(data.label); }, [data.label, editing]);
  useEffect(() => { if (editing) setTimeout(() => inputRef.current?.focus(), 50); }, [editing]);
  const commit = () => { setEditing(false); onRenameRef.current?.(id, value.trim() || "Group"); };
  const accent = data.color || "#7c3aed";
  const isDragTarget = dragOverGroupRef.current === id;

  // Re-render when dragOverGroupRef changes
  useEffect(() => {
    const interval = setInterval(() => rerender((n) => n + 1), 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!pickerOpen) return;
    const close = (e) => setPickerOpen(false);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [pickerOpen]);

  return (
    <div style={{ width: "100%", height: "100%", borderRadius: 12,
      border: `1.5px dashed ${isDragTarget ? accent : selected ? accent : accent + "66"}`,
      background: "transparent",
      boxShadow: isDragTarget ? `0 0 0 2px ${accent}88, 0 0 20px ${accent}33` : "none",
      boxSizing: "border-box", transition: "border-color 0.15s, box-shadow 0.15s",
      pointerEvents: "none", overflow: "visible" }}>
      <div style={{ position: "absolute", top: 0, left: 12, transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 6, background: "#0f1117", padding: "0 8px", pointerEvents: "all" }}>
        <Layers size={10} color={accent} strokeWidth={2} />
        {editing
          ? <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)} onBlur={commit}
              onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") commit(); }}
              onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
              style={{ fontSize: 11, fontWeight: 600, background: "none", border: "none", outline: "none", color: "#f3f4f6", width: 100 }} />
          : <span onDoubleClick={() => setEditing(true)} style={{ fontSize: 11, fontWeight: 600, color: accent, cursor: "text", userSelect: "none" }}>{data.label || "Group"}</span>}
        {/* Color swatch — opens inline picker */}
        <div style={{ position: "relative" }}>
          <div
            onClick={(e) => { e.stopPropagation(); setPickerOpen((o) => !o); }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ width: 10, height: 10, borderRadius: "50%", background: accent, cursor: "pointer", border: "1.5px solid #0f1117", flexShrink: 0 }}
          />
          {pickerOpen && (
            <div
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{ position: "absolute", bottom: 16, left: 0, background: "#1a1d27", border: "1px solid #2e303a", borderRadius: 8, padding: 8, display: "flex", gap: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", zIndex: 9999 }}>
              {GROUP_COLORS.map((c) => (
                <div key={c}
                  onClick={() => { onGroupColorRef.current?.(id, c); setPickerOpen(false); }}
                  style={{ width: 16, height: 16, borderRadius: "50%", background: c, cursor: "pointer", border: c === accent ? "2px solid #fff" : "2px solid transparent", transition: "transform 0.1s", flexShrink: 0 }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.25)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IconBtn({ icon: Icon, onClick, title, color, active }) {
  const [hovered, setHovered] = useState(false);
  const bg = active || hovered ? "#2e303a" : "transparent";
  const stroke = color || (active ? "#f3f4f6" : hovered ? "#f3f4f6" : "#6b7280");
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: bg, border: "none", borderRadius: 6, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.15s" }}
    >
      <Icon size={16} color={stroke} strokeWidth={1.8} />
    </button>
  );
}

function DbNode({ id, data, selected }) {
  const [editing, setEditing] = useState(data.editing ?? false);
  const [value, setValue] = useState(data.label ?? "");
  const inputRef = useRef(null);

  useEffect(() => { if (!editing) setValue(data.label); }, [data.label, editing]);
  useEffect(() => { if (editing) setTimeout(() => inputRef.current?.focus(), 50); }, [editing]);

  const commit = () => { setEditing(false); onRenameRef.current?.(id, value.trim() || "DB"); };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, minWidth: 100, filter: selected ? "drop-shadow(0 0 6px #7c3aed88)" : "none", transition: "filter 0.15s" }}>
      <Handle type="source" position={Position.Top} id="top-s" />
      <Handle type="target" position={Position.Top} id="top-t" style={{ left: "35%" }} />
      <Handle type="source" position={Position.Left} id="left-s" />
      <Handle type="target" position={Position.Left} id="left-t" style={{ top: "35%" }} />
      <Handle type="source" position={Position.Right} id="right-s" />
      <Handle type="target" position={Position.Right} id="right-t" style={{ top: "35%" }} />
      <Handle type="source" position={Position.Bottom} id="bottom-s" />
      <Handle type="target" position={Position.Bottom} id="bottom-t" style={{ left: "35%" }} />
      {/* Cylinder top */}
      <div style={{ width: "100%", height: 14, background: "#0d2d1f", border: "1px solid #059669", borderRadius: "50%", position: "relative", zIndex: 1 }} />
      {/* Cylinder body */}
      <div style={{ width: "100%", background: "#0a1f16", border: "1px solid #059669", borderLeft: "1px solid #059669", borderRight: "1px solid #059669", borderTop: "none", borderBottom: "none", padding: "8px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <Database size={14} color="#059669" strokeWidth={1.8} />
        {editing ? (
          <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)}
            onBlur={commit} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") commit(); }}
            onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}
            style={{ width: 80, fontSize: 11, background: "#0f1117", color: "#f3f4f6", border: "1px solid #059669", borderRadius: 4, padding: "2px 6px", textAlign: "center" }} />
        ) : (
          <span onDoubleClick={() => setEditing(true)} style={{ fontSize: 11, color: "#34d399", fontWeight: 500 }}>{data.label}</span>
        )}
      </div>
      {/* Cylinder bottom */}
      <div style={{ width: "100%", height: 14, background: "#0d2d1f", border: "1px solid #059669", borderRadius: "50%", marginTop: -1 }} />
    </div>
  );
}

const DB_ITEMS = ["Database"];
const LOGIC_ITEMS = ["Function", "Async Function", "Arrow Function", "If / Else", "Switch", "For Loop", "While Loop", "Try / Catch", "Variable", "Constant", "Array", "Object", "Map", "Set", "Console Log", "File Read", "File Write", "HTTP Request", "Class", "Constructor", "Method", "Interface"];

function resolveNode(label) {
  if (DB_ITEMS.includes(label)) return { type: "db", data: { label } };
  if (label === "Endpoint") return { type: "endpoint", data: { label: "myEndpoint", method: "GET", route: "/" } };
  if (LOGIC_ITEMS.includes(label) || label === "Logic") return { type: "logic", data: { label: label === "Logic" ? "myFunction" : label, logicType: label === "Logic" ? "Function" : label } };
  return { type: "logic", data: { label, logicType: "Function" } };
}

const nodesMapRef = { current: {} };

function DataFlowEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, label, source, target }) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  const isRelation = !!data?.relation;
  const manualDir = data?.flowDir; // "forward" | "reverse" | undefined

  const srcNode = nodesMapRef.current[source];
  const tgtNode = nodesMapRef.current[target];
  const srcType = srcNode?.type;
  const tgtType = tgtNode?.type;
  const tgtOp   = tgtNode?.data?.operation;
  const srcOp   = srcNode?.data?.operation;

  let reversed = false;
  if (manualDir) {
    reversed = false;
    if (manualDir === "forward") {
      if (srcType === "logic" && tgtType === "endpoint") reversed = true;
      if (srcType === "logic" && tgtType === "logic" && data?.reversePhysical) reversed = true;
    }
    if (manualDir === "reverse") {
      if (srcType === "endpoint" && tgtType === "logic") reversed = true;
    }
  } else if (!isRelation) {
    // Logic(fetch/delete) ↔ DB: data flows DB → Logic regardless of edge draw direction
    if (srcType === "db" && tgtType === "logic" && ["fetch", "delete"].includes(tgtOp)) reversed = false;
    if (srcType === "logic" && tgtType === "db" && ["fetch", "delete"].includes(srcOp)) reversed = true;

    // Logic(save) ↔ DB: data flows Logic → DB regardless of edge draw direction
    if (srcType === "logic" && tgtType === "db" && srcOp === "save") reversed = false;
    if (srcType === "db" && tgtType === "logic" && tgtOp === "save") reversed = true;

    // Endpoint → Logic: request params flow into logic
    if (srcType === "endpoint" && tgtType === "logic") reversed = false;
    if (srcType === "logic" && tgtType === "endpoint") reversed = false;
  }

  const color     = isRelation ? "#059669" : "#2e303a";
  const animColor = isRelation ? "#34d399" : "#7c3aed";

  // For reversed edges flip the dash offset direction
  const animation = reversed
    ? "dataflow-rev 1.4s linear infinite"
    : "dataflow 1.4s linear infinite";

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: color, strokeWidth: 1.5 }} />
      <path d={edgePath} fill="none"
        stroke={animColor} strokeWidth={1.5}
        strokeDasharray="6 10"
        style={{ animation, opacity: 0.6 }}
      />
      {label && (
        <EdgeLabelRenderer>
          <div style={{ position: "absolute", transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 10, fontFamily: "monospace", color: "#34d399", background: "#0a1f16",
            padding: "1px 6px", borderRadius: 4, border: "1px solid #05966944", pointerEvents: "none" }}>
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes = { dataflow: DataFlowEdge };

const nodeTypes = { multiHandle: MultiHandleNode, db: DbNode, endpoint: EndpointNode, logic: LogicNode, group: GroupNode };

const METHOD_COLORS = { GET: "#059669", POST: "#2563eb", PUT: "#d97706", PATCH: "#7c3aed", DELETE: "#dc2626" };

function EndpointNode({ id, data, selected }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(data.label ?? "");
  const inputRef = useRef(null);
  useEffect(() => { if (!editing) setValue(data.label); }, [data.label, editing]);
  useEffect(() => { if (editing) setTimeout(() => inputRef.current?.focus(), 50); }, [editing]);
  const commit = () => { setEditing(false); onRenameRef.current?.(id, value.trim() || "Endpoint"); };
  const method = data.method || "GET";
  const methodColor = METHOD_COLORS[method] || "#6b7280";

  return (
    <div style={{ background: "#0d1f1a", border: `1px solid ${selected ? "#7c3aed" : "#065f46"}`, borderRadius: 8, minWidth: 160, boxShadow: selected ? "0 0 0 2px #7c3aed44" : "none", transition: "border-color 0.15s, box-shadow 0.15s", overflow: "hidden" }}>
      <Handle type="source" position={Position.Top} id="top-s" />
      <Handle type="target" position={Position.Top} id="top-t" style={{ left: "35%" }} />
      <Handle type="source" position={Position.Bottom} id="bottom-s" />
      <Handle type="target" position={Position.Bottom} id="bottom-t" style={{ left: "35%" }} />
      <Handle type="source" position={Position.Left} id="left-s" />
      <Handle type="target" position={Position.Left} id="left-t" style={{ top: "35%" }} />
      <Handle type="source" position={Position.Right} id="right-s" />
      <Handle type="target" position={Position.Right} id="right-t" style={{ top: "35%" }} />
      <div style={{ background: "#052e1c", padding: "4px 10px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid #065f46" }}>
        <Globe size={10} color="#34d399" strokeWidth={2} />
        <span style={{ fontSize: 9, color: "#34d399", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Endpoint</span>
      </div>
      <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: methodColor, background: methodColor + "22", padding: "1px 6px", borderRadius: 3, fontFamily: "monospace" }}>{method}</span>
          {data.route && <span style={{ fontSize: 10, color: "#6b7280", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>{data.route}</span>}
        </div>
        {editing
          ? <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)} onBlur={commit} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") commit(); }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} style={{ fontSize: 12, fontWeight: 600, background: "#0f1117", color: "#f3f4f6", border: "1px solid #059669", borderRadius: 4, padding: "2px 6px", width: "100%", boxSizing: "border-box" }} />
          : <span onDoubleClick={() => setEditing(true)} style={{ fontSize: 12, fontWeight: 600, color: "#f3f4f6" }}>{data.label}</span>}
      </div>
    </div>
  );
}

const LOGIC_COLORS = { "If / Else": "#d97706", "Switch": "#ea580c", "For Loop": "#ca8a04", "While Loop": "#b45309", "Try / Catch": "#c2410c", "Function": "#7c3aed", "Async Function": "#6d28d9", "Arrow Function": "#5b21b6", "Class": "#0369a1", "Method": "#0284c7" };
const OP_COLORS = { fetch: "#059669", save: "#2563eb", delete: "#dc2626", validate: "#d97706", auth_basic: "#7c3aed", auth_advanced: "#6d28d9", transform: "#0891b2", utility: "#65a30d", http_request: "#0ea5e9", email: "#f59e0b", authorize: "#be185d" };
const OP_LABELS = { fetch: "Fetch", save: "Save", delete: "Delete", validate: "Validate", auth_basic: "Auth", auth_advanced: "Auth+", transform: "Transform", utility: "Utility", http_request: "HTTP Req", email: "Email", authorize: "Authorize" };

function resolveLogicOutputs(data) {
  const op = data.operation;
  if (!op) return [];
  if (op === "fetch") return data.fetchCfg?.fetchFields || [];
  if (op === "save") return ["id", ...Object.keys(data.saveCfg?.mapping || {})];
  if (op === "delete") return ["deleted"];
  if (op === "validate") { const f = data.validateCfg?.field; return f ? [f, `${f}_valid`] : []; }
  if (op === "auth_basic") return ["token", "user"];
  if (op === "auth_advanced") {
    const out = [];
    if (data.authAdvCfg?.hashField) out.push("hashedPassword");
    if (data.authAdvCfg?.jwtPayloadFields?.length) out.push("jwt");
    if (data.authAdvCfg?.decodeJwtOutput) out.push(data.authAdvCfg.decodeJwtOutput);
    return out;
  }
  if (op === "transform") return (data.transformCfg?.rows || []).map((r) => r.outputName).filter(Boolean);
  if (op === "utility") {
    const sub = data.utilityCfg?.subType;
    if (sub === "Paginate") return ["items", "page", "total"];
    if (sub === "Sort") return ["sorted"];
    if (sub === "Filter list") return ["filtered"];
    if (sub === "Count") return ["count"];
  }
  if (op === "http_request") {
    const name = data.httpReqCfg?.outputName || "apiResponse";
    return [name, `${name}_status`];
  }
  if (op === "email") return ["email_sent"];
  if (op === "authorize") return ["authorized"];
  return [];
}

function normalizeAgentEndpointOutputs(nodes, edges) {
  return nodes.map((node) => {
    if (node.type !== "endpoint") return node;
    const responseLogicNodes = edges
      .filter((e) => e.target === node.id && (e.data?.flowDir === "reverse" || e.data?.flowDir === undefined))
      .map((e) => nodes.find((n) => n.id === e.source))
      .filter((n) => n?.type === "logic");
    const provider = responseLogicNodes[responseLogicNodes.length - 1];
    const outputFields = provider ? [...new Set(resolveLogicOutputs(provider.data))] : [];
    return outputFields.length
      ? { ...node, data: { ...node.data, outputFields } }
      : node;
  });
}

function normalizeAgentEndpointResponseEdges(nodes, edges) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return edges.map((edge) => {
    const sourceNode = byId.get(edge.source);
    const targetNode = byId.get(edge.target);
    const flowDir = edge.data?.flowDir;

    if (flowDir === "forward" && sourceNode?.type === "endpoint" && targetNode?.type === "logic") {
      return {
        ...edge,
        type: edge.type || "dataflow",
        sourceHandle: "bottom-s",
        targetHandle: "top-t",
        data: { ...edge.data, flowDir: "forward" },
      };
    }

    if (sourceNode?.type === "logic" && targetNode?.type === "endpoint") {
      return {
        ...edge,
        type: edge.type || "dataflow",
        sourceHandle: "top-s",
        targetHandle: "bottom-t",
        data: { ...edge.data, flowDir: "reverse" },
      };
    }

    if (flowDir !== "reverse") return edge;

    if (sourceNode?.type === "endpoint" && targetNode?.type === "logic") {
      return {
        ...edge,
        source: edge.target,
        target: edge.source,
        type: edge.type || "dataflow",
        sourceHandle: "top-s",
        targetHandle: "bottom-t",
        data: { ...edge.data, flowDir: "reverse" },
      };
    }

    return edge;
  });
}

function LogicNode({ id, data, selected }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(data.label ?? "");
  const inputRef = useRef(null);
  useEffect(() => { if (!editing) setValue(data.label); }, [data.label, editing]);
  useEffect(() => { if (editing) setTimeout(() => inputRef.current?.focus(), 50); }, [editing]);
  const commit = () => { setEditing(false); onRenameRef.current?.(id, value.trim() || "Logic"); };

  const op = data.operation;
  const accent = op ? (OP_COLORS[op] || "#7c3aed") : (LOGIC_COLORS[data.logicType] || "#7c3aed");
  const opLabel = op ? OP_LABELS[op] : (data.logicType || "Logic");
  const outputs = resolveLogicOutputs(data);

  return (
    <div style={{ background: "#111318", border: `1px solid ${selected ? "#7c3aed" : accent + "66"}`, borderRadius: 8, minWidth: 140, boxShadow: selected ? "0 0 0 2px #7c3aed44" : "none", transition: "border-color 0.15s, box-shadow 0.15s", overflow: "hidden" }}>
      <Handle type="source" position={Position.Top} id="top-s" />
      <Handle type="target" position={Position.Top} id="top-t" style={{ left: "35%" }} />
      <Handle type="source" position={Position.Bottom} id="bottom-s" />
      <Handle type="target" position={Position.Bottom} id="bottom-t" style={{ left: "35%" }} />
      <Handle type="source" position={Position.Left} id="left-s" />
      <Handle type="target" position={Position.Left} id="left-t" style={{ top: "35%" }} />
      <Handle type="source" position={Position.Right} id="right-s" />
      <Handle type="target" position={Position.Right} id="right-t" style={{ top: "35%" }} />
      <div style={{ background: accent + "22", padding: "4px 10px", display: "flex", alignItems: "center", gap: 6, borderBottom: `1px solid ${accent}44` }}>
        <GitBranch size={10} color={accent} strokeWidth={2} />
        <span style={{ fontSize: 9, color: accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{opLabel}</span>
      </div>
      <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 5 }}>
        {editing
          ? <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)} onBlur={commit} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") commit(); }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} style={{ fontSize: 12, fontWeight: 600, background: "#0f1117", color: "#f3f4f6", border: `1px solid ${accent}`, borderRadius: 4, padding: "2px 6px", width: "100%", boxSizing: "border-box" }} />
          : <span onDoubleClick={() => setEditing(true)} style={{ fontSize: 12, fontWeight: 600, color: "#f3f4f6" }}>{data.label}</span>}
        {outputs.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 2 }}>
            {outputs.map((f) => (
              <span key={f} style={{ fontSize: 9, fontFamily: "monospace", color: accent, background: accent + "18", padding: "1px 5px", borderRadius: 3, border: `1px solid ${accent}33` }}>{f}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const RELATIONS = [
  { value: "1:1",  label: "One to One",  symbol: "1 — 1" },
  { value: "1:N",  label: "One to Many", symbol: "1 — N" },
  { value: "N:M",  label: "Many to Many", symbol: "N — M" },
];

function RelationPickerModal({ edge, allNodes, onConfirm, onClose }) {
  const [relation, setRelation] = useState("1:N");
  const source = allNodes.find((n) => n.id === edge.source);
  const target = allNodes.find((n) => n.id === edge.target);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#111318", border: "1px solid #2e303a", borderRadius: 12, width: 360, boxShadow: "0 32px 64px rgba(0,0,0,0.6)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e2030", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#f3f4f6" }}>Define Relation</div>
            <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>
              <span style={{ color: "#34d399" }}>{source?.data.label}</span>
              <span style={{ color: "#374151" }}> → </span>
              <span style={{ color: "#34d399" }}>{target?.data.label}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}>
            <X size={15} color="#4b5563" strokeWidth={1.8} />
          </button>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
          {RELATIONS.map((r) => (
            <div key={r.value} onClick={() => setRelation(r.value)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                background: relation === r.value ? "#1e1a3a" : "#1a1d27",
                border: `1px solid ${relation === r.value ? "#7c3aed" : "#2e303a"}` }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: relation === r.value ? "#c4b5fd" : "#d1d5db" }}>{r.label}</div>
              </div>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: relation === r.value ? "#7c3aed" : "#4b5563", background: "#0f1117", padding: "2px 8px", borderRadius: 4 }}>{r.symbol}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid #1e2030", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onClose} style={{ padding: "7px 16px", borderRadius: 6, border: "1px solid #2e303a", background: "none", color: "#6b7280", fontSize: 12, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onConfirm(relation)} style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: "#7c3aed", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

function NodeContextMenu({ x, y, node, onClose, onConfigure, onTest, onCut, onCopy, onPaste, onDelete, onUngroup, onRemoveFromGroup, canPaste }) {
  useEffect(() => {
    const close = (e) => { if (e.button === 0 || e.type === "keydown") onClose(); };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [onClose]);

  const isGroup = node.type === "group";
  const isGroupChild = !!node.parentNode;
  const items = isGroup ? [
    { label: "Ungroup", shortcut: "", action: onUngroup, accent: true },
    null,
    { label: "Cut", shortcut: "Ctrl+X", action: onCut },
    { label: "Copy", shortcut: "Ctrl+C", action: onCopy },
    { label: "Paste", shortcut: "Ctrl+V", action: onPaste, disabled: !canPaste },
    null,
    { label: "Delete Group", shortcut: "Del", action: onDelete, danger: true },
  ] : [
    { label: "Configure", shortcut: "Enter", action: onConfigure, accent: true },
    ...(node.type === "endpoint" ? [{ label: "Test", shortcut: "", action: onTest, teal: true }] : []),
    null,
    ...(isGroupChild ? [{ label: "Remove from group", shortcut: "", action: onRemoveFromGroup }] : []),
    { label: "Cut", shortcut: "Ctrl+X", action: onCut },
    { label: "Copy", shortcut: "Ctrl+C", action: onCopy },
    { label: "Paste", shortcut: "Ctrl+V", action: onPaste, disabled: !canPaste },
    null,
    { label: "Delete", shortcut: "Del", action: onDelete, danger: true },
  ];

  return (
    <div onMouseDown={(e) => e.stopPropagation()} style={{
      position: "fixed", left: x, top: y, zIndex: 1000,
      background: "#1a1d27", border: "1px solid #2e303a", borderRadius: 8,
      padding: "4px", minWidth: 200, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    }}>
      {items.map((item, i) =>
        item === null
          ? <div key={i} style={{ height: 1, background: "#2e303a", margin: "3px 0" }} />
          : (
            <div key={item.label} onClick={() => { if (!item.disabled) { item.action(); onClose(); } }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "7px 10px", borderRadius: 5, cursor: item.disabled ? "default" : "pointer",
                color: item.danger ? "#f87171" : item.accent ? "#c4b5fd" : item.teal ? "#f472b6" : item.disabled ? "#374151" : "#d1d5db",
                fontSize: 12,
              }}
              onMouseEnter={(e) => { if (!item.disabled) e.currentTarget.style.background = "#2e303a"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <span>{item.label}</span>
              <span style={{ fontSize: 11, color: item.disabled ? "#2e303a" : "#4b5563", fontFamily: "monospace" }}>{item.shortcut}</span>
            </div>
          )
      )}
    </div>
  );
}

function ProjectStateStepper({ state }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {STATE_META.filter((s) => s.key !== "RUNNING").map((s, i) => {
        const idx = PROJECT_STATE[s.key];
        const active = state >= idx;
        const isCurrent = state === idx;
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center" }}>
            {i > 0 && <div style={{ width: 20, height: 1, background: active ? s.color : "#2e303a", transition: "background 0.3s" }} />}
            <div
              title={`${s.label} — ${s.desc}`}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 8px", borderRadius: 5,
                background: isCurrent ? s.color + "22" : "transparent",
                border: `1px solid ${isCurrent ? s.color + "66" : "transparent"}`,
                transition: "all 0.3s" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: active ? s.color : "#2e303a", transition: "background 0.3s", flexShrink: 0,
                boxShadow: isCurrent ? `0 0 6px ${s.color}` : "none" }} />
              <span style={{ fontSize: 11, fontWeight: isCurrent ? 600 : 400, color: active ? s.color : "#4b5563", transition: "color 0.3s" }}>{s.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function validateGraph(nodes, edges) {
  const issues = [];
  const realNodes = nodes.filter((n) => n.type !== "group");
  const connectedIds = new Set(edges.flatMap((e) => [e.source, e.target]));

  // Isolated nodes
  const isolated = realNodes.filter((n) => !connectedIds.has(n.id));
  if (isolated.length > 0)
    issues.push({ severity: "warn", title: "Isolated nodes", detail: `${isolated.map((n) => `"${n.data.label}"`).join(", ")} ${isolated.length === 1 ? "has" : "have"} no connections and won't be included in the build.` });

  // Endpoints with no route
  const noRoute = realNodes.filter((n) => n.type === "endpoint" && !n.data.route?.trim());
  if (noRoute.length > 0)
    issues.push({ severity: "warn", title: "Endpoints missing a route", detail: `${noRoute.map((n) => `"${n.data.label}"`).join(", ")} ${noRoute.length === 1 ? "has" : "have"} no route defined.` });

  // DB nodes with no fields
  const emptyDb = realNodes.filter((n) => n.type === "db" && (!n.data.fields || n.data.fields.length === 0));
  if (emptyDb.length > 0)
    issues.push({ severity: "warn", title: "Empty database schemas", detail: `${emptyDb.map((n) => `"${n.data.label}"`).join(", ")} ${emptyDb.length === 1 ? "has" : "have"} no fields defined.` });

  // Duplicate node labels
  const labels = realNodes.map((n) => n.data.label?.trim()).filter(Boolean);
  const dupes = labels.filter((l, i) => labels.indexOf(l) !== i);
  if (dupes.length > 0)
    issues.push({ severity: "error", title: "Duplicate node names", detail: `"${[...new Set(dupes)].join('", "')}" appear more than once. Node names should be unique.` });

  // Empty graph
  if (realNodes.length === 0)
    issues.push({ severity: "error", title: "Empty graph", detail: "There are no nodes in the graph. Add some nodes before building." });

  return issues;
}

// Diff two node snapshots — returns { schemaChanged, logicChanged }
function diffGraph(prevJson, currentNodes, currentEdges) {
  if (!prevJson) return { schemaChanged: false, logicChanged: false };
  const prev = JSON.parse(prevJson);
  const prevDbMap  = Object.fromEntries((prev.nodes || []).filter((n) => n.type === "db").map((n) => [n.id, JSON.stringify({ fields: n.data.fields, tableName: n.data.tableName, dbType: n.data.dbType })]));
  const currDbMap  = Object.fromEntries(currentNodes.filter((n) => n.type === "db").map((n) => [n.id, JSON.stringify({ fields: n.data.fields, tableName: n.data.tableName, dbType: n.data.dbType })]));
  const schemaChanged = JSON.stringify(prevDbMap) !== JSON.stringify(currDbMap);

  const prevLogicMap = Object.fromEntries((prev.nodes || []).filter((n) => n.type !== "db" && n.type !== "group").map((n) => [n.id, JSON.stringify(n.data)]));
  const currLogicMap = Object.fromEntries(currentNodes.filter((n) => n.type !== "db" && n.type !== "group").map((n) => [n.id, JSON.stringify(n.data)]));
  const logicChanged = JSON.stringify(prevLogicMap) !== JSON.stringify(currLogicMap) || JSON.stringify(prev.edges) !== JSON.stringify(currentEdges);

  return { schemaChanged, logicChanged };
}

function BuildButton({ projectPath, projectState, hasChanges, lastBuiltGraphJson, onStateChange, nodes, edges, onOpenSettings, termOpen, termHeight }) {
  const [building, setBuilding] = useState(false);
  const [logs, setLogs] = useState([]);
  const [logsOpen, setLogsOpen] = useState(false);
  const [buildResult, setBuildResult] = useState(null); // "success" | "error" | null
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [issues, setIssues] = useState([]);
  const [missingFramework, setMissingFramework] = useState(false);
  const [missingDb, setMissingDb] = useState(false);
  const logsEndRef = useRef(null);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const getSettings = () => {
    const fromFile = window.electronAPI?.readProjectSettings?.(projectPath);
    return fromFile || JSON.parse(localStorage.getItem(`devflow_settings_${projectPath}`) || "null") || {};
  };

  const { schemaChanged, logicChanged } = diffGraph(lastBuiltGraphJson, nodes, edges);
  // migrate-only: schema changed but logic/endpoints unchanged
  const migrateOnly = hasChanges && schemaChanged && !logicChanged;

  const handleBuildClick = () => {
    const cfg = getSettings();
    // Persist settings to .devflow if they only exist in localStorage
    if (cfg.framework && !window.electronAPI?.readProjectSettings?.(projectPath)) {
      window.electronAPI?.saveProjectSettings?.(projectPath, cfg);
    }
    const hasDbNodes = nodes.some((n) => n.type === "db");
    const graphIssues = validateGraph(nodes, edges);
    const noFramework = !cfg.framework;
    const noOrm = hasDbNodes && !cfg.orm;

    setIssues(graphIssues);
    setMissingFramework(noFramework);
    setMissingDb(noOrm);

    const hasErrors = graphIssues.some((i) => i.severity === "error");
    if (!noFramework && !noOrm && graphIssues.length === 0) {
      if (migrateOnly) { startMigrate(cfg); return; }
      startBuild(cfg);
      return;
    }
    setPreflightOpen(true);
  };

  const startMigrate = async (cfg) => {
    setPreflightOpen(false);
    setLogs([]);
    setBuildResult(null);
    setLogsOpen(true);
    setBuilding(true);
    let hasError = false;
    window.electronAPI?.onBuildProgress((msg) => {
      if (msg.type === "log")   setLogs((l) => [...l, { text: msg.data, kind: "log" }]);
      if (msg.type === "step")  setLogs((l) => [...l, { text: msg.data, kind: "step" }]);
      if (msg.type === "error") { setLogs((l) => [...l, { text: msg.data, kind: "error" }]); hasError = true; }
      if (msg.type === "done")  setLogs((l) => [...l, { text: msg.data, kind: "done" }]);
      if (msg.type === "state") onStateChange(PROJECT_STATE[msg.data]);
    });
    await window.electronAPI?.buildProject(projectPath, cfg.framework, { nodes, edges }, cfg);
    await window.electronAPI?.migrateProject(projectPath, cfg.framework, cfg);
    window.electronAPI?.offBuildProgress();
    setBuilding(false);
    setBuildResult(hasError ? "error" : "success");
  };

  const startBuild = async (cfg) => {
    setPreflightOpen(false);
    setLogs([]);
    setBuildResult(null);
    setLogsOpen(true);
    setBuilding(true);
    let hasError = false;
    window.electronAPI?.onBuildProgress((msg) => {
      if (msg.type === "log")   setLogs((l) => [...l, { text: msg.data, kind: "log" }]);
      if (msg.type === "step")  setLogs((l) => [...l, { text: msg.data, kind: "step" }]);
      if (msg.type === "error") { setLogs((l) => [...l, { text: msg.data, kind: "error" }]); hasError = true; }
      if (msg.type === "done")  setLogs((l) => [...l, { text: msg.data, kind: "done" }]);
      if (msg.type === "state") onStateChange(PROJECT_STATE[msg.data]);
    });
    await window.electronAPI?.buildProject(projectPath, cfg.framework, { nodes, edges }, cfg);
    window.electronAPI?.offBuildProgress();
    setBuilding(false);
    setBuildResult(hasError ? "error" : "success");
  };

  const isBuilding = projectState === PROJECT_STATE.BUILDING || building;
  const isDone     = projectState >= PROJECT_STATE.READY;
  const showUpdate = isDone && hasChanges && !building;
  const showBuild  = !isDone && !isBuilding;
  const hasErrors  = issues.some((i) => i.severity === "error");
  const cfg        = getSettings();

  // Label for the update button based on what changed
  const updateLabel = migrateOnly ? "Migrate DB" : "Update Project";
  const updateColor = migrateOnly ? "#059669" : "#d97706";
  const updateGlow  = migrateOnly ? "#05966944" : "#d9770644";
  const updateBorder = migrateOnly ? "#05966988" : "#d9770688";
  const updateGrad  = migrateOnly ? "linear-gradient(135deg, #059669, #047857)" : "linear-gradient(135deg, #d97706, #b45309)";

  return (
    <>
      {/* Floating build / logs button */}
      <div style={{ position: "fixed", bottom: termOpen ? termHeight + 16 : 24, left: "50%", transform: "translateX(-50%)", zIndex: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "bottom 0.2s cubic-bezier(0.4,0,0.2,1)" }}>
        {(showBuild || showUpdate) && (
          <button onClick={handleBuildClick} disabled={building}
            onMouseEnter={(e) => { if (!building) { e.currentTarget.style.transform = "translateY(-2px) scale(1.03)"; e.currentTarget.style.boxShadow = showUpdate ? `0 8px 32px ${updateColor}66, 0 0 0 1px ${updateColor}88` : "0 8px 32px #7c3aed66, 0 0 0 1px #7c3aed88"; }}}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = building ? "none" : showUpdate ? `0 4px 24px ${updateGlow}` : "0 4px 24px #7c3aed44"; }}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 24px", borderRadius: 12,
              background: building ? "#1a1d27" : showUpdate ? updateGrad : "linear-gradient(135deg, #7c3aed, #2563eb)",
              border: `1px solid ${building ? "#2e303a" : showUpdate ? updateBorder : "#7c3aed88"}`,
              color: building ? "#6b7280" : "#fff", fontSize: 13, fontWeight: 600,
              cursor: building ? "not-allowed" : "pointer",
              boxShadow: building ? "none" : showUpdate ? `0 4px 24px ${updateGlow}` : "0 4px 24px #7c3aed44",
              transition: "transform 0.15s, box-shadow 0.15s, background 0.15s" }}>
            {building
              ? <><div style={{ width: 14, height: 14, border: "2px solid #4b5563", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "devflow-spin 0.7s linear infinite" }} /> {migrateOnly ? "Migrating..." : "Building..."}</>
              : showUpdate
              ? <><Hammer size={14} strokeWidth={2} /> {updateLabel}</>
              : <><Hammer size={14} strokeWidth={2} /> Build Project</>}
          </button>
        )}
        {(isDone || building) && (
          <div style={{ display: "flex", gap: 6 }}>
            {isDone && !showUpdate && !building && (
              <button onClick={handleBuildClick}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8,
                  background: "#1a1d27", border: "1px solid #2e303a", color: "#6b7280",
                  fontSize: 11, fontWeight: 500, cursor: "pointer", transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7c3aed44"; e.currentTarget.style.color = "#c4b5fd"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2e303a"; e.currentTarget.style.color = "#6b7280"; }}>
                <RefreshCw size={11} strokeWidth={2} /> Rebuild
              </button>
            )}
            <button onClick={() => setLogsOpen((o) => !o)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8,
                background: "#0a1f16", border: "1px solid #05966944", color: "#34d399",
                fontSize: 11, fontWeight: 500, cursor: "pointer" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: building ? "#d97706" : "#34d399",
                animation: building ? "devflow-spin 1s linear infinite" : "none" }} />
              {building ? "Building..." : "Build Logs"}
            </button>
          </div>
        )}
      </div>

      {/* Preflight modal */}
      {preflightOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => e.target === e.currentTarget && setPreflightOpen(false)}>
          <div style={{ background: "#111318", border: "1px solid #2e303a", borderRadius: 12, width: 480,
            maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 64px rgba(0,0,0,0.6)" }}>

            {/* Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e2030", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#f3f4f6" }}>Pre-build Check</div>
                <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>Review before proceeding</div>
              </div>
              <button onClick={() => setPreflightOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}>
                <X size={15} color="#4b5563" strokeWidth={1.8} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>

              {/* Config issues */}
              {(missingFramework || missingDb) && (
                <div style={{ background: "#1a1410", border: "1px solid #d9770633", borderRadius: 8, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "#d97706", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Configuration required</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {missingFramework && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "#d1d5db" }}>No framework selected</span>
                        <button onClick={() => { setPreflightOpen(false); onOpenSettings(); }}
                          style={{ fontSize: 11, color: "#38bdf8", background: "none", border: "1px solid #38bdf833", borderRadius: 5, padding: "3px 10px", cursor: "pointer" }}>
                          Open Settings →
                        </button>
                      </div>
                    )}
                    {missingDb && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 12, color: "#d1d5db" }}>DB nodes found but no ORM selected</span>
                        <button onClick={() => { setPreflightOpen(false); onOpenSettings(); }}
                          style={{ fontSize: 11, color: "#38bdf8", background: "none", border: "1px solid #38bdf833", borderRadius: 5, padding: "3px 10px", cursor: "pointer" }}>
                          Open Settings →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Graph issues */}
              {issues.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {issues.map((issue, i) => (
                    <div key={i} style={{
                      background: issue.severity === "error" ? "#1a1010" : "#141208",
                      border: `1px solid ${issue.severity === "error" ? "#dc262633" : "#d9770633"}`,
                      borderRadius: 8, padding: "10px 14px",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: issue.severity === "error" ? "#f87171" : "#fbbf24", flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: issue.severity === "error" ? "#f87171" : "#fbbf24" }}>{issue.title}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>{issue.detail}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* All clear */}
              {issues.length === 0 && !missingFramework && !missingDb && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#0a1f16", border: "1px solid #05966933", borderRadius: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399" }} />
                  <span style={{ fontSize: 12, color: "#34d399" }}>Graph looks good. Ready to build.</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 20px", borderTop: "1px solid #1e2030", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
              <button onClick={() => setPreflightOpen(false)}
                style={{ padding: "7px 16px", borderRadius: 6, border: "1px solid #2e303a", background: "none", color: "#6b7280", fontSize: 12, cursor: "pointer" }}>
                Cancel
              </button>
              <button
                onClick={() => { if (!hasErrors && !missingFramework && !missingDb) { if (migrateOnly) startMigrate(getSettings()); else startBuild(getSettings()); } }}
                disabled={hasErrors || missingFramework || missingDb}
                style={{ padding: "7px 16px", borderRadius: 6, border: "none",
                  background: (hasErrors || missingFramework || missingDb) ? "#1e2030" : "#7c3aed",
                  color: (hasErrors || missingFramework || missingDb) ? "#374151" : "#fff",
                  fontSize: 12, cursor: (hasErrors || missingFramework || missingDb) ? "not-allowed" : "pointer", fontWeight: 500 }}>
                {hasErrors || missingFramework || missingDb ? "Resolve issues to build" : migrateOnly ? "Migrate DB" : "Build anyway"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Build log panel */}
      {logsOpen && (
        <div style={{ position: "fixed", bottom: termOpen ? termHeight + 56 : 80, left: "50%", transform: "translateX(-50%)", width: 520, maxHeight: 320,
          background: "#0c0e14", border: `1px solid ${buildResult === "success" ? "#05966944" : buildResult === "error" ? "#dc262644" : "#1e2030"}`, borderRadius: 10,
          boxShadow: "0 16px 48px rgba(0,0,0,0.6)", zIndex: 60, display: "flex", flexDirection: "column", overflow: "hidden",
          transition: "border-color 0.3s" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #1e2030", flexShrink: 0 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", marginRight: 8, flexShrink: 0,
              background: building ? "#d97706" : buildResult === "success" ? "#34d399" : buildResult === "error" ? "#f87171" : "#4b5563",
              animation: building ? "devflow-spin 1s linear infinite" : "none",
              boxShadow: !building && buildResult === "success" ? "0 0 6px #34d399" : !building && buildResult === "error" ? "0 0 6px #f87171" : "none" }} />
            <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, flex: 1 }}>Build Output</span>
            <button onClick={() => setLogsOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 2 }}>
              <X size={13} color="#4b5563" strokeWidth={1.8} />
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 12px", fontFamily: "monospace", fontSize: 11, display: "flex", flexDirection: "column", gap: 2 }}>
            {logs.length === 0 && <span style={{ color: "#4b5563" }}>Waiting for build...</span>}
            {logs.map((l, i) => (
              l.kind === "step"
                ? <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 2px", paddingTop: i > 0 ? 6 : 0, borderTop: i > 0 ? "1px solid #1e2030" : "none" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#7c3aed", flexShrink: 0, boxShadow: "0 0 4px #7c3aed" }} />
                    <span style={{ color: "#c4b5fd", fontWeight: 600, fontSize: 11, letterSpacing: 0.3 }}>{l.text}</span>
                  </div>
                : <span key={i} style={{ color: l.kind === "error" ? "#f87171" : l.kind === "done" ? "#34d399" : "#6b7280", whiteSpace: "pre-wrap", wordBreak: "break-all", paddingLeft: 13 }}>{l.text}</span>
            ))}
            <div ref={logsEndRef} />
          </div>
          {buildResult && (
            <div style={{ padding: "10px 14px", borderTop: `1px solid ${buildResult === "success" ? "#05966933" : "#dc262633"}`, flexShrink: 0,
              background: buildResult === "success" ? "#0a1f16" : "#1a0a0a",
              display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                background: buildResult === "success" ? "#34d399" : "#f87171",
                boxShadow: buildResult === "success" ? "0 0 8px #34d399" : "0 0 8px #f87171" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: buildResult === "success" ? "#34d399" : "#f87171" }}>
                {buildResult === "success" ? "✓ Build complete — project is ready" : "✗ Build finished with errors"}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function EdgeContextMenu({ x, y, edge, onClose, onFlip, onDelete }) {
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [onClose]);
  const isReversed = edge.data?.flowDir === "reverse";
  return (
    <div onMouseDown={(e) => e.stopPropagation()} style={{
      position: "fixed", left: x, top: y, zIndex: 1000,
      background: "#1a1d27", border: "1px solid #2e303a", borderRadius: 8,
      padding: 4, minWidth: 180, boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    }}>
      <div style={{ padding: "5px 10px 7px", borderBottom: "1px solid #2e303a", marginBottom: 3 }}>
        <div style={{ fontSize: 10, color: "#4b5563", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Data Flow</div>
        <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2, fontFamily: "monospace" }}>
          {isReversed ? "← reverse" : "→ forward"}
        </div>
      </div>
      {[{ label: "→ Forward", dir: "forward" }, { label: "← Reverse", dir: "reverse" }].map((item) => (
        <div key={item.dir} onClick={() => { onFlip(item.dir); onClose(); }}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "7px 10px", borderRadius: 5, cursor: "pointer", fontSize: 12,
            color: edge.data?.flowDir === item.dir || (!edge.data?.flowDir && item.dir === "forward") ? "#c4b5fd" : "#d1d5db",
            background: edge.data?.flowDir === item.dir || (!edge.data?.flowDir && item.dir === "forward") ? "#1e1a3a" : "transparent" }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#2e303a"}
          onMouseLeave={(e) => e.currentTarget.style.background =
            edge.data?.flowDir === item.dir || (!edge.data?.flowDir && item.dir === "forward") ? "#1e1a3a" : "transparent"}>
          {item.label}
        </div>
      ))}
      <div style={{ height: 1, background: "#2e303a", margin: "3px 0" }} />
      <div onClick={() => { onDelete(); onClose(); }}
        style={{ padding: "7px 10px", borderRadius: 5, cursor: "pointer", fontSize: 12, color: "#f87171" }}
        onMouseEnter={(e) => e.currentTarget.style.background = "#2e303a"}
        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
        Delete edge
      </div>
    </div>
  );
}

function AppInner() {
  const { screenToFlowPosition } = useReactFlow();
  const [project, setProject] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [termOpen, setTermOpen] = useState(false);
  const [termHeight, setTermHeight] = useState(280);
  const [loading, setLoading] = useState(true);
  const [configNode, setConfigNode] = useState(null);
  const [ctxMenu, setCtxMenu] = useState(null); // { node, x, y }
  const [edgeCtxMenu, setEdgeCtxMenu] = useState(null); // { edge, x, y }
  const [clipboard, setClipboard] = useState(null);
  const [relationEdge, setRelationEdge] = useState(null);
  const [serverRunning, setServerRunning] = useState(false);
  const serverRunningRef = useRef(false);
  const [projectState, setProjectState] = useState(PROJECT_STATE.EMPTY);
  const [hasChanges, setHasChanges] = useState(false);
  const lastBuiltGraphRef = useRef(null);
  const [sidebarPanel, setSidebarPanel] = useState(null);
  const [testNodeId, setTestNodeId] = useState(null);
  const [dragOverGroup, setDragOverGroup] = useState(null);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [agentBuilding, setAgentBuilding] = useState(false);

  const edgesRef = useRef(edges);
  const nodesRef = useRef(nodes);
  edgesRef.current = edges;
  nodesRef.current = nodes;
  serverRunningRef.current = serverRunning;
  nodesMapRef.current = Object.fromEntries(nodes.map((n) => [n.id, n]));
  dragOverGroupRef.current = dragOverGroup;

  const openProject = (proj) => {
    const graph = api.openProject(proj.path);
    setNodes(graph.nodes);
    setEdges(graph.edges);
    setProject(proj);
    const detected = window.electronAPI?.detectProjectState?.(proj.path) ?? PROJECT_STATE.EMPTY;
    // Never restore BUILDING — means a previous build crashed
    setProjectState(detected === PROJECT_STATE.BUILDING ? PROJECT_STATE.EMPTY : detected);
    if (detected >= PROJECT_STATE.READY) {
      lastBuiltGraphRef.current = JSON.stringify({ nodes: graph.nodes, edges: graph.edges });
    }
    localStorage.setItem("devflow_last_project", proj.path);
  };

  // Watch project folder — if generated files disappear, reset to EMPTY
  useEffect(() => {
    if (!project) return;
    const CHECK_FILES = ["app.py", "main.py", "manage.py"];
    const interval = setInterval(() => {
      const hasFiles = CHECK_FILES.some((f) => api.pathExists(`${project.path}/${f}`));
      setProjectState((prev) => {
        if (prev >= PROJECT_STATE.READY && !hasFiles) {
          lastBuiltGraphRef.current = null;
          setHasChanges(false);
          api.saveGraph(project.path, { nodes: nodesRef.current, edges: edgesRef.current, projectState: PROJECT_STATE.EMPTY });
          return PROJECT_STATE.EMPTY;
        }
        return prev;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [project]);

  useEffect(() => {
    const handler = () => setTermOpen(true);
    window.electronAPI?.onBuildOpenTerminal(handler);
    return () => window.electronAPI?.offBuildOpenTerminal?.();
  }, []);

  useEffect(() => {
    const lastPath = localStorage.getItem("devflow_last_project");
    if (!lastPath) { setLoading(false); return; }
    const projects = api.listProjects();
    const proj = projects.find((p) => p.path === lastPath);
    if (proj && api.pathExists(proj.path)) openProject(proj);
    else localStorage.removeItem("devflow_last_project");
    setLoading(false);
  }, []);

  const projectStateRef = useRef(projectState);
  projectStateRef.current = projectState;

  const save = useCallback((nodes, edges) => {
    if (project) api.saveGraph(project.path, { nodes, edges, projectState: projectStateRef.current });
  }, [project]);

  const commit = useCallback((newNodes, newEdges) => {
    setHistory((h) => [...h.slice(-49), { nodes: nodesRef.current, edges: edgesRef.current }]);
    setFuture([]);
    setNodes(newNodes);
    setEdges(newEdges);
    if (project) api.saveGraph(project.path, { nodes: newNodes, edges: newEdges, projectState: projectStateRef.current });
    if (lastBuiltGraphRef.current) {
      const current = JSON.stringify({ nodes: newNodes, edges: newEdges });
      setHasChanges(current !== lastBuiltGraphRef.current);
    }
  }, [project]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [{ nodes: nodesRef.current, edges: edgesRef.current }, ...f.slice(0, 49)]);
      setNodes(prev.nodes);
      setEdges(prev.edges);
      if (project) api.saveGraph(project.path, { nodes: prev.nodes, edges: prev.edges, projectState: projectStateRef.current });
      return h.slice(0, -1);
    });
  }, [project]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (!f.length) return f;
      const next = f[0];
      setHistory((h) => [...h.slice(-49), { nodes: nodesRef.current, edges: edgesRef.current }]);
      setNodes(next.nodes);
      setEdges(next.edges);
      if (project) api.saveGraph(project.path, { nodes: next.nodes, edges: next.edges, projectState: projectStateRef.current });
      return f.slice(1);
    });
  }, [project]);

  const saveProjectState = useCallback((newState) => {
    setProjectState(newState);
    if (newState === PROJECT_STATE.READY) {
      lastBuiltGraphRef.current = JSON.stringify({ nodes: nodesRef.current, edges: edgesRef.current });
      setHasChanges(false);
    }
    if (project) api.saveGraph(project.path, { nodes: nodesRef.current, edges: edgesRef.current, projectState: newState });
  }, [project]);

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => {
      const updated = applyNodeChanges(changes, nds);
      const posChange = changes.find((c) => c.type === "position" && c.dragging === false);
      const dimChange = changes.find((c) => c.type === "dimensions");
      if (!posChange && !dimChange) return updated;

      // Refit every group to tightly wrap its children
      const PAD = 40;
      const refitted = updated.map((n) => {
        if (n.type !== "group") return n;
        const children = updated.filter((c) => c.parentNode === n.id);
        if (children.length === 0) return n;
        const minX = Math.min(...children.map((c) => c.position.x));
        const minY = Math.min(...children.map((c) => c.position.y));
        const maxX = Math.max(...children.map((c) => c.position.x + (c.width ?? c.measured?.width ?? 180)));
        const maxY = Math.max(...children.map((c) => c.position.y + (c.height ?? c.measured?.height ?? 80)));
        const w = maxX - minX + PAD * 2;
        const h = maxY - minY + PAD * 2;
        return { ...n, width: w, height: h, style: { ...n.style, width: w, height: h } };
      });

      save(refitted, edgesRef.current);
      return refitted;
    });
  }, [save]);

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((connection) => {
    const sourceNode = nodesRef.current.find((n) => n.id === connection.source);
    const targetNode = nodesRef.current.find((n) => n.id === connection.target);

    if (sourceNode?.type === "db" && targetNode?.type === "db") {
      setRelationEdge(connection);
      return;
    }

    // Endpoint: max 1 outgoing + 1 incoming edge total
    if (sourceNode?.type === "endpoint") {
      if (edgesRef.current.some((e) => e.source === connection.source)) return;
    }
    if (targetNode?.type === "endpoint") {
      if (edgesRef.current.some((e) => e.target === connection.target)) return;
    }

    setEdges((eds) => {
      const updated = addEdge(connection, eds);
      commit(nodesRef.current, updated);
      return updated;
    });
  }, [commit]);

  const onNodeDrag = useCallback((_, draggedNode) => {
    if (draggedNode.type === "group" || draggedNode.parentNode) { setDragOverGroup(null); return; }
    const groups = nodesRef.current.filter((n) => n.type === "group");
    const match = groups.find((g) => {
      const gw = g.width ?? g.style?.width ?? 200;
      const gh = g.height ?? g.style?.height ?? 200;
      const { x, y } = draggedNode.position;
      return x >= g.position.x && y >= g.position.y
        && x + (draggedNode.width ?? 140) <= g.position.x + gw
        && y + (draggedNode.height ?? 60) <= g.position.y + gh;
    });
    setDragOverGroup(match ? match.id : null);
  }, []);

  const onNodeDragStop = useCallback((_, draggedNode) => {
    setDragOverGroup(null);
    if (draggedNode.type === "group" || draggedNode.parentNode) return;
    const groups = nodesRef.current.filter((n) => n.type === "group");
    const match = groups.find((g) => {
      const gw = g.width ?? g.style?.width ?? 200;
      const gh = g.height ?? g.style?.height ?? 200;
      const { x, y } = draggedNode.position;
      return x >= g.position.x && y >= g.position.y
        && x + (draggedNode.width ?? 140) <= g.position.x + gw
        && y + (draggedNode.height ?? 60) <= g.position.y + gh;
    });
    if (!match) return;
    const updated = nodesRef.current.map((n) =>
      n.id === draggedNode.id ? {
        ...n, parentNode: match.id, extent: "parent", expandParent: false, zIndex: 1,
        position: { x: draggedNode.position.x - match.position.x, y: draggedNode.position.y - match.position.y },
      } : n
    );
    commit(updated, edgesRef.current);
  }, [commit]);

  onRenameRef.current = useCallback((id, label) => {
    setNodes((nds) => {
      const updated = nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, label, editing: false } } : n
      );
      commit(updated, edgesRef.current);
      return updated;
    });
  }, [commit]);

  onGroupColorRef.current = useCallback((id, color) => {
    setNodes((nds) => {
      const updated = nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, color } } : n
      );
      commit(updated, edgesRef.current);
      return updated;
    });
  }, [commit]);

  const startServer = useCallback(() => {
    const SETTINGS_KEY = `devflow_settings_${project?.path}`;
    const fromFile = window.electronAPI?.readProjectSettings?.(project?.path);
    const cfg = fromFile || JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null") || { framework: "Flask", port: "5000", host: "127.0.0.1", debug: true };
    const commands = {
      "Flask":   `flask run --host=${cfg.host} --port=${cfg.port}${cfg.debug ? " --debug" : ""}`,
      "FastAPI": `uvicorn main:app --host ${cfg.host} --port ${cfg.port}${cfg.debug ? " --reload" : ""}`,
      "Django":  `python manage.py runserver ${cfg.host}:${cfg.port}`,
    };
    const cmd = commands[cfg.framework] || `flask run`;
    setTermOpen(true);
    setServerRunning(true);
    saveProjectState(PROJECT_STATE.RUNNING);
    setTimeout(() => {
      window.electronAPI?.pty?.input(cmd + "\r");
    }, 300);
  }, [project, saveProjectState]);

  const stopServer = useCallback(() => {
    window.electronAPI?.pty?.input("\x03");
    setServerRunning(false);
    saveProjectState(PROJECT_STATE.READY);
  }, [saveProjectState]);

  // Sync run button with actual terminal process state
  useEffect(() => {
    const onData = (e) => {
      if (!serverRunningRef.current) return;
      const clean = e.detail.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, "");
      if (/KeyboardInterrupt|Terminated|Quit|SIGTERM|Stopped|exited|\[process exited\]/i.test(clean)) {
        setServerRunning(false);
        saveProjectState(PROJECT_STATE.READY);
      }
    };
    window.addEventListener("pty-data", onData);
    return () => window.removeEventListener("pty-data", onData);
  }, [saveProjectState]);

  const onAgentGraph = useCallback(async (graph) => {
    const rawNodes = (graph.nodes || []).map(({ className, ...n }) => n);
    const gEdges = normalizeAgentEndpointResponseEdges(rawNodes, graph.edges || []);
    const gNodes = normalizeAgentEndpointOutputs(rawNodes, gEdges);
    setAgentBuilding(true);
    setHistory([]);
    setFuture([]);
    // Clear then animate nodes in one by one
    setNodes([]);
    setEdges([]);
    const NODE_DELAY = 300;
    const EDGE_DELAY = 160;
    for (let i = 0; i < gNodes.length; i++) {
      await new Promise((r) => setTimeout(r, NODE_DELAY));
      setNodes(gNodes.slice(0, i + 1).map((n, idx) =>
        idx === i ? { ...n, className: "agent-node-spawning" } : n
      ));
    }
    const finalNodes = gNodes.map(({ className, ...n }) => n);
    setNodes(finalNodes);
    const builtEdges = [];
    for (let i = 0; i < gEdges.length; i++) {
      await new Promise((r) => setTimeout(r, EDGE_DELAY));
      builtEdges.push(gEdges[i]);
      setEdges([...builtEdges]);
    }
    setAgentBuilding(false);
    if (project) api.saveGraph(project.path, { nodes: finalNodes, edges: builtEdges, projectState: projectStateRef.current });
    if (lastBuiltGraphRef.current) setHasChanges(true);
  }, [project]);

  const handleTermDrag = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = termHeight;
    const onMove = (ev) => setTermHeight(Math.max(80, startH + (startY - ev.clientY)));
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const deleteNode = useCallback((id) => {
    const updatedNodes = nodesRef.current.filter((n) => n.id !== id);
    const updatedEdges = edgesRef.current.filter((e) => e.source !== id && e.target !== id);
    commit(updatedNodes, updatedEdges);
  }, [commit]);

  const cutNode = useCallback((node) => {
    setClipboard({ ...node, id: null });
    deleteNode(node.id);
  }, [deleteNode]);

  const copyNode = useCallback((node) => {
    setClipboard({ ...node, id: null });
  }, []);

  const pasteNode = useCallback((atPos) => {
    if (!clipboard) return;
    const id = String(Date.now());
    const position = atPos || { x: (clipboard.position?.x || 0) + 40, y: (clipboard.position?.y || 0) + 40 };
    const updated = [...nodesRef.current, { ...clipboard, id, position }];
    commit(updated, edgesRef.current);
  }, [clipboard, commit]);

  const groupSelected = useCallback(() => {
    const selected = nodesRef.current.filter((n) => n.selected && n.type !== "group");
    if (selected.length < 2) return;
    const PAD = 40;
    const minX = Math.min(...selected.map((n) => n.position.x)) - PAD;
    const minY = Math.min(...selected.map((n) => n.position.y)) - PAD;
    const maxX = Math.max(...selected.map((n) => n.position.x + (n.width ?? n.measured?.width ?? 180))) + PAD;
    const maxY = Math.max(...selected.map((n) => n.position.y + (n.height ?? n.measured?.height ?? 80))) + PAD;
    const groupId = `group-${Date.now()}`;
    const groupNode = {
      id: groupId, type: "group",
      position: { x: minX, y: minY },
      width: maxX - minX, height: maxY - minY,
      style: { width: maxX - minX, height: maxY - minY },
      data: { label: "Group", color: "#7c3aed" },
      selected: false, zIndex: -1,
    };
    const updatedChildren = selected.map((n) => ({
      ...n,
      position: { x: n.position.x - minX, y: n.position.y - minY },
      parentNode: groupId, extent: "parent", expandParent: false, selected: false, zIndex: 1,
    }));
    const others = nodesRef.current.filter((n) => !selected.find((s) => s.id === n.id));
    commit([groupNode, ...others, ...updatedChildren], edgesRef.current);
  }, [commit]);

  const ungroupNode = useCallback((groupId) => {
    const group = nodesRef.current.find((n) => n.id === groupId);
    if (!group) return;
    const children = nodesRef.current.filter((n) => n.parentNode === groupId);
    const freed = children.map((n) => ({
      ...n,
      position: { x: n.position.x + group.position.x, y: n.position.y + group.position.y },
      parentNode: undefined, extent: undefined,
    }));
    commit([
      ...nodesRef.current.filter((n) => n.id !== groupId && n.parentNode !== groupId),
      ...freed,
    ], edgesRef.current);
  }, [commit]);

  const removeFromGroup = useCallback((nodeId) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node?.parentNode) return;
    const group = nodesRef.current.find((n) => n.id === node.parentNode);
    const groupId = node.parentNode;

    const ejected = nodesRef.current.map((n) =>
      n.id === nodeId ? {
        ...n,
        position: { x: n.position.x + (group?.position.x || 0), y: n.position.y + (group?.position.y || 0) },
        parentNode: undefined, extent: undefined, zIndex: undefined,
      } : n
    );

    // Refit the group to its remaining children
    const PAD = 40;
    const remaining = ejected.filter((n) => n.parentNode === groupId);
    const refitted = ejected.map((n) => {
      if (n.id !== groupId) return n;
      if (remaining.length === 0) return n;
      const minX = Math.min(...remaining.map((c) => c.position.x));
      const minY = Math.min(...remaining.map((c) => c.position.y));
      const maxX = Math.max(...remaining.map((c) => c.position.x + (c.width ?? c.measured?.width ?? 180)));
      const maxY = Math.max(...remaining.map((c) => c.position.y + (c.height ?? c.measured?.height ?? 80)));
      const w = maxX - minX + PAD * 2;
      const h = maxY - minY + PAD * 2;
      return { ...n, width: w, height: h, style: { ...n.style, width: w, height: h } };
    });

    commit(refitted, edgesRef.current);
  }, [commit]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key === "`") { setTermOpen((o) => !o); return; }
      if (e.ctrlKey && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (e.ctrlKey && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); return; }
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.ctrlKey && e.key === "g") { e.preventDefault(); groupSelected(); return; }

      if (e.key === "Delete" || e.key === "Backspace") {
        const selected = nodesRef.current.find((n) => n.selected);
        if (selected) deleteNode(selected.id);
      }
      if (e.ctrlKey && e.key === "x") {
        const selected = nodesRef.current.find((n) => n.selected);
        if (selected) cutNode(selected);
      }
      if (e.ctrlKey && e.key === "c") {
        const selected = nodesRef.current.find((n) => n.selected);
        if (selected) copyNode(selected);
      }
      if (e.ctrlKey && e.key === "v") {
        pasteNode();
      }
      if (e.key === "Enter") {
        const selected = nodesRef.current.find((n) => n.selected);
        if (selected) setConfigNode(selected);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteNode, cutNode, copyNode, pasteNode, groupSelected, undo, redo]);

  if (loading) return (
    <div style={{ width: "100vw", height: "100vh", background: "#0f1117", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.5"><polygon points="12 2 21.39 6.5 21.39 17.5 12 22 2.61 17.5 2.61 6.5"/></svg>
      <div style={{ width: 120, height: 2, background: "#1e2030", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", background: "#7c3aed", borderRadius: 2, animation: "devflow-load 1s ease-in-out infinite" }} />
      </div>
    </div>
  );

  if (!project) return <Welcome onOpen={openProject} />;

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", background: "#0f1117", display: "flex", flexDirection: "column" }}>
      {/* Topbar */}
      <div style={{ height: 40, flexShrink: 0, background: "#1a1d27", borderBottom: "1px solid #2e303a", display: "flex", alignItems: "center", padding: "0 16px", zIndex: 10, gap: 8 }}>
        <IconBtn icon={ArrowLeft} title="Back to Projects" onClick={() => { setProject(null); localStorage.removeItem("devflow_last_project"); }} />
        <span style={{ color: "#7c3aed", fontWeight: 700, fontSize: 14, marginRight: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2"><polygon points="12 2 21.39 6.5 21.39 17.5 12 22 2.61 17.5 2.61 6.5"/></svg>
          DevFlow
        </span>
        <span style={{ color: "#6b7280", fontSize: 13 }}>/</span>
        <span style={{ color: "#f3f4f6", fontSize: 13, fontWeight: 500 }}>{project.name}</span>
        <div style={{ width: 1, height: 16, background: "#2e303a", margin: "0 2px" }} />
        <IconBtn icon={Undo2} title="Undo (Ctrl+Z)" onClick={undo} color={history.length ? "#9ca3af" : "#374151"} />
        <IconBtn icon={Redo2} title="Redo (Ctrl+Y)" onClick={redo} color={future.length ? "#9ca3af" : "#374151"} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {/* Project state stepper */}
          <ProjectStateStepper
            state={serverRunning ? PROJECT_STATE.RUNNING : projectState}
          />
          <div style={{ width: 1, height: 16, background: "#2e303a" }} />
          {/* Run / Stop server button */}
          {(() => {
            const canRun = projectState >= PROJECT_STATE.READY;
            const isRunning = serverRunning;
            return (
              <button
                onClick={isRunning ? stopServer : startServer}
                disabled={!canRun}
                title={!canRun ? "Mark project as Ready before running" : ""}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 12px", height: 28, borderRadius: 6,
                  border: `1px solid ${isRunning ? "#dc262644" : canRun ? "#05966944" : "#2e303a"}`,
                  background: isRunning ? "#1f1a1a" : canRun ? "#0a1f16" : "#111318",
                  color: isRunning ? "#f87171" : canRun ? "#34d399" : "#374151",
                  fontSize: 12, cursor: canRun ? "pointer" : "not-allowed", fontWeight: 500, transition: "all 0.15s",
                  opacity: canRun ? 1 : 0.5 }}>
                {isRunning
                  ? <><Square size={11} strokeWidth={2.5} fill="#f87171" /> Stop</>  
                  : <><Play size={11} strokeWidth={2.5} fill={canRun ? "#34d399" : "#374151"} /> Run</>}
                {isRunning && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34d399", display: "inline-block", animation: "devflow-load 1.2s ease-in-out infinite", marginLeft: 2 }} />}
              </button>
            );
          })()}
          {nodes.filter((n) => n.selected && n.type !== "group").length >= 2 && (
            <button onClick={groupSelected}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 12px", height: 28, borderRadius: 6, border: "1px solid #7c3aed44", background: "#1e1a3a", color: "#c4b5fd", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
              <Layers size={13} strokeWidth={2} /> Group
              <span style={{ fontSize: 10, color: "#7c3aed", fontFamily: "monospace", marginLeft: 2 }}>Ctrl+G</span>
            </button>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, minHeight: 0, paddingBottom: termOpen ? termHeight : 0, paddingRight: sidebarPanel ? (sidebarPanel === "tester" ? 420 : 340) : 40, transition: "padding 0.2s cubic-bezier(0.4,0,0.2,1)" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: "dataflow" }}
          onConnect={onConnect}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onEdgesDelete={(deleted) => {
            const updated = edgesRef.current.filter((e) => !deleted.find((d) => d.id === e.id));
            commit(nodesRef.current, updated);
          }}
          deleteKeyCode="Delete"
          onReconnect={(oldEdge, newConnection) => {
            const updated = edgesRef.current.map((e) => e.id === oldEdge.id ? { ...e, ...newConnection } : e);
            commit(nodesRef.current, updated);
          }}
          onNodeContextMenu={(e, node) => { e.preventDefault(); setEdgeCtxMenu(null); setCtxMenu({ node, x: e.clientX, y: e.clientY }); }}
          onEdgeContextMenu={(e, edge) => { e.preventDefault(); setCtxMenu(null); setEdgeCtxMenu({ edge, x: e.clientX, y: e.clientY }); }}
          onPaneClick={() => { setCtxMenu(null); setEdgeCtxMenu(null); }}
          selectNodesOnDrag={true}
          multiSelectionKeyCode="Shift"
          nodesFocusable={false}
          connectionRadius={50}
          snapToGrid={false}
        >
          <Background color="#2e303a" />
          <Controls />
        </ReactFlow>
      </div>

      {/* Agent building overlay */}
      {agentBuilding && <div className="agent-building-overlay" />}

      {relationEdge && (
        <RelationPickerModal
          edge={relationEdge}
          allNodes={nodesRef.current}
          onClose={() => setRelationEdge(null)}
          onConfirm={(relation) => {
            // Determine which node gets the FK based on relation type and direction
            // edge.source = "one" side (the node the user dragged FROM)
            // edge.target = "many" side (the node the user dragged TO)
            const sourceNode = nodesRef.current.find((n) => n.id === relationEdge.source);
            const targetNode = nodesRef.current.find((n) => n.id === relationEdge.target);
            if (!sourceNode || !targetNode) { setRelationEdge(null); return; }

            const edgeId = `e-${Date.now()}`;
            const dbType = targetNode.data.dbType || "sql";

            // FK always goes to the "many" side (target for 1:N, target for 1:1, both for N:M)
            // Find the PK field of the source node to derive FK name and type
            const sourcePK = (sourceNode.data.fields || []).find((f) => f.primaryKey)
              || (sourceNode.data.fields || [])[0];
            const sourceLabel = (sourceNode.data.label || "ref").toLowerCase();
            const fkName = sourcePK ? `${sourceLabel}_${sourcePK.name}` : `${sourceLabel}_id`;
            const fkType = sourcePK ? sourcePK.type : (dbType === "nosql" ? "ObjectId" : "INT");

            const makeFKField = (targetLabel) => ({
              id: Math.random(),
              name: fkName,
              type: fkType,
              required: relation === "1:1",
              unique: relation === "1:1",
              primaryKey: false,
              defaultValue: "",
              ref: sourceNode.data.label || "",
              isForeignKey: true,
              fkEdgeId: edgeId,
              fkRef: `${sourceNode.data.label}.${sourcePK?.name || "id"}`,
            });

            let updatedNodes = nodesRef.current;

            if (relation === "1:1" || relation === "1:N") {
              // FK goes into target node
              const fkField = makeFKField(targetNode.data.label);
              updatedNodes = updatedNodes.map((n) =>
                n.id === targetNode.id
                  ? { ...n, data: { ...n.data, fields: [...(n.data.fields || []), fkField] } }
                  : n
              );
            } else if (relation === "N:M") {
              // For N:M just record the relation on the edge, no FK injected (junction table is conceptual)
            }

            setNodes(updatedNodes);
            setEdges((eds) => {
              const updated = addEdge({
                ...relationEdge,
                id: edgeId,
                data: { relation },
                label: relation,
                style: { stroke: "#059669" },
                labelStyle: { fill: "#34d399", fontSize: 10, fontWeight: 600 },
                labelBgStyle: { fill: "#0a1f16" },
              }, eds);
              save(updatedNodes, updated);
              return updated;
            });
            setRelationEdge(null);
          }}
        />
      )}
      {edgeCtxMenu && (
        <EdgeContextMenu
          x={edgeCtxMenu.x} y={edgeCtxMenu.y} edge={edgeCtxMenu.edge}
          onClose={() => setEdgeCtxMenu(null)}
          onFlip={(dir) => {
            const updated = edgesRef.current.map((e) =>
              e.id === edgeCtxMenu.edge.id ? { ...e, data: { ...e.data, flowDir: dir } } : e
            );
            commit(nodesRef.current, updated);
          }}
          onDelete={() => {
            const updated = edgesRef.current.filter((e) => e.id !== edgeCtxMenu.edge.id);
            commit(nodesRef.current, updated);
          }}
        />
      )}
      {ctxMenu && (
        <NodeContextMenu
          x={ctxMenu.x} y={ctxMenu.y} node={ctxMenu.node}
          onClose={() => setCtxMenu(null)}
          onConfigure={() => setConfigNode(ctxMenu.node)}
          onTest={() => { setTestNodeId(ctxMenu.node.id); setSidebarPanel("tester"); }}
          onCut={() => cutNode(ctxMenu.node)}
          onCopy={() => copyNode(ctxMenu.node)}
          onPaste={() => pasteNode()}
          onDelete={() => deleteNode(ctxMenu.node.id)}
          onUngroup={() => ungroupNode(ctxMenu.node.id)}
          onRemoveFromGroup={() => removeFromGroup(ctxMenu.node.id)}
          canPaste={!!clipboard}
        />
      )}
      {configNode && (
        <NodeConfigModal
          node={configNode}
          allNodes={nodesRef.current}
          edges={edgesRef.current}
          onClose={() => setConfigNode(null)}
          onSave={(id, newData) => {
            const updated = nodesRef.current.map((n) => n.id === id ? { ...n, data: newData } : n);
            commit(updated, edgesRef.current);
          }}
        />
      )}
      <FileExplorer
        projectPath={project?.path}
        visible={explorerOpen}
        onToggle={() => setExplorerOpen((o) => !o)}
      />
      <FloatingNodePicker onAdd={(label, cursorPos) => {
        const id = String(Date.now());
        const flowPos = screenToFlowPosition({ x: cursorPos.x, y: cursorPos.y });
        const { type, data } = resolveNode(label);
        commit([...nodesRef.current, { id, position: flowPos, data: { ...data, editing: false }, type }], edgesRef.current);
      }} />
      <BuildButton
        projectPath={project?.path}
        projectState={projectState}
        hasChanges={hasChanges}
        lastBuiltGraphJson={lastBuiltGraphRef.current}
        onStateChange={saveProjectState}
        nodes={nodesRef.current}
        edges={edgesRef.current}
        onOpenSettings={() => setSidebarPanel("settings")}
        termOpen={termOpen}
        termHeight={termHeight}
      />
      <Terminal
        open={termOpen}
        height={termHeight}
        onDragStart={handleTermDrag}
        onClose={() => setTermOpen(false)}
        projectPath={project?.path}
        rightOffset={sidebarPanel ? (sidebarPanel === "tester" ? 420 : 340) : 40}
      />
      <Sidebar
        onAddNode={(label) => {
          const id = String(Date.now());
          const { type, data } = resolveNode(label);
          commit([...nodesRef.current, { id, position: { x: Math.random() * 400, y: Math.random() * 400 }, data: { ...data, editing: false }, type }], edgesRef.current);
        }}
        termOpen={termOpen}
        onTermToggle={() => setTermOpen((o) => !o)}
        projectPath={project?.path}
        nodes={nodes}
        edges={edges}
        activePanel={sidebarPanel}
        onPanelChange={setSidebarPanel}
        testNodeId={testNodeId}
        onAgentGraph={onAgentGraph}
      />
    </div>
  );
}


export default function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  );
}
