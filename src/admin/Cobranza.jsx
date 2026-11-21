import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Eyebrow, PillButton, ErrorBanner, OkBanner, SectionTitle, EmptyNote, MissingTablesBanner, Kpi, inputStyle, labelStyle, card, cardAlt, white, gray, blueLight, green, amber, red, FONT } from "../lib/ui";
import { safeSelect, safeLoadClientes, waUrl, fmtMoney, fmtFecha, todayISO, r2 } from "../lib/ops";
import { subirComprobante, ComprobanteValor } from "../lib/comprobantes.jsx";
import { pdfRecibo } from "../lib/pdf";

const METODOS = ["Transferencia", "Tarjeta", "Efectivo", "Otro"];
const TIPOS_COBRO = ["Sesión", "Mensualidad", "Episodio Cero", "Renta", "Reels", "Exterior", "Otro"];

export default function AdminCobranza() {
  const [facturas, setFacturas] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState([]);
  const [sel, setSel] = useState(null);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  // Nueva factura
  const [clienteId, setClienteId] = useState("");
  const [concepto, setConcepto] = useState("");
  const [tipoCobro, setTipoCobro] = useState("Mensualidad");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(todayISO());
  const [vencimiento, setVencimiento] = useState("");
  const [conFactura, setConFactura] = useState(false);
  const [saving, setSaving] = useState(false);

  // Nuevo abono
  const [abMonto, setAbMonto] = useState("");
  const [abFecha, setAbFecha] = useState(todayISO());
  const [abMetodo, setAbMetodo] = useState("Transferencia");
  const [abComprobante, setAbComprobante] = useState("");
  const [abArchivo, setAbArchivo] = useState(null);
  const [abSaving, setAbSaving] = useState(false);

  // Reporte semanal/mensual de cobranza.
  const [repMes, setRepMes] = useState(todayISO().slice(0, 7));
  const [repSemana, setRepSemana] = useState("mes");

  const load = useCallback(async () => {
    const f = await safeSelect("facturas", supabase.from("facturas").select("*").order("created_at", { ascending: false }));
    const a = await safeSelect("abonos", supabase.from("abonos").select("*").order("fecha", { ascending: false }));
    setFacturas(f.data);
    setAbonos(a.data);
    setMissing(f.missing || a.missing);
    setLoading(false);
  }, []);
  useEffect(() => { load(); safeLoadClientes().then(setClientes); }, [load]);

  const nombreCliente = (id) => clientes.find((c) => c.id === id)?.nombre || "Cliente";
  const abonosDe = (fid) => abonos.filter((a) => a.factura_id === fid);
  const saldoDe = (f) => r2(Number(f.monto || 0) - abonosDe(f.id).reduce((a, x) => a + Number(x.monto || 0), 0));
  const hoy = todayISO();

  const porCobrar = facturas.reduce((a, f) => a + Math.max(0, saldoDe(f)), 0);
  const vencidas = facturas.filter((f) => saldoDe(f) > 0 && f.vencimiento && f.vencimiento < hoy);
  const vencidoMonto = vencidas.reduce((a, f) => a + saldoDe(f), 0);
  const mesActual = hoy.slice(0, 7);
  const cobradoMes = abonos.filter((a) => (a.fecha || "").startsWith(mesActual)).reduce((a, x) => a + Number(x.monto || 0), 0);

  // Reporte: facturas y abonos dentro del mes/semana elegidos.
  const enPeriodo = (fechaStr) => {
    if (!fechaStr || !fechaStr.startsWith(repMes)) return false;
    if (repSemana === "mes") return true;
    const dia = parseInt(fechaStr.slice(8, 10), 10);
    const sem = Number(repSemana);
    return dia >= (sem - 1) * 7 + 1 && dia <= sem * 7;
  };
  const repFacturas = facturas.filter((f) => enPeriodo(f.fecha));
  const repFacturado = repFacturas.reduce((a, f) => a + Number(f.monto || 0), 0);
  const repCobrado = abonos.filter((a) => enPeriodo(a.fecha)).reduce((a, x) => a + Number(x.monto || 0), 0);
  const repPendiente = repFacturas.reduce((a, f) => a + Math.max(0, saldoDe(f)), 0);
  const repVencido = repFacturas.filter((f) => saldoDe(f) > 0 && f.vencimiento && f.vencimiento < hoy).reduce((a, f) => a + saldoDe(f), 0);
  const telefonoDe = (id) => clientes.find((c) => c.id === id)?.telefono || "";

  const crearFactura = async (e) => {
    e.preventDefault();
    setError(""); setOk("");
    if (!clienteId || !concepto || !monto) { setError("Elige cliente, concepto y monto."); return; }
    setSaving(true);
    const m = Number(monto);
    const { error } = await supabase.from("facturas").insert({
      cliente_id: clienteId,
      concepto,
      tipo_cobro: tipoCobro,
      monto: m,
      fecha: fecha || hoy,
      vencimiento: vencimiento || null,
      con_factura: conFactura,
      subtotal: conFactura ? r2(m / 1.16) : null,
      iva: conFactura ? r2(m - m / 1.16) : null,
    });
    if (error) setError(error.message);
    else { setConcepto(""); setMonto(""); setVencimiento(""); setOk("Factura registrada."); load(); }
    setSaving(false);
  };

  const registrarAbono = async (e) => {
    e.preventDefault();
    if (!sel) return;
    setError(""); setOk("");
    if (!abMonto) { setError("Escribe el monto del abono."); return; }
    setAbSaving(true);
    let comprobante = abComprobante || null;
    if (abArchivo) {
      try {
        comprobante = await subirComprobante(abArchivo);
      } catch (err) {
        setError(err.message);
        setAbSaving(false);
        return;
      }
    }
    const { error } = await supabase.from("abonos").insert({
      factura_id: sel.id,
      monto: Number(abMonto),
      fecha: abFecha || hoy,
      metodo: abMetodo,
      comprobante_url: comprobante,
    });
    if (error) setError(error.message);
    else { setAbMonto(""); setAbComprobante(""); setAbArchivo(null); setOk("Abono registrado."); load(); }
    setAbSaving(false);
  };

  const eliminarFactura = async (f) => {
    await supabase.from("abonos").delete().eq("factura_id", f.id);
    await supabase.from("facturas").delete().eq("id", f.id);
    setSel(null);
    load();
  };

  const folio = (f, n) => `EP-${String(f.id).replace(/-/g, "").slice(-5).toUpperCase()}-${n}`;
  const recibo = (f, a, idx) => {
    pdfRecibo({
      folio: folio(f, idx + 1),
      cliente: nombreCliente(f.cliente_id),
      concepto: f.concepto,
      monto: Number(a.monto),
      fecha: a.fecha,
      metodo: a.metodo,
      saldo: saldoDe(f),
      conIva: !!f.con_factura,
      iva: Number(f.iva || 0),
    });
  };

  return (
    <div>
      <Eyebrow>ADMINISTRACIÓN</Eyebrow>
      <SectionTitle>Cobranza</SectionTitle>
      {missing && <div className="mt-4"><MissingTablesBanner migration="supabase/migrations/001_portal_inicio.sql" text="Faltan las tablas de facturas y abonos. Aplica una vez la migración" /></div>}
      {!missing && !loading && facturas.length === 0 && (
        <p className="mt-4" style={{ fontFamily: FONT, fontSize: 13.5, color: gray, lineHeight: 1.6 }}>Aún no hay facturas. Registra la primera abajo.</p>
      )}

      <div className="grid grid-cols-3 gap-3 mt-5">
        <Kpi label="POR COBRAR" value={fmtMoney(porCobrar)} color={porCobrar > 0 ? amber : white} />
        <Kpi label="VENCIDO" value={`${fmtMoney(vencidoMonto)} · ${vencidas.length}`} color={vencidas.length > 0 ? red : white} />
        <Kpi label="COBRADO ESTE MES" value={fmtMoney(cobradoMes)} color={green} />
      </div>

      <div className="space-y-2 mt-4">
        {facturas.map((f) => {
          const saldo = saldoDe(f);
          const vencida = saldo > 0 && f.vencimiento && f.vencimiento < hoy;
          return (
            <div key={f.id} onClick={() => setSel(f)} className="rounded-2xl p-4" style={{ background: card, border: `1px solid ${sel?.id === f.id ? blueLight : cardAlt}`, cursor: "pointer" }}>
              <div className="flex items-center justify-between gap-2">
                <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: white }}>{nombreCliente(f.cliente_id)} — {f.concepto}</p>
                <b style={{ fontFamily: FONT, fontSize: 14, color: saldo > 0 ? (vencida ? red : amber) : green }}>{saldo > 0 ? `Saldo ${fmtMoney(saldo)}` : "Pagado ✓"}</b>
              </div>
              <p style={{ fontFamily: FONT, fontSize: 12.5, color: gray, marginTop: 4 }}>
                {f.tipo_cobro || ""} · Total {fmtMoney(f.monto)}{f.fecha ? ` · ${fmtFecha(f.fecha)}` : ""}{f.vencimiento ? ` · Vence ${fmtFecha(f.vencimiento)}` : ""}
                {vencida ? " · VENCIDA" : ""}
              </p>
            </div>
          );
        })}
        {facturas.length === 0 && !loading && <EmptyNote>No hay facturas registradas.</EmptyNote>}
      </div>

      {sel && (
        <div className="rounded-2xl p-5 mt-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>ABONOS — {nombreCliente(sel.cliente_id).toUpperCase()} · {sel.concepto.toUpperCase()}</span>
          <p style={{ fontFamily: FONT, fontSize: 14, color: white, marginTop: 8 }}>Saldo: <b style={{ color: saldoDe(sel) > 0 ? amber : green }}>{fmtMoney(saldoDe(sel))}</b> de {fmtMoney(sel.monto)}</p>
          <div className="space-y-2 mt-3">
            {abonosDe(sel.id).map((a, i) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "#0B1338", border: `1px solid ${cardAlt}` }}>
                <div>
                  <p style={{ fontFamily: FONT, fontSize: 13, color: white }}>{fmtMoney(a.monto)} · {a.metodo || ""}{a.fecha ? ` · ${fmtFecha(a.fecha)}` : ""}</p>
                  {a.comprobante_url && <p style={{ fontFamily: FONT, fontSize: 11.5, marginTop: 2 }}><ComprobanteValor valor={a.comprobante_url} /></p>}
                </div>
                <button onClick={() => recibo(sel, a, i)} style={{ fontFamily: FONT, fontSize: 12.5, color: blueLight, fontWeight: 600 }}>Recibo {folio(sel, i + 1)}</button>
              </div>
            ))}
            {abonosDe(sel.id).length === 0 && <EmptyNote>Sin abonos todavía.</EmptyNote>}
          </div>
          <form onSubmit={registrarAbono} className="mt-4">
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>REGISTRAR ABONO</span>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <input type="number" min="0.01" step="0.01" placeholder="Monto ($)" value={abMonto} onChange={(e) => setAbMonto(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
              <input type="date" value={abFecha} onChange={(e) => setAbFecha(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
              <select value={abMetodo} onChange={(e) => setAbMetodo(e.target.value)} className="rounded-xl px-3 py-2.5" style={inputStyle}>
                {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <input placeholder="Comprobante (nombre o nota, opcional)" value={abComprobante} onChange={(e) => setAbComprobante(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={inputStyle} />
            <label style={{ fontFamily: FONT, fontSize: 12, color: gray, display: "block", marginTop: 8 }}>
              O sube el archivo del comprobante (imagen o PDF, máx. 20 MB)
              <input type="file" accept="image/*,.pdf" onChange={(e) => setAbArchivo(e.target.files?.[0] || null)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-1" style={{ ...inputStyle, padding: "8px 12px" }} />
            </label>
            {abArchivo && <p style={{ fontFamily: FONT, fontSize: 12, color: gray, marginTop: 4 }}>Archivo elegido: {abArchivo.name}</p>}
            <ErrorBanner message={error} />
            <OkBanner message={ok} />
            <div className="flex gap-2 flex-wrap mt-2">
              <PillButton type="submit" disabled={abSaving}>{abSaving ? "Guardando…" : "Guardar abono"}</PillButton>
              <PillButton ghost type="button" onClick={() => eliminarFactura(sel)}>Eliminar factura</PillButton>
            </div>
          </form>
        </div>
      )}

      <form onSubmit={crearFactura} className="mt-6 rounded-2xl p-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>NUEVA FACTURA (COBRO)</span>
        <div className="mt-3">
          <label style={labelStyle}>CLIENTE</label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} className="w-full rounded-xl px-3 py-2.5" style={inputStyle}>
            <option value="">Selecciona un cliente</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre || c.correo}</option>)}
          </select>
        </div>
        <input placeholder="Concepto (p. ej. Mensualidad Impacto — noviembre)" value={concepto} onChange={(e) => setConcepto(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={inputStyle} />
        <div className="grid grid-cols-3 gap-2 mt-2">
          <select value={tipoCobro} onChange={(e) => setTipoCobro(e.target.value)} className="rounded-xl px-3 py-2.5" style={inputStyle}>
            {TIPOS_COBRO.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="number" min="0.01" step="0.01" placeholder="Monto ($)" value={monto} onChange={(e) => setMonto(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label style={labelStyle}>VENCIMIENTO</label>
            <input type="date" value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
          </div>
          <label className="flex items-center gap-2 rounded-xl px-3 py-2.5 mt-6" style={{ background: "#0B1338", border: `1px solid ${cardAlt}`, fontFamily: FONT, fontSize: 13, color: white }}>
            <input type="checkbox" checked={conFactura} onChange={(e) => setConFactura(e.target.checked)} /> Con factura (se calcula IVA 16%)
          </label>
        </div>
        <ErrorBanner message={error} />
        <div className="mt-3"><PillButton type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar factura"}</PillButton></div>
      </form>

      <div className="rounded-2xl p-5 mt-6" style={{ background: card, border: `1px solid ${cardAlt}` }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>REPORTE DE COBRANZA</span>
        <div className="flex gap-2 mt-3 flex-wrap">
          <input type="month" value={repMes} onChange={(e) => setRepMes(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
          <select value={repSemana} onChange={(e) => setRepSemana(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle}>
            <option value="mes">Todo el mes</option>
            <option value="1">Semana 1 (días 1–7)</option>
            <option value="2">Semana 2 (días 8–14)</option>
            <option value="3">Semana 3 (días 15–21)</option>
            <option value="4">Semana 4 (días 22–28)</option>
            <option value="5">Semana 5 (días 29–31)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Kpi label="FACTURADO EN EL PERIODO" value={fmtMoney(repFacturado)} />
          <Kpi label="COBRADO EN EL PERIODO" value={fmtMoney(repCobrado)} color={green} />
          <Kpi label="PENDIENTE (DE ESAS FACTURAS)" value={fmtMoney(repPendiente)} color={repPendiente > 0 ? amber : white} />
          <Kpi label="VENCIDO" value={fmtMoney(repVencido)} color={repVencido > 0 ? red : white} />
        </div>
        <div className="space-y-2 mt-4">
          {repFacturas.map((f) => {
            const saldo = saldoDe(f);
            const vencida = saldo > 0 && f.vencimiento && f.vencimiento < hoy;
            const abonado = abonosDe(f.id).reduce((a, x) => a + Number(x.monto || 0), 0);
            const tel = telefonoDe(f.cliente_id);
            const wa = saldo > 0 && tel ? waUrl(tel, `Hola ${nombreCliente(f.cliente_id)}, te escribe Élite Podhouse. Te recordamos un saldo pendiente de ${fmtMoney(saldo)} por ${f.concepto}${f.vencimiento ? ` (vencía el ${fmtFecha(f.vencimiento)})` : ""}. ¿Nos confirmas tu pago?`) : "";
            return (
              <div key={f.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "#0B1338", border: `1px solid ${cardAlt}` }}>
                <div>
                  <p style={{ fontFamily: FONT, fontSize: 13, color: white }}>{nombreCliente(f.cliente_id)} — {f.concepto}</p>
                  <p style={{ fontFamily: FONT, fontSize: 11.5, color: gray, marginTop: 2 }}>{f.fecha ? fmtFecha(f.fecha) : ""} · {fmtMoney(f.monto)} · abonado {fmtMoney(abonado)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <b style={{ fontFamily: FONT, fontSize: 13, color: saldo > 0 ? (vencida ? red : amber) : green }}>{saldo > 0 ? `Saldo ${fmtMoney(saldo)}` : "Pagada ✓"}</b>
                  {wa && <a href={wa} target="_blank" rel="noreferrer" style={{ fontFamily: FONT, fontSize: 12, color: green, fontWeight: 600 }}>Recordar por WhatsApp</a>}
                </div>
              </div>
            );
          })}
          {repFacturas.length === 0 && <EmptyNote>Sin facturas en este periodo.</EmptyNote>}
        </div>
      </div>
    </div>
  );
}
