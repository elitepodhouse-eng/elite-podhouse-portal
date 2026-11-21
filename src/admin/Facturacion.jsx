import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Eyebrow, PillButton, ErrorBanner, OkBanner, SectionTitle, EmptyNote, MissingTablesBanner, Kpi, inputStyle, labelStyle, card, cardAlt, white, gray, blueLight, green, amber, red, FONT } from "../lib/ui";
import { safeSelect, safeLoadClientes, fmtMoney, fmtFecha, todayISO, r2 } from "../lib/ops";

// Tramos RESICO (mapa §2.8): tasa ISR según ingresos del mes.
const TRAMOS = [
  [25000, 0.01], [50000, 0.011], [83333.33, 0.015], [208333.33, 0.02], [Infinity, 0.025],
];
function tasaResico(base) {
  for (const [limite, tasa] of TRAMOS) if (base <= limite) return tasa;
  return 0.025;
}

export default function AdminFacturacion() {
  const [fiscales, setFiscales] = useState([]);
  const [meses, setMeses] = useState([]);
  const [cobranza, setCobranza] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mesSel, setMesSel] = useState(todayISO().slice(0, 7));
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  // Form factura fiscal
  const [folio, setFolio] = useState("");
  const [cliente, setCliente] = useState("");
  const [concepto, setConcepto] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [iva, setIva] = useState("");
  const [esMoral, setEsMoral] = useState(false);
  const [cobrada, setCobrada] = useState(false);
  const [fechaCobro, setFechaCobro] = useState("");
  const [cobranzaId, setCobranzaId] = useState("");
  const [nota, setNota] = useState("");
  const [saving, setSaving] = useState(false);

  // Form mes fiscal
  const [ivaAcred, setIvaAcred] = useState("");
  const [presentada, setPresentada] = useState("");
  const [notaMes, setNotaMes] = useState("");
  const [mesSaving, setMesSaving] = useState(false);

  const load = useCallback(async () => {
    const f = await safeSelect("facturas_fiscales", supabase.from("facturas_fiscales").select("*").order("fecha", { ascending: false }));
    const m = await safeSelect("meses_fiscales", supabase.from("meses_fiscales").select("*").order("mes", { ascending: false }));
    const c = await safeSelect("facturas", supabase.from("facturas").select("id, concepto, cliente_id, monto"));
    setFiscales(f.data); setMeses(m.data); setCobranza(c.data);
    setMissing(f.missing || m.missing);
    setLoading(false);
  }, []);
  useEffect(() => { load(); safeLoadClientes().then(setClientes); }, [load]);

  const nombreCliente = (id) => clientes.find((c) => c.id === id)?.nombre || "Cliente";

  const failMsg = "Falta aplicar la migración supabase/migrations/002_finanzas_facturacion.sql en Supabase.";

  const guardarFiscal = async (e) => {
    e.preventDefault(); setError(""); setOk("");
    if (!cliente || !concepto) { setError("Escribe cliente y concepto."); return; }
    setSaving(true);
    const { error } = await supabase.from("facturas_fiscales").insert({
      cobranza_id: cobranzaId || null,
      fecha: todayISO(),
      folio: folio || null,
      cliente, concepto,
      subtotal: Number(subtotal) || 0,
      iva: Number(iva) || 0,
      es_moral: esMoral,
      cobrada,
      fecha_cobro: cobrada ? (fechaCobro || todayISO()) : null,
      estado: "Vigente",
      nota: nota || null,
    });
    if (error) setError(error.code === "PGRST205" ? failMsg : error.message);
    else { setFolio(""); setCliente(""); setConcepto(""); setSubtotal(""); setIva(""); setNota(""); setCobranzaId(""); setOk("Factura fiscal registrada."); load(); }
    setSaving(false);
  };

  const guardarMes = async (e) => {
    e.preventDefault(); setError(""); setOk("");
    setMesSaving(true);
    const { error } = await supabase.from("meses_fiscales").upsert({
      mes: mesSel,
      iva_acreditable: Number(ivaAcred) || 0,
      presentada: presentada || null,
      nota: notaMes || null,
    });
    if (error) setError(error.code === "PGRST205" ? failMsg : error.message);
    else { setOk("Mes fiscal guardado."); load(); }
    setMesSaving(false);
  };

  const marcarCobrada = async (f) => {
    await supabase.from("facturas_fiscales").update({ cobrada: !f.cobrada, fecha_cobro: !f.cobrada ? todayISO() : null }).eq("id", f.id);
    load();
  };
  const cancelar = async (f) => {
    await supabase.from("facturas_fiscales").update({ estado: f.estado === "Cancelada" ? "Vigente" : "Cancelada" }).eq("id", f.id);
    load();
  };

  // --- Cálculo RESICO del mes seleccionado ---
  const delMes = fiscales.filter((f) => (f.fecha || "").startsWith(mesSel) && f.estado !== "Cancelada" && f.cobrada);
  const base = r2(delMes.reduce((t, f) => t + Number(f.subtotal || 0), 0));
  const ivaCobrado = r2(delMes.reduce((t, f) => t + Number(f.iva || 0), 0));
  const moral = delMes.filter((f) => f.es_moral);
  const baseMoral = r2(moral.reduce((t, f) => t + Number(f.subtotal || 0), 0));
  const ivaMoral = r2(moral.reduce((t, f) => t + Number(f.iva || 0), 0));
  const tasa = tasaResico(base);
  const isr = r2(base * tasa);
  const retIsr = r2(baseMoral * 0.0125);
  const retIva = r2(ivaMoral * (2 / 3));
  const mesRow = meses.find((m) => m.mes === mesSel);
  const ivaAcreditable = Number(mesRow?.iva_acreditable || 0);
  const ivaNeto = r2(ivaCobrado - retIva - ivaAcreditable);

  useEffect(() => {
    setIvaAcred(mesRow ? String(mesRow.iva_acreditable ?? "") : "");
    setPresentada(mesRow?.presentada || "");
    setNotaMes(mesRow?.nota || "");
  }, [mesSel, meses]);

  const vence = (() => {
    const [y, m] = mesSel.split("-").map(Number);
    return `17 de ${["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][m % 12]} de ${m === 12 ? y + 1 : y}`;
  })();

  return (
    <div>
      <Eyebrow>ADMINISTRACIÓN</Eyebrow>
      <SectionTitle>Facturación</SectionTitle>
      {missing && <div className="mt-4"><MissingTablesBanner migration="supabase/migrations/002_finanzas_facturacion.sql" /></div>}
      {!missing && !loading && fiscales.length === 0 && (
        <p className="mt-4" style={{ fontFamily: FONT, fontSize: 13.5, color: gray, lineHeight: 1.6 }}>Aún no hay facturas fiscales. Registra la primera abajo.</p>
      )}

      {/* Declaración mensual */}
      <div className="rounded-2xl p-5 mt-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>DECLARACIÓN MENSUAL RESICO</span>
        <div className="mt-3">
          <label style={labelStyle}>MES</label>
          <input type="month" value={mesSel} onChange={(e) => setMesSel(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <Kpi label="BASE (COBRADO)" value={fmtMoney(base)} />
          <Kpi label={`ISR RESICO (${(tasa * 100).toFixed(tasa < 0.02 ? 1 : 0)}%)`} value={fmtMoney(isr)} />
          <Kpi label="RET. ISR 1.25% (MORAL)" value={fmtMoney(retIsr)} />
          <Kpi label="IVA NETO" value={fmtMoney(ivaNeto)} color={ivaNeto >= 0 ? white : green} />
        </div>
        <p style={{ fontFamily: FONT, fontSize: 12.5, color: gray, marginTop: 10, lineHeight: 1.6 }}>
          IVA cobrado {fmtMoney(ivaCobrado)} − retención IVA ⅔ sobre moral {fmtMoney(retIva)} − IVA acreditable {fmtMoney(ivaAcreditable)}.
          Vence el {vence}.
        </p>
        <form onSubmit={guardarMes} className="mt-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label style={labelStyle}>IVA ACREDITABLE ($)</label>
              <input type="number" min="0" step="0.01" value={ivaAcred} onChange={(e) => setIvaAcred(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>PRESENTADA</label>
              <select value={presentada} onChange={(e) => setPresentada(e.target.value)} className="w-full rounded-xl px-3 py-2.5" style={inputStyle}>
                <option value="">No</option>
                <option value="sí">Sí</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
          <input placeholder="Nota del mes (opcional)" value={notaMes} onChange={(e) => setNotaMes(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={inputStyle} />
          <ErrorBanner message={error} />
          <OkBanner message={ok} />
          <div className="mt-2"><PillButton type="submit" disabled={mesSaving}>{mesSaving ? "Guardando…" : "Guardar mes fiscal"}</PillButton></div>
        </form>
      </div>

      {/* Lista de facturas fiscales */}
      <div className="space-y-2 mt-5">
        {fiscales.map((f) => (
          <div key={f.id} className="rounded-2xl p-4" style={{ background: card, border: `1px solid ${cardAlt}`, opacity: f.estado === "Cancelada" ? 0.55 : 1 }}>
            <div className="flex items-center justify-between gap-2">
              <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: white }}>{f.cliente} — {f.concepto}</p>
              <span className="px-2.5 py-1 rounded-full shrink-0" style={{ background: f.estado === "Cancelada" ? "rgba(224,93,93,0.12)" : f.cobrada ? greenBg : amber ? "rgba(245,166,35,0.16)" : cardAlt, color: f.estado === "Cancelada" ? red : f.cobrada ? green : amber, fontFamily: FONT, fontSize: 10.5, fontWeight: 600 }}>
                {f.estado === "Cancelada" ? "Cancelada" : f.cobrada ? "Cobrada" : "Pendiente de cobro"}
              </span>
            </div>
            <p style={{ fontFamily: FONT, fontSize: 12.5, color: gray, marginTop: 4 }}>
              {f.folio ? `Folio ${f.folio} · ` : ""}{f.fecha ? fmtFecha(f.fecha) : ""} · Subtotal {fmtMoney(f.subtotal)} + IVA {fmtMoney(f.iva)}{f.es_moral ? " · Persona moral" : ""}
            </p>
            <div className="flex gap-3 mt-2">
              <button onClick={() => marcarCobrada(f)} style={{ fontFamily: FONT, fontSize: 12.5, color: green, fontWeight: 600 }}>{f.cobrada ? "Marcar no cobrada" : "Marcar cobrada"}</button>
              <button onClick={() => cancelar(f)} style={{ fontFamily: FONT, fontSize: 12.5, color: red, fontWeight: 600 }}>{f.estado === "Cancelada" ? "Reactivar" : "Cancelar"}</button>
            </div>
          </div>
        ))}
        {fiscales.length === 0 && !loading && <EmptyNote>Sin facturas fiscales.</EmptyNote>}
      </div>

      {/* Nueva factura fiscal */}
      <form onSubmit={guardarFiscal} className="mt-6 rounded-2xl p-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>NUEVA FACTURA FISCAL</span>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <input placeholder="Folio" value={folio} onChange={(e) => setFolio(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
          <input placeholder="Cliente *" value={cliente} onChange={(e) => setCliente(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
        </div>
        <input placeholder="Concepto *" value={concepto} onChange={(e) => setConcepto(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={inputStyle} />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label style={labelStyle}>SUBTOTAL ($)</label>
            <input type="number" min="0" step="0.01" value={subtotal} onChange={(e) => { setSubtotal(e.target.value); setIva(String(r2(Number(e.target.value || 0) * 0.16))); }} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>IVA ($)</label>
            <input type="number" min="0" step="0.01" value={iva} onChange={(e) => setIva(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
          </div>
        </div>
        {cobranza.length > 0 && (
          <div className="mt-2">
            <label style={labelStyle}>LIGADA A FACTURA DE COBRANZA (OPCIONAL)</label>
            <select value={cobranzaId} onChange={(e) => setCobranzaId(e.target.value)} className="w-full rounded-xl px-3 py-2.5" style={inputStyle}>
              <option value="">Sin liga</option>
              {cobranza.map((c) => <option key={c.id} value={c.id}>{nombreCliente(c.cliente_id)} — {c.concepto} — {fmtMoney(c.monto)}</option>)}
            </select>
          </div>
        )}
        <div className="flex gap-2 mt-3 flex-wrap">
          <label className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "#0B1338", border: `1px solid ${cardAlt}`, fontFamily: FONT, fontSize: 13, color: white }}>
            <input type="checkbox" checked={esMoral} onChange={(e) => setEsMoral(e.target.checked)} /> Persona moral
          </label>
          <label className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "#0B1338", border: `1px solid ${cardAlt}`, fontFamily: FONT, fontSize: 13, color: white }}>
            <input type="checkbox" checked={cobrada} onChange={(e) => setCobrada(e.target.checked)} /> Cobrada
          </label>
          {cobrada && <input type="date" value={fechaCobro} onChange={(e) => setFechaCobro(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />}
        </div>
        <input placeholder="Nota (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={inputStyle} />
        <ErrorBanner message={error} />
        <div className="mt-3"><PillButton type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar factura fiscal"}</PillButton></div>
      </form>
    </div>
  );
}
