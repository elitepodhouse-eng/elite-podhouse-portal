import React, { useState, useEffect, useCallback } from "react";
import {
  Mic, Calendar as CalIcon, Clock, FileText, LogOut, Menu, X, Radio,
  ArrowRight, Users, Loader2, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight,
  Wallet, Package, Sparkles, Newspaper, Banknote, Trash2
} from "lucide-react";
import { supabase, isAdminEmail } from "./supabaseClient";
import { saldoCliente, waUrl } from "./lib/ops";
import { generarImagenSesion, descargarImagenSesion, nombreArchivoSesion } from "./lib/citaImagen";
import { enlaceGoogleCalendarSesion, mensajeWhatsAppSesion } from "./lib/calendarioVisita";
import AdminPropuestas from "./admin/Propuestas";
import AdminCotizador from "./admin/Cotizador";
import AdminContratos from "./admin/Contratos";
import AdminCobranza from "./admin/Cobranza";
import AdminHoy from "./admin/Hoy";
import AdminFinanzas from "./admin/Finanzas";
import AdminFacturacion from "./admin/Facturacion";
import AdminAjustes from "./admin/Ajustes";
import AdminVisitas, { VisitasPanel } from "./admin/Visitas";
import ClienteDetalle from "./admin/ClienteDetalle";
import EpisodioDetalle from "./admin/EpisodioDetalle";

// Identidad Élite Podhouse (la misma de la vista previa aprobada por Tania)
const navy = "#0B1338";
const card = "#12152B";
const cardAlt = "#1E2447";
const blue = "#2F52FF";
const blueDeep = "#1B2FBD";
const blueLight = "#9FB0FF";
const blueSoft = "rgba(47,82,255,0.18)";
const white = "#FFFFFF";
const gray = "#8B90B3";
const red = "#E05D5D";
const green = "#7ED9A0";
const greenBg = "rgba(46,160,90,0.18)";
const amber = "#F5C46A";
const amberBg = "rgba(245,166,35,0.16)";
const gradBlue = `linear-gradient(135deg, ${blueDeep}, ${blue})`;
const FONT = "Poppins";

const PAQUETES = ["Esencia", "Impacto", "Identidad", "Expansión"];
const SLOTS = ["09:00", "10:30", "12:00", "16:00", "17:30"]; // lun–vie: estudio de 8:00 a 20:00
const SLOTS_SABADO = ["10:30", "12:00", "16:00"]; // sábados: estudio de 10:00 a 17:00
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
// La disponibilidad real sale de la tabla `sesiones` de Supabase: un horario
// ocupado por cualquier cliente ya no se ofrece. Fase futura: Google Calendar.

// Precios reales de los paquetes (sin IVA), de la página de Élite Podhouse.
const PRECIOS = {
  Esencia: { sesion: 1499, mensual: 4999 },
  Impacto: { sesion: 2499, mensual: 7999 },
  Identidad: { sesion: 3499, mensual: 10999 },
  "Expansión": { sesion: 3999, mensual: 12999 },
};
// Qué incluye cada paquete (contenido real; cada nivel suma lo del anterior).
const INCLUYE = {
  Esencia: [
    "Grabación en set decorado, 3 cámaras 4K y micrófonos profesionales",
    "Iluminación profesional",
    "Personal de producción en apoyo constante",
    "Video directo + audio",
  ],
  Impacto: [
    "Edición, color y audio de cada episodio",
    "Hasta 7 reels por episodio",
    "Trailer de 30 segundos",
  ],
  Identidad: [
    "Edición con gráficos personalizados",
    "4 thumbnails para YouTube",
    "Títulos con SEO",
    "Publicación en YouTube y podcast",
  ],
  "Expansión": [
    "Producción y edición Premium 360°",
    "Estrategia de distribución y calendario editorial",
    "Preferencia en agenda",
  ],
};
function incluyePaquete(paquete) {
  const order = ["Esencia", "Impacto", "Identidad", "Expansión"];
  const idx = order.indexOf(paquete);
  if (idx < 0) return [];
  return order.slice(0, idx + 1).flatMap((p) => INCLUYE[p]);
}
const SETS = {
  OCRE: "Terciopelo mostaza, luz cálida, el más vibrante.",
  "ÍNDIGO": "Mesa de madera, 4 micrófonos, paredes y luz azules, con TV.",
  INDIGO: "Mesa de madera, 4 micrófonos, paredes y luz azules, con TV.",
  NOGAL: "Terciopelo azul marino, luz violeta, piso de madera gris, sin TV, el más íntimo.",
  "ÓNIX": "Cortinas negras, luz roja, el más dramático.",
  ONIX: "Cortinas negras, luz roja, el más dramático.",
};

// Etapas del flujo de entrega de un episodio (vista previa aprobada).
const ETAPAS = [
  { id: "grabado", label: "Grabado" },
  { id: "en_edicion", label: "En edición" },
  { id: "en_revision", label: "En revisión" },
  { id: "publicado", label: "Publicado" },
];
const ETAPA_PRIORIDAD = { en_revision: 3, en_edicion: 2, grabado: 1, publicado: 0 };
const ETAPA_LABEL = { por_grabar: "Por grabar", ...Object.fromEntries(ETAPAS.map((e) => [e.id, e.label])) };
// Tablero de Producción: las 5 etapas válidas en la base
// (el check de episodios.estado incluye 'por_grabar').
const PRODUCCION_ETAPAS = [{ id: "por_grabar", label: "Por grabar" }, ...ETAPAS];

const fmtMoney = (n) => `$${Number(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
const fmtFecha = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${y}`;
};

// Consulta que tolera que la tabla aún no exista (PGRST205): devuelve
// { data, missing } en vez de romper la vista. Las tablas episodios, pagos y
// contenidos se crean con supabase/migrations/001_portal_inicio.sql.
async function safeSelect(table, query) {
  try {
    const res = await query;
    if (res.error) {
      if (res.error.code === "PGRST205" || res.status === 404) return { data: [], missing: true };
      throw res.error;
    }
    return { data: res.data || [], missing: false };
  } catch {
    return { data: [], missing: true };
  }
}

// Las cuentas del estudio (Tania y Alejandro) NO son clientes: se filtran
// de todas las listas y desplegables de clientes. Sus filas siguen en la
// base; solo no se muestran como clientes.
const filtrarCuentasEstudio = (rows) => (rows || []).filter((c) => !isAdminEmail(c?.correo));

// ---------- UI atoms ----------
function Eyebrow({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ width: 6, height: 6, background: blue, borderRadius: 2 }} />
      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: blueLight, letterSpacing: 1.5 }}>{children}</span>
      <span style={{ width: 6, height: 6, background: blue, borderRadius: 2 }} />
    </div>
  );
}

function PillButton({ children, onClick, disabled, full, type = "button", ghost }) {
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-full px-5 py-2.5 ${full ? "w-full" : ""}`}
      style={{
        background: ghost ? "transparent" : disabled ? "#2A2E4A" : blue,
        border: ghost ? `1px solid ${blue}` : "none",
        color: ghost ? blueLight : white,
        fontFamily: FONT, fontWeight: 600, fontSize: 14, opacity: disabled ? 0.7 : 1,
      }}>
      {children}
    </button>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="mb-4">
      <label style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: gray, display: "block", marginBottom: 6 }}>{label}</label>
      <input {...props} className="w-full rounded-xl px-4 py-3 outline-none" style={{ background: card, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }} />
    </div>
  );
}

function Logo({ size = 28 }) {
  return (
    <div className="flex items-center justify-center shrink-0" style={{ width: size, height: size, background: gradBlue, borderRadius: 8 }}>
      <Mic size={size * 0.55} color={white} strokeWidth={2.4} />
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 mb-4" style={{ background: "rgba(224,93,93,0.12)", border: `1px solid ${red}55` }}>
      <AlertCircle size={15} color={red} className="mt-0.5 shrink-0" />
      <span style={{ fontFamily: FONT, fontSize: 12.5, color: "#F3A9A9" }}>{message}</span>
    </div>
  );
}

function Stepper({ etapa }) {
  const idx = ETAPAS.findIndex((e) => e.id === etapa);
  return (
    <div className="flex mt-4">
      {ETAPAS.map((e, i) => {
        const done = i < idx;
        const now = i === idx;
        return (
          <div key={e.id} className="flex-1 text-center relative pt-5" style={{ fontFamily: FONT, fontSize: 11, color: done ? white : now ? white : gray, fontWeight: now ? 700 : 400 }}>
            <span className="absolute left-1/2 top-1" style={{ transform: "translateX(-50%)", width: 11, height: 11, borderRadius: "50%", background: done ? blue : now ? "#F5A623" : cardAlt, border: `2px solid ${done ? blue : now ? "#F5A623" : cardAlt}`, boxShadow: now ? "0 0 0 4px rgba(245,166,35,0.25)" : "none" }} />
            {i > 0 && <span className="absolute top-2" style={{ left: "calc(-50% + 8px)", right: "calc(50% + 8px)", height: 2, background: done ? blue : cardAlt }} />}
            {e.label}
          </div>
        );
      })}
    </div>
  );
}

function EtapaPill({ etapa }) {
  const style =
    etapa === "publicado" ? { background: greenBg, color: green } :
    etapa === "en_revision" ? { background: amberBg, color: amber } :
    etapa === "en_edicion" ? { background: blueSoft, color: blueLight } :
    { background: cardAlt, color: gray };
  return (
    <span className="px-2.5 py-1 rounded-full shrink-0" style={{ ...style, fontFamily: FONT, fontSize: 10.5, fontWeight: 600 }}>
      {ETAPA_LABEL[etapa] || etapa}
    </span>
  );
}

function Card({ children, blue: isBlue, onClick }) {
  return (
    <div className="rounded-2xl p-5" onClick={onClick}
      style={isBlue
        ? { background: gradBlue, cursor: onClick ? "pointer" : "default" }
        : { background: card, border: `1px solid ${cardAlt}`, cursor: onClick ? "pointer" : "default" }}>
      {children}
    </div>
  );
}

// ---------- Auth ----------
// ---------- Auth ----------
// Entrada con usuario o correo: Supabase exige un correo por dentro, así
// que quien no tiene correo real entra con uno interno sintético
// `usuario@elitepodhouse.local` que nadie ve ni usa. El correo real sigue
// funcionando igual que antes: Tania y Alejandro entran con su correo.
// El registro público se quitó: las cuentas las crea Tania desde
// Clientes → "Nuevo usuario" (con la función create-user).
const USUARIO_DOMINIO = "@elitepodhouse.local";

function loginPara(entrada) {
  const texto = String(entrada || "").trim();
  if (texto.includes("@")) return texto;
  return `${texto.toLowerCase()}${USUARIO_DOMINIO}`;
}

function AuthScreen() {
  const [entrada, setEntrada] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [resetSent, setResetSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const email = loginPara(entrada);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const forgot = async () => {
    const texto = String(entrada || "").trim();
    if (!texto) { setError("Escribe tu usuario o tu correo arriba."); return; }
    // Sin correo real no hay a dónde mandar el enlace: lo restablece Tania.
    if (!texto.includes("@")) {
      setError("");
      setInfo("Si entras con usuario, pídele a Tania que te restablezca la contraseña.");
      return;
    }
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(texto, { redirectTo: window.location.origin });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: navy }}>
      <div className="w-full" style={{ maxWidth: 360 }}>
        <div className="flex flex-col items-center mb-8">
          <Logo size={44} />
          <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 22, color: white, marginTop: 14 }}>Élite Podhouse</h1>
          <p style={{ fontFamily: FONT, fontSize: 13, color: gray, marginTop: 2 }}>Portal de clientes</p>
        </div>

        {resetSent ? (
          <div className="text-center">
            <CheckCircle2 size={28} color={blueLight} className="mx-auto mb-3" />
            <p style={{ fontFamily: FONT, fontSize: 14, color: white }}>
              Te enviamos un correo con el enlace para crear una contraseña nueva. Revisa tu bandeja de entrada.
            </p>
            <button onClick={() => setResetSent(false)} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: blueLight, marginTop: 16 }}>
              Volver a iniciar sesión
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <ErrorBanner message={error} />
            {info && (
              <p className="text-center mb-4" style={{ fontFamily: FONT, fontSize: 13, color: white, lineHeight: 1.55 }}>{info}</p>
            )}
            <Input label="USUARIO O CORREO" type="text" required value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="tu usuario o tu@correo.com" />
            <Input label="CONTRASEÑA" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <PillButton full type="submit" disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : "Iniciar sesión"}
            </PillButton>
            <p className="text-center mt-3" style={{ fontFamily: FONT, fontSize: 13, color: gray }}>
              <button type="button" onClick={forgot} disabled={loading} style={{ color: blueLight, fontWeight: 600 }}>
                ¿Olvidaste tu contraseña?
              </button>
            </p>
            <p className="text-center mt-5" style={{ fontFamily: FONT, fontSize: 12.5, color: gray, lineHeight: 1.55 }}>
              ¿Aún no tienes cuenta? Pídele a Élite Podhouse que te cree tu usuario.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------- Restablecer contraseña ----------
function ResetPasswordScreen({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setError("");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const goLogin = async () => {
    await supabase.auth.signOut();
    onDone();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: navy }}>
      <div className="w-full" style={{ maxWidth: 360 }}>
        <div className="flex flex-col items-center mb-8">
          <Logo size={44} />
          <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 22, color: white, marginTop: 14 }}>Élite Podhouse</h1>
          <p style={{ fontFamily: FONT, fontSize: 13, color: gray, marginTop: 2 }}>Crea una contraseña nueva</p>
        </div>
        {done ? (
          <div className="text-center">
            <CheckCircle2 size={28} color={blueLight} className="mx-auto mb-3" />
            <p style={{ fontFamily: FONT, fontSize: 14, color: white }}>
              Contraseña actualizada. Ya puedes entrar con la nueva.
            </p>
            <button onClick={goLogin} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: blueLight, marginTop: 16 }}>
              Ir a iniciar sesión
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <ErrorBanner message={error} />
            <Input label="CONTRASEÑA NUEVA" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            <Input label="REPITE LA CONTRASEÑA" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
            <PillButton full type="submit" disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : "Guardar contraseña nueva"}
            </PillButton>
          </form>
        )}
      </div>
    </div>
  );
}

// ---------- Shell ----------
function Tab({ active, onClick, icon: Icon, label }) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left" style={{ background: active ? blueSoft : "transparent", color: active ? white : gray }}>
      <Icon size={17} strokeWidth={2} color={active ? blueLight : gray} />
      <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600 }}>{label}</span>
    </button>
  );
}

// Encabezado de sección del menú (solo aparece cuando el ítem trae `section`).
function SectionLabel({ children }) {
  return (
    <p className="px-4 pt-4 pb-1" style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>{children}</p>
  );
}

// Cuenta con la que se entró: visible siempre, para que nunca se confunda
// la cuenta del estudio con la de un cliente.
function AccountBlock({ email, role }) {
  if (!email) return null;
  return (
    <div className="px-4 py-3 rounded-xl" style={{ background: card, border: `1px solid ${cardAlt}` }}>
      <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 10.5, color: gray, letterSpacing: 1 }}>{role ? `${role.toUpperCase()} · SESIÓN` : "SESIÓN"}</p>
      <p style={{ fontFamily: FONT, fontSize: 12.5, color: white, marginTop: 4, wordBreak: "break-all" }}>{email}</p>
    </div>
  );
}

function Shell({ nav, view, setView, children, accountEmail, accountRole }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const logout = () => supabase.auth.signOut();
  const items = (onPick) => (
    <>
      {nav.map((n) => (
        <React.Fragment key={n.id}>
          {n.section && <SectionLabel>{n.section}</SectionLabel>}
          <Tab active={view === n.id} onClick={() => onPick(n.id)} icon={n.icon} label={n.label} />
        </React.Fragment>
      ))}
    </>
  );
  return (
    <div style={{ minHeight: "100vh", background: navy, display: "flex" }}>
      <aside className="hidden md:flex flex-col w-60 p-4 shrink-0" style={{ borderRight: `1px solid ${cardAlt}` }}>
        <div className="flex items-center gap-2.5 px-2 mb-8 mt-2">
          <Logo />
          <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 15, color: white }}>Élite Podhouse</span>
        </div>
        <div className="flex flex-col gap-1">
          {items((id) => setView(id))}
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <AccountBlock email={accountEmail} role={accountRole} />
          <button onClick={logout} className="flex items-center gap-2 px-4 py-3" style={{ color: gray }}>
            <LogOut size={15} /><span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500 }}>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3" style={{ background: navy, borderBottom: `1px solid ${cardAlt}` }}>
        <div className="flex items-center gap-2.5">
          <Logo size={24} />
          <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: white }}>Élite Podhouse</span>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} color={white} /> : <Menu size={20} color={white} />}</button>
      </div>
      {menuOpen && (
        <div className="md:hidden fixed top-12 left-0 right-0 z-20 p-3" style={{ background: card, borderBottom: `1px solid ${cardAlt}` }}>
          {items((id) => { setView(id); setMenuOpen(false); })}
          <div className="mt-3">
            <AccountBlock email={accountEmail} role={accountRole} />
          </div>
          <Tab active={false} onClick={logout} icon={LogOut} label="Cerrar sesión" />
        </div>
      )}

      <main className="flex-1 px-5 py-8 md:py-10 md:px-10 mt-12 md:mt-0" style={{ maxWidth: 720 }}>{children}</main>
    </div>
  );
}

// ---------- Client views ----------
// Tarjeta "Mi cuenta": cambio de contraseña para quien entró con usuario
// o con correo (vale la sesión actual; no se pide el correo).
function MiCuentaCard({ perfil }) {
  const [nueva, setNueva] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (nueva.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
    if (nueva !== confirm) { setError("Las contraseñas no coinciden."); return; }
    setError("");
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: nueva });
      if (error) throw error;
      setDone(true);
      setNueva("");
      setConfirm("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>MI CUENTA</span>
      <p style={{ fontFamily: FONT, fontSize: 13.5, color: white, marginTop: 10 }}>
        {perfil?.usuario ? `Usuario: ${perfil.usuario}` : perfil?.correo ? `Correo: ${perfil.correo}` : "Tu cuenta"}
      </p>
      <form onSubmit={submit} className="mt-4">
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>CAMBIAR CONTRASEÑA</span>
        <input type="password" value={nueva} onChange={(e) => setNueva(e.target.value)} placeholder="Contraseña nueva (mínimo 6 caracteres)" className="w-full rounded-xl px-3 py-2.5 outline-none mt-3" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }} />
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repite la contraseña" className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }} />
        <ErrorBanner message={error} />
        {done && <p style={{ fontFamily: FONT, fontSize: 13, color: green, marginBottom: 12 }}>Contraseña actualizada ✓</p>}
        <div className="mt-2">
          <PillButton type="submit" disabled={saving}>{saving ? <Loader2 size={15} className="animate-spin" /> : "Guardar contraseña nueva"}</PillButton>
        </div>
      </form>
    </Card>
  );
}

function ClientDashboard({ perfil, sesiones, episodios, pagos, facturas, abonos, goTo }) {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const sesionesMes = sesiones.filter((s) => s.fecha && s.fecha.startsWith(monthPrefix));
  const proximas = sesiones
    .filter((s) => s.fecha && s.fecha >= todayISO && s.estado !== "Cancelada")
    .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`));
  const proxima = proximas[0];
  const enCurso = [...episodios]
    .filter((e) => e.estado !== "publicado")
    .sort((a, b) => (ETAPA_PRIORIDAD[b.estado] - ETAPA_PRIORIDAD[a.estado]) || (b.numero - a.numero))[0];
  // Saldo único: facturas de Cobranza (fuente de verdad) + pagos manuales.
  const { pendiente, pagado } = saldoCliente(facturas, abonos, pagos);
  const precio = perfil?.paquete ? PRECIOS[perfil.paquete] : null;
  const incluidos = perfil?.sesiones_incluidas || null;
  const ultimoSet = [...episodios].sort((a, b) => String(b.fecha_grabacion || "").localeCompare(String(a.fecha_grabacion || "")))[0]?.set;
  // Nombre a mostrar: nombre real, si no el usuario, si no el correo (nunca el correo interno @elitepodhouse.local de los usuarios con usuario).
  const nombrePanel = perfil?.nombre || perfil?.usuario || (perfil?.correo && !perfil.correo.endsWith("@elitepodhouse.local") ? perfil.correo : "");

  return (
    <div>
      <Eyebrow>{nombrePanel ? `PANEL DE ${nombrePanel.split(" ")[0].toUpperCase()}` : "PANEL DE CLIENTE"}</Eyebrow>
      <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 28, color: white }}>
        Hola{perfil?.nombre ? `, ${perfil.nombre.split(" ")[0]}` : perfil?.usuario ? `, ${perfil.usuario}` : ""} 👋
      </h1>
      {perfil?.activo ? (
        <p style={{ fontFamily: FONT, fontSize: 14, color: gray, marginTop: 6 }}>
          {perfil.show_nombre || "Tu proyecto"}{perfil.paquete ? <> · Paquete <span style={{ color: blueLight, fontWeight: 600 }}>{perfil.paquete}</span></> : ""}
          {perfil.estado_proyecto ? <> · {perfil.estado_proyecto}</> : ""}
        </p>
      ) : (
        <p style={{ fontFamily: FONT, fontSize: 14, color: gray, marginTop: 6 }}>Tu cuenta está registrada. Élite Podhouse activará tu paquete pronto.</p>
      )}

      <div className="mt-7 space-y-4">
        {/* Tu paquete */}
        <Card blue>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,0.8)", letterSpacing: 1 }}>TU PAQUETE</span>
          <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 22, color: white, marginTop: 8 }}>
            {perfil?.paquete || "Sin paquete asignado"}{perfil?.modalidad === "mensual" ? " · Mensual" : perfil?.modalidad === "sesion" ? " · Por sesión" : ""}
          </p>
          {precio && (
            <p style={{ fontFamily: FONT, fontSize: 13.5, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>
              Mensual {fmtMoney(precio.mensual)} · Por sesión {fmtMoney(precio.sesion)} · sin IVA
            </p>
          )}
          <p style={{ fontFamily: FONT, fontSize: 13.5, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>
            {sesionesMes.length} {sesionesMes.length === 1 ? "sesión" : "sesiones"} este mes
            {incluidos ? ` · te quedan ${Math.max(0, incluidos - sesionesMes.length)} de ${incluidos}` : ""}
            {ultimoSet ? ` · Set ${ultimoSet.charAt(0) + ultimoSet.slice(1).toLowerCase()}` : ""}
          </p>
          {incluidos && (
            <div style={{ height: 9, borderRadius: 99, background: "rgba(255,255,255,0.25)", marginTop: 14, overflow: "hidden" }}>
              <i style={{ display: "block", height: "100%", borderRadius: 99, background: "#fff", width: `${Math.min(100, (sesionesMes.length / incluidos) * 100)}%` }} />
            </div>
          )}
        </Card>

        {/* Entrega en curso */}
        {enCurso ? (
          <Card>
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>TU ENTREGA EN CURSO</span>
              <EtapaPill etapa={enCurso.estado} />
            </div>
            <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 19, color: white, marginTop: 10 }}>
              Episodio {enCurso.numero} — {enCurso.titulo}
            </p>
            <p style={{ fontFamily: FONT, fontSize: 13.5, color: gray, marginTop: 4, lineHeight: 1.55 }}>
              {enCurso.estado === "en_revision"
                ? "Ya está editado y listo para que lo revises. Si lo apruebas, lo publicamos."
                : enCurso.estado === "en_edicion"
                  ? "El equipo está editando tu episodio."
                  : "Tu episodio está grabado y en cola de edición."}
            </p>
            <Stepper etapa={enCurso.estado} />
            <div className="mt-5">
              <PillButton onClick={() => goTo("entregas")}>Revisar episodio <ArrowRight size={15} /></PillButton>
            </div>
          </Card>
        ) : (
          <Card>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>TUS ENTREGAS</span>
            <p style={{ fontFamily: FONT, fontSize: 13.5, color: gray, marginTop: 10, lineHeight: 1.55 }}>
              Aún no hay episodios registrados. El equipo los va agregando aquí conforme se graban, para que veas en qué va cada uno.
            </p>
            <div className="mt-4">
              <PillButton ghost onClick={() => goTo("entregas")}>Ver mis entregas</PillButton>
            </div>
          </Card>
        )}

        {/* Saldo */}
        <Card>
          <div className="flex items-center justify-between">
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>SALDO PENDIENTE</span>
            <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: white }}>{fmtMoney(pendiente)}</span>
          </div>
          <p style={{ fontFamily: FONT, fontSize: 13.5, color: gray, marginTop: 6 }}>
            {pagos.length === 0 && (facturas || []).length === 0
              ? "Aún no hay pagos registrados para tu paquete."
              : `Pagado ${fmtMoney(pagado)}${pendiente > 0 ? " · el resto se paga por adelantado antes de grabar." : " · al corriente."}`}
          </p>
          <div className="mt-4">
            <PillButton ghost onClick={() => goTo("pagos")}>Ver pagos</PillButton>
          </div>
        </Card>

        {/* Próxima sesión */}
        <Card>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>PRÓXIMA SESIÓN</span>
          {proxima ? (
            <>
              <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 19, color: white, marginTop: 10 }}>
                {fmtFecha(proxima.fecha)} · {proxima.hora}
              </p>
              <p style={{ fontFamily: FONT, fontSize: 13.5, color: gray, marginTop: 4 }}>
                {proxima.titulo || "Sesión de grabación"} · Llega 10 minutos antes.
              </p>
            </>
          ) : (
            <p style={{ fontFamily: FONT, fontSize: 13.5, color: gray, marginTop: 10 }}>
              No tienes sesiones agendadas. Aparta la siguiente cuando quieras.
            </p>
          )}
          <div className="mt-4">
            <PillButton onClick={() => goTo("book")}>Reservar otra sesión <ArrowRight size={15} /></PillButton>
          </div>
        </Card>

        {/* Mi cuenta */}
        <MiCuentaCard perfil={perfil} />
      </div>
    </div>
  );
}

function PackageView({ perfil, sesiones, episodios }) {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const sesionesMes = sesiones.filter((s) => s.fecha && s.fecha.startsWith(monthPrefix));
  const precio = perfil?.paquete ? PRECIOS[perfil.paquete] : null;
  const incluidos = perfil?.sesiones_incluidas || null;
  const incluye = incluyePaquete(perfil?.paquete);
  // El set no es un campo del cliente en la base: se toma del set del último
  // episodio grabado (dato real de la tabla episodios).
  const ultimoEp = [...(episodios || [])].sort((a, b) => String(b.fecha_grabacion || "").localeCompare(String(a.fecha_grabacion || "")))[0];
  const setNombre = ultimoEp?.set ? ultimoEp.set.charAt(0) + ultimoEp.set.slice(1).toLowerCase() : null;
  const setDesc = ultimoEp?.set ? SETS[ultimoEp.set] || SETS[ultimoEp.set.toUpperCase()] : null;

  return (
    <div>
      <Eyebrow>MI PAQUETE</Eyebrow>
      <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: white }}>Mi paquete</h1>
      <div className="mt-6 space-y-4">
        <Card blue>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,0.8)", letterSpacing: 1 }}>CONTRATADO</span>
          <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 22, color: white, marginTop: 8 }}>
            {perfil?.paquete ? `${perfil.paquete}${perfil?.modalidad === "mensual" ? " — Mensual (4 episodios)" : perfil?.modalidad === "sesion" ? " — Por sesión" : ""}` : "Sin paquete asignado"}
          </p>
          {precio && (
            <p style={{ fontFamily: FONT, fontSize: 13.5, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>
              {fmtMoney(precio.mensual)} al mes · {fmtMoney(precio.sesion)} por sesión · sin IVA
            </p>
          )}
          {incluidos && (
            <div style={{ height: 9, borderRadius: 99, background: "rgba(255,255,255,0.25)", marginTop: 14, overflow: "hidden" }}>
              <i style={{ display: "block", height: "100%", borderRadius: 99, background: "#fff", width: `${Math.min(100, (sesionesMes.length / incluidos) * 100)}%` }} />
            </div>
          )}
          <p style={{ fontFamily: FONT, fontSize: 13.5, color: "rgba(255,255,255,0.85)", marginTop: 10 }}>
            {sesionesMes.length} {sesionesMes.length === 1 ? "sesión" : "sesiones"} este mes
            {incluidos ? ` · ${Math.max(0, incluidos - sesionesMes.length)} te quedan` : ""}
          </p>
        </Card>

        <Card>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>QUÉ INCLUYE</span>
          {incluye.length > 0 ? (
            <ul className="mt-3 space-y-2.5">
              {incluye.map((item) => (
                <li key={item} className="flex gap-2.5" style={{ fontFamily: FONT, fontSize: 13.5, color: white, lineHeight: 1.5 }}>
                  <span style={{ color: blueLight, marginTop: 1 }}>✓</span>{item}
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ fontFamily: FONT, fontSize: 13.5, color: gray, marginTop: 10 }}>El estudio te confirma qué incluye tu paquete.</p>
          )}
        </Card>

        <Card>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>TU SET</span>
          {setNombre ? (
            <>
              <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 19, color: white, marginTop: 10 }}>{setNombre}</p>
              {setDesc && <p style={{ fontFamily: FONT, fontSize: 13.5, color: gray, marginTop: 4 }}>{setDesc}</p>}
              <p style={{ fontFamily: FONT, fontSize: 12, color: gray, marginTop: 6 }}>Set de tu último episodio grabado.</p>
            </>
          ) : (
            <p style={{ fontFamily: FONT, fontSize: 13.5, color: gray, marginTop: 10 }}>
              Aún no tienes episodios grabados. El set se registra con cada episodio.
            </p>
          )}
        </Card>
        <p style={{ fontFamily: FONT, fontSize: 12.5, color: gray, lineHeight: 1.55 }}>
          Los precios de los paquetes son los reales de Élite Podhouse. Pago por adelantado; reprogramación con 48 h de anticipación.
        </p>
      </div>
    </div>
  );
}

function DeliveriesView({ episodios, loading, missing, onChanged }) {
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState("");

  const updateEtapa = async (ep, estado) => {
    setBusyId(ep.id);
    setMsg("");
    const { error } = await supabase.from("episodios").update({ estado }).eq("id", ep.id);
    if (error) setMsg("No se pudo guardar. Inténtalo de nuevo.");
    else {
      setMsg(estado === "publicado" ? "✓ Episodio aprobado. El equipo lo publica." : "✓ Gracias, el equipo toma tus cambios.");
      onChanged && onChanged();
    }
    setBusyId(null);
  };

  return (
    <div>
      <Eyebrow>MIS ENTREGAS</Eyebrow>
      <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: white }}>Mis entregas</h1>
      <p style={{ fontFamily: FONT, fontSize: 13.5, color: gray, marginTop: 6, marginBottom: 20 }}>
        Aquí ves en qué va cada episodio, desde que se graba hasta que se publica.
      </p>
      {loading && <p style={{ fontFamily: FONT, fontSize: 13, color: gray }}>Cargando…</p>}
      {!loading && missing && (
        <p style={{ fontFamily: FONT, fontSize: 13, color: gray }}>
          El seguimiento de entregas aún no está activado en el portal. El equipo lo está preparando.
        </p>
      )}
      {!loading && !missing && episodios.length === 0 && (
        <p style={{ fontFamily: FONT, fontSize: 13, color: gray }}>Aún no hay episodios registrados para tu proyecto.</p>
      )}
      {msg && <p style={{ fontFamily: FONT, fontSize: 13, color: green, marginBottom: 12 }}>{msg}</p>}
      <div className="space-y-3">
        {episodios.map((ep) => (
          <Card key={ep.id}>
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 17, color: white }}>Episodio {ep.numero}</span>
              <EtapaPill etapa={ep.estado} />
            </div>
            <p style={{ fontFamily: FONT, fontSize: 13.5, color: gray, marginTop: 4 }}>{ep.titulo}</p>
            <Stepper etapa={ep.estado} />
            <p style={{ fontFamily: FONT, fontSize: 13, color: gray, marginTop: 12 }}>
              {ep.estado === "publicado"
                ? ep.fecha_entrega ? `Publicado · entrega ${fmtFecha(ep.fecha_entrega)}.` : "Publicado."
                : ep.estado === "en_revision"
                  ? "Te toca a ti: revísalo y apruébalo o pide cambios."
                  : ep.estado === "en_edicion"
                    ? `El equipo está editando tu episodio${ep.fecha_entrega ? ` · entrega ${fmtFecha(ep.fecha_entrega)}` : ""}.`
                    : `Grabado${ep.fecha_grabacion ? ` el ${fmtFecha(ep.fecha_grabacion)}` : ""}, en cola de edición.`}
              {ep.set ? ` · Set ${ep.set.charAt(0) + ep.set.slice(1).toLowerCase()}` : ""}
              {ep.responsable ? ` · Responsable: ${ep.responsable}` : ""}
            </p>
            {(ep.video_url || ep.audio_url) && (
              <div className="flex gap-4 mt-3">
                {ep.video_url && <a href={ep.video_url} target="_blank" rel="noreferrer" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: blueLight }}>▶ Ver video</a>}
                {ep.audio_url && <a href={ep.audio_url} target="_blank" rel="noreferrer" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: blueLight }}>♪ Escuchar audio</a>}
              </div>
            )}
            {ep.estado === "en_revision" && (
              <div className="flex gap-2 mt-4">
                <PillButton disabled={busyId === ep.id} onClick={() => updateEtapa(ep, "publicado")}>
                  {busyId === ep.id ? <Loader2 size={15} className="animate-spin" /> : "Aprobar episodio"}
                </PillButton>
                <PillButton ghost disabled={busyId === ep.id} onClick={() => updateEtapa(ep, "en_edicion")}>
                  Pedir cambios
                </PillButton>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function PaymentsView({ pagos, facturas, abonos, perfil, loading, missing }) {
  // Saldo único: facturas de Cobranza (fuente de verdad) + pagos manuales.
  const { pendiente, pagado } = saldoCliente(facturas, abonos, pagos);
  const total = pagado + pendiente;
  const precio = perfil?.paquete ? PRECIOS[perfil.paquete] : null;
  const abonosPorFactura = {};
  (abonos || []).forEach((a) => { abonosPorFactura[a.factura_id] = (abonosPorFactura[a.factura_id] || 0) + Number(a.monto || 0); });
  const saldoFactura = (f) => Math.max(0, Number(f.monto || 0) - (abonosPorFactura[f.id] || 0));
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <Eyebrow>PAGOS</Eyebrow>
      <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: white }}>Pagos</h1>
      <div className="mt-6 space-y-4">
        <Card blue>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,0.8)", letterSpacing: 1 }}>SALDO PENDIENTE</span>
          <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 32, color: white, marginTop: 8 }}>{fmtMoney(pendiente)}</p>
          <p style={{ fontFamily: FONT, fontSize: 13.5, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>
            {perfil?.paquete && precio
              ? `Del paquete ${perfil.paquete}: mensual ${fmtMoney(precio.mensual)} · por sesión ${fmtMoney(precio.sesion)} · sin IVA.`
              : "Tu paquete aún no tiene pagos registrados."}
          </p>
        </Card>
        <Card>
          <div className="flex justify-between" style={{ fontFamily: FONT, fontSize: 13.5, color: gray }}><span>Pagado</span><b style={{ color: white }}>{fmtMoney(pagado)}</b></div>
          <div className="flex justify-between mt-2" style={{ fontFamily: FONT, fontSize: 13.5, color: gray }}><span>Pendiente</span><b style={{ color: white }}>{fmtMoney(pendiente)}</b></div>
          <div className="flex justify-between mt-2" style={{ fontFamily: FONT, fontSize: 13.5, color: gray }}><span>Total registrado</span><b style={{ color: white }}>{fmtMoney(total)}</b></div>
        </Card>
        {(facturas || []).length > 0 && (
          <Card>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>FACTURAS</span>
            {facturas.map((f) => {
              const saldo = saldoFactura(f);
              const vencida = saldo > 0 && f.vencimiento && f.vencimiento < hoy;
              const abonado = Math.min(Number(f.monto || 0), abonosPorFactura[f.id] || 0);
              return (
                <div key={f.id} className="flex items-center justify-between mt-3" style={{ fontFamily: FONT, fontSize: 13.5 }}>
                  <span style={{ color: gray }}>{f.concepto}{f.vencimiento ? ` · vence ${fmtFecha(f.vencimiento)}` : ""}{vencida ? " · VENCIDA" : ""} · abonado {fmtMoney(abonado)} de {fmtMoney(f.monto)}</span>
                  <b style={{ color: saldo > 0 ? (vencida ? red : amber) : green }}>{saldo > 0 ? fmtMoney(saldo) : "Pagada ✓"}</b>
                </div>
              );
            })}
          </Card>
        )}
        <Card>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>HISTORIAL</span>
          {loading && <p style={{ fontFamily: FONT, fontSize: 13, color: gray, marginTop: 10 }}>Cargando…</p>}
          {!loading && missing && <p style={{ fontFamily: FONT, fontSize: 13, color: gray, marginTop: 10 }}>El registro de pagos aún no está activado en el portal.</p>}
          {!loading && !missing && pagos.length === 0 && <p style={{ fontFamily: FONT, fontSize: 13, color: gray, marginTop: 10 }}>Aún no hay pagos registrados.</p>}
          {pagos.map((p) => (
            <div key={p.id} className="flex items-center justify-between mt-3" style={{ fontFamily: FONT, fontSize: 13.5 }}>
              <span style={{ color: gray }}>{p.concepto} · {p.estado === "pagado" ? (p.fecha_pago ? `pagado el ${fmtFecha(p.fecha_pago)}` : "pagado") : `vence el ${fmtFecha(p.fecha_vencimiento)}`}</span>
              <b style={{ color: p.estado === "pagado" ? green : white }}>{fmtMoney(p.monto)}{p.estado === "pagado" ? " ✓" : ""}</b>
            </div>
          ))}
        </Card>
        <p style={{ fontFamily: FONT, fontSize: 12.5, color: gray, lineHeight: 1.55 }}>
          Los pagos los registra el estudio en el portal; aquí solo los ves. El pago es por adelantado, por tarjeta, transferencia o efectivo.
        </p>
      </div>
    </div>
  );
}

function TipsView({ contenidos, loading, missing }) {
  const tips = contenidos.filter((c) => c.tipo === "tip");
  const noticias = contenidos.filter((c) => c.tipo === "noticia");
  return (
    <div>
      <Eyebrow>TIPS Y NOTICIAS</Eyebrow>
      <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: white }}>Tips y noticias</h1>
      <div className="mt-6 space-y-4">
        {loading && <p style={{ fontFamily: FONT, fontSize: 13, color: gray }}>Cargando…</p>}
        {!loading && missing && <p style={{ fontFamily: FONT, fontSize: 13, color: gray }}>Los tips y noticias aún no están activados en el portal.</p>}
        {!loading && !missing && contenidos.length === 0 && <p style={{ fontFamily: FONT, fontSize: 13, color: gray }}>Próximamente: tips y noticias del estudio.</p>}
        {tips.map((t, i) => (
          <Card key={t.id}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>TIP DE ESTA SEMANA</span>
            <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 18, color: white, marginTop: 8 }}>
              <span style={{ display: "inline-flex", width: 30, height: 30, borderRadius: 10, background: blueSoft, color: blueLight, alignItems: "center", justifyContent: "center", fontSize: 14, marginRight: 10 }}>{i + 1}</span>
              {t.titulo}
            </p>
            <p style={{ fontFamily: FONT, fontSize: 13.5, color: gray, marginTop: 6, lineHeight: 1.55 }}>{t.cuerpo}</p>
          </Card>
        ))}
        {noticias.map((n) => (
          <Card key={n.id} blue>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,0.8)", letterSpacing: 1 }}>NOTICIA DEL ESTUDIO</span>
            <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 18, color: white, marginTop: 8 }}>{n.titulo}</p>
            <p style={{ fontFamily: FONT, fontSize: 13.5, color: "rgba(255,255,255,0.85)", marginTop: 6, lineHeight: 1.55 }}>{n.cuerpo}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

function BookSession({ userId, perfil, onBooked }) {
  const [monthOffset, setMonthOffset] = useState(0); // 0 = mes actual, hasta 2 meses adelante
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [booked, setBooked] = useState({}); // { "2026-11-20": ["09:00", "16:00"] }
  const [gcalReady, setGcalReady] = useState(null); // null = sin comprobar, true/false = Google Calendar disponible o no
  const [calendarWarning, setCalendarWarning] = useState(false);

  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstOffset = (new Date(year, month, 1).getDay() + 6) % 7; // la semana empieza en lunes
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const fechaISO = (d) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const fechaLabel = (d) => `${d} de ${MESES[month]} de ${year}`;
  const monthLabel = `${MESES[month][0].toUpperCase()}${MESES[month].slice(1)} ${year}`;

  const slotsForDay = (d) => {
    const wd = new Date(year, month, d).getDay();
    if (wd === 0) return []; // domingo: estudio cerrado
    if (wd === 6) return SLOTS_SABADO;
    return SLOTS;
  };

  const freeSlots = (d) => {
    const taken = new Set(booked[fechaISO(d)] || []);
    let slots = slotsForDay(d).filter((s) => !taken.has(s));
    if (fechaISO(d) === todayISO) {
      const nowMin = now.getHours() * 60 + now.getMinutes();
      slots = slots.filter((s) => {
        const [h, m] = s.split(":").map(Number);
        return h * 60 + m > nowMin;
      });
    }
    return slots;
  };

  const isPast = (d) => fechaISO(d) < todayISO;

  const changeMonth = (delta) => {
    const next = monthOffset + delta;
    if (next < 0 || next > 2) return;
    setMonthOffset(next);
    setSelectedDay(null);
    setSelectedSlot(null);
  };

  // Carga las sesiones ya agendadas del mes visible para bloquear sus horarios:
  // las de Supabase y, si la función de Google Calendar está desplegada,
  // también los eventos del calendario del estudio.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sesiones").select("fecha, hora").gte("fecha", fechaISO(1)).lte("fecha", fechaISO(daysInMonth)).neq("estado", "Cancelada");
      const map = {};
      (data || []).forEach((s) => {
        if (!map[s.fecha]) map[s.fecha] = [];
        map[s.fecha].push(s.hora);
      });
      setBooked(map);
      try {
        const { data: gcal, error: gcalError } = await supabase.functions.invoke("google-calendar", {
          body: { action: "busy", from: fechaISO(1), to: fechaISO(daysInMonth) },
        });
        if (gcalError) throw gcalError;
        if (gcal && gcal.busy) {
          setGcalReady(true);
          setBooked((prev) => {
            const merged = { ...prev };
            Object.entries(gcal.busy).forEach(([f, horas]) => {
              merged[f] = Array.from(new Set([...(merged[f] || []), ...horas]));
            });
            return merged;
          });
        }
      } catch {
        // Sin función de Google Calendar (aún no desplegada): la disponibilidad
        // sigue siendo la de Supabase. No es un error para el cliente.
        setGcalReady(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const confirm = async () => {
    setError("");
    setSaving(true);
    try {
      const fecha = fechaISO(selectedDay);
      // Revisión final: si otro cliente apartó ese horario mientras elegías, no se duplica.
      // Las sesiones canceladas no bloquean: al cancelar se libera el horario.
      const { data: clash } = await supabase.from("sesiones").select("id").eq("fecha", fecha).eq("hora", selectedSlot).neq("estado", "Cancelada").limit(1);
      if (clash && clash.length > 0) throw new Error("Ese horario ya se apartó. Elige otro, por favor.");
      const { error } = await supabase.from("sesiones").insert({
        cliente_id: userId, fecha, hora: selectedSlot, titulo: `Sesión — ${perfil?.show_nombre || "Grabación"}`,
      });
      if (error) throw error;
      // Agrega la sesión al calendario de Google del estudio (si está conectado).
      if (gcalReady) {
        try {
          const { error: gcalError } = await supabase.functions.invoke("google-calendar", {
            body: { action: "create", fecha, hora: selectedSlot, titulo: `Sesión — ${perfil?.show_nombre || "Grabación"}`, cliente_nombre: perfil?.nombre, cliente_correo: perfil?.correo },
          });
          if (gcalError) setCalendarWarning(true);
        } catch {
          setCalendarWarning(true);
        }
      }
      setConfirmed(true);
      onBooked && onBooked();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (confirmed) {
    return (
      <div className="flex flex-col items-center text-center py-16">
        <div className="rounded-full flex items-center justify-center" style={{ width: 56, height: 56, background: blueSoft }}>
          <CheckCircle2 size={28} color={blueLight} />
        </div>
        <h2 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 23, color: white, marginTop: 18 }}>Sesión confirmada</h2>
        <p style={{ fontFamily: FONT, fontSize: 14, color: gray, marginTop: 6 }}>{fechaLabel(selectedDay)}, {selectedSlot} hrs</p>
        {calendarWarning && (
          <p style={{ fontFamily: FONT, fontSize: 13, color: "#F3A9A9", marginTop: 12 }}>
            Sesión guardada, pero no se pudo agregar al calendario de Google. Avisa al estudio para que la anoten.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <Eyebrow>AGENDAR SESIÓN</Eyebrow>
      <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: white }}>Elige fecha y hora</h1>
      <div className="flex items-center justify-between mt-4">
        <button onClick={() => changeMonth(-1)} disabled={monthOffset === 0} className="rounded-full flex items-center justify-center" style={{ width: 32, height: 32, background: monthOffset === 0 ? "transparent" : card, color: monthOffset === 0 ? "#3A3F5C" : white }}>
          <ChevronLeft size={17} />
        </button>
        <p style={{ fontFamily: FONT, fontSize: 13, color: gray }}>{monthLabel}</p>
        <button onClick={() => changeMonth(1)} disabled={monthOffset === 2} className="rounded-full flex items-center justify-center" style={{ width: 32, height: 32, background: monthOffset === 2 ? "transparent" : card, color: monthOffset === 2 ? "#3A3F5C" : white }}>
          <ChevronRight size={17} />
        </button>
      </div>
      <ErrorBanner message={error} />
      <div className="grid grid-cols-7 gap-1.5 mt-4">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i} className="text-center" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 10, color: gray }}>{d}</div>
        ))}
        {Array.from({ length: firstOffset }).map((_, i) => <div key={"pad" + i} />)}
        {days.map((d) => {
          const isAvailable = !isPast(d) && freeSlots(d).length > 0;
          const isSelected = selectedDay === d;
          return (
            <button key={d} disabled={!isAvailable} onClick={() => { setSelectedDay(d); setSelectedSlot(null); }} className="aspect-square rounded-xl flex items-center justify-center"
              style={{ background: isSelected ? blue : isAvailable ? blueSoft : "transparent", color: isSelected || isAvailable ? white : "#3A3F5C", fontFamily: FONT, fontWeight: 600, fontSize: 13 }}>
              {d}
            </button>
          );
        })}
      </div>
      {selectedDay && (
        <div className="mt-6">
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>HORARIOS DISPONIBLES</span>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {freeSlots(selectedDay).map((s) => (
              <button key={s} onClick={() => setSelectedSlot(s)} className="py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                style={{ background: selectedSlot === s ? blue : card, color: white, border: `1px solid ${selectedSlot === s ? blue : cardAlt}`, fontFamily: FONT, fontSize: 13 }}>
                <Clock size={13} />{s}
              </button>
            ))}
          </div>
        </div>
      )}
      {selectedDay && selectedSlot && (
        <div className="mt-8">
          <PillButton full disabled={saving} onClick={confirm}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <>Confirmar sesión <ArrowRight size={15} /></>}
          </PillButton>
        </div>
      )}
    </div>
  );
}

function NoteBlock({ title, items }) {
  if (!items.length) return null;
  return (
    <div className="mb-5 rounded-2xl p-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: blueLight, letterSpacing: 1 }}>{title}</span>
      <ul className="mt-3 space-y-2.5">
        {items.map((it) => (
          <li key={it.id} className="flex gap-2.5" style={{ fontFamily: FONT, fontSize: 13.5, color: white }}>
            <span style={{ color: blueLight, marginTop: 1 }}>●</span><span style={{ lineHeight: 1.5 }}>{it.contenido}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MySet({ notas, loading }) {
  const byTipo = (t) => notas.filter((n) => n.tipo === t);
  return (
    <div>
      <Eyebrow>DETALLES DEL SET</Eyebrow>
      <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: white }}>Notas de grabación</h1>
      <div className="mt-6">
        {loading && <p style={{ fontFamily: FONT, fontSize: 13, color: gray }}>Cargando…</p>}
        {!loading && notas.length === 0 && <p style={{ fontFamily: FONT, fontSize: 13, color: gray }}>Aún no hay notas para tu proyecto.</p>}
        <NoteBlock title="TÉCNICAS" items={byTipo("tecnica")} />
        <NoteBlock title="CREATIVAS" items={byTipo("creativa")} />
        <NoteBlock title="REQUISITOS" items={byTipo("requisito")} />
      </div>
    </div>
  );
}

function History({ sesiones, loading }) {
  return (
    <div>
      <Eyebrow>HISTORIAL</Eyebrow>
      <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: white }}>Tus sesiones</h1>
      <div className="mt-6 space-y-3">
        {loading && <p style={{ fontFamily: FONT, fontSize: 13, color: gray }}>Cargando…</p>}
        {!loading && sesiones.length === 0 && <p style={{ fontFamily: FONT, fontSize: 13, color: gray }}>Aún no tienes sesiones agendadas.</p>}
        {sesiones.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: card, border: `1px solid ${cardAlt}` }}>
            <div>
              <p style={{ fontFamily: FONT, fontSize: 14, color: white, fontWeight: 600 }}>{s.titulo || "Sesión de grabación"}</p>
              <p style={{ fontFamily: FONT, fontSize: 11.5, color: gray, marginTop: 3 }}>{s.fecha} · {s.hora}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full" style={{ background: blueSoft, color: blueLight, fontFamily: FONT, fontSize: 10.5, fontWeight: 600 }}>{s.estado}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientPortal({ userId, email }) {
  const [view, setView] = useState("dashboard");
  const [perfil, setPerfil] = useState(null);
  const [perfilError, setPerfilError] = useState(null);
  const [sesiones, setSesiones] = useState([]);
  const [notas, setNotas] = useState([]);
  const [episodios, setEpisodios] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [contenidos, setContenidos] = useState([]);
  const [tablesMissing, setTablesMissing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: perfilData, error: perfilErr }, { data: sesionesData }, { data: notasData }, ep, pg, ct, fc, ab] = await Promise.all([
      supabase.from("clientes").select("*").eq("id", userId).single(),
      supabase.from("sesiones").select("*").eq("cliente_id", userId).order("fecha", { ascending: false }),
      supabase.from("notas").select("*").eq("cliente_id", userId),
      safeSelect("episodios", supabase.from("episodios").select("*").eq("cliente_id", userId).order("fecha_grabacion", { ascending: true })),
      safeSelect("pagos", supabase.from("pagos").select("*").eq("cliente_id", userId).order("fecha_vencimiento", { ascending: false })),
      safeSelect("contenidos", supabase.from("contenidos").select("*").eq("publicado", true).order("created_at", { ascending: false })),
      // Adeudo real: las facturas de Cobranza (+ sus abonos) son la fuente
      // de verdad de "Lo que debes"; los pagos manuales se suman aparte.
      safeSelect("facturas", supabase.from("facturas").select("*").eq("cliente_id", userId).order("fecha", { ascending: false })),
      safeSelect("abonos", supabase.from("abonos").select("*").order("fecha", { ascending: false })),
    ]);
    setPerfil(perfilData);
    setPerfilError(perfilErr || null);
    setSesiones(sesionesData || []);
    setNotas(notasData || []);
    // La tabla episodios no tiene columna de número: el número es el orden
    // cronológico por fecha de grabación.
    setEpisodios(ep.data.map((e, i) => ({ ...e, numero: i + 1 })));
    setPagos(pg.data);
    setFacturas(fc.data);
    const idsFacturas = new Set((fc.data || []).map((f) => f.id));
    setAbonos((ab.data || []).filter((a) => idsFacturas.has(a.factura_id)));
    setContenidos(ct.data);
    setTablesMissing(ep.missing || pg.missing || ct.missing || fc.missing || ab.missing);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const nav = [
    { id: "dashboard", label: "Panel", icon: Radio },
    { id: "paquete", label: "Mi paquete", icon: Package },
    { id: "entregas", label: "Mis entregas", icon: Sparkles },
    { id: "pagos", label: "Pagos", icon: Wallet },
    { id: "tips", label: "Tips y noticias", icon: Newspaper },
    { id: "book", label: "Agendar", icon: CalIcon },
    { id: "set", label: "Mi set", icon: Mic },
    { id: "history", label: "Historial", icon: FileText },
  ];

  // Cuenta sin perfil de cliente (p. ej. una cuenta personal del estudio):
  // antes se mostraba el portal vacío sin explicación. Ahora se dice claro
  // con qué cuenta se entró y cómo entrar con la correcta.
  if (!loading && !perfil) {
    const tablaFalta = perfilError?.code === "PGRST205";
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-10" style={{ background: navy }}>
        <div className="w-full rounded-2xl p-6" style={{ background: card, border: `1px solid ${cardAlt}`, maxWidth: 480 }}>
          <div className="flex items-center gap-2.5 mb-6">
            <Logo />
            <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 15, color: white }}>Élite Podhouse</span>
          </div>
          {tablaFalta ? (
            <>
              <Eyebrow>ERROR</Eyebrow>
              <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 22, color: white }}>Falta una tabla en la base de datos</h1>
              <p style={{ fontFamily: FONT, fontSize: 14, color: gray, marginTop: 10, lineHeight: 1.6 }}>
                El portal no pudo cargar los clientes. Hay que aplicar las migraciones de la carpeta supabase/migrations en Supabase.
              </p>
            </>
          ) : (
            <>
              <Eyebrow>SIN ACCESO</Eyebrow>
              <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 22, color: white }}>Esta cuenta no tiene perfil de cliente</h1>
              <p style={{ fontFamily: FONT, fontSize: 14, color: gray, marginTop: 10, lineHeight: 1.6 }}>
                Entraste con <b style={{ color: white }}>{email}</b>. Esa cuenta no tiene un perfil de cliente en Élite Podhouse, por eso el portal se ve vacío.
              </p>
              <p style={{ fontFamily: FONT, fontSize: 14, color: gray, marginTop: 10, lineHeight: 1.6 }}>
                Si eres del estudio, cierra sesión y entra con la cuenta del estudio: <b style={{ color: white }}>elitepodhouse@gmail.com</b>.
              </p>
              <p style={{ fontFamily: FONT, fontSize: 14, color: gray, marginTop: 10, lineHeight: 1.6 }}>
                Si eres cliente y ves este mensaje, escríbenos al 662 132 1405 y lo revisamos.
              </p>
              <div className="mt-6">
                <PillButton full onClick={() => supabase.auth.signOut()}>Cerrar sesión</PillButton>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <Shell nav={nav} view={view} setView={setView} accountEmail={perfil?.usuario ? `@${perfil.usuario}` : email} accountRole="Cliente">
      {view === "dashboard" && <ClientDashboard perfil={perfil} sesiones={sesiones} episodios={episodios} pagos={pagos} facturas={facturas} abonos={abonos} goTo={setView} />}
      {view === "paquete" && <PackageView perfil={perfil} sesiones={sesiones} episodios={episodios} />}
      {view === "entregas" && <DeliveriesView episodios={episodios} loading={loading} missing={tablesMissing} onChanged={load} />}
      {view === "pagos" && <PaymentsView pagos={pagos} facturas={facturas} abonos={abonos} perfil={perfil} loading={loading} missing={tablesMissing} />}
      {view === "tips" && <TipsView contenidos={contenidos} loading={loading} missing={tablesMissing} />}
      {view === "book" && <BookSession userId={userId} perfil={perfil} onBooked={load} />}
      {view === "set" && <MySet notas={notas} loading={loading} />}
      {view === "history" && <History sesiones={sesiones} loading={loading} />}
    </Shell>
  );
}

// ---------- Admin views ----------
// Cuentas con usuario (sin correo): el portal llama a la Edge Function
// create-user, que crea o migra el usuario en Auth con el correo interno
// sintético `usuario@elitepodhouse.local` (usa service_role; por eso el
// portal no puede hacerlo directo). Requiere la migración 003
// (columna clientes.usuario) y la función desplegada con el secreto
// SUPABASE_SERVICE_ROLE_KEY. Sin eso, el formulario muestra el error.
function validarUsuario(u) {
  const texto = String(u || "").trim().toLowerCase();
  return /^[a-z0-9._-]{3,}$/.test(texto) ? texto : null;
}

async function invocarCreateUser(body) {
  const { data, error } = await supabase.functions.invoke("create-user", { body });
  if (error) throw new Error(error.message || "No se pudo contactar la función create-user. ¿Ya está desplegada?");
  if (data && data.error) throw new Error(data.error);
  return data;
}

function AdminClientes() {
  const [clientes, setClientes] = useState([]);
  const [detalleId, setDetalleId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  // Nuevo usuario (cuenta nueva con usuario y contraseña).
  const [nuNombre, setNuNombre] = useState("");
  const [nuUsuario, setNuUsuario] = useState("");
  const [nuPassword, setNuPassword] = useState("");
  const [nuPaquete, setNuPaquete] = useState("");
  const [nuError, setNuError] = useState("");
  const [nuOk, setNuOk] = useState("");
  const [nuSaving, setNuSaving] = useState(false);
  // Acceso con usuario para un cliente que ya existe.
  const [migOpenId, setMigOpenId] = useState(null);
  const [migUsuario, setMigUsuario] = useState("");
  const [migPassword, setMigPassword] = useState("");
  const [migError, setMigError] = useState("");
  const [migSaving, setMigSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("clientes").select("*").order("created_at", { ascending: false });
    setClientes(filtrarCuentasEstudio(data));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = async (id, patch) => {
    setSavingId(id);
    setError("");
    const { error } = await supabase.from("clientes").update(patch).eq("id", id);
    if (error) { setError(error.message); setSavingId(null); return; }
    setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setSavingId(null);
  };

  const crearUsuario = async (e) => {
    e.preventDefault();
    setNuError("");
    setNuOk("");
    const usuario = validarUsuario(nuUsuario);
    if (!nuNombre.trim()) { setNuError("Escribe el nombre del cliente."); return; }
    if (!usuario) { setNuError("El usuario debe tener al menos 3 caracteres: solo letras, números, punto, guion y guion bajo."); return; }
    if (nuPassword.length < 6) { setNuError("La contraseña debe tener al menos 6 caracteres."); return; }
    setNuSaving(true);
    try {
      const data = await invocarCreateUser({ action: "create", nombre: nuNombre.trim(), usuario, password: nuPassword });
      // El trigger on_auth_user_created ya crea la fila vacía al crear el
      // usuario en Auth: el upsert solo le pone nombre, usuario y paquete.
      const { error } = await supabase.from("clientes").upsert(
        { id: data.id, nombre: nuNombre.trim(), usuario, paquete: nuPaquete || null },
        { onConflict: "id" },
      );
      if (error) throw error;
      setNuNombre(""); setNuUsuario(""); setNuPassword(""); setNuPaquete("");
      setNuOk(`Usuario ${usuario} creado. Ya puede entrar con su usuario y contraseña.`);
      load();
    } catch (err) {
      setNuError(err.message);
    } finally {
      setNuSaving(false);
    }
  };

  const crearAcceso = async (e, cliente) => {
    e.preventDefault();
    setMigError("");
    const usuario = validarUsuario(migUsuario);
    if (!usuario) { setMigError("El usuario debe tener al menos 3 caracteres: solo letras, números, punto, guion y guion bajo."); return; }
    if (migPassword.length < 6) { setMigError("La contraseña debe tener al menos 6 caracteres."); return; }
    setMigSaving(true);
    try {
      await invocarCreateUser({ action: "migrate", usuario, password: migPassword, userId: cliente.id });
      await update(cliente.id, { usuario });
      setMigOpenId(null);
      setMigUsuario(""); setMigPassword("");
      load();
    } catch (err) {
      setMigError(err.message);
    } finally {
      setMigSaving(false);
    }
  };

  return (
    <div>
      {detalleId ? (
        <ClienteDetalle clienteId={detalleId} onBack={() => { setDetalleId(null); load(); }} />
      ) : (
      <>
      <Eyebrow>ADMINISTRACIÓN</Eyebrow>
      <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: white }}>Clientes</h1>
      <form onSubmit={crearUsuario} className="mt-6 rounded-2xl p-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>NUEVO USUARIO</span>
        <p style={{ fontFamily: FONT, fontSize: 12.5, color: gray, marginTop: 6, lineHeight: 1.55 }}>
          Crea la cuenta con usuario y contraseña, sin correo. El cliente entra al portal con su usuario.
        </p>
        <input placeholder="Nombre completo" value={nuNombre} onChange={(e) => setNuNombre(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-3" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }} />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <input placeholder="Usuario (p. ej. luis)" value={nuUsuario} onChange={(e) => setNuUsuario(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }} />
          <input type="password" placeholder="Contraseña (mínimo 6)" value={nuPassword} onChange={(e) => setNuPassword(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }} />
        </div>
        <select value={nuPaquete} onChange={(e) => setNuPaquete(e.target.value)} className="w-full rounded-xl px-3 py-2.5 mt-2" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }}>
          <option value="">Paquete (opcional)</option>
          {PAQUETES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <ErrorBanner message={nuError} />
        {nuOk && <p style={{ fontFamily: FONT, fontSize: 13, color: green, marginBottom: 12 }}>{nuOk}</p>}
        <div className="mt-2">
          <PillButton type="submit" disabled={nuSaving}>{nuSaving ? <Loader2 size={15} className="animate-spin" /> : "Crear usuario"}</PillButton>
        </div>
      </form>
      <ErrorBanner message={error} />
      <div className="mt-6 space-y-3">
        {loading && <p style={{ fontFamily: FONT, fontSize: 13, color: gray }}>Cargando…</p>}
        {clientes.map((c) => (
          <div key={c.id} className="rounded-2xl p-4" style={{ background: card, border: `1px solid ${cardAlt}` }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <button onClick={() => setDetalleId(c.id)} className="text-left" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: white, background: "none", border: "none", padding: 0, cursor: "pointer" }}>{c.nombre || c.correo} →</button>
                <p style={{ fontFamily: FONT, fontSize: 11.5, color: gray }}>{c.correo}</p>
                {c.usuario && <p style={{ fontFamily: FONT, fontSize: 11.5, color: blueLight, marginTop: 2 }}>Usuario: {c.usuario}</p>}
              </div>
              <span className="px-2.5 py-1 rounded-full" style={{ background: c.activo ? blueSoft : "rgba(224,93,93,0.12)", color: c.activo ? blueLight : red, fontFamily: FONT, fontSize: 10.5, fontWeight: 600 }}>
                {c.activo ? "Activo" : "Pendiente"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={c.paquete || ""} onChange={(e) => update(c.id, { paquete: e.target.value })} className="rounded-lg px-3 py-2" style={{ background: cardAlt, color: white, fontFamily: FONT, fontSize: 12.5, border: "none" }}>
                <option value="">Sin paquete</option>
                {PAQUETES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input placeholder="Estado del proyecto" defaultValue={c.estado_proyecto || ""} onBlur={(e) => update(c.id, { estado_proyecto: e.target.value })} className="rounded-lg px-3 py-2" style={{ background: cardAlt, color: white, fontFamily: FONT, fontSize: 12.5, border: "none" }} />
            </div>
            {/* Modalidad, set y sesiones incluidas no son columnas de `clientes`
                todavía: están en supabase/migrations/001_portal_inicio.sql como
                paso opcional. El set se toma del último episodio grabado. */}
            <button onClick={() => update(c.id, { activo: !c.activo })} className="mt-2 text-left" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: blueLight }} disabled={savingId === c.id}>
              {savingId === c.id ? "Guardando…" : c.activo ? "Desactivar cuenta" : "Activar cuenta"}
            </button>
            {!c.usuario && (
              migOpenId === c.id ? (
                <form onSubmit={(e) => crearAcceso(e, c)} className="mt-3 rounded-xl p-3" style={{ background: navy, border: `1px solid ${cardAlt}` }}>
                  <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>CREAR ACCESO CON USUARIO</span>
                  <p style={{ fontFamily: FONT, fontSize: 12, color: gray, marginTop: 4, lineHeight: 1.5 }}>
                    Después de esto, el cliente entrará con su usuario y contraseña (ya no con su correo).
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input placeholder="Usuario (p. ej. luis)" value={migUsuario} onChange={(e) => setMigUsuario(e.target.value)} className="rounded-lg px-3 py-2 outline-none" style={{ background: cardAlt, color: white, fontFamily: FONT, fontSize: 12.5, border: "none" }} />
                    <input type="password" placeholder="Contraseña (mínimo 6)" value={migPassword} onChange={(e) => setMigPassword(e.target.value)} className="rounded-lg px-3 py-2 outline-none" style={{ background: cardAlt, color: white, fontFamily: FONT, fontSize: 12.5, border: "none" }} />
                  </div>
                  <ErrorBanner message={migError} />
                  <div className="flex gap-2 mt-2">
                    <PillButton type="submit" disabled={migSaving}>{migSaving ? <Loader2 size={15} className="animate-spin" /> : "Crear acceso"}</PillButton>
                    <PillButton ghost onClick={() => { setMigOpenId(null); setMigError(""); }}>Cancelar</PillButton>
                  </div>
                </form>
              ) : (
                <button onClick={() => { setMigOpenId(c.id); setMigUsuario(""); setMigPassword(""); setMigError(""); }} className="mt-2 text-left block" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: blueLight }}>
                  Crear acceso con usuario
                </button>
              )
            )}
          </div>
        ))}
      </div>
      </>
      )}
    </div>
  );
}

// Agenda del admin (auditoría Élite OS, tanda 4): crear reservas con
// anticipo/paquete/set, cancelar y reprogramar, y registro de visitas.
// Las columnas extra de sesiones y la tabla visitas llegan con la
// migración 004 (supabase/migrations/004_agenda_y_visitas.sql); el código
// detecta si existen y funciona sin ellas (sin anticipo/paquete/set/nota).
function AdminSesiones() {
  const clientes = useClientesList();
  const [sesiones, setSesiones] = useState([]);
  const [tieneExtras, setTieneExtras] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  // Nueva reserva.
  const [fCliente, setFCliente] = useState("");
  const [fFecha, setFFecha] = useState("");
  const [fHora, setFHora] = useState("");
  const [fPaquete, setFPaquete] = useState("");
  const [fSet, setFSet] = useState("");
  const [fAnticipo, setFAnticipo] = useState("");
  const [fTelefono, setFTelefono] = useState("");
  const [fNota, setFNota] = useState("");
  const [saving, setSaving] = useState(false);
  const [gcalAviso, setGcalAviso] = useState(false);
  // Reprogramar.
  const [reprogId, setReprogId] = useState(null);
  const [reprogFecha, setReprogFecha] = useState("");
  const [reprogHora, setReprogHora] = useState("");
  // Imagen de cita de la sesión (como las visitas): vista previa y descarga.
  const [previewSesion, setPreviewSesion] = useState(null); // { sesion, url }
  const [busySesionId, setBusySesionId] = useState(null);

  const now = new Date();
  const hoyISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("sesiones").select("*, clientes(nombre, correo)").order("fecha", { ascending: false });
    setSesiones(data || []);
    const probe = await supabase.from("sesiones").select("paquete").limit(1);
    setTieneExtras(!probe.error);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const slotsPara = (fechaStr) => {
    if (!fechaStr) return SLOTS;
    const wd = new Date(`${fechaStr}T12:00:00`).getDay();
    if (wd === 0) return [];
    if (wd === 6) return SLOTS_SABADO;
    return SLOTS;
  };

  const crear = async (e) => {
    e.preventDefault();
    setError(""); setOkMsg(""); setGcalAviso(false);
    if (!fCliente || !fFecha || !fHora) { setError("Elige cliente, fecha y hora."); return; }
    const { data: clash } = await supabase.from("sesiones").select("id").eq("fecha", fFecha).eq("hora", fHora).neq("estado", "Cancelada").limit(1);
    if (clash && clash.length > 0) { setError("Ese horario ya está ocupado. Elige otro."); return; }
    setSaving(true);
    const cliente = clientes.find((c) => c.id === fCliente);
    const titulo = `Sesión — ${cliente?.nombre || "Grabación"}`;
    const base = { cliente_id: fCliente, fecha: fFecha, hora: fHora, titulo, estado: "Agendada" };
    const extra = tieneExtras
      ? { paquete: fPaquete || null, set: fSet || null, anticipo: fAnticipo ? Number(fAnticipo) : null, telefono: fTelefono || cliente?.telefono || null, nota: fNota || null }
      : {};
    const { error: err } = await supabase.from("sesiones").insert({ ...base, ...extra });
    if (err) { setError(err.message); setSaving(false); return; }
    // Google Calendar: mejor esfuerzo, como en la reserva del cliente.
    try {
      const { error: gcalError } = await supabase.functions.invoke("google-calendar", {
        body: { action: "create", fecha: fFecha, hora: fHora, titulo, cliente_nombre: cliente?.nombre, cliente_correo: cliente?.correo },
      });
      if (gcalError) setGcalAviso(true);
    } catch { setGcalAviso(true); }
    setFCliente(""); setFFecha(""); setFHora(""); setFPaquete(""); setFSet(""); setFAnticipo(""); setFTelefono(""); setFNota("");
    setOkMsg("Sesión creada.");
    setSaving(false);
    load();
  };

  const cancelar = async (s) => {
    setError(""); setOkMsg("");
    // La restricción única (fecha, hora) seguiría bloqueando el horario
    // aunque la sesión esté cancelada: se mueve la hora a 00:00 y se guarda
    // la hora original en la nota, así el horario queda libre de verdad.
    const patch = { estado: "Cancelada" };
    if (tieneExtras) {
      patch.hora = "00:00";
      patch.nota = `${s.nota ? s.nota + " · " : ""}Cancelada (horario original ${s.hora})`;
    }
    const { error: err } = await supabase.from("sesiones").update(patch).eq("id", s.id);
    if (err) setError(err.message);
    else { setOkMsg("Sesión cancelada; el horario quedó libre."); load(); }
  };

  const reprogramar = async (s) => {
    setError(""); setOkMsg("");
    if (!reprogFecha || !reprogHora) { setError("Elige fecha y hora nuevas."); return; }
    const { data: clash } = await supabase.from("sesiones").select("id").eq("fecha", reprogFecha).eq("hora", reprogHora).neq("estado", "Cancelada").neq("id", s.id).limit(1);
    if (clash && clash.length > 0) { setError("Ese horario ya está ocupado. Elige otro."); return; }
    const { error: err } = await supabase.from("sesiones").update({ fecha: reprogFecha, hora: reprogHora, estado: "Agendada" }).eq("id", s.id);
    if (err) setError(err.message);
    else { setReprogId(null); setOkMsg("Sesión reprogramada."); load(); }
  };

  const eliminar = async (s) => {
    const { error: err } = await supabase.from("sesiones").delete().eq("id", s.id);
    if (err) setError(err.message);
    else load();
  };

  const telefonoDe = (s) => s.telefono || (clientes.find((c) => c.id === s.cliente_id) || {}).telefono || "";

  const verImagenSesion = async (s) => {
    setBusySesionId(s.id);
    try {
      const c = await generarImagenSesion(s);
      setPreviewSesion({ sesion: s, url: c.toDataURL("image/png") });
    } catch { setError("No se pudo generar la imagen de cita."); }
    setBusySesionId(null);
  };

  const descargarSesion = async (s) => {
    setBusySesionId(s.id);
    const ok = await descargarImagenSesion(s);
    if (!ok) setError("No se pudo generar la imagen de cita.");
    setBusySesionId(null);
  };

  return (
    <div>
      <Eyebrow>ADMINISTRACIÓN</Eyebrow>
      <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: white }}>Agenda</h1>
      <p style={{ fontFamily: FONT, fontSize: 13.5, color: gray, marginTop: 6 }}>Crea sesiones, cancela o reprograma, y registra visitas al estudio.</p>
      {error && <p style={{ fontFamily: FONT, fontSize: 13, color: red, marginTop: 12 }}>{error}</p>}
      {okMsg && <p style={{ fontFamily: FONT, fontSize: 13, color: green, marginTop: 12 }}>{okMsg}</p>}
      {gcalAviso && <p style={{ fontFamily: FONT, fontSize: 13, color: amber, marginTop: 12 }}>Sesión guardada, pero no se pudo agregar al calendario de Google. Avisa al estudio para que la anoten.</p>}

      <form onSubmit={crear} className="mt-6 rounded-2xl p-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>NUEVA SESIÓN</span>
        {!tieneExtras && (
          <p style={{ fontFamily: FONT, fontSize: 12.5, color: amber, marginTop: 6, lineHeight: 1.55 }}>
            Las columnas de anticipo, paquete, set y nota aún no están en la base (migración 004 pendiente). La sesión se guarda igual, sin esos datos.
          </p>
        )}
        <select value={fCliente} onChange={(e) => { setFCliente(e.target.value); const c = clientes.find((x) => x.id === e.target.value); setFTelefono(c?.telefono || ""); }} className="w-full rounded-xl px-3 py-2.5 outline-none mt-3" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }}>
          <option value="">Cliente</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre || c.correo}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <input type="date" min={hoyISO} value={fFecha} onChange={(e) => { setFFecha(e.target.value); setFHora(""); }} className="rounded-xl px-3 py-2.5 outline-none" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }} />
          <select value={fHora} onChange={(e) => setFHora(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }}>
            <option value="">Hora</option>
            {slotsPara(fFecha).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={fPaquete} onChange={(e) => setFPaquete(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }}>
            <option value="">Paquete (opcional)</option>
            {PAQUETES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={fSet} onChange={(e) => setFSet(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }}>
            <option value="">Set (opcional)</option>
            {["OCRE", "ÍNDIGO", "NOGAL", "ÓNIX", "Pantalla verde"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="number" min="0" placeholder="Anticipo $ (opcional)" value={fAnticipo} onChange={(e) => setFAnticipo(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }} />
          <input placeholder="Teléfono (opcional)" value={fTelefono} onChange={(e) => setFTelefono(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }} />
        </div>
        <input placeholder="Nota (opcional)" value={fNota} onChange={(e) => setFNota(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }} />
        <div className="mt-3">
          <PillButton type="submit" disabled={saving}>{saving ? <Loader2 size={15} className="animate-spin" /> : "Crear sesión"}</PillButton>
        </div>
      </form>

      {previewSesion && (
        <div className="mt-6 rounded-2xl p-4" style={{ background: card, border: `1px solid ${cardAlt}` }}>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>IMAGEN DE CITA — {previewSesion.sesion.clientes?.nombre || ""}</span>
          <img src={previewSesion.url} alt="Imagen de cita" className="w-full rounded-xl mt-3" style={{ maxWidth: 540 }} />
          <div className="flex gap-3 mt-3 flex-wrap items-center">
            <PillButton onClick={() => descargarSesion(previewSesion.sesion)} disabled={busySesionId === previewSesion.sesion.id}>
              {busySesionId === previewSesion.sesion.id ? <Loader2 size={15} className="animate-spin" /> : "Descargar imagen de cita"}
            </PillButton>
            <a href={enlaceGoogleCalendarSesion(previewSesion.sesion)} target="_blank" rel="noreferrer" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: blueLight }}>Agregar a Google Calendar</a>
            {telefonoDe(previewSesion.sesion) && <a href={waUrl(telefonoDe(previewSesion.sesion), mensajeWhatsAppSesion(previewSesion.sesion))} target="_blank" rel="noreferrer" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: green }}>Confirmar por WhatsApp</a>}
            <button onClick={() => setPreviewSesion(null)} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: gray, background: "none", border: "none", padding: 0, cursor: "pointer" }}>Cerrar</button>
          </div>
          <p style={{ fontFamily: FONT, fontSize: 11.5, color: gray, marginTop: 8 }}>{nombreArchivoSesion(previewSesion.sesion)}</p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>SESIONES</span>
        {loading && <p style={{ fontFamily: FONT, fontSize: 13, color: gray }}>Cargando…</p>}
        {!loading && sesiones.length === 0 && <p style={{ fontFamily: FONT, fontSize: 13, color: gray }}>Aún no hay sesiones agendadas.</p>}
        {sesiones.map((s) => {
          const cancelada = s.estado === "Cancelada";
          const tel = telefonoDe(s);
          const wa = tel ? waUrl(tel, mensajeWhatsAppSesion(s)) : "";
          return (
            <div key={s.id} className="rounded-2xl p-4" style={{ background: card, border: `1px solid ${cardAlt}` }}>
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: white }}>{s.clientes?.nombre || s.clientes?.correo}</p>
                  <p style={{ fontFamily: FONT, fontSize: 11.5, color: gray, marginTop: 3 }}>
                    {s.titulo || "Sesión de grabación"} · {cancelada ? "Cancelada" : `${fmtFecha(s.fecha)} · ${s.hora}`}
                    {s.paquete ? ` · ${s.paquete}` : ""}{s.set ? ` · Set ${s.set}` : ""}{s.anticipo ? ` · Anticipo ${fmtMoney(s.anticipo)}` : ""}
                  </p>
                  {s.nota && <p style={{ fontFamily: FONT, fontSize: 11.5, color: gray, marginTop: 3 }}>{s.nota}</p>}
                </div>
                <span className="px-2.5 py-1 rounded-full" style={{ background: cancelada ? "rgba(224,93,93,0.12)" : blueSoft, color: cancelada ? red : blueLight, fontFamily: FONT, fontSize: 10.5, fontWeight: 600 }}>{s.estado}</span>
              </div>
              <div className="flex gap-3 mt-3 flex-wrap">
                {wa && <a href={wa} target="_blank" rel="noreferrer" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: green }}>Confirmar por WhatsApp</a>}
                <button onClick={() => verImagenSesion(s)} disabled={busySesionId === s.id} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: blueLight, background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                  {busySesionId === s.id ? "Generando…" : "Imagen de cita"}
                </button>
                <button onClick={() => descargarSesion(s)} disabled={busySesionId === s.id} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: blueLight, background: "none", border: "none", padding: 0, cursor: "pointer" }}>Descargar imagen de cita</button>
                <a href={enlaceGoogleCalendarSesion(s)} target="_blank" rel="noreferrer" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: blueLight }}>Agregar a Google Calendar</a>
                {!cancelada && (
                  <>
                    <button onClick={() => { setReprogId(reprogId === s.id ? null : s.id); setReprogFecha(s.fecha); setReprogHora(s.hora); }} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: blueLight, background: "none", border: "none", padding: 0, cursor: "pointer" }}>Reprogramar</button>
                    <button onClick={() => cancelar(s)} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: red, background: "none", border: "none", padding: 0, cursor: "pointer" }}>Cancelar</button>
                  </>
                )}
                {cancelada && (
                  <button onClick={() => eliminar(s)} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: gray, background: "none", border: "none", padding: 0, cursor: "pointer" }}>Eliminar</button>
                )}
              </div>
              {reprogId === s.id && (
                <div className="flex gap-2 mt-3">
                  <input type="date" min={hoyISO} value={reprogFecha} onChange={(e) => { setReprogFecha(e.target.value); setReprogHora(""); }} className="rounded-lg px-3 py-2 outline-none" style={{ background: cardAlt, color: white, fontFamily: FONT, fontSize: 12.5, border: "none" }} />
                  <select value={reprogHora} onChange={(e) => setReprogHora(e.target.value)} className="rounded-lg px-3 py-2 outline-none" style={{ background: cardAlt, color: white, fontFamily: FONT, fontSize: 12.5, border: "none" }}>
                    <option value="">Hora</option>
                    {slotsPara(reprogFecha).map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <button onClick={() => reprogramar(s)} className="rounded-lg px-3 py-2" style={{ background: blue, color: white, fontFamily: FONT, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}>Guardar</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>VISITAS AL ESTUDIO</span>
        <VisitasPanel />
      </div>
    </div>
  );
}

function useClientesList() {
  const [clientes, setClientes] = useState([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("clientes").select("id, nombre, correo, telefono").order("created_at", { ascending: false });
      setClientes(filtrarCuentasEstudio(data));
    })();
  }, []);
  return clientes;
}

// Colaboradores del estudio (tabla `colaboradores`): se usan para asignar
// el responsable de cada episodio en Entregas y en Producción.
function useColaboradores() {
  const [colabs, setColabs] = useState([]);
  useEffect(() => {
    (async () => {
      const res = await safeSelect("colaboradores", supabase.from("colaboradores").select("*").order("nombre"));
      setColabs(res.data || []);
    })();
  }, []);
  return colabs;
}

function MissingTablesBanner() {
  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: amberBg, border: `1px solid ${amber}44` }}>
      <p style={{ fontFamily: FONT, fontSize: 13, color: amber, lineHeight: 1.55 }}>
        Faltan las tablas de entregas, pagos y contenidos. Aplica una vez la migración
        <span style={{ fontWeight: 700 }}> supabase/migrations/001_portal_inicio.sql </span>
        en el SQL Editor de Supabase y recarga.
      </p>
    </div>
  );
}

function AdminEntregas() {
  const clientes = useClientesList();
  const colabs = useColaboradores();
  const [clienteId, setClienteId] = useState("");
  const [episodios, setEpisodios] = useState([]);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("podcast");
  const [setNombre, setSetNombre] = useState("");
  const [responsable, setResponsable] = useState("");
  const [fechaGrab, setFechaGrab] = useState("");
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (cid) => {
    if (!cid) { setEpisodios([]); return; }
    setLoading(true);
    const res = await safeSelect("episodios", supabase.from("episodios").select("*").eq("cliente_id", cid).order("fecha_grabacion", { ascending: true }));
    setEpisodios(res.data.map((e, i) => ({ ...e, numero: i + 1 })));
    setMissing(res.missing);
    setLoading(false);
  }, []);

  useEffect(() => { load(clienteId); }, [clienteId, load]);

  const setEtapa = async (ep, estado) => {
    const { error } = await supabase.from("episodios").update({ estado }).eq("id", ep.id);
    if (error) { setError(error.message); return; }
    load(clienteId);
  };

  const setResponsableEp = async (ep, nombre) => {
    const { error } = await supabase.from("episodios").update({ responsable: nombre || null }).eq("id", ep.id);
    if (error) { setError(error.message); return; }
    load(clienteId);
  };

  const add = async (e) => {
    e.preventDefault();
    setError("");
    if (!clienteId || !titulo) { setError("Elige cliente y título."); return; }
    setSaving(true);
    const { error } = await supabase.from("episodios").insert({
      cliente_id: clienteId, titulo, tipo, set: setNombre || null,
      estado: "grabado",
      responsable: responsable || null,
      fecha_grabacion: fechaGrab || null, fecha_entrega: fechaEntrega || null,
    });
    if (error) setError(error.message);
    else { setTitulo(""); setResponsable(""); setFechaGrab(""); setFechaEntrega(""); load(clienteId); }
    setSaving(false);
  };

  return (
    <div>
      <Eyebrow>ADMINISTRACIÓN</Eyebrow>
      <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: white }}>Entregas</h1>
      {missing && <div className="mt-4"><MissingTablesBanner /></div>}
      <div className="mt-6">
        <label style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: gray, display: "block", marginBottom: 6 }}>CLIENTE</label>
        <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full rounded-xl px-4 py-3" style={{ background: card, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }}>
          <option value="">Selecciona un cliente</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre || c.correo}</option>)}
        </select>
      </div>
      {loading && <p style={{ fontFamily: FONT, fontSize: 13, color: gray, marginTop: 16 }}>Cargando…</p>}
      {!loading && clienteId && episodios.length === 0 && !missing && (
        <p style={{ fontFamily: FONT, fontSize: 13, color: gray, marginTop: 16 }}>Sin episodios para este cliente. Agrega el primero abajo.</p>
      )}
      <div className="space-y-3 mt-4">
        {episodios.map((ep) => (
          <div key={ep.id} className="rounded-2xl p-4" style={{ background: card, border: `1px solid ${cardAlt}` }}>
            <div className="flex items-center justify-between">
              <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: white }}>Episodio {ep.numero} — {ep.titulo}</p>
              <EtapaPill etapa={ep.estado} />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <label style={{ fontFamily: FONT, fontSize: 12, color: gray }}>Etapa:</label>
              <select value={ep.estado} onChange={(e) => setEtapa(ep, e.target.value)} className="rounded-lg px-3 py-2" style={{ background: cardAlt, color: white, fontFamily: FONT, fontSize: 12.5, border: "none" }}>
                {PRODUCCION_ETAPAS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              {ep.set && <span style={{ fontFamily: FONT, fontSize: 12, color: gray }}>Set {ep.set.charAt(0) + ep.set.slice(1).toLowerCase()}</span>}
              {ep.fecha_grabacion && <span style={{ fontFamily: FONT, fontSize: 12, color: gray }}>Grabado el {fmtFecha(ep.fecha_grabacion)}</span>}
              {ep.fecha_entrega && <span style={{ fontFamily: FONT, fontSize: 12, color: gray }}>Entrega {fmtFecha(ep.fecha_entrega)}</span>}
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <label style={{ fontFamily: FONT, fontSize: 12, color: gray }}>Responsable:</label>
              <span style={{ fontFamily: FONT, fontSize: 12, color: white }}>{ep.responsable || "Sin asignar"}</span>
              <select value={ep.responsable || ""} onChange={(e) => setResponsableEp(ep, e.target.value)} className="rounded-lg px-3 py-2" style={{ background: cardAlt, color: white, fontFamily: FONT, fontSize: 12.5, border: "none" }}>
                <option value="">Sin asignar</option>
                {colabs.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                {ep.responsable && !colabs.some((c) => c.nombre === ep.responsable) && <option value={ep.responsable}>{ep.responsable}</option>}
              </select>
            </div>
            <EpisodioDetalle
              ep={ep}
              clienteNombre={(clientes.find((c) => c.id === clienteId) || {}).nombre}
              telefono={(clientes.find((c) => c.id === clienteId) || {}).telefono}
              onChanged={() => load(clienteId)}
            />
          </div>
        ))}
      </div>
      {clienteId && !missing && (
        <form onSubmit={add} className="mt-6 rounded-2xl p-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>AGREGAR EPISODIO</span>
          <input placeholder="Título del episodio" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-3" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }} />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-xl px-3 py-2.5" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }}>
              <option value="podcast">Podcast</option>
              <option value="reel">Reel</option>
              <option value="video">Video</option>
            </select>
            <select value={setNombre} onChange={(e) => setSetNombre(e.target.value)} className="rounded-xl px-3 py-2.5" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }}>
              <option value="">Set (opcional)</option>
              {["OCRE", "INDIGO", "NOGAL", "ONIX"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <label style={{ fontFamily: FONT, fontSize: 12, color: gray }}>Fecha de grabación
              <input type="date" value={fechaGrab} onChange={(e) => setFechaGrab(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-1" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }} />
            </label>
            <label style={{ fontFamily: FONT, fontSize: 12, color: gray }}>Fecha de entrega
              <input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-1" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }} />
            </label>
          </div>
          <label style={{ fontFamily: FONT, fontSize: 12, color: gray, display: "block", marginTop: 8 }}>Responsable
            <select value={responsable} onChange={(e) => setResponsable(e.target.value)} className="w-full rounded-xl px-3 py-2.5 mt-1" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }}>
              <option value="">Sin asignar</option>
              {colabs.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
            </select>
          </label>
          <ErrorBanner message={error} />
          <div className="mt-3">
            <PillButton type="submit" disabled={saving}>{saving ? <Loader2 size={15} className="animate-spin" /> : "Agregar episodio"}</PillButton>
          </div>
        </form>
      )}
    </div>
  );
}

// Tablero de Producción: todos los episodios de todos los clientes en
// un solo lugar, con filtros por etapa y cambio de etapa y responsable
// directo en cada tarjeta.
function AdminProduccion() {
  const colabs = useColaboradores();
  const [episodios, setEpisodios] = useState([]);
  const [clientesMap, setClientesMap] = useState({});
  const [telefonosMap, setTelefonosMap] = useState({});
  const [filtro, setFiltro] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [ep, cl] = await Promise.all([
      safeSelect("episodios", supabase.from("episodios").select("*")),
      supabase.from("clientes").select("id, nombre, correo, telefono"),
    ]);
    const ordenados = [...(ep.data || [])].sort((a, b) => {
      if (!a.fecha_grabacion && !b.fecha_grabacion) return 0;
      if (!a.fecha_grabacion) return 1;
      if (!b.fecha_grabacion) return -1;
      return String(a.fecha_grabacion).localeCompare(String(b.fecha_grabacion));
    });
    setEpisodios(ordenados);
    setMissing(ep.missing);
    const map = {};
    const telMap = {};
    filtrarCuentasEstudio(cl.data).forEach((c) => { map[c.id] = c.nombre || c.correo || "Cliente"; telMap[c.id] = c.telefono || ""; });
    setClientesMap(map);
    setTelefonosMap(telMap);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const setEtapa = async (ep, estado) => {
    const { error } = await supabase.from("episodios").update({ estado }).eq("id", ep.id);
    if (error) { setError(error.message); return; }
    load();
  };

  const setResponsableEp = async (ep, nombre) => {
    const { error } = await supabase.from("episodios").update({ responsable: nombre || null }).eq("id", ep.id);
    if (error) { setError(error.message); return; }
    load();
  };

  const conteos = { todos: episodios.length };
  PRODUCCION_ETAPAS.forEach((t) => { conteos[t.id] = episodios.filter((e) => e.estado === t.id).length; });
  const visibles = filtro === "todos" ? episodios : episodios.filter((e) => e.estado === filtro);
  const filtros = [{ id: "todos", label: "Todos" }, ...PRODUCCION_ETAPAS];

  return (
    <div>
      <Eyebrow>ADMINISTRACIÓN</Eyebrow>
      <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: white }}>Producción</h1>
      <p style={{ fontFamily: FONT, fontSize: 13.5, color: gray, marginTop: 6 }}>
        Todos los episodios en producción, por etapa y con su responsable.
      </p>
      {error && <p style={{ fontFamily: FONT, fontSize: 13, color: red, marginTop: 12 }}>{error}</p>}
      {missing && <div className="mt-4"><MissingTablesBanner /></div>}
      <div className="flex gap-2 mt-6 flex-wrap">
        {filtros.map((f) => (
          <button key={f.id} onClick={() => setFiltro(f.id)} className="px-3.5 py-2 rounded-full" style={{ background: filtro === f.id ? blue : card, border: `1px solid ${filtro === f.id ? blue : cardAlt}`, color: filtro === f.id ? white : gray, fontFamily: FONT, fontSize: 12.5, fontWeight: 600 }}>
            {f.label} · {conteos[f.id] || 0}
          </button>
        ))}
      </div>
      {loading && <p style={{ fontFamily: FONT, fontSize: 13, color: gray, marginTop: 16 }}>Cargando…</p>}
      {!loading && !missing && episodios.length === 0 && (
        <p style={{ fontFamily: FONT, fontSize: 13, color: gray, marginTop: 16 }}>Aún no hay episodios en producción.</p>
      )}
      {!loading && !missing && visibles.length === 0 && episodios.length > 0 && (
        <p style={{ fontFamily: FONT, fontSize: 13, color: gray, marginTop: 16 }}>Ningún episodio en esta etapa.</p>
      )}
      <div className="space-y-3 mt-4">
        {visibles.map((ep) => (
          <div key={ep.id} className="rounded-2xl p-4" style={{ background: card, border: `1px solid ${cardAlt}` }}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: white }}>{ep.titulo}</p>
                <p style={{ fontFamily: FONT, fontSize: 12, color: gray, marginTop: 2 }}>{clientesMap[ep.cliente_id] || "Cliente"}</p>
              </div>
              <EtapaPill etapa={ep.estado} />
            </div>
            <p style={{ fontFamily: FONT, fontSize: 12, color: gray, marginTop: 8 }}>
              {ep.set ? `Set ${ep.set.charAt(0) + ep.set.slice(1).toLowerCase()} · ` : ""}
              {ep.fecha_grabacion ? `Grabado el ${fmtFecha(ep.fecha_grabacion)}` : "Sin fecha de grabación"}
              {ep.fecha_entrega ? ` · Entrega ${fmtFecha(ep.fecha_entrega)}` : ""}
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <label style={{ fontFamily: FONT, fontSize: 12, color: gray }}>Etapa:</label>
              <select value={ep.estado} onChange={(e) => setEtapa(ep, e.target.value)} className="rounded-lg px-3 py-2" style={{ background: cardAlt, color: white, fontFamily: FONT, fontSize: 12.5, border: "none" }}>
                {PRODUCCION_ETAPAS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <label style={{ fontFamily: FONT, fontSize: 12, color: gray }}>Responsable:</label>
              <span style={{ fontFamily: FONT, fontSize: 12, color: white }}>{ep.responsable || "Sin asignar"}</span>
              <select value={ep.responsable || ""} onChange={(e) => setResponsableEp(ep, e.target.value)} className="rounded-lg px-3 py-2" style={{ background: cardAlt, color: white, fontFamily: FONT, fontSize: 12.5, border: "none" }}>
                <option value="">Sin asignar</option>
                {colabs.map((c) => <option key={c.id} value={c.nombre}>{c.nombre}</option>)}
                {ep.responsable && !colabs.some((c) => c.nombre === ep.responsable) && <option value={ep.responsable}>{ep.responsable}</option>}
              </select>
            </div>
            <EpisodioDetalle ep={ep} clienteNombre={clientesMap[ep.cliente_id]} telefono={telefonosMap[ep.cliente_id]} onChanged={load} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPagos() {
  const clientes = useClientesList();
  const [clienteId, setClienteId] = useState("");
  const [pagos, setPagos] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [missing, setMissing] = useState(false);
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [estado, setEstado] = useState("pagado");
  const [fechaVenc, setFechaVenc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (cid) => {
    if (!cid) { setPagos([]); setFacturas([]); setAbonos([]); return; }
    const res = await safeSelect("pagos", supabase.from("pagos").select("*").eq("cliente_id", cid).order("fecha_vencimiento", { ascending: false }));
    // Las facturas de Cobranza se reflejan aquí: son la fuente del adeudo
    // que ve el cliente; los pagos manuales de abajo son registros aparte.
    const fc = await safeSelect("facturas", supabase.from("facturas").select("*").eq("cliente_id", cid).order("fecha", { ascending: false }));
    const ab = await safeSelect("abonos", supabase.from("abonos").select("*").order("fecha", { ascending: false }));
    setPagos(res.data);
    setFacturas(fc.data);
    const ids = new Set((fc.data || []).map((f) => f.id));
    setAbonos((ab.data || []).filter((a) => ids.has(a.factura_id)));
    setMissing(res.missing || fc.missing || ab.missing);
  }, []);

  useEffect(() => { load(clienteId); }, [clienteId, load]);

  const { pendiente, pagado } = saldoCliente(facturas, abonos, pagos);
  const abonosPorFactura = {};
  abonos.forEach((a) => { abonosPorFactura[a.factura_id] = (abonosPorFactura[a.factura_id] || 0) + Number(a.monto || 0); });
  const saldoFactura = (f) => Math.max(0, Number(f.monto || 0) - (abonosPorFactura[f.id] || 0));

  const add = async (e) => {
    e.preventDefault();
    setError("");
    if (!clienteId || !monto || !concepto) { setError("Elige cliente, monto y concepto."); return; }
    setSaving(true);
    const hoy = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("pagos").insert({
      cliente_id: clienteId, monto: Number(monto), concepto, estado,
      fecha_vencimiento: fechaVenc || hoy,
      fecha_pago: estado === "pagado" ? hoy : null,
    });
    if (error) setError(error.message);
    else { setMonto(""); setConcepto(""); setFechaVenc(""); load(clienteId); }
    setSaving(false);
  };

  const remove = async (id) => {
    const { error } = await supabase.from("pagos").delete().eq("id", id);
    if (error) { setError(error.message); return; }
    load(clienteId);
  };

  return (
    <div>
      <Eyebrow>ADMINISTRACIÓN</Eyebrow>
      <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: white }}>Pagos</h1>
      {missing && <div className="mt-4"><MissingTablesBanner /></div>}
      <div className="mt-6">
        <label style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: gray, display: "block", marginBottom: 6 }}>CLIENTE</label>
        <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full rounded-xl px-4 py-3" style={{ background: card, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }}>
          <option value="">Selecciona un cliente</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre || c.correo}</option>)}
        </select>
      </div>
      {clienteId && !missing && (
        <>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-2xl p-4" style={{ background: card, border: `1px solid ${cardAlt}` }}>
              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>PAGADO</span>
              <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 22, color: green, marginTop: 6 }}>{fmtMoney(pagado)}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: card, border: `1px solid ${cardAlt}` }}>
              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>PENDIENTE</span>
              <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 22, color: pendiente > 0 ? amber : white, marginTop: 6 }}>{fmtMoney(pendiente)}</p>
            </div>
          </div>
          {facturas.length > 0 && (
            <div className="mt-4">
              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>FACTURAS DE COBRANZA — ESTO ES LO QUE VE EL CLIENTE</span>
              <div className="space-y-2 mt-2">
                {facturas.map((f) => {
                  const saldo = saldoFactura(f);
                  const abonado = Math.min(Number(f.monto || 0), abonosPorFactura[f.id] || 0);
                  return (
                    <div key={f.id} className="flex items-center justify-between p-3 rounded-2xl" style={{ background: card, border: `1px solid ${cardAlt}` }}>
                      <div>
                        <p style={{ fontFamily: FONT, fontSize: 13.5, color: white }}>{f.concepto}</p>
                        <p style={{ fontFamily: FONT, fontSize: 11.5, color: gray }}>{f.tipo_cobro || ""}{f.vencimiento ? ` · Vence ${fmtFecha(f.vencimiento)}` : ""} · abonado {fmtMoney(abonado)} de {fmtMoney(f.monto)}</p>
                      </div>
                      <b style={{ fontFamily: FONT, fontSize: 14, color: saldo > 0 ? amber : green }}>{saldo > 0 ? `Saldo ${fmtMoney(saldo)}` : "Pagada ✓"}</b>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="space-y-2 mt-4">
            {pagos.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl" style={{ background: card, border: `1px solid ${cardAlt}` }}>
                <div>
                  <p style={{ fontFamily: FONT, fontSize: 13.5, color: white }}>{p.concepto}</p>
                  <p style={{ fontFamily: FONT, fontSize: 11.5, color: gray }}>{p.estado === "pagado" ? (p.fecha_pago ? `Pagado el ${fmtFecha(p.fecha_pago)}` : "Pagado ✓") : `Vence el ${fmtFecha(p.fecha_vencimiento)}`}</p>
                </div>
                <div className="flex items-center gap-3">
                  <b style={{ fontFamily: FONT, fontSize: 14, color: white }}>{fmtMoney(p.monto)}</b>
                  <button onClick={() => remove(p.id)} title="Eliminar pago"><Trash2 size={15} color={red} /></button>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={add} className="mt-6 rounded-2xl p-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>REGISTRAR UN PAGO</span>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <input type="number" min="1" step="0.01" placeholder="Monto ($)" value={monto} onChange={(e) => setMonto(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }} />
              <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-xl px-3 py-2.5" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }}>
                <option value="pagado">Pagado</option>
                <option value="pendiente">Pendiente</option>
              </select>
            </div>
            <input placeholder="Concepto (p. ej. Anticipo mensual Impacto)" value={concepto} onChange={(e) => setConcepto(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }} />
            <label style={{ fontFamily: FONT, fontSize: 12, color: gray, display: "block", marginTop: 10 }}>Fecha de vencimiento
              <input type="date" value={fechaVenc} onChange={(e) => setFechaVenc(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-1" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }} />
            </label>
            <ErrorBanner message={error} />
            <div className="mt-3">
              <PillButton type="submit" disabled={saving}>{saving ? <Loader2 size={15} className="animate-spin" /> : "Guardar pago"}</PillButton>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

function AdminTips() {
  const [items, setItems] = useState([]);
  const [missing, setMissing] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [tipo, setTipo] = useState("tip");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await safeSelect("contenidos", supabase.from("contenidos").select("*").order("created_at", { ascending: false }));
    setItems(res.data);
    setMissing(res.missing);
  }, []);

  useEffect(() => { load(); }, [load]);

  const publish = async (e) => {
    e.preventDefault();
    setError("");
    if (!titulo || !cuerpo) { setError("Escribe título y texto."); return; }
    setSaving(true);
    const { error } = await supabase.from("contenidos").insert({ titulo, cuerpo, tipo });
    if (error) setError(error.message);
    else { setTitulo(""); setCuerpo(""); load(); }
    setSaving(false);
  };

  const toggle = async (it) => {
    const { error } = await supabase.from("contenidos").update({ publicado: !it.publicado }).eq("id", it.id);
    if (error) { setError(error.message); return; }
    load();
  };

  const remove = async (id) => {
    const { error } = await supabase.from("contenidos").delete().eq("id", id);
    if (error) { setError(error.message); return; }
    load();
  };

  return (
    <div>
      <Eyebrow>ADMINISTRACIÓN</Eyebrow>
      <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: white }}>Tips y noticias</h1>
      {missing && <div className="mt-4"><MissingTablesBanner /></div>}
      <form onSubmit={publish} className="mt-6 rounded-2xl p-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>PUBLICAR UN TIP O NOTICIA</span>
        <input placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-3" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }} />
        <textarea placeholder="Texto para los clientes…" value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} rows={3} className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14, resize: "none" }} />
        <div className="flex gap-2 mt-2">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-xl px-3 py-2.5" style={{ background: navy, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }}>
            <option value="tip">Tip</option>
            <option value="noticia">Noticia del estudio</option>
          </select>
          <PillButton type="submit" disabled={saving}>{saving ? <Loader2 size={15} className="animate-spin" /> : "Publicar"}</PillButton>
        </div>
        <ErrorBanner message={error} />
        <p style={{ fontFamily: FONT, fontSize: 12.5, color: gray, marginTop: 10 }}>Aparece en “Tips y noticias” de todos los clientes.</p>
      </form>
      <div className="space-y-3 mt-4">
        {items.map((it) => (
          <div key={it.id} className="rounded-2xl p-4" style={{ background: card, border: `1px solid ${cardAlt}`, opacity: it.publicado ? 1 : 0.55 }}>
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full" style={{ background: it.tipo === "noticia" ? blueSoft : cardAlt, color: it.tipo === "noticia" ? blueLight : gray, fontFamily: FONT, fontSize: 10.5, fontWeight: 600 }}>
                {it.tipo === "noticia" ? "Noticia" : "Tip"}
              </span>
              <div className="flex items-center gap-3">
                <button onClick={() => toggle(it)} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: blueLight }}>{it.publicado ? "Ocultar" : "Mostrar"}</button>
                <button onClick={() => remove(it.id)} title="Eliminar"><Trash2 size={15} color={red} /></button>
              </div>
            </div>
            <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: white, marginTop: 8 }}>{it.titulo}</p>
            <p style={{ fontFamily: FONT, fontSize: 13, color: gray, marginTop: 4, lineHeight: 1.55 }}>{it.cuerpo}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminNotas() {
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [tipo, setTipo] = useState("tecnica");
  const [contenido, setContenido] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("clientes").select("id, nombre, correo").order("created_at", { ascending: false });
      setClientes(filtrarCuentasEstudio(data));
    })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!clienteId || !contenido) return;
    setSaving(true);
    await supabase.from("notas").insert({ cliente_id: clienteId, tipo, contenido });
    setContenido("");
    setDone(true);
    setSaving(false);
    setTimeout(() => setDone(false), 2000);
  };

  return (
    <div>
      <Eyebrow>ADMINISTRACIÓN</Eyebrow>
      <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: white }}>Agregar nota</h1>
      <form onSubmit={submit} className="mt-6">
        <label style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: gray, display: "block", marginBottom: 6 }}>CLIENTE</label>
        <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full rounded-xl px-4 py-3 mb-4" style={{ background: card, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }}>
          <option value="">Selecciona un cliente</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre || c.correo}</option>)}
        </select>
        <label style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: gray, display: "block", marginBottom: 6 }}>TIPO</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full rounded-xl px-4 py-3 mb-4" style={{ background: card, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14 }}>
          <option value="tecnica">Técnica</option>
          <option value="creativa">Creativa</option>
          <option value="requisito">Requisito</option>
        </select>
        <label style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: gray, display: "block", marginBottom: 6 }}>NOTA</label>
        <textarea value={contenido} onChange={(e) => setContenido(e.target.value)} rows={4} className="w-full rounded-xl px-4 py-3 mb-4 outline-none" style={{ background: card, border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 14, resize: "none" }} placeholder="Escribe la nota…" />
        <PillButton full type="submit" disabled={saving}>{saving ? <Loader2 size={15} className="animate-spin" /> : done ? "Guardada ✓" : "Guardar nota"}</PillButton>
      </form>
    </div>
  );
}

function AdminPortal({ email }) {
  const [view, setView] = useState("hoy");
  const nav = [
    { id: "hoy", label: "Hoy", icon: CalIcon, section: "Operación" },
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "sesiones", label: "Sesiones", icon: CalIcon },
    { id: "visitas", label: "Visitas", icon: Users },
    { id: "entregas", label: "Entregas", icon: Sparkles },
    { id: "produccion", label: "Producción", icon: Package },
    { id: "propuestas", label: "Propuestas", icon: FileText, section: "Ventas" },
    { id: "cotizador", label: "Cotizador", icon: FileText },
    { id: "contratos", label: "Contratos", icon: FileText },
    { id: "cobranza", label: "Cobranza", icon: FileText },
    { id: "pagos", label: "Pagos", icon: Wallet },
    { id: "finanzas", label: "Finanzas", icon: FileText, section: "Finanzas" },
    { id: "facturacion", label: "Facturación", icon: FileText },
    { id: "ajustes", label: "Ajustes", icon: FileText, section: "Sistema" },
    { id: "tips", label: "Tips y noticias", icon: Newspaper },
    { id: "notas", label: "Agregar nota", icon: FileText },
  ];
  return (
    <Shell nav={nav} view={view} setView={setView} accountEmail={email} accountRole="Administrador">
      {view === "hoy" && <AdminHoy />}
      {view === "clientes" && <AdminClientes />}
      {view === "sesiones" && <AdminSesiones />}
      {view === "visitas" && <AdminVisitas />}
      {view === "entregas" && <AdminEntregas />}
      {view === "produccion" && <AdminProduccion />}
      {view === "pagos" && <AdminPagos />}
      {view === "propuestas" && <AdminPropuestas />}
      {view === "cotizador" && <AdminCotizador />}
      {view === "contratos" && <AdminContratos />}
      {view === "cobranza" && <AdminCobranza />}
      {view === "finanzas" && <AdminFinanzas />}
      {view === "facturacion" && <AdminFacturacion />}
      {view === "ajustes" && <AdminAjustes />}
      {view === "tips" && <AdminTips />}
      {view === "notas" && <AdminNotas />}
    </Shell>
  );
}

// ---------- Root ----------
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = cargando, null = sin sesión
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: navy }}>
        <Loader2 size={24} className="animate-spin" color={blueLight} />
      </div>
    );
  }

  if (recovery) return <ResetPasswordScreen onDone={() => setRecovery(false)} />;

  if (!session) return <AuthScreen />;

  // Admin = lista VITE_ADMIN_EMAILS (Tania + Alejandro cuando Tania dé su correo).
  const isAdmin = isAdminEmail(session.user.email);
  return isAdmin ? <AdminPortal email={session.user.email} /> : <ClientPortal userId={session.user.id} email={session.user.email} />;
}
