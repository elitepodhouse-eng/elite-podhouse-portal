import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Mic,
  Video,
  CalendarClock,
  Wallet,
  AlertTriangle,
  Clock,
  Phone,
  FileText,
  CheckCircle2,
  Sun,
  Moon,
  Coffee,
  ArrowRight,
} from "lucide-react";
import { Eyebrow, SectionTitle, EmptyNote, MissingTablesBanner, cardAlt, white, gray, blueLight, green, amber, red, FONT, blue, blueDeep, navy } from "../lib/ui";
import { safeSelect, fmtMoney, fmtFecha, todayISO, r2, filtrarClientes, MESES } from "../lib/ops";

// Rediseño 26 nov 2026: azul y blanco, no todo oscuro.
// La lógica y las consultas son las mismas de antes; solo cambia la presentación.
// Paleta: blanco y hueso de fondo, azul Élite para acentos, azul profundo para títulos.

const LIGHT_BG = "#EDEFF7";
const INK = "#0B1338";
const MUTED = "#5B607A";
const LINE = "#DDE2F2";
const BLUE_SOFT = "rgba(47,82,255,0.10)";
const RED_SOFT = "rgba(224,93,93,0.10)";
const AMBER_SOFT = "rgba(245,166,35,0.14)";
const GREEN_SOFT = "rgba(46,160,90,0.14)";

function KpiCard({ icon: Icon, label, value, sub, tone, iconBg }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: white, border: `1px solid ${LINE}`, boxShadow: "0 1px 4px rgba(11,19,56,0.06)" }}>
      <div className="flex items-center justify-between">
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: MUTED, letterSpacing: 1 }}>{label}</span>
        <span className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: 10, background: iconBg || BLUE_SOFT }}>
          <Icon size={17} color={tone || blue} />
        </span>
      </div>
      <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, color: INK, marginTop: 8, lineHeight: 1.1 }}>{value}</p>
      {sub && <p style={{ fontFamily: FONT, fontSize: 12, color: MUTED, marginTop: 4 }}>{sub}</p>}
    </div>
  );
}

function Row({ titulo, sub, badge, badgeTone }) {
  const badgeStyle =
    badgeTone === "red"
      ? { background: RED_SOFT, color: "#B93A3A" }
      : badgeTone === "blue"
        ? { background: BLUE_SOFT, color: blueDeep }
        : badgeTone === "amber"
          ? { background: AMBER_SOFT, color: "#8A5A00" }
          : { background: GREEN_SOFT, color: "#1E7A45" };
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl" style={{ background: white, border: `1px solid ${LINE}` }}>
      <div className="min-w-0">
        <p style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 600, color: INK }}>{titulo}</p>
        {sub && <p style={{ fontFamily: FONT, fontSize: 12, color: MUTED, marginTop: 2 }}>{sub}</p>}
      </div>
      {badge && (
        <span className="px-2 py-0.5 rounded-full shrink-0" style={{ ...badgeStyle, fontFamily: FONT, fontSize: 10.5, fontWeight: 700 }}>
          {badge}
        </span>
      )}
    </div>
  );
}

function Bloque({ titulo, count, children, vacio, icon: Icon }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: white, border: `1px solid ${LINE}`, boxShadow: "0 1px 4px rgba(11,19,56,0.06)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <span className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: 8, background: BLUE_SOFT }}>
              <Icon size={15} color={blue} />
            </span>
          )}
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: INK, letterSpacing: 0.5 }}>{titulo}</span>
        </div>
        {typeof count === "number" && (
          <span className="px-2 py-0.5 rounded-full" style={{ background: LIGHT_BG, color: MUTED, fontFamily: FONT, fontSize: 11, fontWeight: 700 }}>
            {count}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {children}
        {vacio && <EmptyNote>{vacio}</EmptyNote>}
      </div>
    </div>
  );
}

export default function AdminHoy() {
  const [episodios, setEpisodios] = useState([]);
  const [propuestas, setPropuestas] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const e = await safeSelect("episodios", supabase.from("episodios").select("*"));
      const p = await safeSelect("propuestas", supabase.from("propuestas").select("*"));
      const f = await safeSelect("facturas", supabase.from("facturas").select("*"));
      const a = await safeSelect("abonos", supabase.from("abonos").select("*"));
      const c = await supabase.from("clientes").select("id, nombre, correo, proximo_contacto");
      const s = await safeSelect("sesiones", supabase.from("sesiones").select("*"));
      setEpisodios(e.data); setPropuestas(p.data); setFacturas(f.data); setAbonos(a.data);
      setClientes(filtrarClientes(c.data)); setSesiones(s.data);
      setMissing(e.missing || p.missing || f.missing || a.missing);
      setLoading(false);
    })();
  }, []);

  const hoy = todayISO();
  const manana = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
  const nombreCliente = (id) => clientes.find((c) => c.id === id)?.nombre || "Cliente";

  const grabHoy = episodios.filter((x) => x.fecha_grabacion === hoy);
  const entAtrasadas = episodios.filter((x) => x.fecha_entrega && x.fecha_entrega < hoy && x.estado !== "publicado");
  const entHoy = episodios.filter((x) => x.fecha_entrega === hoy && x.estado !== "publicado");
  const entManana = episodios.filter((x) => x.fecha_entrega === manana && x.estado !== "publicado");
  const propHoy = propuestas.filter((p) => p.siguiente_contacto === hoy && !["Perdido", "Agendó"].includes(p.estado));
  const contactarHoy = clientes.filter((c) => c.proximo_contacto === hoy);
  const saldoDe = (f) => r2(Number(f.monto || 0) - abonos.filter((a) => a.factura_id === f.id).reduce((t, a) => t + Number(a.monto || 0), 0));
  const porCobrar = facturas.filter((f) => saldoDe(f) > 0);
  const vencidas = porCobrar.filter((f) => f.vencimiento && f.vencimiento < hoy);
  const porCobrarTotal = porCobrar.reduce((t, f) => t + saldoDe(f), 0);
  const sesionesHoy = sesiones.filter((s) => s.fecha === hoy);

  // Días para la declaración mensual (vence el 17 del mes siguiente).
  const ahora = new Date();
  const vence = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 17);
  const diasDecla = Math.ceil((vence - ahora) / (1000 * 60 * 60 * 24));

  // Solo presentación: saludo según la hora, fecha larga y lo próximo de hoy.
  const hora = ahora.getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
  const SaludoIcon = hora < 12 ? Sun : hora < 19 ? Coffee : Moon;
  const fechaLarga = (() => {
    const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    return `${dias[ahora.getDay()]}, ${ahora.getDate()} de ${MESES[ahora.getMonth()]} de ${ahora.getFullYear()}`;
  })();
  const atencionTotal = entAtrasadas.length + vencidas.length;
  const proximas = [...sesionesHoy].sort((a, b) => String(a.hora || "").localeCompare(String(b.hora || "")));
  const proxima = proximas[0];
  const resumen =
    grabHoy.length === 0 && sesionesHoy.length === 0
      ? "Hoy no hay grabaciones ni sesiones agendadas."
      : `${grabHoy.length} ${grabHoy.length === 1 ? "grabación" : "grabaciones"} · ${sesionesHoy.length} ${sesionesHoy.length === 1 ? "sesión" : "sesiones"} · ${fmtMoney(porCobrarTotal)} por cobrar.`;

  return (
    <div style={{ background: LIGHT_BG, padding: 16, borderRadius: 24, marginLeft: -8, marginRight: -8 }}>
      {/* Encabezado en blanco y azul */}
      <div className="rounded-3xl p-5" style={{ background: `linear-gradient(135deg, ${blueDeep}, ${blue})`, boxShadow: "0 8px 24px rgba(27,47,189,0.25)" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p style={{ fontFamily: FONT, fontSize: 12, color: blueLight, fontWeight: 600, letterSpacing: 1 }}>ÉLITE PODHOUSE · HOY</p>
            <h1 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 26, color: white, marginTop: 6, lineHeight: 1.15 }}>{saludo}, Tania</h1>
            <p style={{ fontFamily: FONT, fontSize: 13.5, color: "rgba(255,255,255,0.85)", marginTop: 4 }}>{fechaLarga}</p>
            <p style={{ fontFamily: FONT, fontSize: 13.5, color: white, marginTop: 10, fontWeight: 600 }}>{resumen}</p>
          </div>
          <span className="hidden sm:flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(255,255,255,0.18)" }}>
            <SaludoIcon size={22} color={white} />
          </span>
        </div>
        {proxima && (
          <div className="flex items-center justify-between gap-3 mt-4 px-3 py-3 rounded-2xl" style={{ background: "rgba(255,255,255,0.96)" }}>
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 10, background: BLUE_SOFT }}>
                <Clock size={17} color={blue} />
              </span>
              <div className="min-w-0">
                <p style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: 1 }}>PRÓXIMO HOY</p>
                <p style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: INK }}>{proxima.hora ? `${proxima.hora} · ` : ""}{proxima.titulo || "Sesión"}</p>
                {proxima.cliente_id && <p style={{ fontFamily: FONT, fontSize: 12, color: MUTED }}>{nombreCliente(proxima.cliente_id)}</p>}
              </div>
            </div>
            <ArrowRight size={16} color={blue} className="shrink-0" />
          </div>
        )}
      </div>

      {missing && <div className="mt-4"><MissingTablesBanner migration="supabase/migrations/001_portal_inicio.sql" text="Algunas tablas aún no existen. Aplica una vez la migración" /></div>}

      {/* Lo que necesita atención, primero */}
      {atencionTotal > 0 && (
        <div className="rounded-2xl p-4 mt-5" style={{ background: white, border: `1px solid #F0C9C9`, boxShadow: "0 1px 4px rgba(11,19,56,0.06)" }}>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: 8, background: RED_SOFT }}>
              <AlertTriangle size={15} color={red} />
            </span>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: INK }}>Necesita atención</span>
            <span className="px-2 py-0.5 rounded-full" style={{ background: RED_SOFT, color: "#B93A3A", fontFamily: FONT, fontSize: 11, fontWeight: 700 }}>{atencionTotal}</span>
          </div>
          <p style={{ fontFamily: FONT, fontSize: 13, color: MUTED, marginTop: 8 }}>
            {entAtrasadas.length > 0 && `${entAtrasadas.length} ${entAtrasadas.length === 1 ? "entrega atrasada" : "entregas atrasadas"}`}
            {entAtrasadas.length > 0 && vencidas.length > 0 && " · "}
            {vencidas.length > 0 && `${vencidas.length} ${vencidas.length === 1 ? "factura vencida" : "facturas vencidas"}`}
          </p>
        </div>
      )}

      {/* KPIs en blanco */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        <KpiCard icon={Video} label="GRABACIONES HOY" value={grabHoy.length} sub={grabHoy.length ? "En el estudio" : "Sin grabaciones"} tone={grabHoy.length ? blue : blue} />
        <KpiCard icon={AlertTriangle} label="ENTREGAS ATRASADAS" value={entAtrasadas.length} sub={entAtrasadas.length ? "Revisar primero" : "Al corriente"} tone={entAtrasadas.length ? red : green} iconBg={entAtrasadas.length ? RED_SOFT : GREEN_SOFT} />
        <KpiCard icon={Wallet} label="POR COBRAR" value={fmtMoney(porCobrarTotal)} sub={`${porCobrar.length} ${porCobrar.length === 1 ? "factura" : "facturas"} pendientes`} tone={porCobrarTotal > 0 ? "#B7791F" : green} iconBg={porCobrarTotal > 0 ? AMBER_SOFT : GREEN_SOFT} />
        <KpiCard icon={CalendarClock} label="DECLARACIÓN · VENCE 17" value={`${diasDecla} días`} sub={diasDecla <= 5 ? "Se acerca la fecha" : "A tiempo"} tone={diasDecla <= 5 ? red : blue} iconBg={diasDecla <= 5 ? RED_SOFT : BLUE_SOFT} />
      </div>

      {/* Agenda y entregas en dos columnas en escritorio */}
      <div className="grid md:grid-cols-2 gap-4 mt-5">
        <div className="space-y-4">
          <Bloque titulo="GRABACIONES DE HOY" count={grabHoy.length} icon={Mic} vacio={loading ? "" : "No hay grabaciones hoy."}>
            {grabHoy.map((x) => <Row key={x.id} titulo={x.titulo} sub={`${nombreCliente(x.cliente_id)}${x.set ? ` · Set ${x.set}` : ""}${x.paquete ? ` · ${x.paquete}` : ""}`} />)}
          </Bloque>

          <Bloque titulo="SESIONES AGENDADAS HOY" count={sesionesHoy.length} icon={CalendarClock} vacio={loading ? "" : "No hay sesiones agendadas hoy."}>
            {sesionesHoy.map((s) => <Row key={s.id} titulo={s.titulo || "Sesión"} sub={`${s.hora || ""}${s.cliente_id ? ` · ${nombreCliente(s.cliente_id)}` : ""}`} />)}
          </Bloque>

          <Bloque titulo="PROPUESTAS A SEGUIR HOY" count={propHoy.length} icon={FileText} vacio={loading ? "" : "Ninguna propuesta vence hoy."}>
            {propHoy.map((p) => <Row key={p.id} titulo={p.nombre} sub={`${p.proyecto || ""}${p.proyecto ? " · " : ""}${p.estado || ""}`} />)}
          </Bloque>

          <Bloque titulo="CLIENTES POR CONTACTAR HOY" count={contactarHoy.length} icon={Phone} vacio={loading ? "" : "Nadie por contactar hoy."}>
            {contactarHoy.map((c) => <Row key={c.id} titulo={c.nombre || c.correo} sub={c.correo || ""} />)}
          </Bloque>
        </div>

        <div className="space-y-4">
          <Bloque titulo="ENTREGAS" count={entAtrasadas.length + entHoy.length + entManana.length} icon={CheckCircle2} vacio={loading ? "" : "Nada pendiente de entrega."}>
            {entAtrasadas.map((x) => <Row key={x.id} titulo={x.titulo} sub={`${nombreCliente(x.cliente_id)} · Vencía ${fmtFecha(x.fecha_entrega)}`} badge="ATRASADA" badgeTone="red" />)}
            {entHoy.map((x) => <Row key={x.id} titulo={x.titulo} sub={`${nombreCliente(x.cliente_id)} · Entrega hoy`} badge="HOY" badgeTone="blue" />)}
            {entManana.map((x) => <Row key={x.id} titulo={x.titulo} sub={`${nombreCliente(x.cliente_id)} · Entrega mañana`} />)}
          </Bloque>

          <Bloque titulo="FACTURAS POR COBRAR" count={porCobrar.length} icon={Wallet} vacio={loading ? "" : "Nada por cobrar."}>
            {porCobrar.map((f) => (
              <Row key={f.id} titulo={`${nombreCliente(f.cliente_id)} — ${f.concepto}`} sub={`Saldo ${fmtMoney(saldoDe(f))}${f.vencimiento ? ` · Vence ${fmtFecha(f.vencimiento)}` : ""}`} badge={vencidas.includes(f) ? "VENCIDA" : null} badgeTone="red" />
            ))}
          </Bloque>

          <div className="rounded-2xl p-4" style={{ background: blueDeep, boxShadow: "0 8px 24px rgba(27,47,189,0.20)" }}>
            <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: white }}>¿Todo al corriente?</p>
            <p style={{ fontFamily: FONT, fontSize: 12.5, color: "rgba(255,255,255,0.85)", marginTop: 4, lineHeight: 1.6 }}>
              Si no hay nada en rojo arriba, el día está en orden. Lo urgente siempre sale primero.
            </p>
          </div>
        </div>
      </div>

      <p style={{ fontFamily: FONT, fontSize: 11.5, color: MUTED, marginTop: 16, textAlign: "center" }}>{fmtFecha(hoy)} · Élite Podhouse</p>
    </div>
  );
}
