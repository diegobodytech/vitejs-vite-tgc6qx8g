import { useState, useEffect, useCallback } from "react";

// ── SUPABASE CONFIG ────────────────────────────────────────────
const SUPABASE_URL = "https://dcxjqhiimcldtlfzhaka.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjeGpxaGlpbWNsZHRsZnpoYWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzAwNjcsImV4cCI6MjA5NzcwNjA2N30.tQKRm8mNBbCbnPgbXhB2Ju5HnGR-CB8XQOov4m82W4k";

async function supabase(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation",
      ...options.headers
    },
    ...options
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

const sb = {
  get: (table, query = "") => supabase(`${table}?${query}`),
  post: (table, body) => supabase(table, { method: "POST", body: JSON.stringify(body) }),
  patch: (table, query, body) => supabase(`${table}?${query}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (table, query) => supabase(`${table}?${query}`, { method: "DELETE", prefer: "return=minimal" }),
};

// ── ETAPAS CONFIG ──────────────────────────────────────────────
const ETAPAS = [
  { key: "Prospección",    color: "#4F46E5", light: "#EEF2FF", table: "prospeccion" },
  { key: "Acercamiento",   color: "#0891B2", light: "#ECFEFF", table: "acercamiento" },
  { key: "Agendamiento",   color: "#7C3AED", light: "#F5F3FF", table: "agendamiento" },
  { key: "Cotización",     color: "#0F766E", light: "#F0FDFA", table: "cotizacion" },
  { key: "Oferta",         color: "#B45309", light: "#FFFBEB", table: "oferta" },
  { key: "Implementación", color: "#B91C1C", light: "#FEF2F2", table: "implementacion" },
  { key: "Lanzamiento",    color: "#15803D", light: "#F0FDF4", table: "lanzamiento" },
];

// ── STYLES ─────────────────────────────────────────────────────
const S = {
  app: { fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh", background: "#F8FAFC", color: "#0F172A" },
  sidebar: { width: 220, minHeight: "100vh", background: "#0F172A", display: "flex", flexDirection: "column", padding: "24px 0", position: "fixed", top: 0, left: 0 },
  sidebarLogo: { padding: "0 20px 24px", borderBottom: "1px solid #1E293B", marginBottom: 8 },
  sidebarTitle: { fontSize: 15, fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.3px" },
  sidebarSub: { fontSize: 11, color: "#64748B", marginTop: 2 },
  navItem: (active) => ({ display: "flex", alignItems: "center", gap: 10, padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#F8FAFC" : "#94A3B8", background: active ? "#1E293B" : "transparent", borderLeft: active ? "3px solid #4F46E5" : "3px solid transparent", transition: "all 0.15s" }),
  main: { marginLeft: 220, padding: "28px 32px", minHeight: "100vh" },
  pageTitle: { fontSize: 22, fontWeight: 700, color: "#0F172A", marginBottom: 4 },
  pageSub: { fontSize: 13, color: "#64748B", marginBottom: 24 },
  card: { background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: 20, marginBottom: 16 },
  btn: (variant = "primary") => ({
    padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 0.15s",
    background: variant === "primary" ? "#4F46E5" : variant === "danger" ? "#DC2626" : variant === "ghost" ? "transparent" : "#F1F5F9",
    color: variant === "primary" ? "#fff" : variant === "danger" ? "#fff" : variant === "ghost" ? "#64748B" : "#374151",
    border: variant === "ghost" ? "1px solid #E2E8F0" : "none"
  }),
  badge: (color, light) => ({ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: light, color: color }),
  input: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff", color: "#0F172A" },
  label: { fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 4, display: "block" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 },
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" },
  modalBox: { background: "#fff", borderRadius: 16, padding: 28, width: "90%", maxWidth: 620, maxHeight: "85vh", overflowY: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748B", borderBottom: "1px solid #E2E8F0", textTransform: "uppercase", letterSpacing: "0.05em" },
  td: { padding: "12px 14px", borderBottom: "1px solid #F1F5F9", color: "#374151" },
  stat: { background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: "20px 24px" },
  statNum: { fontSize: 32, fontWeight: 800, color: "#0F172A", lineHeight: 1 },
  statLabel: { fontSize: 12, color: "#64748B", marginTop: 6 },
  pipelineCol: { minWidth: 200, background: "#F8FAFC", borderRadius: 12, padding: 12, flex: "0 0 200px" },
  dealCard: { background: "#fff", borderRadius: 8, padding: 12, marginBottom: 8, border: "1px solid #E2E8F0", cursor: "pointer" },
  select: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, outline: "none", background: "#fff", boxSizing: "border-box", color: "#0F172A" },
  alert: (type) => ({ padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 12, background: type === "error" ? "#FEF2F2" : "#F0FDF4", color: type === "error" ? "#DC2626" : "#15803D", border: `1px solid ${type === "error" ? "#FECACA" : "#BBF7D0"}` }),
};

// ── HELPERS ────────────────────────────────────────────────────
function fmt(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function EtapaBadge({ etapa }) {
  const e = ETAPAS.find(x => x.key === etapa) || ETAPAS[0];
  return <span style={S.badge(e.color, e.light)}>{etapa}</span>;
}

// ── MODAL NUEVA EMPRESA ────────────────────────────────────────
function ModalNuevaEmpresa({ onClose, onSaved, usuarios }) {
  const [form, setForm] = useState({ nit: "", razon_social: "", subsegmento: "", kam_id: "", nombre_contacto: "", cargo_contacto: "", correo_contacto: "", telefono_contacto: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const kams = usuarios.filter(u => u.roles?.nombre === "KAM");

  async function guardar() {
    if (!form.nit || !form.razon_social || !form.kam_id) { setMsg({ type: "error", text: "NIT, Razón Social y KAM son obligatorios." }); return; }
    setLoading(true);
    try {
      // Cruce contra Plan de Cuentas
      const planCuentas = await sb.get("plan_de_cuentas", `nit=eq.${form.nit}`);
      if (planCuentas.length > 0) {
        setMsg({ type: "error", text: `⚠️ La empresa con NIT ${form.nit} ya existe en el Plan de Cuentas. No se puede registrar como prospecto.` });
        setLoading(false);
        return;
      }
      const [emp] = await sb.post("empresas", { nit: form.nit, razon_social: form.razon_social, subsegmento: form.subsegmento, kam_id: form.kam_id, etapa_actual: "Prospección" });
      await sb.post("prospeccion", { empresa_id: emp.id, nombre_contacto: form.nombre_contacto, cargo_contacto: form.cargo_contacto, correo_contacto: form.correo_contacto, telefono_contacto: form.telefono_contacto });
      await sb.post("historial", { empresa_id: emp.id, nit: emp.nit, razon_social: emp.razon_social, subsegmento: emp.subsegmento, cambio: "Creación → Prospección", usuario_email: "sistema", nota: JSON.stringify(form) });
      onSaved();
    } catch (e) {
      setMsg({ type: "error", text: e.message.includes("unique") ? "Este NIT ya existe en el sistema." : e.message });
    }
    setLoading(false);
  }

  return (
    <div style={S.modal} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modalBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div><div style={{ fontSize: 17, fontWeight: 700 }}>Nueva Empresa</div><div style={{ fontSize: 12, color: "#64748B" }}>Registrar nuevo prospecto</div></div>
          <button style={S.btn("ghost")} onClick={onClose}>✕</button>
        </div>
        {msg && <div style={S.alert(msg.type)}>{msg.text}</div>}
        <div style={{ marginBottom: 16 }}>
          <div style={S.grid2}>
            <div><label style={S.label}>NIT *</label><input style={S.input} value={form.nit} onChange={e => setForm(p => ({ ...p, nit: e.target.value }))} placeholder="900123456-7" /></div>
            <div><label style={S.label}>Razón Social *</label><input style={S.input} value={form.razon_social} onChange={e => setForm(p => ({ ...p, razon_social: e.target.value }))} placeholder="Empresa S.A.S" /></div>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={S.grid2}>
            <div><label style={S.label}>Subsegmento</label><input style={S.input} value={form.subsegmento} onChange={e => setForm(p => ({ ...p, subsegmento: e.target.value }))} placeholder="Employee Benefits" /></div>
            <div><label style={S.label}>KAM Asignado *</label>
              <select style={S.select} value={form.kam_id} onChange={e => setForm(p => ({ ...p, kam_id: e.target.value }))}>
                <option value="">Seleccionar KAM...</option>
                {kams.map(k => <option key={k.id} value={k.id}>{k.nombre}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 10, paddingTop: 10, borderTop: "1px solid #F1F5F9" }}>CONTACTO INICIAL</div>
        <div style={S.grid2}>
          <div><label style={S.label}>Nombre Completo</label><input style={S.input} value={form.nombre_contacto} onChange={e => setForm(p => ({ ...p, nombre_contacto: e.target.value }))} /></div>
          <div><label style={S.label}>Cargo</label><input style={S.input} value={form.cargo_contacto} onChange={e => setForm(p => ({ ...p, cargo_contacto: e.target.value }))} /></div>
          <div><label style={S.label}>Correo</label><input style={S.input} value={form.correo_contacto} onChange={e => setForm(p => ({ ...p, correo_contacto: e.target.value }))} /></div>
          <div><label style={S.label}>Teléfono</label><input style={S.input} value={form.telefono_contacto} onChange={e => setForm(p => ({ ...p, telefono_contacto: e.target.value }))} /></div>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button style={S.btn("ghost")} onClick={onClose}>Cancelar</button>
          <button style={S.btn()} onClick={guardar} disabled={loading}>{loading ? "Guardando..." : "Registrar Empresa"}</button>
        </div>
      </div>
    </div>
  );
}

// ── MODAL DETALLE EMPRESA ──────────────────────────────────────
function ModalDetalle({ empresa, onClose, onMoved }) {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    sb.get("historial", `empresa_id=eq.${empresa.id}&order=fecha_cambio.desc`).then(setHistorial);
  }, [empresa.id]);

  const etapaActual = ETAPAS.find(e => e.key === empresa.etapa_actual);
  const etapaIdx = ETAPAS.findIndex(e => e.key === empresa.etapa_actual);
  const siguienteEtapa = ETAPAS[etapaIdx + 1];

  async function moverSiguiente() {
    if (!siguienteEtapa) return;
    setLoading(true);
    try {
      const tablaDestino = siguienteEtapa.table;
      await sb.post(tablaDestino, { empresa_id: empresa.id });
      await sb.patch("empresas", `id=eq.${empresa.id}`, { etapa_actual: siguienteEtapa.key, updated_at: new Date().toISOString() });
      await sb.post("historial", { empresa_id: empresa.id, nit: empresa.nit, razon_social: empresa.razon_social, subsegmento: empresa.subsegmento, cambio: `${empresa.etapa_actual} → ${siguienteEtapa.key}`, usuario_email: "usuario_actual", nota: `Movido manualmente a ${siguienteEtapa.key}` });
      setMsg({ type: "ok", text: `✅ Empresa movida a ${siguienteEtapa.key}` });
      onMoved();
    } catch (e) {
      setMsg({ type: "error", text: e.message });
    }
    setLoading(false);
  }

  return (
    <div style={S.modal} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modalBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{empresa.razon_social}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>NIT: {empresa.nit} · {empresa.subsegmento || "Sin subsegmento"}</div>
            <div style={{ marginTop: 8 }}><EtapaBadge etapa={empresa.etapa_actual} /></div>
          </div>
          <button style={S.btn("ghost")} onClick={onClose}>✕</button>
        </div>

        {msg && <div style={S.alert(msg.type)}>{msg.text}</div>}

        {/* Pipeline visual */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
          {ETAPAS.map((e, i) => (
            <div key={e.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: empresa.etapa_actual === e.key ? e.color : "#F1F5F9", color: empresa.etapa_actual === e.key ? "#fff" : etapaIdx > i ? e.color : "#94A3B8", border: `1px solid ${empresa.etapa_actual === e.key ? e.color : etapaIdx > i ? e.light : "#E2E8F0"}` }}>{e.key}</div>
              {i < ETAPAS.length - 1 && <div style={{ color: "#CBD5E1", fontSize: 14 }}>›</div>}
            </div>
          ))}
        </div>

        {/* KAM info */}
        <div style={{ ...S.card, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", marginBottom: 6 }}>KAM ASIGNADO</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{empresa.usuarios?.nombre || "—"}</div>
          <div style={{ fontSize: 12, color: "#64748B" }}>{empresa.usuarios?.email || "—"}</div>
        </div>

        {/* Mover etapa */}
        {siguienteEtapa && (
          <div style={{ background: siguienteEtapa.light, borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: siguienteEtapa.color }}>SIGUIENTE ETAPA</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{siguienteEtapa.key}</div>
            </div>
            <button style={{ ...S.btn(), background: siguienteEtapa.color }} onClick={moverSiguiente} disabled={loading}>
              {loading ? "Moviendo..." : `Mover a ${siguienteEtapa.key} →`}
            </button>
          </div>
        )}

        {/* Historial */}
        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 8 }}>HISTORIAL DE MOVIMIENTOS</div>
        {historial.length === 0 ? (
          <div style={{ color: "#94A3B8", fontSize: 13, padding: 12 }}>Sin movimientos registrados aún.</div>
        ) : (
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {historial.map(h => (
              <div key={h.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #F1F5F9" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4F46E5", marginTop: 5, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{h.cambio}</div>
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>{fmt(h.fecha_cambio)} · {h.usuario_email}</div>
                  {h.nota && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2, wordBreak: "break-all" }}>{h.nota.length > 120 ? h.nota.slice(0, 120) + "..." : h.nota}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── VISTA: DASHBOARD ───────────────────────────────────────────
function Dashboard({ empresas, usuarios }) {
  const totalEmpresas = empresas.length;
  const kams = usuarios.filter(u => u.roles?.nombre === "KAM").length;
  const porEtapa = ETAPAS.map(e => ({ ...e, count: empresas.filter(x => x.etapa_actual === e.key).length }));
  const recientes = [...empresas].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);

  return (
    <div>
      <div style={S.pageTitle}>Dashboard</div>
      <div style={{ ...S.pageSub }}>Resumen del pipeline comercial</div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <div style={S.stat}><div style={S.statNum}>{totalEmpresas}</div><div style={S.statLabel}>Total Empresas</div></div>
        <div style={S.stat}><div style={S.statNum}>{kams}</div><div style={S.statLabel}>KAMs Activos</div></div>
        <div style={S.stat}><div style={{ ...S.statNum, color: "#4F46E5" }}>{porEtapa[0]?.count || 0}</div><div style={S.statLabel}>En Prospección</div></div>
        <div style={S.stat}><div style={{ ...S.statNum, color: "#15803D" }}>{porEtapa[6]?.count || 0}</div><div style={S.statLabel}>En Lanzamiento</div></div>
      </div>

      {/* Pipeline por etapa */}
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Pipeline por Etapa</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {porEtapa.map(e => (
            <div key={e.key} style={{ flex: "1 1 120px", background: e.light, borderRadius: 10, padding: 14, textAlign: "center", border: `1px solid ${e.color}22` }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: e.color }}>{e.count}</div>
              <div style={{ fontSize: 11, color: e.color, fontWeight: 600, marginTop: 4 }}>{e.key}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recientes */}
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Empresas Recientes</div>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Empresa</th><th style={S.th}>NIT</th><th style={S.th}>Subsegmento</th><th style={S.th}>Etapa</th><th style={S.th}>Registro</th></tr></thead>
          <tbody>
            {recientes.map(e => (
              <tr key={e.id}>
                <td style={S.td}><div style={{ fontWeight: 500 }}>{e.razon_social}</div></td>
                <td style={S.td}>{e.nit}</td>
                <td style={S.td}>{e.subsegmento || "—"}</td>
                <td style={S.td}><EtapaBadge etapa={e.etapa_actual} /></td>
                <td style={S.td}>{fmt(e.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── VISTA: PIPELINE ────────────────────────────────────────────
function Pipeline({ empresas, onSelect }) {
  return (
    <div>
      <div style={S.pageTitle}>Pipeline Comercial</div>
      <div style={S.pageSub}>Vista Kanban — haz clic en una empresa para ver detalles o moverla</div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 }}>
        {ETAPAS.map(etapa => {
          const items = empresas.filter(e => e.etapa_actual === etapa.key);
          return (
            <div key={etapa.key} style={{ ...S.pipelineCol, borderTop: `3px solid ${etapa.color}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: etapa.color }}>{etapa.key}</div>
                <div style={{ ...S.badge(etapa.color, etapa.light), fontSize: 10 }}>{items.length}</div>
              </div>
              {items.length === 0 && <div style={{ color: "#CBD5E1", fontSize: 12, padding: "12px 0", textAlign: "center" }}>Sin empresas</div>}
              {items.map(emp => (
                <div key={emp.id} style={S.dealCard} onClick={() => onSelect(emp)}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", marginBottom: 4 }}>{emp.razon_social}</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>NIT: {emp.nit}</div>
                  {emp.subsegmento && <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>{emp.subsegmento}</div>}
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>{emp.usuarios?.nombre || "—"}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── VISTA: EMPRESAS ────────────────────────────────────────────
function Empresas({ empresas, onSelect, onNueva }) {
  const [buscar, setBuscar] = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState("");

  const filtradas = empresas.filter(e => {
    const matchBuscar = !buscar || e.razon_social.toLowerCase().includes(buscar.toLowerCase()) || e.nit.includes(buscar);
    const matchEtapa = !filtroEtapa || e.etapa_actual === filtroEtapa;
    return matchBuscar && matchEtapa;
  });

  function exportarCSV() {
    const headers = ["NIT", "Razon Social", "Subsegmento", "KAM", "Etapa", "Fecha Registro"];
    const rows = filtradas.map(e => [e.nit, e.razon_social, e.subsegmento || "", e.usuarios?.nombre || "", e.etapa_actual, fmt(e.created_at)]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "empresas_crm.csv"; a.click();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div><div style={S.pageTitle}>Empresas</div><div style={S.pageSub}>{filtradas.length} empresa{filtradas.length !== 1 ? "s" : ""} encontrada{filtradas.length !== 1 ? "s" : ""}</div></div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={S.btn("ghost")} onClick={exportarCSV}>↓ Exportar CSV</button>
          <button style={S.btn()} onClick={onNueva}>+ Nueva Empresa</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input style={{ ...S.input, maxWidth: 280 }} placeholder="Buscar por nombre o NIT..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        <select style={{ ...S.select, maxWidth: 200 }} value={filtroEtapa} onChange={e => setFiltroEtapa(e.target.value)}>
          <option value="">Todas las etapas</option>
          {ETAPAS.map(e => <option key={e.key} value={e.key}>{e.key}</option>)}
        </select>
      </div>

      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={S.th}>Razón Social</th>
              <th style={S.th}>NIT</th>
              <th style={S.th}>Subsegmento</th>
              <th style={S.th}>KAM</th>
              <th style={S.th}>Etapa</th>
              <th style={S.th}>Registro</th>
              <th style={S.th}></th>
            </tr>
          </thead>
          <tbody>
            {filtradas.length === 0 && (
              <tr><td colSpan={7} style={{ ...S.td, textAlign: "center", color: "#94A3B8", padding: 32 }}>No se encontraron empresas</td></tr>
            )}
            {filtradas.map(e => (
              <tr key={e.id} style={{ cursor: "pointer" }} onClick={() => onSelect(e)}>
                <td style={S.td}><div style={{ fontWeight: 500 }}>{e.razon_social}</div></td>
                <td style={S.td}>{e.nit}</td>
                <td style={S.td}>{e.subsegmento || "—"}</td>
                <td style={S.td}>{e.usuarios?.nombre || "—"}</td>
                <td style={S.td}><EtapaBadge etapa={e.etapa_actual} /></td>
                <td style={S.td}>{fmt(e.created_at)}</td>
                <td style={S.td}><button style={S.btn("ghost")} onClick={ev => { ev.stopPropagation(); onSelect(e); }}>Ver →</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── VISTA: HISTORIAL ───────────────────────────────────────────
function Historial() {
  const [hist, setHist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb.get("historial", "order=fecha_cambio.desc&limit=100").then(data => { setHist(data); setLoading(false); });
  }, []);

  function exportarCSV() {
    const headers = ["NIT", "Razon Social", "Subsegmento", "Fecha Cambio", "Cambio", "Usuario", "Nota"];
    const rows = hist.map(h => [h.nit, h.razon_social, h.subsegmento || "", fmt(h.fecha_cambio), h.cambio, h.usuario_email, h.nota || ""]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "historial_crm.csv"; a.click();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div><div style={S.pageTitle}>Historial</div><div style={S.pageSub}>Registro completo de todos los movimientos</div></div>
        <button style={S.btn("ghost")} onClick={exportarCSV}>↓ Exportar CSV</button>
      </div>
      <div style={S.card}>
        {loading ? <div style={{ color: "#94A3B8", padding: 20 }}>Cargando...</div> : (
          <table style={S.table}>
            <thead><tr><th style={S.th}>Empresa</th><th style={S.th}>NIT</th><th style={S.th}>Cambio</th><th style={S.th}>Usuario</th><th style={S.th}>Fecha</th></tr></thead>
            <tbody>
              {hist.map(h => (
                <tr key={h.id}>
                  <td style={S.td}><div style={{ fontWeight: 500 }}>{h.razon_social}</div><div style={{ fontSize: 11, color: "#94A3B8" }}>{h.subsegmento}</div></td>
                  <td style={S.td}>{h.nit}</td>
                  <td style={S.td}><span style={{ background: "#EEF2FF", color: "#4F46E5", padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 500 }}>{h.cambio}</span></td>
                  <td style={S.td}>{h.usuario_email}</td>
                  <td style={S.td}>{fmt(h.fecha_cambio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── VISTA: USUARIOS ────────────────────────────────────────────
function Usuarios({ usuarios, onRefresh }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nombre: "", email: "", rol_id: "" });
  const [roles, setRoles] = useState([]);
  const [msg, setMsg] = useState(null);

  useEffect(() => { sb.get("roles").then(setRoles); }, []);

  async function guardar() {
    if (!form.nombre || !form.email || !form.rol_id) { setMsg({ type: "error", text: "Todos los campos son obligatorios." }); return; }
    try {
      await sb.post("usuarios", form);
      setModal(false); setForm({ nombre: "", email: "", rol_id: "" }); onRefresh();
    } catch (e) {
      setMsg({ type: "error", text: e.message.includes("unique") ? "Este correo ya está registrado." : e.message });
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div><div style={S.pageTitle}>Usuarios</div><div style={S.pageSub}>Gestión de KAMs y roles del sistema</div></div>
        <button style={S.btn()} onClick={() => setModal(true)}>+ Nuevo Usuario</button>
      </div>
      <div style={S.card}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Nombre</th><th style={S.th}>Email</th><th style={S.th}>Rol</th><th style={S.th}>Estado</th></tr></thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id}>
                <td style={S.td}><div style={{ fontWeight: 500 }}>{u.nombre}</div></td>
                <td style={S.td}>{u.email}</td>
                <td style={S.td}><span style={{ background: "#EEF2FF", color: "#4F46E5", padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 500 }}>{u.roles?.nombre || "—"}</span></td>
                <td style={S.td}><span style={{ background: u.activo ? "#F0FDF4" : "#FEF2F2", color: u.activo ? "#15803D" : "#DC2626", padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 500 }}>{u.activo ? "Activo" : "Inactivo"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <div style={S.modal} onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div style={{ ...S.modalBox, maxWidth: 420 }}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 16 }}>Nuevo Usuario</div>
            {msg && <div style={S.alert(msg.type)}>{msg.text}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div><label style={S.label}>Nombre completo</label><input style={S.input} value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} /></div>
              <div><label style={S.label}>Correo electrónico</label><input style={S.input} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
              <div><label style={S.label}>Rol</label>
                <select style={S.select} value={form.rol_id} onChange={e => setForm(p => ({ ...p, rol_id: e.target.value }))}>
                  <option value="">Seleccionar rol...</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
              <button style={S.btn("ghost")} onClick={() => setModal(false)}>Cancelar</button>
              <button style={S.btn()} onClick={guardar}>Crear Usuario</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── APP PRINCIPAL ──────────────────────────────────────────────
export default function App() {
  const [vista, setVista] = useState("dashboard");
  const [empresas, setEmpresas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalNueva, setModalNueva] = useState(false);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState(null);

  const cargarDatos = useCallback(async () => {
    try {
      const [emps, usrs] = await Promise.all([
        sb.get("empresas", "select=*,usuarios(nombre,email,roles(nombre))&order=created_at.desc"),
        sb.get("usuarios", "select=*,roles(nombre)&activo=eq.true"),
      ]);
      setEmpresas(emps);
      setUsuarios(usrs);
      setError(null);
    } catch (e) {
      setError("No se pudo conectar con la base de datos. Verifica la configuración de Supabase.");
    }
    setLoading(false);
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const NAV = [
    { key: "dashboard", icon: "◉", label: "Dashboard" },
    { key: "pipeline", icon: "⊞", label: "Pipeline" },
    { key: "empresas", icon: "☰", label: "Empresas" },
    { key: "historial", icon: "◷", label: "Historial" },
    { key: "usuarios", icon: "◎", label: "Usuarios" },
  ];

  return (
    <div style={S.app}>
      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={S.sidebarLogo}>
          <div style={S.sidebarTitle}>CRM Comercial</div>
          <div style={S.sidebarSub}>Pipeline · Prospección</div>
        </div>
        {NAV.map(n => (
          <div key={n.key} style={S.navItem(vista === n.key)} onClick={() => setVista(n.key)}>
            <span style={{ fontSize: 15 }}>{n.icon}</span>
            <span>{n.label}</span>
          </div>
        ))}
        <div style={{ marginTop: "auto", padding: "16px 20px", borderTop: "1px solid #1E293B" }}>
          <div style={{ fontSize: 11, color: "#475569" }}>Conectado a Supabase</div>
          <div style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>dcxjqhiimcld...</div>
        </div>
      </div>

      {/* Main */}
      <div style={S.main}>
        {loading && <div style={{ color: "#64748B", padding: 40, textAlign: "center" }}>Cargando datos...</div>}
        {error && <div style={S.alert("error")}>{error}</div>}
        {!loading && !error && (
          <>
            {vista === "dashboard" && <Dashboard empresas={empresas} usuarios={usuarios} />}
            {vista === "pipeline" && <Pipeline empresas={empresas} onSelect={setEmpresaSeleccionada} />}
            {vista === "empresas" && <Empresas empresas={empresas} onSelect={setEmpresaSeleccionada} onNueva={() => setModalNueva(true)} />}
            {vista === "historial" && <Historial />}
            {vista === "usuarios" && <Usuarios usuarios={usuarios} onRefresh={cargarDatos} />}
          </>
        )}
      </div>

      {/* Modales */}
      {modalNueva && <ModalNuevaEmpresa onClose={() => setModalNueva(false)} onSaved={() => { setModalNueva(false); cargarDatos(); }} usuarios={usuarios} />}
      {empresaSeleccionada && <ModalDetalle empresa={empresaSeleccionada} onClose={() => setEmpresaSeleccionada(null)} onMoved={() => { setEmpresaSeleccionada(null); cargarDatos(); }} />}
    </div>
  );
}
