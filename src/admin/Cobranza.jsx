import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Eyebrow, PillButton, ErrorBanner, OkBanner, SectionTitle, EmptyNote, MissingTablesBanner, Kpi, inputStyle, labelStyle, card, cardAlt, white, gray, blueLight, green, amber, red, FONT } from "../lib/ui";
import { safeSelect, safeLoadClientes, waUrl, fmtMoney, fmtFecha, todayISO, r2 } from "../lib/ops";
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
  const [abSaving, setAbSaving] = useState(false);

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
    const { error } = await supabase.from("abonos").insert({
      factura_id: sel.id,
      monto: Number(abMonto),
      fecha: abFecha || hoy,
      metodo: abMetodo,
      comprobante_url: abComprobante || null,
    });
    if (error) setError(error.message);
    else { setAbMonto(""); setAbComprobante(""); setOk("Abono registrado."); load(); }
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
                  {a.comprobante_url && <p style={{ fontFamily: FONT, fontSize: 11.5, color: gray }}>Comprobante: {a.comprobante_url}</p>}
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
            <input placeholder="Comprobante (nombre o nota, opcional — por ahora no se sube archivo)" value={abComprobante} onChange={(e) => setAbComprobante(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={inputStyle} />
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
    </div>
  );
}
