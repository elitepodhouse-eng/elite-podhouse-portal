import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Eyebrow, SectionTitle, EmptyNote, MissingTablesBanner, Kpi, card, cardAlt, white, gray, blueLight, green, amber, red, FONT } from "../lib/ui";
import { safeSelect, fmtMoney, fmtFecha, todayISO, r2 } from "../lib/ops";

function Row({ titulo, sub, alerta }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: "#0B1338", border: `1px solid ${cardAlt}` }}>
      <div>
        <p style={{ fontFamily: FONT, fontSize: 13.5, color: white }}>{titulo}</p>
        {sub && <p style={{ fontFamily: FONT, fontSize: 12, color: gray, marginTop: 2 }}>{sub}</p>}
      </div>
      {alerta && <span className="px-2 py-0.5 rounded-full shrink-0" style={{ background: "rgba(224,93,93,0.12)", color: red, fontFamily: FONT, fontSize: 10.5, fontWeight: 700 }}>{alerta}</span>}
    </div>
  );
}

function Bloque({ titulo, children, vacio }) {
  return (
    <div className="mt-6">
      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>{titulo}</span>
      <div className="space-y-2 mt-2">
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
      setClientes(c.data || []); setSesiones(s.data);
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

  return (
    <div>
      <Eyebrow>ADMINISTRACIÓN</Eyebrow>
      <SectionTitle>Hoy</SectionTitle>
      <p style={{ fontFamily: FONT, fontSize: 13.5, color: gray, marginTop: 4 }}>{fmtFecha(hoy)}</p>
      {missing && <div className="mt-4"><MissingTablesBanner migration="supabase/migrations/001_portal_inicio.sql" text="Algunas tablas aún no existen. Aplica una vez la migración" /></div>}

      <div className="grid grid-cols-2 gap-3 mt-5">
        <Kpi label="GRABACIONES HOY" value={grabHoy.length} color={grabHoy.length ? blueLight : white} />
        <Kpi label="ENTREGAS ATRASADAS" value={entAtrasadas.length} color={entAtrasadas.length ? red : green} />
        <Kpi label="POR COBRAR" value={fmtMoney(porCobrarTotal)} color={porCobrarTotal > 0 ? amber : white} />
        <Kpi label="DECLARACIÓN (VENCE 17)" value={`${diasDecla} días`} color={diasDecla <= 5 ? red : white} />
      </div>

      <Bloque titulo="GRABACIONES DE HOY" vacio={loading ? "" : "No hay grabaciones hoy."}>
        {grabHoy.map((x) => <Row key={x.id} titulo={x.titulo} sub={`${nombreCliente(x.cliente_id)}${x.set ? ` · Set ${x.set}` : ""}${x.paquete ? ` · ${x.paquete}` : ""}`} />)}
      </Bloque>

      <Bloque titulo="SESIONES AGENDADAS HOY" vacio={loading ? "" : "No hay sesiones agendadas hoy."}>
        {sesionesHoy.map((s) => <Row key={s.id} titulo={s.titulo || "Sesión"} sub={`${s.hora || ""}${s.cliente_id ? ` · ${nombreCliente(s.cliente_id)}` : ""}`} />)}
      </Bloque>

      <Bloque titulo="ENTREGAS" vacio={loading ? "" : "Nada pendiente de entrega."}>
        {entAtrasadas.map((x) => <Row key={x.id} titulo={x.titulo} sub={`${nombreCliente(x.cliente_id)} · Vencía ${fmtFecha(x.fecha_entrega)}`} alerta="ATRASADA" />)}
        {entHoy.map((x) => <Row key={x.id} titulo={x.titulo} sub={`${nombreCliente(x.cliente_id)} · Entrega hoy`} alerta="HOY" />)}
        {entManana.map((x) => <Row key={x.id} titulo={x.titulo} sub={`${nombreCliente(x.cliente_id)} · Entrega mañana`} />)}
      </Bloque>

      <Bloque titulo="PROPUESTAS A SEGUIR HOY" vacio={loading ? "" : "Ninguna propuesta vence hoy."}>
        {propHoy.map((p) => <Row key={p.id} titulo={p.nombre} sub={`${p.proyecto || ""}${p.proyecto ? " · " : ""}${p.estado || ""}`} />)}
      </Bloque>

      <Bloque titulo="CLIENTES POR CONTACTAR HOY" vacio={loading ? "" : "Nadie por contactar hoy."}>
        {contactarHoy.map((c) => <Row key={c.id} titulo={c.nombre || c.correo} sub={c.correo || ""} />)}
      </Bloque>

      <Bloque titulo="FACTURAS POR COBRAR" vacio={loading ? "" : "Nada por cobrar."}>
        {porCobrar.map((f) => (
          <Row key={f.id} titulo={`${nombreCliente(f.cliente_id)} — ${f.concepto}`} sub={`Saldo ${fmtMoney(saldoDe(f))}${f.vencimiento ? ` · Vence ${fmtFecha(f.vencimiento)}` : ""}`} alerta={vencidas.includes(f) ? "VENCIDA" : null} />
        ))}
      </Bloque>
    </div>
  );
}
