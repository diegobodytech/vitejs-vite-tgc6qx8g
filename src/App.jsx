import { useState, useEffect, useCallback } from "react";

// ── SUPABASE CONFIG ────────────────────────────────────────────
const SUPABASE_URL = "https://dcxjqhiimcldtlfzhaka.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjeGpxaGlpbWNsZHRsZnpoYWthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzAwNjcsImV4cCI6MjA5NzcwNjA2N30.tQKRm8mNBbCbnPgbXhB2Ju5HnGR-CB8XQOov4m82W4k";

const SUBSEGMENTOS = ["Employee Benefits", "Affinity", "Protección Social", "Sedes Corporativas"];

// ── SUPABASE FETCH ─────────────────────────────────────────────
async function supabase(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${options.token || SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "return=representation",
      ...options.headers
    },
    ...options
  });
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ── SUPABASE AUTH ──────────────────────────────────────────────
const auth = {
  signIn: async (email, password) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.msg || "Error al iniciar sesión");
    return data;
  },
  signOut: async (token) => {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` }
    });
  },
  getUser: async (token) => {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) return null;
    return res.json();
  }
};

const sb = {
  get:    (table, query = "") => supabase(`${table}?${query}`),
  post:   (table, body)       => supabase(table, { method: "POST", body: JSON.stringify(body) }),
  patch:  (table, query, body)=> supabase(`${table}?${query}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (table, query)      => supabase(`${table}?${query}`, { method: "DELETE", prefer: "return=minimal" }),
};

// ── NOTIFICACIONES DINÁMICAS ───────────────────────────────────
async function obtenerLiderSubsegmento(subsegmento) {
  try {
    const todos = await sb.get("usuarios", "select=nombre,email,subsegmento,roles(nombre)&activo=eq.true");
    return todos.filter(u => u.roles?.nombre === "Lider Subsegmento" && u.subsegmento && u.subsegmento.includes(subsegmento));
  } catch(e) { return []; }
}

async function obtenerUsuarioConRol(rolNombre) {
  try {
    const todos = await sb.get("usuarios", "select=nombre,email,roles(nombre)&activo=eq.true");
    return todos.filter(u => u.roles?.nombre === rolNombre);
  } catch(e) { return []; }
}

async function encolarNotificacion(etapa, nit, razon_social) {
  try {
    await sb.post("cola_correos", { etapa, nit, razon_social, estado: "Pendiente" });
  } catch(e) { console.error("Error encolando notificación", e); }
}

async function notificarLiderSubsegmento(subsegmento, nit, razon_social) {
  const lideres = await obtenerLiderSubsegmento(subsegmento);
  for (const l of lideres) await encolarNotificacion(`Nuevo Lead - ${subsegmento} - ${l.email}`, nit, razon_social);
}

async function notificarPorRol(rol, etapa, nit, razon_social) {
  const usuarios = await obtenerUsuarioConRol(rol);
  for (const u of usuarios) await encolarNotificacion(`${etapa} - ${u.email}`, nit, razon_social);
}

// ── ETAPAS ─────────────────────────────────────────────────────
const ETAPAS = [
  { key: "Prospección",    color: "#4F46E5", light: "#EEF2FF", table: "prospeccion" },
  { key: "Acercamiento",   color: "#0891B2", light: "#ECFEFF", table: "acercamiento" },
  { key: "Agendamiento",   color: "#7C3AED", light: "#F5F3FF", table: "agendamiento" },
  { key: "Cotización",     color: "#0F766E", light: "#F0FDFA", table: "cotizacion" },
  { key: "Oferta",         color: "#B45309", light: "#FFFBEB", table: "oferta" },
  { key: "Implementación", color: "#B91C1C", light: "#FEF2F2", table: "implementacion" },
  { key: "Lanzamiento",    color: "#15803D", light: "#F0FDF4", table: "lanzamiento" },
];

// ── CAMPOS OBLIGATORIOS POR ETAPA ─────────────────────────────
const CAMPOS_REQUERIDOS = {
  "Acercamiento": [
    { key: "nombre_contacto",   label: "Nombre Completo del Contacto" },
    { key: "cargo_contacto",    label: "Cargo del Contacto" },
    { key: "correo_contacto",   label: "Correo Electrónico del Contacto" },
    { key: "telefono_contacto", label: "Número de Teléfono del Contacto" },
  ],
  "Agendamiento": [
    { key: "nombre_contacto",       label: "Nombre Completo del Contacto" },
    { key: "cargo_contacto",        label: "Cargo del Contacto" },
    { key: "correo_contacto",       label: "Correo Electrónico del Contacto" },
    { key: "telefono_contacto",     label: "Número de Teléfono del Contacto" },
    { key: "firma_habeas_data",     label: "Firma HABEAS DATA" },
    { key: "industria",             label: "Industria" },
    { key: "sector",                label: "Sector" },
    { key: "tomador_programa",      label: "Tomador del Programa" },
    { key: "grupo_objetivo",        label: "Grupo Objetivo" },
    { key: "vinculo_relacional",    label: "Vínculo Relacional" },
    { key: "ciudad_principal",      label: "Ciudad Principal" },
    { key: "sucursales",            label: "Sucursales" },
    { key: "tamano_universo",       label: "Tamaño Universo" },
    { key: "tamano_grupo_objetivo", label: "Tamaño Grupo Objetivo" },
    { key: "tamano_empresa",        label: "Tamaño Empresa" },
    { key: "objetivo_programa",     label: "Objetivo del Programa" },
    { key: "esquema_pago",          label: "Esquema de Pago" },
    { key: "tipo_pago",             label: "Tipo de Pago" },
    { key: "canales_venta",         label: "Canales de Venta" },
    { key: "tipo_adhesion",         label: "Tipo de Adhesión" },
    { key: "rangos_salariales",     label: "Rangos Salariales" },
    { key: "generos",               label: "Géneros" },
    { key: "prevalencias_medicas",  label: "Prevalencias Médicas" },
    { key: "adn_terminado",         label: "ADN Terminado" },
  ],
  "Cotización":     [],
  "Oferta":         [{ key: "link_oferta", label: "Link Oferta" }],
  "Implementación": [
    { key: "link_oferta",   label: "Link Oferta" },
    { key: "link_contrato", label: "Link de Contrato" },
    { key: "link_anexos",   label: "Link de Anexos" },
  ],
  "Lanzamiento": [
    { key: "link_oferta",        label: "Link Oferta" },
    { key: "link_contrato",      label: "Link de Contrato" },
    { key: "link_anexos",        label: "Link de Anexos" },
    { key: "oferta_lanzamiento", label: "Oferta Lanzamiento" },
    { key: "diseno_piezas",      label: "Diseño Piezas" },
    { key: "canales_difusion",   label: "Canales de Difusión" },
    { key: "link_piezas",        label: "Link Piezas" },
  ],
};

const CAMPOS_POR_TABLA = {
  acercamiento:  ["nombre_contacto","cargo_contacto","correo_contacto","telefono_contacto"],
  agendamiento:  ["nombre_contacto","cargo_contacto","correo_contacto","telefono_contacto","firma_habeas_data","industria","sector","tomador_programa","grupo_objetivo","vinculo_relacional","ciudad_principal","sucursales","tamano_universo","tamano_grupo_objetivo","tamano_empresa","objetivo_programa","esquema_pago","tipo_pago","canales_venta","tipo_adhesion","rangos_salariales","generos","prevalencias_medicas","adn_terminado"],
  cotizacion:    [],
  oferta:        ["link_oferta","tamano_grupo_objetivo","esquema_pago","tipo_pago","canales_venta","tipo_adhesion"],
  implementacion:["link_oferta","link_contrato","link_anexos"],
  lanzamiento:   ["link_oferta","link_contrato","link_anexos","oferta_lanzamiento","diseno_piezas","canales_difusion","link_piezas"],
};

function validarCampos(etapaSiguiente, formData) {
  const requeridos = CAMPOS_REQUERIDOS[etapaSiguiente] || [];
  return requeridos.filter(c => !formData[c.key] || formData[c.key] === "" || formData[c.key] === false);
}

// ── PERMISOS POR ROL ───────────────────────────────────────────
function getPermisos(rol, subsegmento) {
  switch(rol) {
    case "KAM": return {
      verDashboard: true, verPipeline: true, verEmpresas: true,
      verHistorial: false, verUsuarios: false,
      soloSuyos: true, soloSubsegmento: null,
      puedeCrearEmpresas: true, puedeMoverEtapas: true,
      etapasEditables: null, puedeCrearUsuarios: false,
      esAdmin: false
    };
    case "Lider Subsegmento": return {
      verDashboard: true, verPipeline: true, verEmpresas: true,
      verHistorial: false, verUsuarios: true,
      soloSuyos: false, soloSubsegmento: subsegmento,
      puedeCrearEmpresas: false, puedeMoverEtapas: false,
      etapasEditables: null, puedeCrearUsuarios: true,
      esAdmin: false
    };
    case "Lider Mercadeo": return {
      verDashboard: false, verPipeline: true, verEmpresas: true,
      verHistorial: false, verUsuarios: false,
      soloSuyos: false, soloSubsegmento: null,
      puedeCrearEmpresas: false, puedeMoverEtapas: true,
      etapasEditables: ["Lanzamiento"], puedeCrearUsuarios: false,
      esAdmin: false
    };
    case "Juridico": return {
      verDashboard: false, verPipeline: true, verEmpresas: true,
      verHistorial: false, verUsuarios: false,
      soloSuyos: false, soloSubsegmento: null,
      puedeCrearEmpresas: false, puedeMoverEtapas: true,
      etapasEditables: ["Implementación", "Lanzamiento"], puedeCrearUsuarios: false,
      esAdmin: false
    };
    case "Lider Planeacion": return {
      verDashboard: true, verPipeline: true, verEmpresas: true,
      verHistorial: true, verUsuarios: true,
      soloSuyos: false, soloSubsegmento: null,
      puedeCrearEmpresas: true, puedeMoverEtapas: true,
      etapasEditables: null, puedeCrearUsuarios: true,
      esAdmin: true
    };
    default: return {
      verDashboard: false, verPipeline: false, verEmpresas: false,
      verHistorial: false, verUsuarios: false,
      soloSuyos: false, soloSubsegmento: null,
      puedeCrearEmpresas: false, puedeMoverEtapas: false,
      etapasEditables: [], puedeCrearUsuarios: false,
      esAdmin: false
    };
  }
}

// ── STYLES ─────────────────────────────────────────────────────
const S = {
  app:         { fontFamily: "'Inter', system-ui, sans-serif", minHeight: "100vh", background: "#F8FAFC", color: "#0F172A" },
  sidebar:     { width: 220, minHeight: "100vh", background: "#0F172A", display: "flex", flexDirection: "column", padding: "24px 0", position: "fixed", top: 0, left: 0 },
  sidebarLogo: { padding: "0 20px 24px", borderBottom: "1px solid #1E293B", marginBottom: 8 },
  sidebarTitle:{ fontSize: 15, fontWeight: 700, color: "#F8FAFC", letterSpacing: "-0.3px" },
  sidebarSub:  { fontSize: 11, color: "#64748B", marginTop: 2 },
  navItem: (active) => ({ display: "flex", alignItems: "center", gap: 10, padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400, color: active ? "#F8FAFC" : "#94A3B8", background: active ? "#1E293B" : "transparent", borderLeft: active ? "3px solid #4F46E5" : "3px solid transparent", transition: "all 0.15s" }),
  main:        { marginLeft: 220, padding: "28px 32px", minHeight: "100vh" },
  pageTitle:   { fontSize: 22, fontWeight: 700, color: "#0F172A", marginBottom: 4 },
  pageSub:     { fontSize: 13, color: "#64748B", marginBottom: 24 },
  card:        { background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: 20, marginBottom: 16 },
  btn: (variant = "primary") => ({ padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.15s", background: variant === "primary" ? "#4F46E5" : variant === "danger" ? "#DC2626" : variant === "ghost" ? "transparent" : "#F1F5F9", color: variant === "primary" ? "#fff" : variant === "danger" ? "#fff" : variant === "ghost" ? "#64748B" : "#374151", border: variant === "ghost" ? "1px solid #E2E8F0" : "none" }),
  badge: (color, light) => ({ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: light, color: color }),
  input:       { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#fff", color: "#0F172A" },
  inputError:  { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #DC2626", fontSize: 13, outline: "none", boxSizing: "border-box", background: "#FEF2F2", color: "#0F172A" },
  label:       { fontSize: 12, fontWeight: 500, color: "#374151", marginBottom: 4, display: "block" },
  labelError:  { fontSize: 12, fontWeight: 500, color: "#DC2626", marginBottom: 4, display: "block" },
  grid2:       { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  grid3:       { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 },
  modal:       { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" },
  modalBox:    { background: "#fff", borderRadius: 16, padding: 28, width: "90%", maxWidth: 680, maxHeight: "88vh", overflowY: "auto" },
  table:       { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th:          { padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "#64748B", borderBottom: "1px solid #E2E8F0", textTransform: "uppercase", letterSpacing: "0.05em" },
  td:          { padding: "12px 14px", borderBottom: "1px solid #F1F5F9", color: "#374151" },
  stat:        { background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: "20px 24px" },
  statNum:     { fontSize: 32, fontWeight: 800, color: "#0F172A", lineHeight: 1 },
  statLabel:   { fontSize: 12, color: "#64748B", marginTop: 6 },
  pipelineCol: { minWidth: 200, background: "#F8FAFC", borderRadius: 12, padding: 12, flex: "0 0 200px" },
  dealCard:    { background: "#fff", borderRadius: 8, padding: 12, marginBottom: 8, border: "1px solid #E2E8F0", cursor: "pointer" },
  select:      { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 13, outline: "none", background: "#fff", boxSizing: "border-box", color: "#0F172A" },
  selectError: { width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #DC2626", fontSize: 13, outline: "none", background: "#FEF2F2", boxSizing: "border-box", color: "#0F172A" },
  alert: (type) => ({ padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 12, background: type === "error" ? "#FEF2F2" : "#F0FDF4", color: type === "error" ? "#DC2626" : "#15803D", border: `1px solid ${type === "error" ? "#FECACA" : "#BBF7D0"}` }),
  section:     { fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 10, paddingTop: 12, borderTop: "1px solid #F1F5F9", textTransform: "uppercase", letterSpacing: "0.05em" },
};

function fmt(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

function EtapaBadge({ etapa }) {
  const e = ETAPAS.find(x => x.key === etapa) || ETAPAS[0];
  return <span style={S.badge(e.color, e.light)}>{etapa}</span>;
}

function Campo({ label, error, children }) {
  return (
    <div>
      <label style={error ? S.labelError : S.label}>{label}{error ? " *" : ""}</label>
      {children}
      {error && <div style={{ fontSize: 11, color: "#DC2626", marginTop: 3 }}>Campo obligatorio</div>}
    </div>
  );
}

// ── PANTALLA DE LOGIN ──────────────────────────────────────────
function Login({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  async function handleLogin() {
    if (!email || !password) { setError("Ingresa tu correo y contraseña."); return; }
    setLoading(true); setError(null);
    try {
      const session = await auth.signIn(email, password);
      onLogin(session);
    } catch(e) {
      setError("Correo o contraseña incorrectos.");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 40, width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A" }}>CRM Comercial</div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 6 }}>Ingresa con tu correo corporativo</div>
        </div>
        {error && <div style={S.alert("error")}>{error}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={S.label}>Correo electrónico</label>
            <input style={S.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nombre@bodytechcorp.com" onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          <div>
            <label style={S.label}>Contraseña</label>
            <input style={S.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === "Enter" && handleLogin()} />
          </div>
          <button style={{ ...S.btn(), width: "100%", padding: "11px", marginTop: 8 }} onClick={handleLogin} disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MODAL CAMPOS ETAPA ─────────────────────────────────────────
function ModalCamposEtapa({ empresa, etapaSiguiente, datosHeredados, onClose, onSaved }) {
  const [form, setForm]     = useState(datosHeredados || {});
  const [errores, setErrores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]       = useState(null);

  function set(key, val) { setForm(p => ({ ...p, [key]: val })); setErrores(p => p.filter(x => x !== key)); }
  function inp(key, placeholder = "") {
    const err = errores.includes(key);
    return <input style={err ? S.inputError : S.input} value={form[key] || ""} onChange={e => set(key, e.target.value)} placeholder={placeholder} />;
  }
  function sel(key, opciones) {
    const err = errores.includes(key);
    return (
      <select style={err ? S.selectError : S.select} value={form[key] || ""} onChange={e => set(key, e.target.value)}>
        <option value="">Seleccionar...</option>
        {opciones.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  async function guardar() {
    const faltantes = validarCampos(etapaSiguiente, form);
    if (faltantes.length > 0) {
      setErrores(faltantes.map(f => f.key));
      setMsg({ type: "error", text: `Faltan ${faltantes.length} campo(s): ${faltantes.map(f => f.label).join(", ")}` });
      return;
    }
    setLoading(true);
    try {
      const tabla = ETAPAS.find(e => e.key === etapaSiguiente)?.table;
      const camposPermitidos = CAMPOS_POR_TABLA[tabla] || [];
      const datosLimpios = camposPermitidos.length > 0
        ? Object.fromEntries(Object.entries(form).filter(([key]) => camposPermitidos.includes(key)))
        : {};

      await sb.post(tabla, { empresa_id: empresa.id, ...datosLimpios });
      await sb.patch("empresas", `id=eq.${empresa.id}`, { etapa_actual: etapaSiguiente, updated_at: new Date().toISOString() });
      await sb.post("historial", { empresa_id: empresa.id, nit: empresa.nit, razon_social: empresa.razon_social, subsegmento: empresa.subsegmento, cambio: `${empresa.etapa_actual} → ${etapaSiguiente}`, usuario_email: "usuario_actual", nota: JSON.stringify(datosLimpios) });

      if (etapaSiguiente === "Cotización")     await notificarPorRol("Lider Planeacion", "Cotización",     empresa.nit, empresa.razon_social);
      if (etapaSiguiente === "Implementación") await notificarPorRol("Juridico",         "Implementación", empresa.nit, empresa.razon_social);
      if (etapaSiguiente === "Lanzamiento")    await notificarPorRol("Lider Mercadeo",   "Lanzamiento",    empresa.nit, empresa.razon_social);

      onSaved();
    } catch(e) {
      setMsg({ type: "error", text: e.message });
    }
    setLoading(false);
  }

  const etapaColor = ETAPAS.find(e => e.key === etapaSiguiente)?.color || "#4F46E5";

  const renderCampos = () => {
    if (etapaSiguiente === "Acercamiento") return (
      <div style={S.grid2}>
        <Campo label="Nombre Completo del Contacto" error={errores.includes("nombre_contacto")}>{inp("nombre_contacto")}</Campo>
        <Campo label="Cargo del Contacto" error={errores.includes("cargo_contacto")}>{inp("cargo_contacto")}</Campo>
        <Campo label="Correo Electrónico" error={errores.includes("correo_contacto")}>{inp("correo_contacto")}</Campo>
        <Campo label="Número de Teléfono" error={errores.includes("telefono_contacto")}>{inp("telefono_contacto")}</Campo>
      </div>
    );
    if (etapaSiguiente === "Agendamiento") return (
      <>
        <div style={S.section}>Contacto</div>
        <div style={S.grid2}>
          <Campo label="Nombre Completo" error={errores.includes("nombre_contacto")}>{inp("nombre_contacto")}</Campo>
          <Campo label="Cargo" error={errores.includes("cargo_contacto")}>{inp("cargo_contacto")}</Campo>
          <Campo label="Correo" error={errores.includes("correo_contacto")}>{inp("correo_contacto")}</Campo>
          <Campo label="Teléfono" error={errores.includes("telefono_contacto")}>{inp("telefono_contacto")}</Campo>
        </div>
        <div style={S.section}>Datos de la Empresa</div>
        <div style={S.grid2}>
          <Campo label="Firma HABEAS DATA" error={errores.includes("firma_habeas_data")}>
            <select style={errores.includes("firma_habeas_data") ? S.selectError : S.select} value={form.firma_habeas_data || ""} onChange={e => set("firma_habeas_data", e.target.value === "true")}>
              <option value="">Seleccionar...</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </Campo>
          <Campo label="Industria" error={errores.includes("industria")}>{inp("industria")}</Campo>
          <Campo label="Sector" error={errores.includes("sector")}>{inp("sector")}</Campo>
          <Campo label="Tomador del Programa" error={errores.includes("tomador_programa")}>{inp("tomador_programa")}</Campo>
          <Campo label="Grupo Objetivo" error={errores.includes("grupo_objetivo")}>{inp("grupo_objetivo")}</Campo>
          <Campo label="Vínculo Relacional" error={errores.includes("vinculo_relacional")}>{inp("vinculo_relacional")}</Campo>
          <Campo label="Ciudad Principal" error={errores.includes("ciudad_principal")}>{inp("ciudad_principal")}</Campo>
          <Campo label="Sucursales" error={errores.includes("sucursales")}>{inp("sucursales")}</Campo>
        </div>
        <div style={S.section}>Tamaños y Objetivos</div>
        <div style={S.grid3}>
          <Campo label="Tamaño Universo" error={errores.includes("tamano_universo")}>{inp("tamano_universo")}</Campo>
          <Campo label="Tamaño Grupo Objetivo" error={errores.includes("tamano_grupo_objetivo")}>{inp("tamano_grupo_objetivo")}</Campo>
          <Campo label="Tamaño Empresa" error={errores.includes("tamano_empresa")}>{sel("tamano_empresa", ["Micro","Pequeña","Mediana","Grande"])}</Campo>
          <Campo label="Objetivo del Programa" error={errores.includes("objetivo_programa")}>{inp("objetivo_programa")}</Campo>
          <Campo label="Esquema de Pago" error={errores.includes("esquema_pago")}>{sel("esquema_pago", ["Colectivo","Individual","Mixto"])}</Campo>
          <Campo label="Tipo de Pago" error={errores.includes("tipo_pago")}>{sel("tipo_pago", ["Nómina","TC/TD","PSE","Efectivo"])}</Campo>
        </div>
        <div style={S.section}>Comercial</div>
        <div style={S.grid2}>
          <Campo label="Canales de Venta" error={errores.includes("canales_venta")}>{inp("canales_venta")}</Campo>
          <Campo label="Tipo de Adhesión" error={errores.includes("tipo_adhesion")}>{sel("tipo_adhesion", ["Voluntaria","Obligatoria"])}</Campo>
          <Campo label="Rangos Salariales" error={errores.includes("rangos_salariales")}>{inp("rangos_salariales")}</Campo>
          <Campo label="Géneros" error={errores.includes("generos")}>{inp("generos")}</Campo>
          <Campo label="Prevalencias Médicas" error={errores.includes("prevalencias_medicas")}>{inp("prevalencias_medicas")}</Campo>
          <Campo label="ADN Terminado" error={errores.includes("adn_terminado")}>
            <select style={errores.includes("adn_terminado") ? S.selectError : S.select} value={form.adn_terminado || ""} onChange={e => set("adn_terminado", e.target.value === "true")}>
              <option value="">Seleccionar...</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </Campo>
        </div>
      </>
    );
    if (etapaSiguiente === "Cotización") return (
      <div style={{ background: "#F0FDF4", borderRadius: 10, padding: 16, textAlign: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#0F766E" }}>✅ ADN completado</div>
        <div style={{ fontSize: 13, color: "#64748B", marginTop: 6 }}>La empresa pasará a Cotización y se notificará al Líder de Planeación.</div>
      </div>
    );
    if (etapaSiguiente === "Oferta") return (
      <div style={S.grid2}>
        <Campo label="Link Oferta" error={errores.includes("link_oferta")}>{inp("link_oferta","https://...")}</Campo>
      </div>
    );
    if (etapaSiguiente === "Implementación") return (
      <div style={S.grid2}>
        <Campo label="Link Oferta" error={errores.includes("link_oferta")}>{inp("link_oferta","https://...")}</Campo>
        <Campo label="Link de Contrato" error={errores.includes("link_contrato")}>{inp("link_contrato","https://...")}</Campo>
        <Campo label="Link de Anexos" error={errores.includes("link_anexos")}>{inp("link_anexos","https://...")}</Campo>
      </div>
    );
    if (etapaSiguiente === "Lanzamiento") return (
      <div style={S.grid2}>
        <Campo label="Link Oferta" error={errores.includes("link_oferta")}>{inp("link_oferta","https://...")}</Campo>
        <Campo label="Link de Contrato" error={errores.includes("link_contrato")}>{inp("link_contrato","https://...")}</Campo>
        <Campo label="Link de Anexos" error={errores.includes("link_anexos")}>{inp("link_anexos","https://...")}</Campo>
        <Campo label="Oferta Lanzamiento" error={errores.includes("oferta_lanzamiento")}>{inp("oferta_lanzamiento")}</Campo>
        <Campo label="Diseño Piezas" error={errores.includes("diseno_piezas")}>{inp("diseno_piezas")}</Campo>
        <Campo label="Canales de Difusión" error={errores.includes("canales_difusion")}>{inp("canales_difusion")}</Campo>
        <Campo label="Link Piezas" error={errores.includes("link_piezas")}>{inp("link_piezas","https://...")}</Campo>
      </div>
    );
    return null;
  };

  return (
    <div style={S.modal} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modalBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Avanzar a {etapaSiguiente}</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{empresa.razon_social} · NIT: {empresa.nit}</div>
          </div>
          <button style={S.btn("ghost")} onClick={onClose}>✕</button>
        </div>
        {msg && <div style={{ ...S.alert("error"), marginBottom: 12 }}>{msg.text}</div>}
        {renderCampos()}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
          <button style={S.btn("ghost")} onClick={onClose}>Cancelar</button>
          <button style={{ ...S.btn(), background: etapaColor }} onClick={guardar} disabled={loading}>
            {loading ? "Guardando..." : `Confirmar → ${etapaSiguiente}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MODAL NUEVA EMPRESA ────────────────────────────────────────
function ModalNuevaEmpresa({ onClose, onSaved, usuarios, usuarioActual }) {
  const [form, setForm] = useState({
    nit: "", razon_social: "", subsegmento: "",
    kam_id: usuarioActual?.rol === "KAM" ? usuarioActual.id : "",
    nombre_contacto: "", cargo_contacto: "", correo_contacto: "", telefono_contacto: ""
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState(null);
  const [errores, setErrores] = useState([]);

  const kams = usuarios.filter(u => u.roles?.nombre === "KAM");

  async function guardar() {
    const obligatorios = ["nit","razon_social","kam_id","subsegmento","nombre_contacto","cargo_contacto","correo_contacto","telefono_contacto"];
    const faltantes = obligatorios.filter(k => !form[k]);
    if (faltantes.length > 0) { setErrores(faltantes); setMsg({ type: "error", text: "Todos los campos son obligatorios." }); return; }
    setLoading(true);
    try {
      const planCuentas = await sb.get("plan_de_cuentas", `nit=eq.${form.nit}`);
      if (planCuentas.length > 0) {
        setMsg({ type: "error", text: `⚠️ NIT ${form.nit} ya existe en el Plan de Cuentas.` });
        setLoading(false); return;
      }
      const [emp] = await sb.post("empresas", { nit: form.nit, razon_social: form.razon_social, subsegmento: form.subsegmento, kam_id: form.kam_id, etapa_actual: "Prospección" });
      await sb.post("prospeccion", { empresa_id: emp.id, nombre_contacto: form.nombre_contacto, cargo_contacto: form.cargo_contacto, correo_contacto: form.correo_contacto, telefono_contacto: form.telefono_contacto });
      await sb.post("historial", { empresa_id: emp.id, nit: emp.nit, razon_social: emp.razon_social, subsegmento: emp.subsegmento, cambio: "Creación → Prospección", usuario_email: usuarioActual?.email || "sistema", nota: JSON.stringify(form) });
      await notificarLiderSubsegmento(form.subsegmento, form.nit, form.razon_social);
      onSaved();
    } catch(e) {
      setMsg({ type: "error", text: e.message.includes("unique") ? "Este NIT ya existe en el sistema." : e.message });
    }
    setLoading(false);
  }

  function inp(key, placeholder = "") {
    const err = errores.includes(key);
    return <input style={err ? S.inputError : S.input} value={form[key] || ""} onChange={e => { setForm(p => ({ ...p, [key]: e.target.value })); setErrores(p => p.filter(x => x !== key)); }} placeholder={placeholder} />;
  }

  return (
    <div style={S.modal} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={S.modalBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div><div style={{ fontSize: 17, fontWeight: 700 }}>Nueva Empresa</div><div style={{ fontSize: 12, color: "#64748B" }}>Registrar nuevo prospecto</div></div>
          <button style={S.btn("ghost")} onClick={onClose}>✕</button>
        </div>
        {msg && <div style={S.alert(msg.type)}>{msg.text}</div>}
        <div style={S.grid2}>
          <Campo label="NIT *" error={errores.includes("nit")}>{inp("nit","900123456-7")}</Campo>
          <Campo label="Razón Social *" error={errores.includes("razon_social")}>{inp("razon_social","Empresa S.A.S")}</Campo>
          <Campo label="Subsegmento *" error={errores.includes("subsegmento")}>
            <select style={errores.includes("subsegmento") ? S.selectError : S.select} value={form.subsegmento} onChange={e => { setForm(p => ({ ...p, subsegmento: e.target.value })); setErrores(p => p.filter(x => x !== "subsegmento")); }}>
              <option value="">Seleccionar subsegmento...</option>
              {SUBSEGMENTOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Campo>
          <Campo label="KAM Asignado *" error={errores.includes("kam_id")}>
            {usuarioActual?.rol === "KAM" ? (
              <input style={S.input} value={usuarioActual.nombre} disabled />
            ) : (
              <select style={errores.includes("kam_id") ? S.selectError : S.select} value={form.kam_id} onChange={e => { setForm(p => ({ ...p, kam_id: e.target.value })); setErrores(p => p.filter(x => x !== "kam_id")); }}>
                <option value="">Seleccionar KAM...</option>
                {kams.map(k => <option key={k.id} value={k.id}>{k.nombre}</option>)}
              </select>
            )}
          </Campo>
        </div>
        {form.subsegmento && (
          <div style={{ background: "#EEF2FF", borderRadius: 8, padding: "8px 12px", margin: "12px 0", fontSize: 12, color: "#4F46E5" }}>
            📧 Se notificará al Líder de <strong>{form.subsegmento}</strong> al registrar este prospecto.
          </div>
        )}
        <div style={S.section}>Contacto Inicial</div>
        <div style={S.grid2}>
          <Campo label="Nombre Completo *" error={errores.includes("nombre_contacto")}>{inp("nombre_contacto")}</Campo>
          <Campo label="Cargo *" error={errores.includes("cargo_contacto")}>{inp("cargo_contacto")}</Campo>
          <Campo label="Correo *" error={errores.includes("correo_contacto")}>{inp("correo_contacto")}</Campo>
          <Campo label="Teléfono *" error={errores.includes("telefono_contacto")}>{inp("telefono_contacto")}</Campo>
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
function ModalDetalle({ empresa, onClose, onMoved, permisos }) {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState(null);
  const [modalCampos, setModalCampos] = useState(false);
  const [datosHeredados, setDatosHeredados] = useState({});

  useEffect(() => {
    sb.get("historial", `empresa_id=eq.${empresa.id}&order=fecha_cambio.desc`).then(setHistorial);
  }, [empresa.id]);

  const etapaIdx      = ETAPAS.findIndex(e => e.key === empresa.etapa_actual);
  const siguienteEtapa = ETAPAS[etapaIdx + 1];

  const puedeAvanzar = permisos.puedeMoverEtapas &&
    (!permisos.etapasEditables || permisos.etapasEditables.includes(empresa.etapa_actual));

  async function iniciarMovimiento() {
    setLoading(true);
    try {
      const tablaActual = ETAPAS[etapaIdx]?.table;
      const datosActuales = await sb.get(tablaActual, `empresa_id=eq.${empresa.id}&limit=1`);
      const datos = datosActuales[0] || {};
      setDatosHeredados({
        nombre_contacto:        datos.nombre_contacto || "",
        cargo_contacto:         datos.cargo_contacto || "",
        correo_contacto:        datos.correo_contacto || "",
        telefono_contacto:      datos.telefono_contacto || "",
        link_oferta:            datos.link_oferta || "",
        link_contrato:          datos.link_contrato || "",
        link_anexos:            datos.link_anexos || "",
        grupo_objetivo:         datos.grupo_objetivo || "",
        sucursales:             datos.sucursales || "",
        tamano_universo:        datos.tamano_universo || "",
        tamano_grupo_objetivo:  datos.tamano_grupo_objetivo || "",
        tamano_empresa:         datos.tamano_empresa || "",
        objetivo_programa:      datos.objetivo_programa || "",
        esquema_pago:           datos.esquema_pago || "",
        tipo_pago:              datos.tipo_pago || "",
        canales_venta:          datos.canales_venta || "",
        tipo_adhesion:          datos.tipo_adhesion || "",
      });
      setModalCampos(true);
    } catch(e) {
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
        {msg && <div style={S.alert("error")}>{msg.text}</div>}

        {/* Pipeline visual */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
          {ETAPAS.map((e, i) => (
            <div key={e.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: empresa.etapa_actual === e.key ? e.color : "#F1F5F9", color: empresa.etapa_actual === e.key ? "#fff" : etapaIdx > i ? e.color : "#94A3B8" }}>{e.key}</div>
              {i < ETAPAS.length - 1 && <div style={{ color: "#CBD5E1", fontSize: 14 }}>›</div>}
            </div>
          ))}
        </div>

        {/* KAM */}
        <div style={{ ...S.card, padding: 14, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#64748B", marginBottom: 6 }}>KAM ASIGNADO</div>
          <div style={{ fontSize: 13, fontWeight: 500 }}>{empresa.usuarios?.nombre || "—"}</div>
          <div style={{ fontSize: 12, color: "#64748B" }}>{empresa.usuarios?.email || "—"}</div>
        </div>

        {/* Botón avanzar */}
        {siguienteEtapa && puedeAvanzar && (
          <div style={{ background: siguienteEtapa.light, borderRadius: 10, padding: 14, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: siguienteEtapa.color }}>SIGUIENTE ETAPA</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{siguienteEtapa.key}</div>
            </div>
            <button style={{ ...S.btn(), background: siguienteEtapa.color }} onClick={iniciarMovimiento} disabled={loading}>
              {loading ? "Cargando..." : `Avanzar →`}
            </button>
          </div>
        )}

        {empresa.etapa_actual === "Lanzamiento" && (
          <div style={{ background: "#F0FDF4", borderRadius: 10, padding: 14, marginBottom: 16, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#15803D" }}>🎉 Proceso completado</div>
          </div>
        )}

        {/* Historial */}
        <div style={{ fontSize: 12, fontWeight: 600, color: "#64748B", marginBottom: 8 }}>HISTORIAL</div>
        {historial.length === 0
          ? <div style={{ color: "#94A3B8", fontSize: 13 }}>Sin movimientos aún.</div>
          : <div style={{ maxHeight: 200, overflowY: "auto" }}>
              {historial.map(h => (
                <div key={h.id} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid #F1F5F9" }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4F46E5", marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{h.cambio}</div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>{fmt(h.fecha_cambio)} · {h.usuario_email}</div>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>

      {modalCampos && siguienteEtapa && (
        <ModalCamposEtapa
          empresa={empresa}
          etapaSiguiente={siguienteEtapa.key}
          datosHeredados={datosHeredados}
          onClose={() => setModalCampos(false)}
          onSaved={() => { setModalCampos(false); onMoved(); }}
        />
      )}
    </div>
  );
}

// ── VISTA: DASHBOARD ───────────────────────────────────────────
function Dashboard({ empresas, usuarios }) {
  const porEtapa  = ETAPAS.map(e => ({ ...e, count: empresas.filter(x => x.etapa_actual === e.key).length }));
  const recientes = [...empresas].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  const kams      = usuarios.filter(u => u.roles?.nombre === "KAM").length;

  return (
    <div>
      <div style={S.pageTitle}>Dashboard</div>
      <div style={S.pageSub}>Resumen del pipeline comercial</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 24 }}>
        <div style={S.stat}><div style={S.statNum}>{empresas.length}</div><div style={S.statLabel}>Total Empresas</div></div>
        <div style={S.stat}><div style={S.statNum}>{kams}</div><div style={S.statLabel}>KAMs Activos</div></div>
        <div style={S.stat}><div style={{ ...S.statNum, color: "#4F46E5" }}>{porEtapa[0]?.count || 0}</div><div style={S.statLabel}>En Prospección</div></div>
        <div style={S.stat}><div style={{ ...S.statNum, color: "#15803D" }}>{porEtapa[6]?.count || 0}</div><div style={S.statLabel}>En Lanzamiento</div></div>
      </div>
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
function Pipeline({ empresas, onSelect, permisos }) {
  const etapasVisibles = permisos.etapasEditables
    ? ETAPAS.filter(e => permisos.etapasEditables.includes(e.key))
    : ETAPAS;

  return (
    <div>
      <div style={S.pageTitle}>Pipeline Comercial</div>
      <div style={S.pageSub}>Vista Kanban — haz clic en una empresa para ver detalles</div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16 }}>
        {etapasVisibles.map(etapa => {
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
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{emp.razon_social}</div>
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
function Empresas({ empresas, onSelect, onNueva, permisos }) {
  const [buscar, setBuscar]       = useState("");
  const [filtroEtapa, setFiltroEtapa] = useState("");
  const [filtroSub, setFiltroSub] = useState("");

  const etapasDisponibles = permisos.etapasEditables
    ? ETAPAS.filter(e => permisos.etapasEditables.includes(e.key))
    : ETAPAS;

  const filtradas = empresas.filter(e => {
    const matchBuscar = !buscar || e.razon_social.toLowerCase().includes(buscar.toLowerCase()) || e.nit.includes(buscar);
    const matchEtapa  = !filtroEtapa || e.etapa_actual === filtroEtapa;
    const matchSub    = !filtroSub || e.subsegmento === filtroSub;
    return matchBuscar && matchEtapa && matchSub;
  });

  function exportarCSV() {
    const headers = ["NIT","Razon Social","Subsegmento","KAM","Etapa","Fecha Registro"];
    const rows = filtradas.map(e => [e.nit, e.razon_social, e.subsegmento||"", e.usuarios?.nombre||"", e.etapa_actual, fmt(e.created_at)]);
    const csv = [headers,...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="empresas_crm.csv"; a.click();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div><div style={S.pageTitle}>Empresas</div><div style={S.pageSub}>{filtradas.length} empresa{filtradas.length!==1?"s":""} encontrada{filtradas.length!==1?"s":""}</div></div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={S.btn("ghost")} onClick={exportarCSV}>↓ Exportar CSV</button>
          {permisos.puedeCrearEmpresas && <button style={S.btn()} onClick={onNueva}>+ Nueva Empresa</button>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input style={{ ...S.input, maxWidth: 260 }} placeholder="Buscar por nombre o NIT..." value={buscar} onChange={e => setBuscar(e.target.value)} />
        <select style={{ ...S.select, maxWidth: 180 }} value={filtroEtapa} onChange={e => setFiltroEtapa(e.target.value)}>
          <option value="">Todas las etapas</option>
          {etapasDisponibles.map(e => <option key={e.key} value={e.key}>{e.key}</option>)}
        </select>
        <select style={{ ...S.select, maxWidth: 200 }} value={filtroSub} onChange={e => setFiltroSub(e.target.value)}>
          <option value="">Todos los subsegmentos</option>
          {SUBSEGMENTOS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={S.card}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Razón Social</th><th style={S.th}>NIT</th><th style={S.th}>Subsegmento</th><th style={S.th}>KAM</th><th style={S.th}>Etapa</th><th style={S.th}>Registro</th><th style={S.th}></th></tr></thead>
          <tbody>
            {filtradas.length === 0 && <tr><td colSpan={7} style={{ ...S.td, textAlign:"center", color:"#94A3B8", padding:32 }}>No se encontraron empresas</td></tr>}
            {filtradas.map(e => (
              <tr key={e.id} style={{ cursor:"pointer" }} onClick={() => onSelect(e)}>
                <td style={S.td}><div style={{ fontWeight:500 }}>{e.razon_social}</div></td>
                <td style={S.td}>{e.nit}</td>
                <td style={S.td}>{e.subsegmento||"—"}</td>
                <td style={S.td}>{e.usuarios?.nombre||"—"}</td>
                <td style={S.td}><EtapaBadge etapa={e.etapa_actual} /></td>
                <td style={S.td}>{fmt(e.created_at)}</td>
                <td style={S.td}><button style={S.btn("ghost")} onClick={ev=>{ev.stopPropagation();onSelect(e);}}>Ver →</button></td>
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
  const [hist, setHist]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sb.get("historial","order=fecha_cambio.desc&limit=200").then(d => { setHist(d); setLoading(false); });
  }, []);

  function exportarCSV() {
    const headers = ["NIT","Razon Social","Subsegmento","Fecha Cambio","Cambio","Usuario","Nota"];
    const rows = hist.map(h => [h.nit,h.razon_social,h.subsegmento||"",fmt(h.fecha_cambio),h.cambio,h.usuario_email,h.nota||""]);
    const csv = [headers,...rows].map(r => r.map(v=>`"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download="historial_crm.csv"; a.click();
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div><div style={S.pageTitle}>Historial</div><div style={S.pageSub}>Registro completo de movimientos</div></div>
        <button style={S.btn("ghost")} onClick={exportarCSV}>↓ Exportar CSV</button>
      </div>
      <div style={S.card}>
        {loading ? <div style={{ color:"#94A3B8", padding:20 }}>Cargando...</div> : (
          <table style={S.table}>
            <thead><tr><th style={S.th}>Empresa</th><th style={S.th}>NIT</th><th style={S.th}>Cambio</th><th style={S.th}>Usuario</th><th style={S.th}>Fecha</th></tr></thead>
            <tbody>
              {hist.map(h => (
                <tr key={h.id}>
                  <td style={S.td}><div style={{ fontWeight:500 }}>{h.razon_social}</div><div style={{ fontSize:11, color:"#94A3B8" }}>{h.subsegmento}</div></td>
                  <td style={S.td}>{h.nit}</td>
                  <td style={S.td}><span style={{ background:"#EEF2FF", color:"#4F46E5", padding:"2px 8px", borderRadius:6, fontSize:12, fontWeight:500 }}>{h.cambio}</span></td>
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
function Usuarios({ usuarios, onRefresh, permisos }) {
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({ nombre:"", email:"", rol_id:"", subsegmento:"" });
  const [roles, setRoles] = useState([]);
  const [msg, setMsg]     = useState(null);

  useEffect(() => {
    sb.get("roles").then(r => {
      // Si es Lider Subsegmento solo puede crear KAMs
      if (!permisos.esAdmin) setRoles(r.filter(x => x.nombre === "KAM"));
      else setRoles(r);
    });
  }, [permisos.esAdmin]);

  async function guardar() {
    if (!form.nombre || !form.email || !form.rol_id) { setMsg({ type:"error", text:"Todos los campos son obligatorios." }); return; }
    try {
      await sb.post("usuarios", { nombre: form.nombre, email: form.email, rol_id: form.rol_id, subsegmento: form.subsegmento || null, activo: true });
      setModal(false); setForm({ nombre:"", email:"", rol_id:"", subsegmento:"" }); onRefresh();
    } catch(e) {
      setMsg({ type:"error", text: e.message.includes("unique") ? "Este correo ya está registrado." : e.message });
    }
  }

  async function toggleActivo(u) {
    await sb.patch("usuarios", `id=eq.${u.id}`, { activo: !u.activo });
    onRefresh();
  }

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20 }}>
        <div><div style={S.pageTitle}>Usuarios</div><div style={S.pageSub}>Gestión de usuarios y roles</div></div>
        {permisos.puedeCrearUsuarios && <button style={S.btn()} onClick={() => setModal(true)}>+ Nuevo Usuario</button>}
      </div>
      <div style={S.card}>
        <table style={S.table}>
          <thead><tr><th style={S.th}>Nombre</th><th style={S.th}>Email</th><th style={S.th}>Rol</th><th style={S.th}>Subsegmento</th><th style={S.th}>Estado</th>{permisos.esAdmin && <th style={S.th}>Acciones</th>}</tr></thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id}>
                <td style={S.td}><div style={{ fontWeight:500 }}>{u.nombre}</div></td>
                <td style={S.td}>{u.email}</td>
                <td style={S.td}><span style={{ background:"#EEF2FF", color:"#4F46E5", padding:"2px 8px", borderRadius:6, fontSize:12, fontWeight:500 }}>{u.roles?.nombre||"—"}</span></td>
                <td style={S.td}>{u.subsegmento||"—"}</td>
                <td style={S.td}><span style={{ background: u.activo?"#F0FDF4":"#FEF2F2", color: u.activo?"#15803D":"#DC2626", padding:"2px 8px", borderRadius:6, fontSize:12, fontWeight:500 }}>{u.activo?"Activo":"Inactivo"}</span></td>
                {permisos.esAdmin && <td style={S.td}><button style={S.btn(u.activo?"danger":"ghost")} onClick={() => toggleActivo(u)}>{u.activo?"Desactivar":"Activar"}</button></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <div style={S.modal} onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div style={{ ...S.modalBox, maxWidth:420 }}>
            <div style={{ fontSize:17, fontWeight:700, marginBottom:16 }}>Nuevo Usuario</div>
            {msg && <div style={S.alert(msg.type)}>{msg.text}</div>}
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div><label style={S.label}>Nombre completo</label><input style={S.input} value={form.nombre} onChange={e => setForm(p=>({...p,nombre:e.target.value}))} /></div>
              <div><label style={S.label}>Correo electrónico</label><input style={S.input} value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))} /></div>
              <div><label style={S.label}>Rol</label>
                <select style={S.select} value={form.rol_id} onChange={e => setForm(p=>({...p,rol_id:e.target.value}))}>
                  <option value="">Seleccionar rol...</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                </select>
              </div>
              {permisos.esAdmin && (
                <div><label style={S.label}>Subsegmento (solo Líderes de Subsegmento)</label>
                  <select style={S.select} value={form.subsegmento} onChange={e => setForm(p=>({...p,subsegmento:e.target.value}))}>
                    <option value="">Sin subsegmento</option>
                    {SUBSEGMENTOS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:20 }}>
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
  const [session, setSession]           = useState(null);
  const [usuarioActual, setUsuarioActual] = useState(null);
  const [vista, setVista]               = useState("dashboard");
  const [empresas, setEmpresas]         = useState([]);
  const [usuarios, setUsuarios]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [modalNueva, setModalNueva]     = useState(false);
  const [empresaSel, setEmpresaSel]     = useState(null);

  // Verificar sesión guardada
  useEffect(() => {
    const saved = localStorage.getItem("crm_session");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setSession(s);
      } catch(e) { localStorage.removeItem("crm_session"); }
    } else {
      setLoading(false);
    }
  }, []);

  // Cargar usuario actual cuando hay sesión
  useEffect(() => {
    if (!session) return;
    async function cargarUsuario() {
      try {
        const authUser = await auth.getUser(session.access_token);
        if (!authUser) { handleLogout(); return; }
        const todos = await sb.get("usuarios", "select=*,roles(nombre)&activo=eq.true");
        const u = todos.find(x => x.email === authUser.email);
        if (u) {
          setUsuarioActual({ ...u, rol: u.roles?.nombre });
          // Ajustar vista inicial según rol
          const perms = getPermisos(u.roles?.nombre, u.subsegmento);
          if (!perms.verDashboard && perms.verPipeline) setVista("pipeline");
          else if (!perms.verDashboard && !perms.verPipeline && perms.verEmpresas) setVista("empresas");
        }
        await cargarDatos(u);
      } catch(e) {
        setError("Error al cargar el perfil de usuario.");
        setLoading(false);
      }
    }
    cargarUsuario();
  }, [session]);

  function handleLogin(sessionData) {
    localStorage.setItem("crm_session", JSON.stringify(sessionData));
    setSession(sessionData);
  }

  function handleLogout() {
    if (session) auth.signOut(session.access_token);
    localStorage.removeItem("crm_session");
    setSession(null); setUsuarioActual(null);
    setEmpresas([]); setUsuarios([]);
    setLoading(false);
  }

  const cargarDatos = useCallback(async (u) => {
    const usuario = u || usuarioActual;
    if (!usuario) return;
    setLoading(true);
    try {
      const perms = getPermisos(usuario.rol, usuario.subsegmento);
      let query = "select=*,usuarios(nombre,email,roles(nombre))&order=created_at.desc";

      // Filtrar por KAM si es necesario
      if (perms.soloSuyos) query += `&kam_id=eq.${usuario.id}`;

      // Filtrar por subsegmento si es Lider Subsegmento
      if (perms.soloSubsegmento) {
        const subsegmentos = perms.soloSubsegmento.split(",").map(s => s.trim());
        if (subsegmentos.length === 1) query += `&subsegmento=eq.${encodeURIComponent(subsegmentos[0])}`;
      }

      // Filtrar por etapa si solo puede ver ciertas etapas
      if (perms.etapasEditables && perms.etapasEditables.length > 0) {
        query += `&etapa_actual=in.(${perms.etapasEditables.map(e => encodeURIComponent(e)).join(",")})`;
      }

      const [emps, usrs] = await Promise.all([
        sb.get("empresas", query),
        sb.get("usuarios", "select=*,roles(nombre)&activo=eq.true"),
      ]);
      setEmpresas(emps);
      setUsuarios(usrs);
      setError(null);
    } catch(e) {
      setError("Error al cargar los datos.");
    }
    setLoading(false);
  }, [usuarioActual]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#F8FAFC", marginBottom: 8 }}>CRM Comercial</div>
        <div style={{ fontSize: 13, color: "#64748B" }}>Cargando...</div>
      </div>
    </div>
  );

  if (!session) return <Login onLogin={handleLogin} />;

  const permisos = usuarioActual ? getPermisos(usuarioActual.rol, usuarioActual.subsegmento) : {};

  const NAV = [
    permisos.verDashboard && { key: "dashboard", icon: "◉", label: "Dashboard" },
    permisos.verPipeline  && { key: "pipeline",  icon: "⊞", label: "Pipeline" },
    permisos.verEmpresas  && { key: "empresas",  icon: "☰", label: "Empresas" },
    permisos.verHistorial && { key: "historial", icon: "◷", label: "Historial" },
    permisos.verUsuarios  && { key: "usuarios",  icon: "◎", label: "Usuarios" },
  ].filter(Boolean);



  return (
    <div style={S.app}>
      <div style={S.sidebar}>
        <div style={S.sidebarLogo}>
          <div style={S.sidebarTitle}>CRM Comercial</div>
          <div style={S.sidebarSub}>{usuarioActual?.nombre || "..."}</div>
          {usuarioActual?.rol && (
            <div style={{ fontSize: 10, marginTop: 4, background: "#1E293B", color: "#94A3B8", padding: "2px 8px", borderRadius: 10, display: "inline-block" }}>
              {usuarioActual.rol}
            </div>
          )}
        </div>
        {NAV.map(n => (
          <div key={n.key} style={S.navItem(vista === n.key)} onClick={() => setVista(n.key)}>
            <span style={{ fontSize: 15 }}>{n.icon}</span>
            <span>{n.label}</span>
          </div>
        ))}
        <div style={{ marginTop: "auto", padding: "16px 20px", borderTop: "1px solid #1E293B" }}>
          <div style={{ fontSize: 11, color: "#475569", marginBottom: 8 }}>{usuarioActual?.email}</div>
          <button style={{ ...S.btn("ghost"), fontSize: 12, padding: "6px 12px", color: "#64748B" }} onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </div>

      <div style={S.main}>
        {loading && <div style={{ color: "#64748B", padding: 40, textAlign: "center" }}>Cargando...</div>}
        {error && <div style={S.alert("error")}>{error}</div>}
        {!loading && !error && usuarioActual && (
          <>
            {vista === "dashboard" && <Dashboard empresas={empresas} usuarios={usuarios} />}
            {vista === "pipeline"  && <Pipeline empresas={empresas} onSelect={setEmpresaSel} permisos={permisos} />}
            {vista === "empresas"  && <Empresas empresas={empresas} onSelect={setEmpresaSel} onNueva={() => setModalNueva(true)} permisos={permisos} />}
            {vista === "historial" && <Historial />}
            {vista === "usuarios"  && <Usuarios usuarios={usuarios} onRefresh={() => cargarDatos()} permisos={permisos} />}
          </>
        )}
      </div>

      {modalNueva && (
        <ModalNuevaEmpresa
          onClose={() => setModalNueva(false)}
          onSaved={() => { setModalNueva(false); cargarDatos(); }}
          usuarios={usuarios}
          usuarioActual={usuarioActual}
        />
      )}
      {empresaSel && (
        <ModalDetalle
          empresa={empresaSel}
          onClose={() => setEmpresaSel(null)}
          onMoved={() => { setEmpresaSel(null); cargarDatos(); }}
          permisos={permisos}
        />
      )}
    </div>
  );
}
