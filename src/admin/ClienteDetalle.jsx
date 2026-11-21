// Ficha 360° del cliente (auditoría Élite OS, tanda 2): todo lo del cliente
// en un solo lugar — datos de contacto y CRM, KPIs de facturación y cada
// factura, cotización, contrato, episodio, propuesta, pago y sesión.
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Eyebrow, EmptyNote, MissingTablesBanner, Kpi, card, cardAlt, white, gray, blueLight, green, amber, red, FONT } from "../lib/ui";
import { safeSelect, fmtMoney, fmtFecha, saldoCliente, waUrl, PAQUETES } from "../lib/ops";

const ETAPAS_CRM = ["Prospecto", "Activo", "Inactivo"];
const ORIGENES = ["Referido", "Instagram", "Facebook", "Google", "Recomendación", "Otro"];
const SETS = ["OCRE", "ÍNDIGO", "NOGAL", "ÓNIX", "Pantalla verde"];

const inputStyle = { background: "#0A0D1E", border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 13.5 };
const labelStyle = { fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1, display: "block", marginBottom: 4 };

function Seccion({ titulo, vacio, children }) {
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

function Fila({ titulo, sub, derecha, colorDerecha }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: card, border: `1px solid ${cardAlt}` }}>
      <div>
        <p style={{ fontFamily: FONT, fontSize: 13.5, color: white }}>{titulo}</p>
        {sub && <p style={{ fontFamily: FONT, fontSize: 11.5, color: gray, marginTop: 2 }}>{sub}</p>}
      </div>
      {derecha && <b style={{ fontFamily: FONT, fontSize: 13, color: colorDerecha || white, whiteSpace: "nowrap", marginLeft: 12 }}>{derecha}</b>}
    </div>
  );
}

export default function ClienteDetalle({ clienteId, onBack }) {
  const [cliente, setCliente] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [contratos, setContratos] = useState([]);
  const [episodios, setEpisodios] = useState([]);
  const [propuestas, setPropuestas] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: c } = await supabase.from("clientes").select("*").eq("id", clienteId).single();
    const fc = await safeSelect("facturas", supabase.from("facturas").select("*").eq("cliente_id", clienteId).order("fecha", { ascending: false }));
    const ab = await safeSelect("abonos", supabase.from("abonos").select("*").order("fecha", { ascending: false }));
    const ct = await safeSelect("cotizaciones", supabase.from("cotizaciones").select("*").eq("cliente_id", clienteId).order("fecha", { ascending: false }));
    const cn = await safeSelect("contratos", supabase.from("contratos").select("*").eq("cliente_id", clienteId).order("fecha", { ascending: false }));
    const ep = await safeSelect("episodios", supabase.from("episodios").select("*").eq("cliente_id", clienteId).order("fecha_grabacion", { ascending: false }));
    const pr = await safeSelect("propuestas", supabase.from("propuestas").select("*").eq("cliente_id", clienteId).order("fecha", { ascending: false }));
    const pg = await safeSelect("pagos", supabase.from("pagos").select("*").eq("cliente_id", clienteId).order("fecha_vencimiento", { ascending: false }));
    const ss = await safeSelect("sesiones", supabase.from("sesiones").select("*").eq("cliente_id", clienteId).order("fecha", { ascending: false }));
    setCliente(c);
    setForm(c || {});
    setFacturas(fc.data);
    const ids = new Set((fc.data || []).map((f) => f.id));
    setAbonos((ab.data || []).filter((a) => ids.has(a.factura_id)));
    setCotizaciones(ct.data);
    setContratos(cn.data);
    setEpisodios(ep.data);
    setPropuestas(pr.data);
    setPagos(pg.data);
    setSesiones(ss.data);
    setMissing(fc.missing || ab.missing || ct.missing || cn.missing || ep.missing || pr.missing || pg.missing || ss.missing);
    setLoading(false);
  }, [clienteId]);

  useEffect(() => { load(); }, [load]);

  const { pendiente, pagado } = saldoCliente(facturas, abonos, pagos);
  const facturado = facturas.reduce((a, f) => a + Number(f.monto || 0), 0);
  const abonosPorFactura = {};
  abonos.forEach((a) => { abonosPorFactura[a.factura_id] = (abonosPorFactura[a.factura_id] || 0) + Number(a.monto || 0); });
  const saldoFactura = (f) => Math.max(0, Number(f.monto || 0) - (abonosPorFactura[f.id] || 0));

  const setF = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved("");
    const patch = {
      telefono: form.telefono || null,
      etapa: form.etapa || null,
      origen: form.origen || null,
      notas: form.notas || null,
      proximo_contacto: form.proximo_contacto || null,
      show_nombre: form.show_nombre || null,
      paquete: form.paquete || null,
      modalidad: form.modalidad || null,
      set: form.set || null,
      sesiones_incluidas: form.sesiones_incluidas ? parseInt(form.sesiones_incluidas, 10) : null,
      estado_proyecto: form.estado_proyecto || null,
    };
    const { error: err } = await supabase.from("clientes").update(patch).eq("id", clienteId);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setCliente((prev) => ({ ...prev, ...patch }));
    setSaved("Guardado.");
    setEdit(false);
  };

  if (loading) {
    return (
      <div>
        <p style={{ fontFamily: FONT, fontSize: 13, color: gray }}>Cargando ficha…</p>
      </div>
    );
  }
  if (!cliente) {
    return (
      <div>
        <button onClick={onBack} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: blueLight }}>← Volver a clientes</button>
        <p style={{ fontFamily: FONT, fontSize: 13, color: gray, marginTop: 12 }}>No se encontró este cliente.</p>
      </div>
    );
  }

  const wa = waUrl(cliente.telefono, `Hola ${cliente.nombre || ""}, te escribe Élite Podhouse.`);
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <button onClick={onBack} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: blueLight, background: "none", border: "none", padding: 0, cursor: "pointer" }}>← Volver a clientes</button>
      <Eyebrow>FICHA DEL CLIENTE</Eyebrow>
      <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: white }}>{cliente.nombre || cliente.correo}</h1>
      <p style={{ fontFamily: FONT, fontSize: 13, color: gray, marginTop: 4 }}>
        {cliente.show_nombre ? `${cliente.show_nombre} · ` : ""}{cliente.correo || "Sin correo"}{cliente.usuario ? ` · Usuario: ${cliente.usuario}` : ""}
      </p>

      {missing && <div className="mt-4"><MissingTablesBanner /></div>}

      <div className="grid grid-cols-3 gap-3 mt-6">
        <Kpi label="FACTURADO" value={fmtMoney(facturado)} />
        <Kpi label="COBRADO" value={fmtMoney(pagado)} color={green} />
        <Kpi label="SALDO" value={fmtMoney(pendiente)} color={pendiente > 0 ? amber : white} />
      </div>

      <div className="mt-6 rounded-2xl p-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
        <div className="flex items-center justify-between">
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>DATOS Y SEGUIMIENTO</span>
          <button onClick={() => { setEdit(!edit); setSaved(""); setError(""); }} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: blueLight, background: "none", border: "none", cursor: "pointer" }}>
            {edit ? "Cancelar" : "Editar"}
          </button>
        </div>
        {edit ? (
          <form onSubmit={guardar} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={labelStyle}>TELÉFONO</label>
                <input value={form.telefono || ""} onChange={(e) => setF("telefono", e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>PROYECTO</label>
                <input value={form.show_nombre || ""} onChange={(e) => setF("show_nombre", e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>ETAPA</label>
                <select value={form.etapa || ""} onChange={(e) => setF("etapa", e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle}>
                  <option value="">Sin etapa</option>
                  {ETAPAS_CRM.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>ORIGEN</label>
                <select value={form.origen || ""} onChange={(e) => setF("origen", e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle}>
                  <option value="">Sin origen</option>
                  {ORIGENES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>PRÓXIMO CONTACTO</label>
                <input type="date" value={form.proximo_contacto || ""} onChange={(e) => setF("proximo_contacto", e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>PAQUETE</label>
                <select value={form.paquete || ""} onChange={(e) => setF("paquete", e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle}>
                  <option value="">Sin paquete</option>
                  {PAQUETES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>MODALIDAD</label>
                <input value={form.modalidad || ""} onChange={(e) => setF("modalidad", e.target.value)} placeholder="p. ej. Mensual" className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>SET</label>
                <select value={form.set || ""} onChange={(e) => setF("set", e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle}>
                  <option value="">Sin set</option>
                  {SETS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>SESIONES INCLUIDAS</label>
                <input type="number" min="0" value={form.sesiones_incluidas || ""} onChange={(e) => setF("sesiones_incluidas", e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>ESTADO DEL PROYECTO</label>
                <input value={form.estado_proyecto || ""} onChange={(e) => setF("estado_proyecto", e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>NOTAS</label>
              <textarea value={form.notas || ""} onChange={(e) => setF("notas", e.target.value)} rows={3} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
            </div>
            {error && <p style={{ fontFamily: FONT, fontSize: 13, color: red }}>{error}</p>}
            <button type="submit" disabled={saving} className="rounded-full px-5 py-2.5" style={{ background: "#2F52FF", color: "white", fontFamily: FONT, fontWeight: 600, fontSize: 13.5, border: "none", cursor: "pointer" }}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </form>
        ) : (
          <div className="mt-4 space-y-2" style={{ fontFamily: FONT, fontSize: 13.5 }}>
            <p style={{ color: gray }}>Teléfono: <b style={{ color: white }}>{cliente.telefono || "—"}</b></p>
            <p style={{ color: gray }}>Etapa: <b style={{ color: white }}>{cliente.etapa || "—"}</b> · Origen: <b style={{ color: white }}>{cliente.origen || "—"}</b></p>
            <p style={{ color: gray }}>Próximo contacto: <b style={{ color: white }}>{cliente.proximo_contacto ? fmtFecha(cliente.proximo_contacto) : "—"}</b></p>
            <p style={{ color: gray }}>Paquete: <b style={{ color: white }}>{cliente.paquete || "—"}</b>{cliente.modalidad ? ` · ${cliente.modalidad}` : ""}{cliente.set ? ` · Set ${cliente.set}` : ""}{cliente.sesiones_incluidas ? ` · ${cliente.sesiones_incluidas} sesiones` : ""}</p>
            <p style={{ color: gray }}>Estado del proyecto: <b style={{ color: white }}>{cliente.estado_proyecto || "—"}</b></p>
            {cliente.notas && <p style={{ color: gray, lineHeight: 1.55 }}>Notas: <span style={{ color: white }}>{cliente.notas}</span></p>}
            {saved && <p style={{ color: green }}>{saved}</p>}
          </div>
        )}
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="inline-block mt-4 rounded-full px-5 py-2.5" style={{ background: "#25D366", color: "white", fontFamily: FONT, fontWeight: 600, fontSize: 13.5, textDecoration: "none" }}>
            WhatsApp al cliente
          </a>
        )}
      </div>

      <Seccion titulo="FACTURAS" vacio={facturas.length === 0 ? "Sin facturas registradas." : ""}>
        {facturas.map((f) => {
          const saldo = saldoFactura(f);
          const vencida = saldo > 0 && f.vencimiento && f.vencimiento < hoy;
          return (
            <Fila
              key={f.id}
              titulo={f.concepto}
              sub={`${f.tipo_cobro || ""}${f.vencimiento ? ` · vence ${fmtFecha(f.vencimiento)}` : ""}${vencida ? " · VENCIDA" : ""} · abonado ${fmtMoney(Math.min(Number(f.monto || 0), abonosPorFactura[f.id] || 0))} de ${fmtMoney(f.monto)}`}
              derecha={saldo > 0 ? `Saldo ${fmtMoney(saldo)}` : "Pagada ✓"}
              colorDerecha={saldo > 0 ? (vencida ? red : amber) : green}
            />
          );
        })}
      </Seccion>

      <Seccion titulo="COTIZACIONES" vacio={cotizaciones.length === 0 ? "Sin cotizaciones." : ""}>
        {cotizaciones.map((q) => (
          <Fila key={q.id} titulo={`${q.paquete || "Cotización"}${q.proyecto ? ` · ${q.proyecto}` : ""}`} sub={`${q.fecha ? fmtFecha(q.fecha) : ""} · ${q.estado || ""}`} derecha={fmtMoney(q.total)} />
        ))}
      </Seccion>

      <Seccion titulo="CONTRATOS" vacio={contratos.length === 0 ? "Sin contratos." : ""}>
        {contratos.map((c) => (
          <Fila key={c.id} titulo={c.nombre || "Contrato"} sub={`${c.fecha ? fmtFecha(c.fecha) : ""} · ${c.estado || ""}`} derecha={fmtMoney(c.total)} />
        ))}
      </Seccion>

      <Seccion titulo="EPISODIOS" vacio={episodios.length === 0 ? "Sin episodios." : ""}>
        {episodios.map((e) => (
          <Fila key={e.id} titulo={e.titulo} sub={`${e.tipo || ""}${e.set ? ` · Set ${e.set}` : ""}${e.fecha_grabacion ? ` · grabado ${fmtFecha(e.fecha_grabacion)}` : ""}${e.responsable ? ` · ${e.responsable}` : ""}`} derecha={e.estado} />
        ))}
      </Seccion>

      <Seccion titulo="PROPUESTAS" vacio={propuestas.length === 0 ? "Sin propuestas." : ""}>
        {propuestas.map((p) => (
          <Fila key={p.id} titulo={`${p.interes || "Propuesta"}${p.proyecto ? ` · ${p.proyecto}` : ""}`} sub={`${p.fecha ? fmtFecha(p.fecha) : ""} · ${p.estado || ""}${p.siguiente_contacto ? ` · siguiente contacto ${fmtFecha(p.siguiente_contacto)}` : ""}`} />
        ))}
      </Seccion>

      <Seccion titulo="PAGOS MANUALES" vacio={pagos.length === 0 ? "Sin pagos manuales." : ""}>
        {pagos.map((p) => (
          <Fila key={p.id} titulo={p.concepto} sub={p.estado === "pagado" ? (p.fecha_pago ? `pagado el ${fmtFecha(p.fecha_pago)}` : "pagado") : `vence el ${fmtFecha(p.fecha_vencimiento)}`} derecha={fmtMoney(p.monto)} colorDerecha={p.estado === "pagado" ? green : white} />
        ))}
      </Seccion>

      <Seccion titulo="SESIONES" vacio={sesiones.length === 0 ? "Sin sesiones agendadas." : ""}>
        {sesiones.map((s) => (
          <Fila key={s.id} titulo={`${s.fecha} · ${s.hora}`} sub={s.tipo || s.estado || ""} derecha={s.estado} />
        ))}
      </Seccion>
    </div>
  );
}
