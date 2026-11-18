import React, { useState, useEffect, useCallback } from "react";
import {
  Mic, Calendar as CalIcon, Clock, FileText, LogOut, Menu, X, Radio,
  ArrowRight, Users, Loader2, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight
} from "lucide-react";
import { supabase, ADMIN_EMAIL } from "./supabaseClient";

const navy = "#0A0D1E";
const card = "#12152B";
const cardAlt = "#171B36";
const blue = "#3B4CE0";
const blueLight = "#5D6BFF";
const blueSoft = "rgba(59,76,224,0.14)";
const white = "#FFFFFF";
const gray = "#9098B8";
const red = "#E05D5D";

const PAQUETES = ["Esencia", "Impacto", "Identidad", "Expansión"];
const SLOTS = ["09:00", "10:30", "12:00", "16:00", "17:30"]; // lun–vie: estudio de 8:00 a 20:00
const SLOTS_SABADO = ["10:30", "12:00", "16:00"]; // sábados: estudio de 10:00 a 17:00
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
// La disponibilidad real sale de la tabla `sesiones` de Supabase: un horario
// ocupado por cualquier cliente ya no se ofrece. Fase futura: Google Calendar.

// ---------- UI atoms ----------
function Eyebrow({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ width: 6, height: 6, background: blue, borderRadius: 2 }} />
      <span style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 11, color: blueLight, letterSpacing: 1.5 }}>{children}</span>
      <span style={{ width: 6, height: 6, background: blue, borderRadius: 2 }} />
    </div>
  );
}

function PillButton({ children, onClick, disabled, full, type = "button" }) {
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-full px-5 py-2.5 ${full ? "w-full" : ""}`}
      style={{ background: disabled ? "#2A2E4A" : blue, color: white, fontFamily: "Inter", fontWeight: 600, fontSize: 14, opacity: disabled ? 0.7 : 1 }}>
      {children}
    </button>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="mb-4">
      <label style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 12, color: gray, display: "block", marginBottom: 6 }}>{label}</label>
      <input {...props} className="w-full rounded-xl px-4 py-3 outline-none" style={{ background: card, border: `1px solid ${cardAlt}`, color: white, fontFamily: "Inter", fontSize: 14 }} />
    </div>
  );
}

function Logo({ size = 28 }) {
  return (
    <div className="flex items-center justify-center shrink-0" style={{ width: size, height: size, background: blue, borderRadius: 8 }}>
      <Mic size={size * 0.55} color={white} strokeWidth={2.4} />
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 mb-4" style={{ background: "rgba(224,93,93,0.12)", border: `1px solid ${red}55` }}>
      <AlertCircle size={15} color={red} className="mt-0.5 shrink-0" />
      <span style={{ fontFamily: "Inter", fontSize: 12.5, color: "#F3A9A9" }}>{message}</span>
    </div>
  );
}

// ---------- Auth ----------
function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signupDone, setSignupDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) setSignupDone(true);
      }
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
          <h1 style={{ fontFamily: "Fredoka", fontWeight: 600, fontSize: 22, color: white, marginTop: 14 }}>Élite Podhouse</h1>
          <p style={{ fontFamily: "Inter", fontSize: 13, color: gray, marginTop: 2 }}>Portal de clientes</p>
        </div>

        {signupDone ? (
          <div className="text-center">
            <CheckCircle2 size={28} color={blueLight} className="mx-auto mb-3" />
            <p style={{ fontFamily: "Inter", fontSize: 14, color: white }}>
              Cuenta creada. Revisa tu correo para confirmarla antes de iniciar sesión.
            </p>
            <button onClick={() => { setSignupDone(false); setMode("login"); }} style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 13, color: blueLight, marginTop: 16 }}>
              Ir a iniciar sesión
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <ErrorBanner message={error} />
            <Input label="CORREO" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
            <Input label="CONTRASEÑA" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <PillButton full type="submit" disabled={loading}>
              {loading ? <Loader2 size={15} className="animate-spin" /> : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
            </PillButton>
            <p className="text-center mt-5" style={{ fontFamily: "Inter", fontSize: 13, color: gray }}>
              {mode === "login" ? "¿Eres nuevo cliente?" : "¿Ya tienes cuenta?"}{" "}
              <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} style={{ color: blueLight, fontWeight: 600 }}>
                {mode === "login" ? "Regístrate" : "Inicia sesión"}
              </button>
            </p>
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
      <span style={{ fontFamily: "Inter", fontSize: 14, fontWeight: 600 }}>{label}</span>
    </button>
  );
}

function Shell({ nav, view, setView, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const logout = () => supabase.auth.signOut();
  return (
    <div style={{ minHeight: "100vh", background: navy, display: "flex" }}>
      <aside className="hidden md:flex flex-col w-56 p-4 shrink-0" style={{ borderRight: `1px solid ${cardAlt}` }}>
        <div className="flex items-center gap-2.5 px-2 mb-8 mt-2">
          <Logo />
          <span style={{ fontFamily: "Fredoka", fontWeight: 600, fontSize: 15, color: white }}>Élite Podhouse</span>
        </div>
        <div className="flex flex-col gap-1">
          {nav.map((n) => <Tab key={n.id} active={view === n.id} onClick={() => setView(n.id)} icon={n.icon} label={n.label} />)}
        </div>
        <button onClick={logout} className="mt-auto flex items-center gap-2 px-4 py-3" style={{ color: gray }}>
          <LogOut size={15} /><span style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 500 }}>Cerrar sesión</span>
        </button>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3" style={{ background: navy, borderBottom: `1px solid ${cardAlt}` }}>
        <div className="flex items-center gap-2.5">
          <Logo size={24} />
          <span style={{ fontFamily: "Fredoka", fontWeight: 600, fontSize: 14, color: white }}>Élite Podhouse</span>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={20} color={white} /> : <Menu size={20} color={white} />}</button>
      </div>
      {menuOpen && (
        <div className="md:hidden fixed top-12 left-0 right-0 z-20 p-3" style={{ background: card, borderBottom: `1px solid ${cardAlt}` }}>
          {nav.map((n) => <Tab key={n.id} active={view === n.id} onClick={() => { setView(n.id); setMenuOpen(false); }} icon={n.icon} label={n.label} />)}
          <Tab active={false} onClick={logout} icon={LogOut} label="Cerrar sesión" />
        </div>
      )}

      <main className="flex-1 px-5 py-8 md:py-10 md:px-10 mt-12 md:mt-0" style={{ maxWidth: 680 }}>{children}</main>
    </div>
  );
}

// ---------- Client views ----------
function ClientDashboard({ perfil, goTo }) {
  return (
    <div>
      <Eyebrow>PANEL DE {(perfil?.nombre || perfil?.correo || "").split(" ")[0].toUpperCase()}</Eyebrow>
      <h1 style={{ fontFamily: "Fredoka", fontWeight: 600, fontSize: 28, color: white }}>
        Hola{perfil?.nombre ? `, ${perfil.nombre.split(" ")[0]}` : ""} 👋
      </h1>
      {perfil?.activo ? (
        <p style={{ fontFamily: "Inter", fontSize: 14, color: gray, marginTop: 6 }}>
          {perfil.show_nombre || "Tu proyecto"} · Paquete <span style={{ color: blueLight, fontWeight: 600 }}>{perfil.paquete}</span>
        </p>
      ) : (
        <p style={{ fontFamily: "Inter", fontSize: 14, color: gray, marginTop: 6 }}>Tu cuenta está registrada. Élite Podhouse activará tu paquete pronto.</p>
      )}
      <div className="mt-7 space-y-4">
        <div className="rounded-2xl p-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
          <span style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>ESTADO DEL PROYECTO</span>
          <p style={{ fontFamily: "Fredoka", fontWeight: 600, fontSize: 19, color: white, marginTop: 10 }}>{perfil?.estado_proyecto || "Sin asignar"}</p>
        </div>
        <div className="rounded-2xl p-5 cursor-pointer" style={{ background: `linear-gradient(135deg, ${blue}, ${blueLight})` }} onClick={() => goTo("book")}>
          <span style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,0.85)", letterSpacing: 1 }}>AGENDAR</span>
          <p style={{ fontFamily: "Fredoka", fontWeight: 600, fontSize: 19, color: white, marginTop: 10 }}>Nueva sesión de grabación</p>
          <div className="flex items-center gap-1.5 mt-3" style={{ color: white }}>
            <span style={{ fontFamily: "Inter", fontSize: 13, fontWeight: 600 }}>Elegir fecha y hora</span><ArrowRight size={14} />
          </div>
        </div>
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
      const { data } = await supabase.from("sesiones").select("fecha, hora").gte("fecha", fechaISO(1)).lte("fecha", fechaISO(daysInMonth));
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
      const { data: clash } = await supabase.from("sesiones").select("id").eq("fecha", fecha).eq("hora", selectedSlot).limit(1);
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
        <h2 style={{ fontFamily: "Fredoka", fontWeight: 600, fontSize: 23, color: white, marginTop: 18 }}>Sesión confirmada</h2>
        <p style={{ fontFamily: "Inter", fontSize: 14, color: gray, marginTop: 6 }}>{fechaLabel(selectedDay)}, {selectedSlot} hrs</p>
        {calendarWarning && (
          <p style={{ fontFamily: "Inter", fontSize: 13, color: "#F3A9A9", marginTop: 12 }}>
            Sesión guardada, pero no se pudo agregar al calendario de Google. Avisa al estudio para que la anoten.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <Eyebrow>AGENDAR SESIÓN</Eyebrow>
      <h1 style={{ fontFamily: "Fredoka", fontWeight: 600, fontSize: 26, color: white }}>Elige fecha y hora</h1>
      <div className="flex items-center justify-between mt-4">
        <button onClick={() => changeMonth(-1)} disabled={monthOffset === 0} className="rounded-full flex items-center justify-center" style={{ width: 32, height: 32, background: monthOffset === 0 ? "transparent" : card, color: monthOffset === 0 ? "#3A3F5C" : white }}>
          <ChevronLeft size={17} />
        </button>
        <p style={{ fontFamily: "Inter", fontSize: 13, color: gray }}>{monthLabel}</p>
        <button onClick={() => changeMonth(1)} disabled={monthOffset === 2} className="rounded-full flex items-center justify-center" style={{ width: 32, height: 32, background: monthOffset === 2 ? "transparent" : card, color: monthOffset === 2 ? "#3A3F5C" : white }}>
          <ChevronRight size={17} />
        </button>
      </div>
      <ErrorBanner message={error} />
      <div className="grid grid-cols-7 gap-1.5 mt-4">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i} className="text-center" style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 10, color: gray }}>{d}</div>
        ))}
        {Array.from({ length: firstOffset }).map((_, i) => <div key={"pad" + i} />)}
        {days.map((d) => {
          const isAvailable = !isPast(d) && freeSlots(d).length > 0;
          const isSelected = selectedDay === d;
          return (
            <button key={d} disabled={!isAvailable} onClick={() => { setSelectedDay(d); setSelectedSlot(null); }} className="aspect-square rounded-xl flex items-center justify-center"
              style={{ background: isSelected ? blue : isAvailable ? blueSoft : "transparent", color: isSelected || isAvailable ? white : "#3A3F5C", fontFamily: "Inter", fontWeight: 600, fontSize: 13 }}>
              {d}
            </button>
          );
        })}
      </div>
      {selectedDay && (
        <div className="mt-6">
          <span style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>HORARIOS DISPONIBLES</span>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {freeSlots(selectedDay).map((s) => (
              <button key={s} onClick={() => setSelectedSlot(s)} className="py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                style={{ background: selectedSlot === s ? blue : card, color: white, border: `1px solid ${selectedSlot === s ? blue : cardAlt}`, fontFamily: "Inter", fontSize: 13 }}>
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
      <span style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 11, color: blueLight, letterSpacing: 1 }}>{title}</span>
      <ul className="mt-3 space-y-2.5">
        {items.map((it) => (
          <li key={it.id} className="flex gap-2.5" style={{ fontFamily: "Inter", fontSize: 13.5, color: white }}>
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
      <h1 style={{ fontFamily: "Fredoka", fontWeight: 600, fontSize: 26, color: white }}>Notas de grabación</h1>
      <div className="mt-6">
        {loading && <p style={{ fontFamily: "Inter", fontSize: 13, color: gray }}>Cargando…</p>}
        {!loading && notas.length === 0 && <p style={{ fontFamily: "Inter", fontSize: 13, color: gray }}>Aún no hay notas para tu proyecto.</p>}
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
      <h1 style={{ fontFamily: "Fredoka", fontWeight: 600, fontSize: 26, color: white }}>Tus sesiones</h1>
      <div className="mt-6 space-y-3">
        {loading && <p style={{ fontFamily: "Inter", fontSize: 13, color: gray }}>Cargando…</p>}
        {!loading && sesiones.length === 0 && <p style={{ fontFamily: "Inter", fontSize: 13, color: gray }}>Aún no tienes sesiones agendadas.</p>}
        {sesiones.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: card, border: `1px solid ${cardAlt}` }}>
            <div>
              <p style={{ fontFamily: "Inter", fontSize: 14, color: white, fontWeight: 600 }}>{s.titulo || "Sesión de grabación"}</p>
              <p style={{ fontFamily: "Inter", fontSize: 11.5, color: gray, marginTop: 3 }}>{s.fecha} · {s.hora}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full" style={{ background: blueSoft, color: blueLight, fontFamily: "Inter", fontSize: 10.5, fontWeight: 600 }}>{s.estado}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientPortal({ userId }) {
  const [view, setView] = useState("dashboard");
  const [perfil, setPerfil] = useState(null);
  const [sesiones, setSesiones] = useState([]);
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: perfilData }, { data: sesionesData }, { data: notasData }] = await Promise.all([
      supabase.from("clientes").select("*").eq("id", userId).single(),
      supabase.from("sesiones").select("*").eq("cliente_id", userId).order("fecha", { ascending: false }),
      supabase.from("notas").select("*").eq("cliente_id", userId),
    ]);
    setPerfil(perfilData);
    setSesiones(sesionesData || []);
    setNotas(notasData || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const nav = [
    { id: "dashboard", label: "Panel", icon: Radio },
    { id: "book", label: "Agendar", icon: CalIcon },
    { id: "set", label: "Mi set", icon: Mic },
    { id: "history", label: "Historial", icon: FileText },
  ];

  return (
    <Shell nav={nav} view={view} setView={setView}>
      {view === "dashboard" && <ClientDashboard perfil={perfil} goTo={setView} />}
      {view === "book" && <BookSession userId={userId} perfil={perfil} onBooked={load} />}
      {view === "set" && <MySet notas={notas} loading={loading} />}
      {view === "history" && <History sesiones={sesiones} loading={loading} />}
    </Shell>
  );
}

// ---------- Admin views ----------
function AdminClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("clientes").select("*").order("created_at", { ascending: false });
    setClientes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = async (id, patch) => {
    setSavingId(id);
    await supabase.from("clientes").update(patch).eq("id", id);
    setClientes((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    setSavingId(null);
  };

  return (
    <div>
      <Eyebrow>ADMINISTRACIÓN</Eyebrow>
      <h1 style={{ fontFamily: "Fredoka", fontWeight: 600, fontSize: 26, color: white }}>Clientes</h1>
      <div className="mt-6 space-y-3">
        {loading && <p style={{ fontFamily: "Inter", fontSize: 13, color: gray }}>Cargando…</p>}
        {clientes.map((c) => (
          <div key={c.id} className="rounded-2xl p-4" style={{ background: card, border: `1px solid ${cardAlt}` }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 14, color: white }}>{c.nombre || c.correo}</p>
                <p style={{ fontFamily: "Inter", fontSize: 11.5, color: gray }}>{c.correo}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full" style={{ background: c.activo ? blueSoft : "rgba(224,93,93,0.12)", color: c.activo ? blueLight : red, fontFamily: "Inter", fontSize: 10.5, fontWeight: 600 }}>
                {c.activo ? "Activo" : "Pendiente"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={c.paquete || ""} onChange={(e) => update(c.id, { paquete: e.target.value })} className="rounded-lg px-3 py-2" style={{ background: cardAlt, color: white, fontFamily: "Inter", fontSize: 12.5, border: "none" }}>
                <option value="">Sin paquete</option>
                {PAQUETES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input placeholder="Estado del proyecto" defaultValue={c.estado_proyecto || ""} onBlur={(e) => update(c.id, { estado_proyecto: e.target.value })} className="rounded-lg px-3 py-2" style={{ background: cardAlt, color: white, fontFamily: "Inter", fontSize: 12.5, border: "none" }} />
            </div>
            <button onClick={() => update(c.id, { activo: !c.activo })} className="mt-2 text-left" style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 12, color: blueLight }} disabled={savingId === c.id}>
              {savingId === c.id ? "Guardando…" : c.activo ? "Desactivar cuenta" : "Activar cuenta"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminSesiones() {
  const [sesiones, setSesiones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("sesiones").select("*, clientes(nombre, correo)").order("fecha", { ascending: false });
      setSesiones(data || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <Eyebrow>ADMINISTRACIÓN</Eyebrow>
      <h1 style={{ fontFamily: "Fredoka", fontWeight: 600, fontSize: 26, color: white }}>Todas las sesiones</h1>
      <div className="mt-6 space-y-3">
        {loading && <p style={{ fontFamily: "Inter", fontSize: 13, color: gray }}>Cargando…</p>}
        {!loading && sesiones.length === 0 && <p style={{ fontFamily: "Inter", fontSize: 13, color: gray }}>Aún no hay sesiones agendadas.</p>}
        {sesiones.map((s) => (
          <div key={s.id} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: card, border: `1px solid ${cardAlt}` }}>
            <div>
              <p style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 14, color: white }}>{s.clientes?.nombre || s.clientes?.correo}</p>
              <p style={{ fontFamily: "Inter", fontSize: 11.5, color: gray, marginTop: 3 }}>{s.fecha} · {s.hora}</p>
            </div>
            <span className="px-2.5 py-1 rounded-full" style={{ background: blueSoft, color: blueLight, fontFamily: "Inter", fontSize: 10.5, fontWeight: 600 }}>{s.estado}</span>
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
      setClientes(data || []);
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
      <h1 style={{ fontFamily: "Fredoka", fontWeight: 600, fontSize: 26, color: white }}>Agregar nota</h1>
      <form onSubmit={submit} className="mt-6">
        <label style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 12, color: gray, display: "block", marginBottom: 6 }}>CLIENTE</label>
        <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full rounded-xl px-4 py-3 mb-4" style={{ background: card, border: `1px solid ${cardAlt}`, color: white, fontFamily: "Inter", fontSize: 14 }}>
          <option value="">Selecciona un cliente</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre || c.correo}</option>)}
        </select>
        <label style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 12, color: gray, display: "block", marginBottom: 6 }}>TIPO</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full rounded-xl px-4 py-3 mb-4" style={{ background: card, border: `1px solid ${cardAlt}`, color: white, fontFamily: "Inter", fontSize: 14 }}>
          <option value="tecnica">Técnica</option>
          <option value="creativa">Creativa</option>
          <option value="requisito">Requisito</option>
        </select>
        <label style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 12, color: gray, display: "block", marginBottom: 6 }}>NOTA</label>
        <textarea value={contenido} onChange={(e) => setContenido(e.target.value)} rows={4} className="w-full rounded-xl px-4 py-3 mb-4 outline-none" style={{ background: card, border: `1px solid ${cardAlt}`, color: white, fontFamily: "Inter", fontSize: 14, resize: "none" }} placeholder="Escribe la nota…" />
        <PillButton full type="submit" disabled={saving}>{saving ? <Loader2 size={15} className="animate-spin" /> : done ? "Guardada ✓" : "Guardar nota"}</PillButton>
      </form>
    </div>
  );
}

function AdminPortal() {
  const [view, setView] = useState("clientes");
  const nav = [
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "sesiones", label: "Sesiones", icon: CalIcon },
    { id: "notas", label: "Agregar nota", icon: FileText },
  ];
  return (
    <Shell nav={nav} view={view} setView={setView}>
      {view === "clientes" && <AdminClientes />}
      {view === "sesiones" && <AdminSesiones />}
      {view === "notas" && <AdminNotas />}
    </Shell>
  );
}

// ---------- Root ----------
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = cargando, null = sin sesión

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: navy }}>
        <Loader2 size={24} className="animate-spin" color={blueLight} />
      </div>
    );
  }

  if (!session) return <AuthScreen />;

  const isAdmin = session.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  return isAdmin ? <AdminPortal /> : <ClientPortal userId={session.user.id} />;
}
