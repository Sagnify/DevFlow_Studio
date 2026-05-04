import React, { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

const SQL_TYPES = ["VARCHAR", "TEXT", "INT", "BIGINT", "FLOAT", "DECIMAL", "BOOLEAN", "DATE", "DATETIME", "TIMESTAMP", "UUID", "JSON", "BLOB"];
const NOSQL_TYPES = ["String", "Number", "Boolean", "Date", "ObjectId", "Array", "Object", "Mixed", "Buffer", "Map"];
const SQL_INDEX_TYPES = ["INDEX", "UNIQUE", "PRIMARY", "FULLTEXT"];
const NOSQL_INDEX_TYPES = ["ASC (1)", "DESC (-1)", "UNIQUE", "TEXT", "2dsphere"];
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const METHOD_COLORS = { GET: "#059669", POST: "#2563eb", PUT: "#d97706", PATCH: "#7c3aed", DELETE: "#dc2626" };
const OPERATIONS = [
  { id: "fetch",          label: "Fetch",          color: "#059669", desc: "Read from database" },
  { id: "save",           label: "Save",           color: "#2563eb", desc: "Create or update record" },
  { id: "delete",         label: "Delete",         color: "#dc2626", desc: "Remove a record" },
  { id: "validate",       label: "Validate",       color: "#d97706", desc: "Check field rules" },
  { id: "auth_basic",     label: "Auth — Basic",   color: "#7c3aed", desc: "Login / protect route" },
  { id: "auth_advanced",  label: "Auth — Advanced",color: "#6d28d9", desc: "JWT, hashing, verify" },
  { id: "transform",      label: "Transform",      color: "#0891b2", desc: "Reshape data fields" },
  { id: "utility",        label: "Utility",        color: "#65a30d", desc: "Paginate, sort, filter" },
  { id: "http_request",   label: "HTTP Request",   color: "#0ea5e9", desc: "Call an external API" },
  { id: "email",          label: "Email",          color: "#f59e0b", desc: "Send an email" },
  { id: "authorize",      label: "Authorize",      color: "#be185d", desc: "Role / permission check" },
];

const DEFAULT_FIELD = () => ({
  id: Math.random(),
  name: "",
  type: "VARCHAR",
  required: false,
  unique: false,
  primaryKey: false,
  defaultValue: "",
  ref: "",
});

const DEFAULT_INDEX = () => ({ id: Math.random(), fields: [], type: "INDEX" });

function IndexFieldPicker({ selectedFields, fieldNames, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, background: "#0f1117", border: "1px solid #2e303a", borderRadius: 5, padding: "4px 6px", minHeight: 28, alignItems: "center" }}>
      {fieldNames.length === 0
        ? <span style={{ fontSize: 11, color: "#374151" }}>No fields defined</span>
        : fieldNames.map((name) => {
            const active = selectedFields.includes(name);
            return (
              <span key={name} onClick={() => onChange(active ? selectedFields.filter((f) => f !== name) : [...selectedFields, name])}
                style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, cursor: "pointer", userSelect: "none",
                  background: active ? "#3b1fa8" : "#1e2030", color: active ? "#c4b5fd" : "#6b7280",
                  border: `1px solid ${active ? "#7c3aed" : "#2e303a"}`, transition: "all 0.1s" }}>
                {name}
              </span>
            );
          })}
    </div>
  );
}

function DbSchemaEditor({ data, onChange, allNodes = [], edges = [], nodeId }) {
  const fields = data.fields || [];
  const indexes = data.indexes || [];
  const dbType = data.dbType || "sql";

  const updateField = (id, key, val) =>
    onChange({ ...data, fields: fields.map((f) => f.id === id ? { ...f, [key]: val } : f) });
  const addField = () => onChange({ ...data, fields: [...fields, DEFAULT_FIELD()] });
  const removeField = (id) => onChange({ ...data, fields: fields.filter((f) => f.id !== id) });

  const updateIndex = (id, key, val) =>
    onChange({ ...data, indexes: indexes.map((ix) => ix.id === id ? { ...ix, [key]: val } : ix) });
  const addIndex = () => onChange({ ...data, indexes: [...indexes, DEFAULT_INDEX()] });
  const removeIndex = (id) => onChange({ ...data, indexes: indexes.filter((ix) => ix.id !== id) });

  const sqlCols   = "1fr 110px 28px 28px 28px 80px 28px";
  const nosqlCols = "1fr 110px 28px 28px 80px 100px 28px";
  const cols = dbType === "sql" ? sqlCols : nosqlCols;
  const headers = dbType === "sql"
    ? ["Field Name", "Type", "PK", "Req", "Uniq", "Default", ""]
    : ["Field Name", "Type", "Req", "Uniq", "Default", "Ref Model", ""];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* DB Type + table/collection name */}
      <div style={{ display: "flex", gap: 8 }}>
        {["sql", "nosql"].map((t) => (
          <button key={t} onClick={() => onChange({ ...data, dbType: t })}
            style={{ padding: "5px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500, background: dbType === t ? "#7c3aed" : "#1e2030", color: dbType === t ? "#fff" : "#6b7280" }}>
            {t === "sql" ? "SQL" : "NoSQL"}
          </button>
        ))}
        <input value={data.tableName || ""} onChange={(e) => onChange({ ...data, tableName: e.target.value })}
          placeholder={dbType === "sql" ? "Table name" : "Collection name"}
          style={{ flex: 1, background: "#0f1117", border: "1px solid #2e303a", borderRadius: 6, padding: "5px 10px", color: "#f3f4f6", fontSize: 12, outline: "none" }} />
      </div>

      {/* Field headers */}
      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 8, alignItems: "center", padding: "0 2px", width: "100%" }}>
        {headers.map((h, i) => (
          <div key={i} style={{ fontSize: 10, color: "#4b5563", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</div>
        ))}
      </div>

      {/* Fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 260, overflowY: "auto" }}>
        {fields.length === 0 && (
          <div style={{ textAlign: "center", color: "#4b5563", fontSize: 12, padding: "16px 0" }}>No fields yet.</div>
        )}
        {fields.map((f) => (
          <div key={f.id} style={{ display: "grid", gridTemplateColumns: cols, gap: 8, alignItems: "center", width: "100%", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
              <input value={f.name} onChange={(e) => updateField(f.id, "name", e.target.value)} placeholder="field_name" style={inputStyle} />
              {f.isForeignKey && (
                <span style={{ fontSize: 9, fontFamily: "monospace", color: "#059669", background: "#0a1f16", padding: "1px 5px", borderRadius: 3, border: "1px solid #05996944", flexShrink: 0, whiteSpace: "nowrap" }}>FK</span>
              )}
            </div>
            <select value={f.type} onChange={(e) => updateField(f.id, "type", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {(dbType === "sql" ? SQL_TYPES : NOSQL_TYPES).map((t) => <option key={t}>{t}</option>)}
            </select>
            {dbType === "sql" && <Toggle checked={f.primaryKey} onChange={(v) => updateField(f.id, "primaryKey", v)} color="#f59e0b" />}
            <Toggle checked={f.required} onChange={(v) => updateField(f.id, "required", v)} color="#059669" />
            <Toggle checked={f.unique} onChange={(v) => updateField(f.id, "unique", v)} color="#0ea5e9" />
            <input value={f.defaultValue} onChange={(e) => updateField(f.id, "defaultValue", e.target.value)} placeholder="—" style={inputStyle} />
            {dbType === "nosql" && (
              <input value={f.ref} onChange={(e) => updateField(f.id, "ref", e.target.value)} placeholder="Model" style={inputStyle} />
            )}
            <button onClick={() => removeField(f.id)} style={delBtn}><Trash2 size={12} color="#4b5563" strokeWidth={1.8} /></button>
          </div>
        ))}
      </div>

      <button onClick={addField} style={addRowBtn}>
        <Plus size={13} strokeWidth={1.8} /> Add Field
      </button>

      {/* Relations */}
      {(() => {
        const relEdges = edges.filter((e) =>
          (e.source === nodeId || e.target === nodeId) && e.data?.relation
        );
        if (relEdges.length === 0) return null;

        return (
          <div style={{ borderTop: "1px solid #1e2030", paddingTop: 14 }}>
            <div style={{ fontSize: 10, color: "#4b5563", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Relations</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {relEdges.map((e) => {
                const isManySide = e.target === nodeId;
                const isOneSide  = e.source === nodeId;
                const sourceNode = allNodes.find((n) => n.id === e.source);
                const targetNode = allNodes.find((n) => n.id === e.target);
                const rel = e.data.relation;
                let fkField = fields.find((f) => f.fkEdgeId === e.id);

                const relLabel = rel === "1:1"
                  ? `${sourceNode?.data?.label} (1) ↔ ${targetNode?.data?.label} (1)`
                  : rel === "1:N"
                  ? `${sourceNode?.data?.label} (1) → ${targetNode?.data?.label} (many)`
                  : `${sourceNode?.data?.label} (many) ↔ ${targetNode?.data?.label} (many)`;

                const thisTable  = data.label || nodeId;
                const otherTable = isManySide ? sourceNode?.data?.label : targetNode?.data?.label;

                return (
                  <div key={e.id} style={{ background: "#0f1117", border: "1px solid #1e2030", borderRadius: 8, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {/* Relation header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, color: "#d1d5db", fontWeight: 500 }}>{relLabel}</span>
                      <span style={{ fontSize: 10, fontFamily: "monospace", color: "#7c3aed", background: "#1e1a3a", padding: "1px 7px", borderRadius: 4, border: "1px solid #7c3aed44" }}>{rel}</span>
                    </div>

                    {/* Many side: show FK with field picker */}
                    {isManySide && rel !== "N:M" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ fontSize: 10, color: "#4b5563", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Foreign Key</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <select
                            value={fkField?.id || "__new__"}
                            onChange={(ev) => {
                              const val = ev.target.value;
                              if (val === "__new__") {
                                // create a new FK field and assign it
                                const sourcePK = (sourceNode?.data?.fields || []).find((f) => f.primaryKey) || (sourceNode?.data?.fields || [])[0];
                                const sourceLabel = (sourceNode?.data?.label || "ref").toLowerCase();
                                const newField = {
                                  id: Math.random(),
                                  name: sourcePK ? `${sourceLabel}_${sourcePK.name}` : `${sourceLabel}_id`,
                                  type: sourcePK ? sourcePK.type : (dbType === "nosql" ? "ObjectId" : "INT"),
                                  required: rel === "1:1", unique: rel === "1:1",
                                  primaryKey: false, defaultValue: "",
                                  ref: sourceNode?.data?.label || "",
                                  isForeignKey: true, fkEdgeId: e.id,
                                  fkRef: `${sourceNode?.data?.label}.${sourcePK?.name || "id"}`,
                                };
                                // unassign any previous FK for this edge, add new
                                onChange({ ...data, fields: [
                                  ...fields.map((f) => f.fkEdgeId === e.id ? { ...f, isForeignKey: false, fkEdgeId: undefined, fkRef: undefined } : f),
                                  newField,
                                ]});
                              } else {
                                // assign existing field as FK
                                onChange({ ...data, fields: fields.map((f) => {
                                  if (f.fkEdgeId === e.id) return { ...f, isForeignKey: false, fkEdgeId: undefined, fkRef: undefined };
                                  if (f.id === parseFloat(val) || f.id === val) return {
                                    ...f, isForeignKey: true, fkEdgeId: e.id,
                                    fkRef: `${sourceNode?.data?.label}.${(sourceNode?.data?.fields || []).find((sf) => sf.primaryKey)?.name || "id"}`,
                                  };
                                  return f;
                                })});
                              }
                            }}
                            style={{ ...inputStyle, flex: 1, cursor: "pointer", fontFamily: "monospace" }}>
                            <option value="__new__">+ Auto-generate FK field</option>
                            {fields.filter((f) => f.name).map((f) => (
                              <option key={f.id} value={f.id}>{f.name} ({f.type})</option>
                            ))}
                          </select>
                          {fkField && (
                            <span style={{ fontSize: 11, color: "#374151", flexShrink: 0, fontFamily: "monospace", whiteSpace: "nowrap" }}>→ {fkField.fkRef}</span>
                          )}
                        </div>
                        {fkField && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "#0a1f16", borderRadius: 6, border: "1px solid #065f4644" }}>
                            <span style={{ fontSize: 10, color: "#059669", fontWeight: 700, fontFamily: "monospace", flexShrink: 0 }}>FK</span>
                            <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace", flexShrink: 0 }}>{thisTable}.</span>
                            <span style={{ fontSize: 11, color: "#34d399", fontFamily: "monospace" }}>{fkField.name}</span>
                            <span style={{ fontSize: 11, color: "#374151", fontFamily: "monospace", marginLeft: "auto" }}>→ {fkField.fkRef}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* One side: show where FK lives */}
                    {isOneSide && rel !== "N:M" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 10, color: "#4b5563", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Foreign Key</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 10px", background: "#111318", borderRadius: 6, border: "1px solid #2e303a" }}>
                          <span style={{ fontSize: 10, color: "#059669", fontWeight: 700, flexShrink: 0, fontFamily: "monospace" }}>FK</span>
                          <span style={{ fontSize: 11, color: "#d1d5db", fontFamily: "monospace" }}>
                            {otherTable}.{(() => {
                              const fk = (targetNode?.data?.fields || []).find((f) => f.fkEdgeId === e.id);
                              return fk?.name || "?";
                            })()} → {thisTable}.{(sourceNode?.data?.fields || []).find((f) => f.primaryKey)?.name || "id"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* N:M junction info */}
                    {rel === "N:M" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 10, color: "#4b5563", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>Junction Table</div>
                        <div style={{ padding: "7px 10px", background: "#111318", borderRadius: 6, border: "1px solid #2e303a" }}>
                          <span style={{ fontSize: 11, color: "#6b7280", fontFamily: "monospace" }}>{sourceNode?.data?.label}_{targetNode?.data?.label}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Indexes */}
      <div style={{ borderTop: "1px solid #1e2030", paddingTop: 14 }}>
        <div style={{ fontSize: 10, color: "#4b5563", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Indexes</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 20px", gap: 6, padding: "0 2px", marginBottom: 6 }}>
          {["Fields", "Type", ""].map((h, i) => (
            <div key={i} style={{ fontSize: 10, color: "#4b5563", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {indexes.length === 0 && (
            <div style={{ textAlign: "center", color: "#4b5563", fontSize: 12, padding: "10px 0" }}>No indexes defined.</div>
          )}
          {indexes.map((ix) => (
            <div key={ix.id} style={{ display: "grid", gridTemplateColumns: "1fr 110px 20px", gap: 6, alignItems: "center" }}>
              <IndexFieldPicker
                selectedFields={ix.fields}
                fieldNames={fields.map((f) => f.name).filter(Boolean)}
                onChange={(val) => updateIndex(ix.id, "fields", val)}
              />
              <select value={ix.type} onChange={(e) => updateIndex(ix.id, "type", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {(dbType === "sql" ? SQL_INDEX_TYPES : NOSQL_INDEX_TYPES).map((t) => <option key={t}>{t}</option>)}
              </select>
              <button onClick={() => removeIndex(ix.id)} style={delBtn}><Trash2 size={12} color="#4b5563" strokeWidth={1.8} /></button>
            </div>
          ))}
        </div>
        <button onClick={addIndex} style={{ ...addRowBtn, marginTop: 8 }}>
          <Plus size={13} strokeWidth={1.8} /> Add Index
        </button>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, color }) {
  return (
    <div onClick={() => onChange(!checked)} style={{ width: 28, height: 16, borderRadius: 8, background: checked ? color : "#2e303a", cursor: "pointer", position: "relative", transition: "background 0.15s", flexShrink: 0 }}>
      <div style={{ position: "absolute", top: 2, left: checked ? 14 : 2, width: 12, height: 12, borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
    </div>
  );
}

const PARAM_SOURCES = ["body", "query", "path", "header"];
const PARAM_SOURCE_COLORS = { body: "#2563eb", query: "#059669", path: "#d97706", header: "#7c3aed" };

const PARAM_TYPES = ["string", "number", "boolean", "integer", "array", "object", "file"];

function KVEditor({ value = [], onChange, keyPlaceholder = "key" }) {
  const add = () => onChange([...value, { id: Math.random(), key: "", val: "string", source: "body" }]);
  const remove = (id) => onChange(value.filter((r) => r.id !== id));
  const update = (id, field, v) => onChange(value.map((r) => r.id === id ? { ...r, [field]: v } : r));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {value.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 90px 20px", gap: 4, padding: "0 2px" }}>
          {["source", "name", "type", ""].map((h) => (
            <div key={h} style={{ fontSize: 10, color: "#4b5563", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</div>
          ))}
        </div>
      )}
      {value.map((row) => {
        const src = row.source || "body";
        const srcColor = PARAM_SOURCE_COLORS[src];
        return (
          <div key={row.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr 90px 20px", gap: 4, alignItems: "center" }}>
            <select value={src} onChange={(e) => update(row.id, "source", e.target.value)}
              style={{ ...inputStyle, cursor: "pointer", fontFamily: "monospace", color: srcColor, fontWeight: 600, fontSize: 10 }}>
              {PARAM_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={row.key} onChange={(e) => update(row.id, "key", e.target.value)} placeholder={keyPlaceholder}
              style={{ ...inputStyle, fontFamily: "monospace" }} />
            <select value={row.val || "string"} onChange={(e) => update(row.id, "val", e.target.value)}
              style={{ ...inputStyle, cursor: "pointer", fontFamily: "monospace" }}>
              {PARAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <button onClick={() => remove(row.id)} style={delBtn}><Trash2 size={11} color="#4b5563" strokeWidth={1.8} /></button>
          </div>
        );
      })}
      <button onClick={add} style={{ ...addRowBtn, marginTop: 2 }}>
        <Plus size={12} strokeWidth={1.8} /> Add
      </button>
    </div>
  );
}

function EndpointPreview({ data, availableFields }) {
  const method = data.method || "GET";
  const route = data.route || "/";
  const inputs = (data.input || []).filter((r) => r.key);
  const selectedOutput = data.outputFields || [];
  const responseFields = availableFields.filter(({ field }) => selectedOutput.includes(field));

  const toExample = (r) => {
    const t = (r.val || "string").toLowerCase();
    return t === "number" || t === "int" || t === "integer" ? 0 : t === "boolean" || t === "bool" ? true : `<${r.key}>`;
  };

  const grouped = inputs.reduce((acc, r) => {
    const src = r.source || "body";
    if (!acc[src]) acc[src] = {};
    acc[src][r.key] = toExample(r);
    return acc;
  }, {});

  const responseExample = responseFields.length > 0
    ? responseFields.reduce((acc, { field }) => { acc[field] = `<${field}>`; return acc; }, {})
    : { message: "<response>" };

  const block = (label, obj, color) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 10, color: "#4b5563", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <pre style={{ margin: 0, background: "#0a0c12", border: `1px solid ${color}22`, borderRadius: 7, padding: "12px 14px", fontSize: 11, color, fontFamily: "monospace", lineHeight: 1.7, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
        {JSON.stringify(obj, null, 2)}
      </pre>
    </div>
  );

  // Build URL segments for colored rendering
  const pathParams = inputs.filter((r) => r.source === "path");
  const queryParams = inputs.filter((r) => r.source === "query");

  // Split route into parts, substituting :param tokens with colored spans
  const routeParts = route.split(/(:[a-zA-Z_][a-zA-Z0-9_]*)/).map((part, i) => {
    if (part.startsWith(":")) {
      const name = part.slice(1);
      return <span key={i} style={{ color: PARAM_SOURCE_COLORS.path }}>&#123;{name}&#125;</span>;
    }
    return <span key={i}>{part}</span>;
  });

  // Path params that have no matching :param in the route — append as /{value}
  const matchedNames = new Set((route.match(/:[a-zA-Z_][a-zA-Z0-9_]*/g) || []).map((s) => s.slice(1)));
  const unmatchedPath = pathParams.filter((r) => !matchedNames.has(r.key));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* URL line */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#0f1117", border: "1px solid #1e2030", borderRadius: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: METHOD_COLORS[method] || "#6b7280",
          background: (METHOD_COLORS[method] || "#6b7280") + "22", padding: "2px 8px", borderRadius: 4, flexShrink: 0 }}>{method}</span>
        <span style={{ fontSize: 12, fontFamily: "monospace", color: "#9ca3af", wordBreak: "break-all" }}>
          {routeParts}
          {unmatchedPath.map((r) => (
            <span key={r.key}><span style={{ color: "#4b5563" }}>/</span><span style={{ color: PARAM_SOURCE_COLORS.path }}>&#123;{r.key}&#125;</span></span>
          ))}
          {queryParams.length > 0 && (
            <>
              <span style={{ color: "#4b5563" }}>?</span>
              {queryParams.map((r, i) => (
                <span key={r.key}>
                  {i > 0 && <span style={{ color: "#4b5563" }}>&amp;</span>}
                  <span style={{ color: PARAM_SOURCE_COLORS.query }}>{r.key}</span>
                  <span style={{ color: "#4b5563" }}>=</span>
                  <span style={{ color: "#f3f4f6" }}>&lt;{r.key}&gt;</span>
                </span>
              ))}
            </>
          )}
        </span>
      </div>

      {inputs.length === 0 && <div style={{ fontSize: 12, color: "#374151" }}>No request params defined.</div>}

      {/* Only body and header as JSON blocks — path lives in the URL, query in the URL string */}
      {["body", "header"].map((src) => grouped[src] && block(`${src} params`, grouped[src], PARAM_SOURCE_COLORS[src] || "#a78bfa"))}

      {block("Response", responseExample, "#34d399")}
      {responseFields.length === 0 && (
        <div style={{ fontSize: 11, color: "#4b5563" }}>Select response fields in the Config tab to populate the response shape.</div>
      )}
    </div>
  );
}

function EndpointEditor({ data, onChange, allNodes, edges, nodeId }) {
  const [tab, setTab] = React.useState("config");
  // Response logic nodes: logic results that flow back INTO this endpoint
  const upstreamLogic = edges
    .filter((e) => {
      const dir = e.data?.flowDir;
      if (dir === "reverse") return e.target === nodeId;
      return e.target === nodeId; // forward or default
    })
    .map((e) => allNodes.find((n) => n.id === e.source))
    .filter((n) => n?.type === "logic")
    .filter((n, i, arr) => arr.findIndex((x) => x?.id === n?.id) === i);

  const availableFields = upstreamLogic.flatMap((n) =>
    upstreamFields(n).map((f) => ({ field: f, source: n.data.label || n.id }))
  );

  const method = data.method || "GET";
  const selectedOutput = data.outputFields || [];
  const toggleOutput = (f) => {
    const next = selectedOutput.includes(f) ? selectedOutput.filter((x) => x !== f) : [...selectedOutput, f];
    onChange({ ...data, outputFields: next });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 2, background: "#0f1117", borderRadius: 7, padding: 3, alignSelf: "flex-start" }}>
        {["config", "preview"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "4px 14px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500,
              background: tab === t ? "#1e2030" : "transparent",
              color: tab === t ? "#f3f4f6" : "#4b5563", transition: "all 0.15s" }}>
            {t === "config" ? "Config" : "JSON Preview"}
          </button>
        ))}
      </div>

      {tab === "preview" && <EndpointPreview data={data} availableFields={availableFields} />}

      {tab === "config" && <>
        <div style={{ display: "flex", gap: 8 }}>
          {HTTP_METHODS.map((m) => (
            <button key={m} onClick={() => onChange({ ...data, method: m })}
              style={{ padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "monospace",
                background: method === m ? METHOD_COLORS[m] + "33" : "#1e2030",
                color: method === m ? METHOD_COLORS[m] : "#6b7280",
                outline: method === m ? `1px solid ${METHOD_COLORS[m]}` : "none" }}>
              {m}
            </button>
          ))}
        </div>

        <div>
          <label style={labelStyle}>Route</label>
          <input value={data.route || ""} onChange={(e) => onChange({ ...data, route: e.target.value })}
            placeholder="/api/users/:id"
            style={{ ...inputStyle, width: "100%", boxSizing: "border-box", fontFamily: "monospace" }} />
        </div>

        <div>
          <label style={labelStyle}>Request params</label>
          <div style={{ fontSize: 11, color: "#4b5563", marginBottom: 6 }}>These are the inputs coming into this endpoint (query params, body fields, path params).</div>
          <KVEditor value={data.input || []} onChange={(v) => onChange({ ...data, input: v })} keyPlaceholder="param" />
        </div>

        <div>
          <label style={labelStyle}>Response fields</label>
          <div style={{ fontSize: 11, color: "#4b5563", marginBottom: 6 }}>Fields returned from upstream logic nodes connected to this endpoint.</div>
          {availableFields.length === 0
            ? <div style={{ fontSize: 12, color: "#374151", padding: "8px 0" }}>Connect Logic nodes (as input) to pick response fields.</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {availableFields.map(({ field, source }) => {
                  const active = selectedOutput.includes(field);
                  return (
                    <div key={field} onClick={() => toggleOutput(field)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6, cursor: "pointer",
                        background: active ? "#0a1f16" : "#1a1d27",
                        border: `1px solid ${active ? "#05966966" : "#2e303a"}`,
                        transition: "all 0.1s" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: active ? "#34d399" : "#374151", flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontFamily: "monospace", color: active ? "#34d399" : "#d1d5db", flex: 1 }}>{field}</span>
                      <span style={{ fontSize: 10, color: "#374151" }}>from {source}</span>
                    </div>
                  );
                })}
              </div>}
        </div>
      </>}
    </div>
  );
}

function LogicEditor({ data, onChange, allNodes, edges, nodeId }) {
  const op = data.operation || null;
  const selected = OPERATIONS.find((o) => o.id === op);
  const [picking, setPicking] = React.useState(!op);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Operation header — show picker only when no op selected or user clicked Change */}
      {picking || !op ? (
        <div>
          <label style={labelStyle}>Operation</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {OPERATIONS.map((o) => (
              <div key={o.id} onClick={() => { onChange({ ...data, operation: o.id }); setPicking(false); }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, cursor: "pointer",
                  background: op === o.id ? o.color + "18" : "#1a1d27",
                  border: `1px solid ${op === o.id ? o.color + "88" : "#2e303a"}`,
                  transition: "all 0.15s" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: op === o.id ? o.color : "#374151", flexShrink: 0,
                  boxShadow: op === o.id ? `0 0 6px ${o.color}` : "none" }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: op === o.id ? o.color : "#d1d5db" }}>{o.label}</div>
                  <div style={{ fontSize: 10, color: "#4b5563", marginTop: 1 }}>{o.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 12px", background: selected.color + "12", border: `1px solid ${selected.color}44`, borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: selected.color, boxShadow: `0 0 6px ${selected.color}` }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: selected.color }}>{selected.label}</span>
            <span style={{ fontSize: 11, color: "#4b5563" }}>{selected.desc}</span>
          </div>
          <button onClick={() => setPicking(true)}
            style={{ fontSize: 11, color: "#6b7280", background: "#1e2030", border: "1px solid #2e303a", borderRadius: 5, padding: "3px 10px", cursor: "pointer" }}>
            Change
          </button>
        </div>
      )}

      {/* Operation config panels — only shown when op is selected and not picking */}
      {!picking && op === "fetch" && <FetchConfig data={data} onChange={onChange} allNodes={allNodes} edges={edges} nodeId={nodeId} />}
      {!picking && op === "save"  && <SaveConfig  data={data} onChange={onChange} allNodes={allNodes} edges={edges} nodeId={nodeId} />}
      {!picking && op === "delete" && <DeleteConfig data={data} onChange={onChange} allNodes={allNodes} edges={edges} nodeId={nodeId} />}
      {!picking && op === "validate" && <ValidateConfig data={data} onChange={onChange} allNodes={allNodes} edges={edges} nodeId={nodeId} />}
      {!picking && op === "auth_basic" && <AuthBasicConfig data={data} onChange={onChange} allNodes={allNodes} edges={edges} nodeId={nodeId} />}
      {!picking && op === "auth_advanced" && <AuthAdvancedConfig data={data} onChange={onChange} allNodes={allNodes} edges={edges} nodeId={nodeId} />}
      {!picking && op === "transform"    && <TransformConfig    data={data} onChange={onChange} allNodes={allNodes} edges={edges} nodeId={nodeId} />}
      {!picking && op === "utility"       && <UtilityConfig       data={data} onChange={onChange} allNodes={allNodes} edges={edges} nodeId={nodeId} />}
      {!picking && op === "http_request"  && <HttpRequestConfig  data={data} onChange={onChange} allNodes={allNodes} edges={edges} nodeId={nodeId} />}
      {!picking && op === "email"         && <EmailConfig         data={data} onChange={onChange} allNodes={allNodes} edges={edges} nodeId={nodeId} />}
      {!picking && op === "authorize"     && <AuthorizeConfig     data={data} onChange={onChange} allNodes={allNodes} edges={edges} nodeId={nodeId} />}
    </div>
  );
}

// --- HTTP Request config ---

function HttpRequestConfig({ data, onChange, allNodes, edges, nodeId }) {
  const upstream = upstreamLogicNodes(allNodes, edges, nodeId);
  const upstreamEndpoints = upstreamEndpointNodes(allNodes, edges, nodeId);
  const upstreamFieldList = [
    ...upstreamEndpoints.flatMap(endpointFields),
    ...upstream.flatMap(upstreamFields),
  ];
  const cfg = data.httpReqCfg || {};
  const set = (patch) => onChange({ ...data, httpReqCfg: { ...cfg, ...patch } });
  const headers = cfg.headers || [];
  const bodyFields = cfg.bodyFields || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <ConfigBlock>
        <SectionLabel>Method & URL</SectionLabel>
        <div style={{ display: "flex", gap: 6 }}>
          {["GET","POST","PUT","PATCH","DELETE"].map((m) => (
            <button key={m} onClick={() => set({ method: m })}
              style={{ padding: "4px 10px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "monospace",
                background: cfg.method === m ? METHOD_COLORS[m] + "33" : "#1e2030",
                color: cfg.method === m ? METHOD_COLORS[m] : "#6b7280",
                outline: cfg.method === m ? `1px solid ${METHOD_COLORS[m]}` : "none" }}>
              {m}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#6b7280", flexShrink: 0, width: 36 }}>URL</span>
          <ValueSource value={cfg.url || { mode: "static", val: "" }} upstreamFieldList={upstreamFieldList}
            onChange={(v) => set({ url: v })} />
        </div>
      </ConfigBlock>

      <ConfigBlock>
        <SectionLabel>Headers</SectionLabel>
        {headers.map((h) => (
          <div key={h.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input value={h.key} onChange={(e) => set({ headers: headers.map((x) => x.id === h.id ? { ...x, key: e.target.value } : x) })}
              placeholder="Header-Name" style={{ ...inputStyle, flex: 1, fontFamily: "monospace" }} />
            <ValueSource value={h.value || { mode: "static", val: "" }} upstreamFieldList={upstreamFieldList}
              onChange={(v) => set({ headers: headers.map((x) => x.id === h.id ? { ...x, value: v } : x) })} />
            <button onClick={() => set({ headers: headers.filter((x) => x.id !== h.id) })} style={delBtn}><Trash2 size={11} color="#4b5563" strokeWidth={1.8} /></button>
          </div>
        ))}
        <button onClick={() => set({ headers: [...headers, { id: Math.random(), key: "", value: { mode: "static", val: "" } }] })} style={addRowBtn}>
          <Plus size={12} strokeWidth={1.8} /> Add header
        </button>
      </ConfigBlock>

      {(cfg.method === "POST" || cfg.method === "PUT" || cfg.method === "PATCH") && (
        <ConfigBlock>
          <SectionLabel>Body fields</SectionLabel>
          {bodyFields.map((f) => (
            <div key={f.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input value={f.key} onChange={(e) => set({ bodyFields: bodyFields.map((x) => x.id === f.id ? { ...x, key: e.target.value } : x) })}
                placeholder="field" style={{ ...inputStyle, flex: 1, fontFamily: "monospace" }} />
              <ValueSource value={f.value || { mode: "static", val: "" }} upstreamFieldList={upstreamFieldList}
                onChange={(v) => set({ bodyFields: bodyFields.map((x) => x.id === f.id ? { ...x, value: v } : x) })} />
              <button onClick={() => set({ bodyFields: bodyFields.filter((x) => x.id !== f.id) })} style={delBtn}><Trash2 size={11} color="#4b5563" strokeWidth={1.8} /></button>
            </div>
          ))}
          <button onClick={() => set({ bodyFields: [...bodyFields, { id: Math.random(), key: "", value: { mode: "static", val: "" } }] })} style={addRowBtn}>
            <Plus size={12} strokeWidth={1.8} /> Add field
          </button>
        </ConfigBlock>
      )}

      <ConfigBlock>
        <SectionLabel>Response output name</SectionLabel>
        <input value={cfg.outputName || ""} onChange={(e) => set({ outputName: e.target.value })}
          placeholder="e.g. apiResponse" style={{ ...inputStyle, fontFamily: "monospace" }} />
        <div style={{ fontSize: 10, color: "#4b5563" }}>The response will be available as this variable downstream.</div>
      </ConfigBlock>
    </div>
  );
}

// --- Email config ---

function EmailConfig({ data, onChange, allNodes, edges, nodeId }) {
  const upstream = upstreamLogicNodes(allNodes, edges, nodeId);
  const upstreamEndpoints = upstreamEndpointNodes(allNodes, edges, nodeId);
  const upstreamFieldList = [
    ...upstreamEndpoints.flatMap(endpointFields),
    ...upstream.flatMap(upstreamFields),
  ];
  const cfg = data.emailCfg || {};
  const set = (patch) => onChange({ ...data, emailCfg: { ...cfg, ...patch } });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <ConfigBlock>
        <SectionLabel>Provider</SectionLabel>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["SMTP", "SendGrid", "Mailgun", "Resend"].map((p) => (
            <button key={p} onClick={() => set({ provider: p })}
              style={{ padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500,
                background: cfg.provider === p ? "#1a1410" : "#1e2030",
                color: cfg.provider === p ? "#f59e0b" : "#6b7280",
                outline: cfg.provider === p ? "1px solid #f59e0b66" : "none" }}>
              {p}
            </button>
          ))}
        </div>
        {cfg.provider === "SMTP" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
            {[["Host", "smtpHost", "smtp.gmail.com"], ["Port", "smtpPort", "587"], ["User", "smtpUser", "user@example.com"]].map(([label, key, ph]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "#6b7280", width: 36, flexShrink: 0 }}>{label}</span>
                <input value={cfg[key] || ""} onChange={(e) => set({ [key]: e.target.value })} placeholder={ph} style={{ ...inputStyle, flex: 1 }} />
              </div>
            ))}
          </div>
        )}
        {(cfg.provider === "SendGrid" || cfg.provider === "Mailgun" || cfg.provider === "Resend") && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#6b7280", width: 60, flexShrink: 0 }}>API Key</span>
            <input value={cfg.apiKey || ""} onChange={(e) => set({ apiKey: e.target.value })} placeholder="use env var e.g. SENDGRID_KEY" style={{ ...inputStyle, flex: 1, fontFamily: "monospace" }} />
          </div>
        )}
      </ConfigBlock>

      <ConfigBlock>
        <SectionLabel>Email fields</SectionLabel>
        {[["To", "to"], ["From", "from"], ["Subject", "subject"]].map(([label, key]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#6b7280", width: 50, flexShrink: 0 }}>{label}</span>
            <ValueSource value={cfg[key] || { mode: "static", val: "" }} upstreamFieldList={upstreamFieldList}
              onChange={(v) => set({ [key]: v })} />
          </div>
        ))}
      </ConfigBlock>

      <ConfigBlock>
        <SectionLabel>Body</SectionLabel>
        <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          {["text", "html"].map((t) => (
            <button key={t} onClick={() => set({ bodyType: t })}
              style={{ padding: "3px 12px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 11,
                background: (cfg.bodyType || "text") === t ? "#1e2030" : "transparent",
                color: (cfg.bodyType || "text") === t ? "#f3f4f6" : "#4b5563" }}>
              {t}
            </button>
          ))}
        </div>
        <textarea value={cfg.body || ""} onChange={(e) => set({ body: e.target.value })}
          placeholder={(cfg.bodyType || "text") === "html" ? "<h1>Hello {{name}}</h1>" : "Hello {{name}}, your account is ready."}
          rows={4} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} />
        <div style={{ fontSize: 10, color: "#4b5563" }}>Use {"{{fieldName}}"} to inject upstream field values.</div>
      </ConfigBlock>
    </div>
  );
}

// --- Authorize config ---

function AuthorizeConfig({ data, onChange, allNodes, edges, nodeId }) {
  const upstream = upstreamLogicNodes(allNodes, edges, nodeId);
  const upstreamEndpoints = upstreamEndpointNodes(allNodes, edges, nodeId);
  const upstreamFieldList = [
    ...upstreamEndpoints.flatMap(endpointFields),
    ...upstream.flatMap(upstreamFields),
  ];
  const cfg = data.authorizeCfg || {};
  const set = (patch) => onChange({ ...data, authorizeCfg: { ...cfg, ...patch } });
  const rules = cfg.rules || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <ConfigBlock>
        <SectionLabel>User role / field</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#6b7280", width: 80, flexShrink: 0 }}>Role field</span>
          <FieldSelect value={cfg.roleField} fields={upstreamFieldList}
            onChange={(v) => set({ roleField: v })} placeholder="— upstream field —" />
        </div>
        <div style={{ fontSize: 10, color: "#4b5563" }}>Pick the field that carries the user's role (e.g. from a fetch or auth result).</div>
      </ConfigBlock>

      <ConfigBlock>
        <SectionLabel>Permission rules</SectionLabel>
        <div style={{ fontSize: 10, color: "#4b5563", marginBottom: 4 }}>All rules must pass. If any fails, a 403 is returned.</div>
        {rules.length === 0 && <div style={{ fontSize: 12, color: "#374151" }}>No rules — all roles allowed.</div>}
        {rules.map((r) => (
          <div key={r.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select value={r.type || "role_is"} onChange={(e) => set({ rules: rules.map((x) => x.id === r.id ? { ...x, type: e.target.value } : x) })}
              style={{ ...inputStyle, width: 130, flexShrink: 0, cursor: "pointer" }}>
              <option value="role_is">role is</option>
              <option value="role_in">role in list</option>
              <option value="role_not">role is not</option>
              <option value="field_equals">field equals</option>
            </select>
            {(r.type === "role_is" || r.type === "role_not" || !r.type) && (
              <input value={r.value || ""} onChange={(e) => set({ rules: rules.map((x) => x.id === r.id ? { ...x, value: e.target.value } : x) })}
                placeholder="admin" style={{ ...inputStyle, flex: 1, fontFamily: "monospace" }} />
            )}
            {r.type === "role_in" && (
              <input value={r.value || ""} onChange={(e) => set({ rules: rules.map((x) => x.id === r.id ? { ...x, value: e.target.value } : x) })}
                placeholder="admin, editor, moderator" style={{ ...inputStyle, flex: 1, fontFamily: "monospace" }} />
            )}
            {r.type === "field_equals" && (
              <>
                <FieldSelect value={r.field} fields={upstreamFieldList}
                  onChange={(v) => set({ rules: rules.map((x) => x.id === r.id ? { ...x, field: v } : x) })} placeholder="— field —" />
                <input value={r.value || ""} onChange={(e) => set({ rules: rules.map((x) => x.id === r.id ? { ...x, value: e.target.value } : x) })}
                  placeholder="expected value" style={{ ...inputStyle, width: 100, flexShrink: 0 }} />
              </>
            )}
            <button onClick={() => set({ rules: rules.filter((x) => x.id !== r.id) })} style={delBtn}><Trash2 size={11} color="#4b5563" strokeWidth={1.8} /></button>
          </div>
        ))}
        <button onClick={() => set({ rules: [...rules, { id: Math.random(), type: "role_is", value: "" }] })} style={addRowBtn}>
          <Plus size={12} strokeWidth={1.8} /> Add rule
        </button>
      </ConfigBlock>

      <ConfigBlock>
        <SectionLabel>On deny</SectionLabel>
        <input value={cfg.denyMessage || ""} onChange={(e) => set({ denyMessage: e.target.value })}
          placeholder="Forbidden" style={{ ...inputStyle }} />
        <div style={{ fontSize: 10, color: "#4b5563" }}>Message returned with 403 when access is denied.</div>
      </ConfigBlock>
    </div>
  );
}

// ─── helpers ────────────────────────────────────────────────────────────────

/** Returns all DB nodes connected to nodeId (via any edge) */
function connectedDbNodes(allNodes, edges, nodeId) {
  const ids = new Set(
    edges
      .filter((e) => e.source === nodeId || e.target === nodeId)
      .map((e) => (e.source === nodeId ? e.target : e.source))
  );
  return allNodes.filter((n) => ids.has(n.id) && n.type === "db");
}

/** Returns upstream logic nodes (nodes that feed INTO nodeId) */
function upstreamLogicNodes(allNodes, edges, nodeId) {
  const ids = new Set(
    edges.filter((e) => {
      const dir = e.data?.flowDir;
      if (dir === "forward") return e.target === nodeId;
      if (dir === "reverse") return e.source === nodeId;
      return e.target === nodeId;
    }).map((e) => e.data?.flowDir === "reverse" ? e.target : e.source)
  );
  return allNodes.filter((n) => ids.has(n.id) && n.type === "logic");
}

/** Returns upstream endpoint nodes (nodes that feed INTO nodeId) */
function upstreamEndpointNodes(allNodes, edges, nodeId) {
  const ids = new Set(
    edges.filter((e) => {
      const dir = e.data?.flowDir;
      if (dir === "forward") return e.target === nodeId;
      if (dir === "reverse") return e.source === nodeId;
      return e.target === nodeId;
    }).map((e) => e.data?.flowDir === "reverse" ? e.target : e.source)
  );
  return allNodes.filter((n) => ids.has(n.id) && n.type === "endpoint");
}

/** Collect input param names from an upstream endpoint node */
function endpointFields(node) {
  return (node?.data?.input || []).map((r) => r.key).filter(Boolean);
}

/** Collect output field names from an upstream logic node's operation config */
function upstreamFields(node) {
  const op = node?.data?.operation;
  if (!op) return [];
  if (op === "fetch") {
    const picked = node.data.fetchCfg?.fetchFields || [];
    return picked.length ? picked : [];
  }
  if (op === "save") return Object.keys(node.data.saveCfg?.mapping || {});
  if (op === "validate") {
    const f = node.data.validateCfg?.field;
    return f ? [f, `${f}_valid`, `${f}_error`] : ["valid", "error"];
  }
  if (op === "auth_basic") return ["token", "user"];
  if (op === "auth_advanced") {
    const out = [];
    if (node.data.authAdvCfg?.hashField) out.push("hashedPassword");
    if (node.data.authAdvCfg?.verifyPlainField) out.push("passwordMatch");
    if (node.data.authAdvCfg?.jwtPayloadFields?.length) out.push("jwt");
    if (node.data.authAdvCfg?.decodeJwtOutput) out.push(node.data.authAdvCfg.decodeJwtOutput);
    return out;
  }
  if (op === "transform") return (node.data.transformCfg?.rows || []).map((r) => r.outputName).filter(Boolean);
  if (op === "utility") {
    const sub = node.data.utilityCfg?.subType;
    if (sub === "Paginate") return ["items", "page", "total"];
    if (sub === "Sort") return ["sorted"];
    if (sub === "Filter list") return ["filtered"];
    if (sub === "Count") return ["count"];
  }
  if (op === "http_request") {
    const name = node.data.httpReqCfg?.outputName || "apiResponse";
    return [name, `${name}_status`];
  }
  if (op === "email") return ["email_sent"];
  if (op === "authorize") return ["authorized"];
  return [];
}

const FILTER_OPERATORS = ["is", "is not", "contains", "greater than", "less than"];

// ─── Shared primitives ───────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return <div style={{ fontSize: 10, color: "#4b5563", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{children}</div>;
}

function ConfigBlock({ children }) {
  return <div style={{ background: "#0f1117", border: "1px solid #1e2030", borderRadius: 8, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>;
}

/** Field picker: dropdown of field names from a list */
function FieldSelect({ value, fields, onChange, placeholder = "— field —" }) {
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)}
      style={{ ...inputStyle, cursor: "pointer", fontFamily: "monospace", flex: 1 }}>
      <option value="">{placeholder}</option>
      {fields.map((f) => <option key={f} value={f}>{f}</option>)}
    </select>
  );
}

/**
 * Value source: toggle between "upstream" (field picker from upstream nodes)
 * and "static" (plain text input).
 */
function ValueSource({ value = {}, onChange, upstreamFieldList }) {
  const mode = value.mode || "static";
  return (
    <div style={{ display: "flex", gap: 4, flex: 1, alignItems: "center" }}>
      {/* mode toggle */}
      <div style={{ display: "flex", borderRadius: 5, overflow: "hidden", border: "1px solid #2e303a", flexShrink: 0 }}>
        {["static", "upstream"].map((m) => (
          <button key={m} onClick={() => onChange({ ...value, mode: m, val: "" })}
            style={{ padding: "3px 8px", fontSize: 10, border: "none", cursor: "pointer", fontWeight: 500,
              background: mode === m ? "#2e303a" : "transparent",
              color: mode === m ? "#f3f4f6" : "#4b5563" }}>
            {m === "static" ? "value" : "field"}
          </button>
        ))}
      </div>
      {mode === "static"
        ? <input value={value.val || ""} onChange={(e) => onChange({ ...value, val: e.target.value })}
            placeholder="static value" style={{ ...inputStyle, flex: 1 }} />
        : <FieldSelect value={value.val} fields={upstreamFieldList}
            onChange={(v) => onChange({ ...value, val: v })} placeholder="— upstream field —" />}
    </div>
  );
}

// ─── Fetch config ────────────────────────────────────────────────────────────

function FetchConfig({ data, onChange, allNodes, edges, nodeId }) {
  const dbNodes = connectedDbNodes(allNodes, edges, nodeId);
  const upstream = upstreamLogicNodes(allNodes, edges, nodeId);
  const upstreamEndpoints = upstreamEndpointNodes(allNodes, edges, nodeId);
  const upstreamFieldList = [
    ...upstreamEndpoints.flatMap(endpointFields),
    ...upstream.flatMap(upstreamFields),
  ];

  const cfg = data.fetchCfg || {};
  const set = (patch) => onChange({ ...data, fetchCfg: { ...cfg, ...patch } });

  // model fields from the selected DB node
  const modelNode = allNodes.find((n) => n.id === cfg.modelId);
  const modelFields = (modelNode?.data?.fields || []).map((f) => f.name).filter(Boolean);

  const filters = cfg.filters || [];
  const addFilter = () => set({ filters: [...filters, { id: Math.random(), field: "", op: "is", value: { mode: "static", val: "" } }] });
  const updateFilter = (id, patch) => set({ filters: filters.map((f) => f.id === id ? { ...f, ...patch } : f) });
  const removeFilter = (id) => set({ filters: filters.filter((f) => f.id !== id) });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Model */}
      <ConfigBlock>
        <SectionLabel>Model</SectionLabel>
        {dbNodes.length === 0
          ? <div style={{ fontSize: 12, color: "#4b5563" }}>Connect a Database node to pick a model.</div>
          : <select value={cfg.modelId || ""} onChange={(e) => set({ modelId: e.target.value, fetchFields: [], filters: [] })}
              style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">— select model —</option>
              {dbNodes.map((n) => <option key={n.id} value={n.id}>{n.data.label}</option>)}
            </select>}
      </ConfigBlock>

      {/* Fields to return */}
      {modelFields.length > 0 && (
        <ConfigBlock>
          <SectionLabel>Fields to return</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {modelFields.map((f) => {
              const active = (cfg.fetchFields || []).includes(f);
              return (
                <span key={f} onClick={() => {
                  const cur = cfg.fetchFields || [];
                  set({ fetchFields: active ? cur.filter((x) => x !== f) : [...cur, f] });
                }}
                  style={{ fontSize: 11, padding: "3px 9px", borderRadius: 5, cursor: "pointer", userSelect: "none",
                    background: active ? "#0a1f16" : "#1a1d27",
                    color: active ? "#34d399" : "#6b7280",
                    border: `1px solid ${active ? "#05966966" : "#2e303a"}`,
                    transition: "all 0.1s" }}>
                  {f}
                </span>
              );
            })}
          </div>
          <div style={{ fontSize: 10, color: "#374151" }}>Leave all unselected to return all fields.</div>
        </ConfigBlock>
      )}

      {/* Filters */}
      {cfg.modelId && (
        <ConfigBlock>
          <SectionLabel>Filter by</SectionLabel>
          {filters.length === 0 && <div style={{ fontSize: 12, color: "#374151" }}>No filters — returns all records.</div>}
          {filters.map((f) => (
            <div key={f.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <FieldSelect value={f.field} fields={modelFields} onChange={(v) => updateFilter(f.id, { field: v })} />
              <select value={f.op} onChange={(e) => updateFilter(f.id, { op: e.target.value })}
                style={{ ...inputStyle, width: 110, flexShrink: 0, cursor: "pointer" }}>
                {FILTER_OPERATORS.map((o) => <option key={o}>{o}</option>)}
              </select>
              <ValueSource value={f.value} upstreamFieldList={upstreamFieldList}
                onChange={(v) => updateFilter(f.id, { value: v })} />
              <button onClick={() => removeFilter(f.id)} style={delBtn}><Trash2 size={12} color="#4b5563" strokeWidth={1.8} /></button>
            </div>
          ))}
          <button onClick={addFilter} style={addRowBtn}><Plus size={12} strokeWidth={1.8} /> Add filter</button>
        </ConfigBlock>
      )}

      {/* Return cardinality */}
      {cfg.modelId && (
        <ConfigBlock>
          <SectionLabel>Return</SectionLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {["one", "many"].map((v) => (
              <button key={v} onClick={() => set({ returnMany: v === "many" })}
                style={{ flex: 1, padding: "7px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 500,
                  background: (cfg.returnMany ? "many" : "one") === v ? "#1e3a5f" : "#1a1d27",
                  color: (cfg.returnMany ? "many" : "one") === v ? "#38bdf8" : "#6b7280",
                  outline: (cfg.returnMany ? "many" : "one") === v ? "1px solid #38bdf844" : "none" }}>
                {v === "one" ? "One record" : "Many records"}
              </button>
            ))}
          </div>
        </ConfigBlock>
      )}

    </div>
  );
}

// --- Utility config ---

const UTILITY_SUBTYPES = ["Paginate", "Sort", "Filter list", "Count"];

function UtilityConfig({ data, onChange, allNodes, edges, nodeId }) {
  const upstream = upstreamLogicNodes(allNodes, edges, nodeId);
  const upstreamEndpoints = upstreamEndpointNodes(allNodes, edges, nodeId);
  const upstreamFieldList = [
    ...upstreamEndpoints.flatMap(endpointFields),
    ...upstream.flatMap(upstreamFields),
  ];

  const cfg = data.utilityCfg || {};
  const set = (patch) => onChange({ ...data, utilityCfg: { ...cfg, ...patch } });
  const sub = cfg.subType || null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Sub-type picker */}
      <ConfigBlock>
        <SectionLabel>Sub-type</SectionLabel>
        <div style={{ display: "flex", gap: 6 }}>
          {UTILITY_SUBTYPES.map((s) => (
            <button key={s} onClick={() => set({ subType: s })}
              style={{ flex: 1, padding: "7px 4px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500,
                background: sub === s ? "#0a1f16" : "#1a1d27",
                color: sub === s ? "#34d399" : "#6b7280",
                outline: sub === s ? "1px solid #05966944" : "none" }}>
              {s}
            </button>
          ))}
        </div>
      </ConfigBlock>

      {/* Paginate */}
      {sub === "Paginate" && (
        <ConfigBlock>
          <SectionLabel>Paginate</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#6b7280", width: 80, flexShrink: 0 }}>Page field</span>
              <FieldSelect value={cfg.pageField} fields={upstreamFieldList}
                onChange={(v) => set({ pageField: v })} placeholder="— upstream field —" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#6b7280", width: 80, flexShrink: 0 }}>Page size</span>
              <ValueSource value={cfg.pageSize || { mode: "static", val: "10" }}
                upstreamFieldList={upstreamFieldList}
                onChange={(v) => set({ pageSize: v })} />
            </div>
          </div>
        </ConfigBlock>
      )}

      {/* Sort */}
      {sub === "Sort" && (
        <ConfigBlock>
          <SectionLabel>Sort</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#6b7280", width: 80, flexShrink: 0 }}>Field</span>
              <FieldSelect value={cfg.sortField} fields={upstreamFieldList}
                onChange={(v) => set({ sortField: v })} placeholder="— upstream field —" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#6b7280", width: 80, flexShrink: 0 }}>Direction</span>
              <div style={{ display: "flex", gap: 6 }}>
                {["Asc", "Desc"].map((d) => (
                  <button key={d} onClick={() => set({ sortDir: d })}
                    style={{ padding: "4px 16px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500,
                      background: cfg.sortDir === d ? "#1e1a3a" : "#1a1d27",
                      color: cfg.sortDir === d ? "#c4b5fd" : "#6b7280",
                      outline: cfg.sortDir === d ? "1px solid #7c3aed44" : "none" }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ConfigBlock>
      )}

      {/* Filter list */}
      {sub === "Filter list" && (
        <ConfigBlock>
          <SectionLabel>Filter list</SectionLabel>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <FieldSelect value={cfg.filterField} fields={upstreamFieldList}
              onChange={(v) => set({ filterField: v })} />
            <select value={cfg.filterOp || "is"} onChange={(e) => set({ filterOp: e.target.value })}
              style={{ ...inputStyle, width: 110, flexShrink: 0, cursor: "pointer" }}>
              {FILTER_OPERATORS.map((o) => <option key={o}>{o}</option>)}
            </select>
            <ValueSource value={cfg.filterValue || { mode: "static", val: "" }}
              upstreamFieldList={upstreamFieldList}
              onChange={(v) => set({ filterValue: v })} />
          </div>
        </ConfigBlock>
      )}

      {/* Count */}
      {sub === "Count" && (
        <ConfigBlock>
          <SectionLabel>Count</SectionLabel>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#6b7280", width: 80, flexShrink: 0 }}>Source</span>
            <FieldSelect value={cfg.countSource} fields={upstreamFieldList}
              onChange={(v) => set({ countSource: v })} placeholder="— model or list —" />
          </div>
        </ConfigBlock>
      )}

    </div>
  );
}

// --- Transform config ---

const TRANSFORM_OPS = ["Rename", "Combine", "Format date", "Uppercase", "Lowercase", "Extract"];
const TRANSFORM_NO_CONFIG = ["Uppercase", "Lowercase"];

function TransformConfig({ data, onChange, allNodes, edges, nodeId }) {
  const upstream = upstreamLogicNodes(allNodes, edges, nodeId);
  const upstreamEndpoints = upstreamEndpointNodes(allNodes, edges, nodeId);
  const upstreamFieldList = [
    ...upstreamEndpoints.flatMap(endpointFields),
    ...upstream.flatMap(upstreamFields),
  ];

  const cfg = data.transformCfg || {};
  const set = (patch) => onChange({ ...data, transformCfg: { ...cfg, ...patch } });

  const rows = cfg.rows || [];
  const addRow = () => set({ rows: [...rows, { id: Math.random(), inputField: "", op: "Rename", opConfig: "", outputName: "" }] });
  const updateRow = (id, patch) => set({ rows: rows.map((r) => r.id === id ? { ...r, ...patch } : r) });
  const removeRow = (id) => set({ rows: rows.filter((r) => r.id !== id) });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <ConfigBlock>
        <SectionLabel>Transformations</SectionLabel>
        {rows.length === 0 && <div style={{ fontSize: 12, color: "#374151" }}>No transformations yet.</div>}
        {rows.map((r) => (
          <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 6,
            padding: "10px 12px", background: "#111318", borderRadius: 7, border: "1px solid #2e303a" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <FieldSelect value={r.inputField} fields={upstreamFieldList}
                onChange={(v) => updateRow(r.id, { inputField: v })} placeholder="— input field —" />
              <span style={{ color: "#2e303a", flexShrink: 0 }}>→</span>
              <select value={r.op} onChange={(e) => updateRow(r.id, { op: e.target.value, opConfig: "" })}
                style={{ ...inputStyle, width: 120, flexShrink: 0, cursor: "pointer" }}>
                {TRANSFORM_OPS.map((o) => <option key={o}>{o}</option>)}
              </select>
              <button onClick={() => removeRow(r.id)} style={delBtn}><Trash2 size={12} color="#4b5563" strokeWidth={1.8} /></button>
            </div>
            {/* op-specific config */}
            {!TRANSFORM_NO_CONFIG.includes(r.op) && (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#4b5563", width: 70, flexShrink: 0 }}>
                  {r.op === "Rename" ? "New name" : r.op === "Combine" ? "Combine with" : r.op === "Format date" ? "Format" : r.op === "Extract" ? "Pattern" : ""}
                </span>
                {r.op === "Combine"
                  ? <FieldSelect value={r.opConfig} fields={upstreamFieldList}
                      onChange={(v) => updateRow(r.id, { opConfig: v })} placeholder="— second field —" />
                  : <input value={r.opConfig || ""} onChange={(e) => updateRow(r.id, { opConfig: e.target.value })}
                      placeholder={r.op === "Format date" ? "YYYY-MM-DD" : r.op === "Extract" ? "regex" : "name"}
                      style={{ ...inputStyle, flex: 1 }} />}
              </div>
            )}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#4b5563", width: 70, flexShrink: 0 }}>Output name</span>
              <input value={r.outputName || ""} onChange={(e) => updateRow(r.id, { outputName: e.target.value })}
                placeholder="e.g. fullName" style={{ ...inputStyle, flex: 1 }} />
            </div>
          </div>
        ))}
        <button onClick={addRow} style={addRowBtn}><Plus size={12} strokeWidth={1.8} /> Add transformation</button>
      </ConfigBlock>
    </div>
  );
}

// --- Auth Advanced config ---

const JWT_EXPIRY_OPTIONS = ["1h", "24h", "7d", "30d", "custom"];

function AuthAdvancedConfig({ data, onChange, allNodes, edges, nodeId }) {
  const upstream = upstreamLogicNodes(allNodes, edges, nodeId);
  const upstreamEndpoints = upstreamEndpointNodes(allNodes, edges, nodeId);
  const upstreamFieldList = [
    ...upstreamEndpoints.flatMap(endpointFields),
    ...upstream.flatMap(upstreamFields),
  ];

  const cfg = data.authAdvCfg || {};
  const set = (patch) => onChange({ ...data, authAdvCfg: { ...cfg, ...patch } });

  const jwtPayloadFields = cfg.jwtPayloadFields || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Hash password */}
      <ConfigBlock>
        <SectionLabel>Hash password</SectionLabel>
        <FieldSelect value={cfg.hashField} fields={upstreamFieldList}
          onChange={(v) => set({ hashField: v })} placeholder="— field to hash —" />
      </ConfigBlock>

      {/* Verify password */}
      <ConfigBlock>
        <SectionLabel>Verify password</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#6b7280", width: 90, flexShrink: 0 }}>Plain text</span>
            <FieldSelect value={cfg.verifyPlainField} fields={upstreamFieldList}
              onChange={(v) => set({ verifyPlainField: v })} placeholder="— upstream field —" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#6b7280", width: 90, flexShrink: 0 }}>Hashed</span>
            <FieldSelect value={cfg.verifyHashedField} fields={upstreamFieldList}
              onChange={(v) => set({ verifyHashedField: v })} placeholder="— upstream field —" />
          </div>
        </div>
      </ConfigBlock>

      {/* Generate JWT */}
      <ConfigBlock>
        <SectionLabel>Generate JWT</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 10, color: "#4b5563" }}>Payload fields</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {upstreamFieldList.length === 0
              ? <span style={{ fontSize: 11, color: "#374151" }}>No upstream fields available</span>
              : upstreamFieldList.map((f) => {
                  const active = jwtPayloadFields.includes(f);
                  return (
                    <span key={f} onClick={() => set({ jwtPayloadFields: active ? jwtPayloadFields.filter((x) => x !== f) : [...jwtPayloadFields, f] })}
                      style={{ fontSize: 11, padding: "3px 9px", borderRadius: 5, cursor: "pointer", userSelect: "none",
                        background: active ? "#1e1a3a" : "#1a1d27",
                        color: active ? "#c4b5fd" : "#6b7280",
                        border: `1px solid ${active ? "#7c3aed66" : "#2e303a"}`,
                        transition: "all 0.1s" }}>
                      {f}
                    </span>
                  );
                })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#6b7280", flexShrink: 0 }}>Expiry</span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {JWT_EXPIRY_OPTIONS.map((e) => (
                <button key={e} onClick={() => set({ jwtExpiry: e })}
                  style={{ padding: "3px 10px", borderRadius: 5, border: "none", cursor: "pointer", fontSize: 11,
                    background: cfg.jwtExpiry === e ? "#1e1a3a" : "#1a1d27",
                    color: cfg.jwtExpiry === e ? "#c4b5fd" : "#6b7280",
                    outline: cfg.jwtExpiry === e ? "1px solid #7c3aed44" : "none" }}>
                  {e}
                </button>
              ))}
            </div>
            {cfg.jwtExpiry === "custom" && (
              <input value={cfg.jwtExpiryCustom || ""} onChange={(e) => set({ jwtExpiryCustom: e.target.value })}
                placeholder="e.g. 2h" style={{ ...inputStyle, width: 70, flexShrink: 0 }} />
            )}
          </div>
        </div>
      </ConfigBlock>

      {/* Verify JWT */}
      <ConfigBlock>
        <SectionLabel>Verify JWT</SectionLabel>
        <FieldSelect value={cfg.verifyJwtField} fields={upstreamFieldList}
          onChange={(v) => set({ verifyJwtField: v })} placeholder="— token field —" />
      </ConfigBlock>

      {/* Decode JWT */}
      <ConfigBlock>
        <SectionLabel>Decode JWT</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#6b7280", width: 90, flexShrink: 0 }}>Token field</span>
            <FieldSelect value={cfg.decodeJwtField} fields={upstreamFieldList}
              onChange={(v) => set({ decodeJwtField: v })} placeholder="— upstream field —" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#6b7280", width: 90, flexShrink: 0 }}>Output name</span>
            <input value={cfg.decodeJwtOutput || ""} onChange={(e) => set({ decodeJwtOutput: e.target.value })}
              placeholder="e.g. decodedUser" style={{ ...inputStyle, flex: 1 }} />
          </div>
        </div>
      </ConfigBlock>

    </div>
  );
}

// --- Auth Basic config ---

function AuthBasicConfig({ data, onChange, allNodes, edges, nodeId }) {
  const dbNodes = connectedDbNodes(allNodes, edges, nodeId);
  const upstream = upstreamLogicNodes(allNodes, edges, nodeId);
  const upstreamEndpoints = upstreamEndpointNodes(allNodes, edges, nodeId);
  const upstreamFieldList = [
    ...upstreamEndpoints.flatMap(endpointFields),
    ...upstream.flatMap(upstreamFields),
  ];

  const cfg = data.authBasicCfg || {};
  const set = (patch) => onChange({ ...data, authBasicCfg: { ...cfg, ...patch } });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Login flow */}
      <ConfigBlock>
        <SectionLabel>Login flow</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#6b7280", width: 100, flexShrink: 0 }}>Username field</span>
            <FieldSelect value={cfg.usernameField} fields={upstreamFieldList}
              onChange={(v) => set({ usernameField: v })} placeholder="— upstream field —" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#6b7280", width: 100, flexShrink: 0 }}>Password field</span>
            <FieldSelect value={cfg.passwordField} fields={upstreamFieldList}
              onChange={(v) => set({ passwordField: v })} placeholder="— upstream field —" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "#6b7280", width: 100, flexShrink: 0 }}>User model</span>
            {dbNodes.length === 0
              ? <span style={{ fontSize: 11, color: "#4b5563" }}>Connect a Database node</span>
              : <select value={cfg.modelId || ""} onChange={(e) => set({ modelId: e.target.value })}
                  style={{ ...inputStyle, cursor: "pointer", flex: 1 }}>
                  <option value="">— select model —</option>
                  {dbNodes.map((n) => <option key={n.id} value={n.id}>{n.data.label}</option>)}
                </select>}
          </div>
        </div>
      </ConfigBlock>

      {/* Protect route */}
      <ConfigBlock>
        <SectionLabel>Protect route</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#6b7280", width: 100, flexShrink: 0 }}>Token source</span>
          <FieldSelect value={cfg.tokenField} fields={upstreamFieldList}
            onChange={(v) => set({ tokenField: v })} placeholder="— upstream field —" />
        </div>
      </ConfigBlock>

      {/* Logout */}
      <ConfigBlock>
        <SectionLabel>Logout</SectionLabel>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#6b7280", width: 100, flexShrink: 0 }}>Token / session</span>
          <FieldSelect value={cfg.logoutField} fields={upstreamFieldList}
            onChange={(v) => set({ logoutField: v })} placeholder="— upstream field —" />
        </div>
      </ConfigBlock>

    </div>
  );
}

// --- Validate config ---

const VALIDATE_RULES = ["required", "is email", "is number", "min length", "max length", "is URL", "matches pattern"];
const RULES_WITH_VALUE = ["min length", "max length", "matches pattern"];

function ValidateConfig({ data, onChange, allNodes, edges, nodeId }) {
  const upstream = upstreamLogicNodes(allNodes, edges, nodeId);
  const upstreamEndpoints = upstreamEndpointNodes(allNodes, edges, nodeId);
  const upstreamFieldList = [
    ...upstreamEndpoints.flatMap(endpointFields),
    ...upstream.flatMap(upstreamFields),
  ];

  const cfg = data.validateCfg || {};
  const set = (patch) => onChange({ ...data, validateCfg: { ...cfg, ...patch } });

  const rules = cfg.rules || [{ id: Math.random(), type: "required", ruleVal: "", onFail: "" }];
  const addRule = () => set({ rules: [...rules, { id: Math.random(), type: "required", ruleVal: "", onFail: "" }] });
  const updateRule = (id, patch) => set({ rules: rules.map((r) => r.id === id ? { ...r, ...patch } : r) });
  const removeRule = (id) => set({ rules: rules.filter((r) => r.id !== id) });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <ConfigBlock>
        <SectionLabel>Field to validate</SectionLabel>
        <FieldSelect value={cfg.field} fields={upstreamFieldList}
          onChange={(v) => set({ field: v })} placeholder="— pick upstream field —" />
      </ConfigBlock>

      <ConfigBlock>
        <SectionLabel>Rules</SectionLabel>
        {rules.map((r, i) => (
          <div key={r.id} style={{ display: "flex", flexDirection: "column", gap: 6,
            padding: "10px 12px", background: "#111318", borderRadius: 7, border: "1px solid #2e303a" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#4b5563", flexShrink: 0, width: 16 }}>#{i + 1}</span>
              <select value={r.type} onChange={(e) => updateRule(r.id, { type: e.target.value, ruleVal: "" })}
                style={{ ...inputStyle, cursor: "pointer", flex: 1 }}>
                {VALIDATE_RULES.map((t) => <option key={t}>{t}</option>)}
              </select>
              {RULES_WITH_VALUE.includes(r.type) && (
                <input value={r.ruleVal || ""} onChange={(e) => updateRule(r.id, { ruleVal: e.target.value })}
                  placeholder={r.type === "matches pattern" ? "regex" : "number"}
                  style={{ ...inputStyle, width: 80, flexShrink: 0 }} />
              )}
              <button onClick={() => removeRule(r.id)} style={delBtn}><Trash2 size={12} color="#4b5563" strokeWidth={1.8} /></button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 10, color: "#4b5563", flexShrink: 0 }}>On fail:</span>
              <input value={r.onFail || ""} onChange={(e) => updateRule(r.id, { onFail: e.target.value })}
                placeholder="error message" style={{ ...inputStyle, flex: 1 }} />
            </div>
          </div>
        ))}
        <button onClick={addRule} style={addRowBtn}><Plus size={12} strokeWidth={1.8} /> Add rule</button>
      </ConfigBlock>
    </div>
  );
}

// --- Delete config ---

function DeleteConfig({ data, onChange, allNodes, edges, nodeId }) {
  const dbNodes = connectedDbNodes(allNodes, edges, nodeId);
  const upstream = upstreamLogicNodes(allNodes, edges, nodeId);
  const upstreamEndpoints = upstreamEndpointNodes(allNodes, edges, nodeId);
  const upstreamFieldList = [
    ...upstreamEndpoints.flatMap(endpointFields),
    ...upstream.flatMap(upstreamFields),
  ];

  const cfg = data.deleteCfg || {};
  const set = (patch) => onChange({ ...data, deleteCfg: { ...cfg, ...patch } });

  const modelNode = allNodes.find((n) => n.id === cfg.modelId);
  const modelFields = (modelNode?.data?.fields || []).map((f) => f.name).filter(Boolean);

  const filters = cfg.filters || [];
  const addFilter = () => set({ filters: [...filters, { id: Math.random(), field: "", op: "is", value: { mode: "static", val: "" } }] });
  const updateFilter = (id, patch) => set({ filters: filters.map((f) => f.id === id ? { ...f, ...patch } : f) });
  const removeFilter = (id) => set({ filters: filters.filter((f) => f.id !== id) });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <ConfigBlock>
        <SectionLabel>Model</SectionLabel>
        {dbNodes.length === 0
          ? <div style={{ fontSize: 12, color: "#4b5563" }}>Connect a Database node to pick a model.</div>
          : <select value={cfg.modelId || ""} onChange={(e) => set({ modelId: e.target.value, filters: [] })}
              style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">— select model —</option>
              {dbNodes.map((n) => <option key={n.id} value={n.id}>{n.data.label}</option>)}
            </select>}
      </ConfigBlock>

      {cfg.modelId && (
        <ConfigBlock>
          <SectionLabel>Filter by</SectionLabel>
          {filters.length === 0 && (
            <div style={{ fontSize: 12, color: "#f87171" }}>⚠ No filters — this will delete all records.</div>
          )}
          {filters.map((f) => (
            <div key={f.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <FieldSelect value={f.field} fields={modelFields} onChange={(v) => updateFilter(f.id, { field: v })} />
              <select value={f.op} onChange={(e) => updateFilter(f.id, { op: e.target.value })}
                style={{ ...inputStyle, width: 110, flexShrink: 0, cursor: "pointer" }}>
                {FILTER_OPERATORS.map((o) => <option key={o}>{o}</option>)}
              </select>
              <ValueSource value={f.value} upstreamFieldList={upstreamFieldList}
                onChange={(v) => updateFilter(f.id, { value: v })} />
              <button onClick={() => removeFilter(f.id)} style={delBtn}><Trash2 size={12} color="#4b5563" strokeWidth={1.8} /></button>
            </div>
          ))}
          <button onClick={addFilter} style={addRowBtn}><Plus size={12} strokeWidth={1.8} /> Add filter</button>
        </ConfigBlock>
      )}
    </div>
  );
}

// --- Save config ---

const SAVE_OPS = [
  { id: "create",        label: "Create" },
  { id: "update",        label: "Update" },
  { id: "create_update", label: "Create or Update" },
];

function SaveConfig({ data, onChange, allNodes, edges, nodeId }) {
  const dbNodes = connectedDbNodes(allNodes, edges, nodeId);
  const upstream = upstreamLogicNodes(allNodes, edges, nodeId);
  const upstreamEndpoints = upstreamEndpointNodes(allNodes, edges, nodeId);
  const upstreamFieldList = [
    ...upstreamEndpoints.flatMap(endpointFields),
    ...upstream.flatMap(upstreamFields),
  ];

  const cfg = data.saveCfg || {};
  const set = (patch) => onChange({ ...data, saveCfg: { ...cfg, ...patch } });

  const modelNode = allNodes.find((n) => n.id === cfg.modelId);
  const modelFields = (modelNode?.data?.fields || []).filter((f) => !f.primaryKey && f.name);
  const mapping = cfg.mapping || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <ConfigBlock>
        <SectionLabel>Model</SectionLabel>
        {dbNodes.length === 0
          ? <div style={{ fontSize: 12, color: "#4b5563" }}>Connect a Database node to pick a model.</div>
          : <select value={cfg.modelId || ""} onChange={(e) => set({ modelId: e.target.value, mapping: {} })}
              style={{ ...inputStyle, cursor: "pointer" }}>
              <option value="">— select model —</option>
              {dbNodes.map((n) => <option key={n.id} value={n.id}>{n.data.label}</option>)}
            </select>}
      </ConfigBlock>

      {cfg.modelId && (
        <ConfigBlock>
          <SectionLabel>Operation</SectionLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {SAVE_OPS.map((o) => (
              <button key={o.id} onClick={() => set({ saveOp: o.id })}
                style={{ flex: 1, padding: "7px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 500,
                  background: cfg.saveOp === o.id ? "#1e1a3a" : "#1a1d27",
                  color: cfg.saveOp === o.id ? "#c4b5fd" : "#6b7280",
                  outline: cfg.saveOp === o.id ? "1px solid #7c3aed44" : "none" }}>
                {o.label}
              </button>
            ))}
          </div>
        </ConfigBlock>
      )}

      {cfg.modelId && modelFields.length > 0 && (
        <ConfigBlock>
          <SectionLabel>Field mapping</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {modelFields.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 120, flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: "#d1d5db", fontFamily: "monospace", fontWeight: 500 }}>{f.name}</div>
                  <div style={{ fontSize: 10, color: "#374151" }}>{f.type}{f.required ? " · required" : ""}</div>
                </div>
                <div style={{ color: "#2e303a", fontSize: 12, flexShrink: 0 }}>←</div>
                <ValueSource
                  value={mapping[f.name] || { mode: "static", val: "" }}
                  upstreamFieldList={upstreamFieldList}
                  onChange={(v) => set({ mapping: { ...mapping, [f.name]: v } })}
                />
              </div>
            ))}
          </div>
        </ConfigBlock>
      )}
    </div>
  );
}

function GeneralEditor({ data, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={labelStyle}>Description</label>
        <textarea value={data.description || ""} onChange={(e) => onChange({ ...data, description: e.target.value })}
          placeholder="What does this node do?" rows={3}
          style={{ width: "100%", background: "#0f1117", border: "1px solid #2e303a", borderRadius: 6, padding: "8px 10px", color: "#f3f4f6", fontSize: 12, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
      </div>
      <div>
        <label style={labelStyle}>Tags</label>
        <input value={data.tags || ""} onChange={(e) => onChange({ ...data, tags: e.target.value })}
          placeholder="e.g. auth, api, middleware"
          style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
      </div>
      <div>
        <label style={labelStyle}>Notes</label>
        <textarea value={data.notes || ""} onChange={(e) => onChange({ ...data, notes: e.target.value })}
          placeholder="Any additional notes..." rows={2}
          style={{ width: "100%", background: "#0f1117", border: "1px solid #2e303a", borderRadius: 6, padding: "8px 10px", color: "#9ca3af", fontSize: 12, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
      </div>
    </div>
  );
}

export default function NodeConfigModal({ node, onClose, onSave, allNodes = [], edges = [] }) {
  const [data, setData] = useState(node.data || {});
  const isDb = node.type === "db";
  const isEndpoint = node.type === "endpoint";
  const isLogic = node.type === "logic";

  const modalWidth = isDb ? 780 : isLogic ? 600 : isEndpoint ? 560 : 480;
  const typeLabel = isDb ? "Database Node" : isEndpoint ? "Endpoint Node" : isLogic ? "Logic Node" : "Node";

  const save = () => { onSave(node.id, data); onClose(); };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#111318", border: "1px solid #2e303a", borderRadius: 12, width: modalWidth, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 32px 64px rgba(0,0,0,0.6)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e2030", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <input value={data.label || ""} onChange={(e) => setData({ ...data, label: e.target.value })}
              style={{ background: "none", border: "none", outline: "none", color: "#f3f4f6", fontSize: 16, fontWeight: 600, width: "100%" }}
              placeholder="Node name" />
            <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>{typeLabel}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 4 }}>
            <X size={16} color="#4b5563" strokeWidth={1.8} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {isDb && <DbSchemaEditor data={data} onChange={setData} allNodes={allNodes} edges={edges} nodeId={node.id} />}
          {isEndpoint && <EndpointEditor data={data} onChange={setData} allNodes={allNodes} edges={edges} nodeId={node.id} />}
          {isLogic && <LogicEditor data={data} onChange={setData} allNodes={allNodes} edges={edges} nodeId={node.id} />}
          {!isDb && !isEndpoint && !isLogic && <GeneralEditor data={data} onChange={setData} />}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #1e2030", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: "7px 16px", borderRadius: 6, border: "1px solid #2e303a", background: "none", color: "#6b7280", fontSize: 12, cursor: "pointer" }}>Cancel</button>
          <button onClick={save} style={{ padding: "7px 16px", borderRadius: 6, border: "none", background: "#7c3aed", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>Save</button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  background: "#0f1117", border: "1px solid #2e303a", borderRadius: 5,
  padding: "5px 7px", color: "#f3f4f6", fontSize: 11, outline: "none",
  width: "100%", boxSizing: "border-box", minWidth: 0,
};

const taStyle = {
  width: "100%", background: "#0f1117", border: "1px solid #2e303a", borderRadius: 6,
  padding: "8px 10px", color: "#f3f4f6", fontSize: 11, outline: "none",
  resize: "vertical", boxSizing: "border-box",
};

const delBtn = {
  background: "none", border: "none", cursor: "pointer", display: "flex", padding: 2, flexShrink: 0,
};

const addRowBtn = {
  padding: "7px", background: "#1e2030", border: "1px dashed #2e303a", borderRadius: 6,
  color: "#6b7280", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center",
  justifyContent: "center", gap: 6,
};

const labelStyle = {
  display: "block", fontSize: 10, color: "#4b5563", fontWeight: 600,
  textTransform: "uppercase", letterSpacing: 1, marginBottom: 6,
};
