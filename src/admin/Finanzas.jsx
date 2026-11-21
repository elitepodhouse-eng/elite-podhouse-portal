import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Eyebrow, PillButton, ErrorBanner, OkBanner, SectionTitle, EmptyNote, MissingTablesBanner, Kpi, inputStyle, labelStyle, card, cardAlt, white, gray, blueLight, blueSoft, green, greenBg, amber, red, FONT } from "../lib/ui";
import { safeSelect, fmtMoney, fmtFecha, todayISO, useConfig, r2 } from "../lib/ops";
import { subirComprobante, ComprobanteValor } from "../lib/comprobantes.jsx";
import { pdfReciboColab } from "../lib/pdf";

const CAT_EGRESO = ["Equipo y estudio", "Software y suscripciones", "Marketing y publicidad", "Renta y servicios", "Sueldos y colaboradores", "Impuestos", "Transporte", "Otros"];
const CAT_INGRESO = ["Servicio extra", "Otros ingresos"];
const METODOS = ["Transferencia", "Tarjeta", "Efectivo", "Otro"];

export default function AdminFinanzas() {
  const [tab, setTab] = useState("resumen");
  const [movimientos, setMovimientos] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [colabs, setColabs] = useState([]);
  const [pagosColab, setPagosColab] = useState([]);
  const [abonos, setAbonos] = useState([]);
  const [missing, setMissing] = useState(false);
  const [missingColab, setMissingColab] = useState(false);
  const [loading, setLoading] = useState(true);
  const { config } = useConfig();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async () => {
    const m = await safeSelect("movimientos", supabase.from("movimientos").select("*").order("fecha", { ascending: false }));
    const g = await safeSelect("gastos_fijos", supabase.from("gastos_fijos").select("*").order("created_at", { ascending: false }));
    const c = await safeSelect("colaboradores", supabase.from("colaboradores").select("*").order("created_at", { ascending: false }));
    const pc = await safeSelect("pagos_colaboradores", supabase.from("pagos_colaboradores").select("*").order("fecha", { ascending: false }));
    const a = await safeSelect("abonos", supabase.from("abonos").select("*"));
    setMovimientos(m.data); setGastos(g.data); setColabs(c.data); setPagosColab(pc.data); setAbonos(a.data);
    setMissing(m.missing || g.missing);
    setMissingColab(c.missing || pc.missing);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const mes = todayISO().slice(0, 7);
  const delMes = (arr) => arr.filter((x) => (x.fecha || "").startsWith(mes));
  const ingMov = delMes(movimientos).filter((x) => x.tipo === "ingreso").reduce((t, x) => t + Number(x.monto || 0), 0);
  const ingAbonos = delMes(abonos).reduce((t, x) => t + Number(x.monto || 0), 0);
  const ingresos = r2(ingMov + ingAbonos);
  const egrMov = delMes(movimientos).filter((x) => x.tipo === "egreso").reduce((t, x) => t + Number(x.monto || 0), 0);
  const egrColab = delMes(pagosColab).reduce((t, x) => t + Number(x.monto || 0), 0);
  const egresos = r2(egrMov + egrColab);
  const utilidad = r2(ingresos - egresos);
  const fijosTotal = gastos.reduce((t, x) => t + Number(x.monto || 0), 0);
  const meta = Number(config?.metaMensual || 0);
  const avanceMeta = meta > 0 ? Math.min(100, Math.round((ingresos / meta) * 100)) : 0;

  // Gráfica mes a mes (últimos 6 meses): ingresos en verde, egresos en rojo.
  const MESES_NOMBRES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const ultimosMeses = (() => {
    const lista = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
      const clave = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
      const ing = movimientos.filter((x) => (x.fecha || "").startsWith(clave) && x.tipo === "ingreso").reduce((t, x) => t + Number(x.monto || 0), 0)
        + abonos.filter((x) => (x.fecha || "").startsWith(clave)).reduce((t, x) => t + Number(x.monto || 0), 0);
      const egr = movimientos.filter((x) => (x.fecha || "").startsWith(clave) && x.tipo === "egreso").reduce((t, x) => t + Number(x.monto || 0), 0)
        + pagosColab.filter((x) => (x.fecha || "").startsWith(clave)).reduce((t, x) => t + Number(x.monto || 0), 0);
      lista.push({ clave, etiqueta: MESES_NOMBRES[m.getMonth()], ing: r2(ing), egr: r2(egr) });
    }
    return lista;
  })();
  const maxGrafica = Math.max(1, ...ultimosMeses.map((m) => Math.max(m.ing, m.egr)));

  // --- Forms ---
  const [mvTipo, setMvTipo] = useState("egreso");
  const [mvFecha, setMvFecha] = useState(todayISO());
  const [mvConcepto, setMvConcepto] = useState("");
  const [mvCategoria, setMvCategoria] = useState(CAT_EGRESO[0]);
  const [mvMonto, setMvMonto] = useState("");
  const [mvMetodo, setMvMetodo] = useState("Transferencia");
  const [mvNota, setMvNota] = useState("");
  const [mvSaving, setMvSaving] = useState(false);

  const [gfConcepto, setGfConcepto] = useState("");
  const [gfCategoria, setGfCategoria] = useState(CAT_EGRESO[3]);
  const [gfMonto, setGfMonto] = useState("");
  const [gfMetodo, setGfMetodo] = useState("Transferencia");
  const [gfSaving, setGfSaving] = useState(false);

  const [cbNombre, setCbNombre] = useState("");
  const [cbServicio, setCbServicio] = useState("");
  const [cbTelefono, setCbTelefono] = useState("");
  const [cbCorreo, setCbCorreo] = useState("");
  const [cbSaving, setCbSaving] = useState(false);
  const [selColab, setSelColab] = useState(null);
  const [pcFecha, setPcFecha] = useState(todayISO());
  const [pcConcepto, setPcConcepto] = useState("");
  const [pcMonto, setPcMonto] = useState("");
  const [pcMetodo, setPcMetodo] = useState("Transferencia");
  const [pcNota, setPcNota] = useState("");
  const [pcComprobante, setPcComprobante] = useState("");
  const [pcArchivo, setPcArchivo] = useState(null);
  const [pcSaving, setPcSaving] = useState(false);

  const failMsg = "Falta aplicar la migración supabase/migrations/002_finanzas_facturacion.sql en Supabase.";

  const addMovimiento = async (e) => {
    e.preventDefault(); setError(""); setOk("");
    if (!mvConcepto || !mvMonto) { setError("Escribe concepto y monto."); return; }
    setMvSaving(true);
    const { error } = await supabase.from("movimientos").insert({ tipo: mvTipo, fecha: mvFecha || todayISO(), concepto: mvConcepto, categoria: mvCategoria, monto: Number(mvMonto), metodo: mvMetodo, nota: mvNota || null });
    if (error) setError(error.code === "PGRST205" ? failMsg : error.message);
    else { setMvConcepto(""); setMvMonto(""); setMvNota(""); setOk("Movimiento guardado."); load(); }
    setMvSaving(false);
  };
  const addGasto = async (e) => {
    e.preventDefault(); setError(""); setOk("");
    if (!gfConcepto || !gfMonto) { setError("Escribe concepto y monto."); return; }
    setGfSaving(true);
    const { error } = await supabase.from("gastos_fijos").insert({ concepto: gfConcepto, categoria: gfCategoria, monto: Number(gfMonto), metodo: gfMetodo });
    if (error) setError(error.code === "PGRST205" ? failMsg : error.message);
    else { setGfConcepto(""); setGfMonto(""); setOk("Gasto fijo guardado."); load(); }
    setGfSaving(false);
  };
  const addColab = async (e) => {
    e.preventDefault(); setError(""); setOk("");
    if (!cbNombre.trim()) { setError("Escribe el nombre del colaborador."); return; }
    setCbSaving(true);
    const { error } = await supabase.from("colaboradores").insert({ nombre: cbNombre.trim(), servicio: cbServicio || null, telefono: cbTelefono || null, correo: cbCorreo || null });
    if (error) setError(error.code === "PGRST205" ? failMsg : error.message);
    else { setCbNombre(""); setCbServicio(""); setCbTelefono(""); setCbCorreo(""); setOk("Colaborador guardado."); load(); }
    setCbSaving(false);
  };
  const addPagoColab = async (e) => {
    e.preventDefault(); if (!selColab) return;
    setError(""); setOk("");
    if (!pcConcepto || !pcMonto) { setError("Escribe concepto y monto."); return; }
    setPcSaving(true);
    let comprobante = pcComprobante || null;
    if (pcArchivo) {
      try {
        comprobante = await subirComprobante(pcArchivo);
      } catch (err) {
        setError(err.message);
        setPcSaving(false);
        return;
      }
    }
    const { error } = await supabase.from("pagos_colaboradores").insert({ colaborador_id: selColab.id, fecha: pcFecha || todayISO(), concepto: pcConcepto, monto: Number(pcMonto), metodo: pcMetodo, nota: pcNota || null, comprobante_url: comprobante });
    if (error) setError(error.code === "PGRST205" ? failMsg : error.message);
    else { setPcConcepto(""); setPcMonto(""); setPcNota(""); setPcComprobante(""); setPcArchivo(null); setOk("Pago registrado."); load(); }
    setPcSaving(false);
  };
  const delMov = async (id) => { await supabase.from("movimientos").delete().eq("id", id); load(); };
  const delGasto = async (id) => { await supabase.from("gastos_fijos").delete().eq("id", id); load(); };
  const delPagoColab = async (id) => { await supabase.from("pagos_colaboradores").delete().eq("id", id); load(); };

  const tabs = [
    { id: "resumen", label: "Resumen" },
    { id: "movimientos", label: "Movimientos" },
    { id: "fijos", label: "Gastos fijos" },
    { id: "colaboradores", label: "Colaboradores" },
  ];

  return (
    <div>
      <Eyebrow>ADMINISTRACIÓN</Eyebrow>
      <SectionTitle>Finanzas</SectionTitle>
      {missing && <div className="mt-4"><MissingTablesBanner migration="supabase/migrations/002_finanzas_facturacion.sql" /></div>}
      {missingColab && <div className="mt-2"><MissingTablesBanner migration="supabase/migrations/001_portal_inicio.sql" text="Faltan las tablas de colaboradores. Aplica una vez la migración" /></div>}

      <div className="flex gap-2 mt-5 flex-wrap">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className="px-3 py-1.5 rounded-full"
            style={{ background: tab === t.id ? blueSoft : card, border: `1px solid ${cardAlt}`, color: tab === t.id ? blueLight : gray, fontFamily: FONT, fontSize: 12, fontWeight: 600 }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "resumen" && (
        <div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            <Kpi label="INGRESOS DEL MES" value={fmtMoney(ingresos)} color={green} />
            <Kpi label="EGRESOS DEL MES" value={fmtMoney(egresos)} color={red} />
            <Kpi label="UTILIDAD DEL MES" value={fmtMoney(utilidad)} color={utilidad >= 0 ? green : red} />
          </div>
          <div className="rounded-2xl p-5 mt-4" style={{ background: card, border: `1px solid ${cardAlt}` }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>META MENSUAL</span>
            {meta > 0 ? (
              <>
                <p style={{ fontFamily: FONT, fontSize: 15, color: white, marginTop: 8 }}>{fmtMoney(ingresos)} de {fmtMoney(meta)} ({avanceMeta}%)</p>
                <div className="w-full rounded-full mt-2" style={{ height: 10, background: "#0B1338" }}>
                  <div className="rounded-full" style={{ width: `${avanceMeta}%`, height: 10, background: green }} />
                </div>
              </>
            ) : (
              <p style={{ fontFamily: FONT, fontSize: 13.5, color: gray, marginTop: 8 }}>Sin meta mensual. Se define en Ajustes (clave metaMensual).</p>
            )}
          </div>
          <div className="rounded-2xl p-5 mt-4" style={{ background: card, border: `1px solid ${cardAlt}` }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>ÚLTIMOS 6 MESES</span>
            <div className="flex items-end gap-3 mt-4" style={{ height: 120 }}>
              {ultimosMeses.map((m) => (
                <div key={m.clave} className="flex-1 flex flex-col items-center justify-end" style={{ height: "100%" }}>
                  <div className="flex items-end gap-1" style={{ height: 96 }}>
                    <div title={`Ingresos ${fmtMoney(m.ing)}`} style={{ width: 12, height: `${Math.max(2, (m.ing / maxGrafica) * 96)}px`, background: green, borderRadius: 3 }} />
                    <div title={`Egresos ${fmtMoney(m.egr)}`} style={{ width: 12, height: `${Math.max(2, (m.egr / maxGrafica) * 96)}px`, background: red, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontFamily: FONT, fontSize: 11, color: gray, marginTop: 6 }}>{m.etiqueta}</span>
                </div>
              ))}
            </div>
            <p style={{ fontFamily: FONT, fontSize: 12, color: gray, marginTop: 8 }}>
              <span style={{ color: green }}>■</span> Ingresos &nbsp; <span style={{ color: red }}>■</span> Egresos
            </p>
          </div>
          <div className="rounded-2xl p-5 mt-4" style={{ background: card, border: `1px solid ${cardAlt}` }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>CÓMO SE CUENTA</span>
            <p style={{ fontFamily: FONT, fontSize: 13, color: gray, marginTop: 8, lineHeight: 1.6 }}>
              Ingresos: movimientos de ingreso ({fmtMoney(ingMov)}) + abonos cobrados a clientes ({fmtMoney(ingAbonos)}), automáticos.
              Egresos: movimientos de egreso ({fmtMoney(egrMov)}) + pagos a colaboradores ({fmtMoney(egrColab)}).
              Gastos fijos mensuales: {fmtMoney(fijosTotal)} (se muestran aparte, no se suman dos veces).
            </p>
          </div>
        </div>
      )}

      {tab === "movimientos" && (
        <div>
          <form onSubmit={addMovimiento} className="mt-5 rounded-2xl p-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>NUEVO MOVIMIENTO</span>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <select value={mvTipo} onChange={(e) => { setMvTipo(e.target.value); setMvCategoria(e.target.value === "ingreso" ? CAT_INGRESO[0] : CAT_EGRESO[0]); }} className="rounded-xl px-3 py-2.5" style={inputStyle}>
                <option value="ingreso">Ingreso</option>
                <option value="egreso">Egreso</option>
              </select>
              <input type="date" value={mvFecha} onChange={(e) => setMvFecha(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
            </div>
            <input placeholder="Concepto *" value={mvConcepto} onChange={(e) => setMvConcepto(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={inputStyle} />
            <div className="grid grid-cols-3 gap-2 mt-2">
              <select value={mvCategoria} onChange={(e) => setMvCategoria(e.target.value)} className="rounded-xl px-3 py-2.5" style={inputStyle}>
                {(mvTipo === "ingreso" ? CAT_INGRESO : CAT_EGRESO).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" min="0.01" step="0.01" placeholder="Monto ($)" value={mvMonto} onChange={(e) => setMvMonto(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
              <select value={mvMetodo} onChange={(e) => setMvMetodo(e.target.value)} className="rounded-xl px-3 py-2.5" style={inputStyle}>
                {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <input placeholder="Nota (opcional)" value={mvNota} onChange={(e) => setMvNota(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={inputStyle} />
            <ErrorBanner message={error} />
            <OkBanner message={ok} />
            <div className="mt-2"><PillButton type="submit" disabled={mvSaving}>{mvSaving ? "Guardando…" : "Guardar movimiento"}</PillButton></div>
          </form>
          <div className="space-y-2 mt-4">
            {movimientos.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-2xl" style={{ background: card, border: `1px solid ${cardAlt}` }}>
                <div>
                  <p style={{ fontFamily: FONT, fontSize: 13.5, color: white }}>{m.concepto}</p>
                  <p style={{ fontFamily: FONT, fontSize: 11.5, color: gray }}>{m.categoria || ""}{m.fecha ? ` · ${fmtFecha(m.fecha)}` : ""}{m.metodo ? ` · ${m.metodo}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <b style={{ fontFamily: FONT, fontSize: 14, color: m.tipo === "ingreso" ? green : red }}>{m.tipo === "ingreso" ? "+" : "−"}{fmtMoney(m.monto)}</b>
                  <button onClick={() => delMov(m.id)} style={{ fontFamily: FONT, fontSize: 12.5, color: red, fontWeight: 600 }}>Eliminar</button>
                </div>
              </div>
            ))}
            {movimientos.length === 0 && !loading && <EmptyNote>Sin movimientos todavía. Todo vacío hasta migrar la hoja privada.</EmptyNote>}
          </div>
        </div>
      )}

      {tab === "fijos" && (
        <div>
          <div className="rounded-2xl p-4 mt-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>TOTAL MENSUAL DE GASTOS FIJOS</span>
            <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 22, color: white, marginTop: 6 }}>{fmtMoney(fijosTotal)}</p>
          </div>
          <form onSubmit={addGasto} className="mt-4 rounded-2xl p-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>NUEVO GASTO FIJO</span>
            <input placeholder="Concepto *" value={gfConcepto} onChange={(e) => setGfConcepto(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-3" style={inputStyle} />
            <div className="grid grid-cols-3 gap-2 mt-2">
              <select value={gfCategoria} onChange={(e) => setGfCategoria(e.target.value)} className="rounded-xl px-3 py-2.5" style={inputStyle}>
                {CAT_EGRESO.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="number" min="0.01" step="0.01" placeholder="Monto mensual ($)" value={gfMonto} onChange={(e) => setGfMonto(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
              <select value={gfMetodo} onChange={(e) => setGfMetodo(e.target.value)} className="rounded-xl px-3 py-2.5" style={inputStyle}>
                {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <ErrorBanner message={error} />
            <OkBanner message={ok} />
            <div className="mt-2"><PillButton type="submit" disabled={gfSaving}>{gfSaving ? "Guardando…" : "Guardar gasto fijo"}</PillButton></div>
          </form>
          <div className="space-y-2 mt-4">
            {gastos.map((g) => (
              <div key={g.id} className="flex items-center justify-between p-3 rounded-2xl" style={{ background: card, border: `1px solid ${cardAlt}` }}>
                <div>
                  <p style={{ fontFamily: FONT, fontSize: 13.5, color: white }}>{g.concepto}</p>
                  <p style={{ fontFamily: FONT, fontSize: 11.5, color: gray }}>{g.categoria || ""}{g.metodo ? ` · ${g.metodo}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <b style={{ fontFamily: FONT, fontSize: 14, color: white }}>{fmtMoney(g.monto)}</b>
                  <button onClick={() => delGasto(g.id)} style={{ fontFamily: FONT, fontSize: 12.5, color: red, fontWeight: 600 }}>Eliminar</button>
                </div>
              </div>
            ))}
            {gastos.length === 0 && !loading && <EmptyNote>Sin gastos fijos registrados.</EmptyNote>}
          </div>
        </div>
      )}

      {tab === "colaboradores" && (
        <div>
          <form onSubmit={addColab} className="mt-5 rounded-2xl p-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>NUEVO COLABORADOR</span>
            <input placeholder="Nombre *" value={cbNombre} onChange={(e) => setCbNombre(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-3" style={inputStyle} />
            <div className="grid grid-cols-3 gap-2 mt-2">
              <input placeholder="Servicio" value={cbServicio} onChange={(e) => setCbServicio(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
              <input placeholder="Teléfono" value={cbTelefono} onChange={(e) => setCbTelefono(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
              <input placeholder="Correo" value={cbCorreo} onChange={(e) => setCbCorreo(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
            </div>
            <ErrorBanner message={error} />
            <OkBanner message={ok} />
            <div className="mt-2"><PillButton type="submit" disabled={cbSaving}>{cbSaving ? "Guardando…" : "Guardar colaborador"}</PillButton></div>
          </form>
          <div className="space-y-2 mt-4">
            {colabs.map((c) => {
              const total = pagosColab.filter((p) => p.colaborador_id === c.id).reduce((t, p) => t + Number(p.monto || 0), 0);
              return (
                <div key={c.id} onClick={() => setSelColab(c)} className="rounded-2xl p-4" style={{ background: card, border: `1px solid ${selColab?.id === c.id ? blueLight : cardAlt}`, cursor: "pointer" }}>
                  <div className="flex items-center justify-between">
                    <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: white }}>{c.nombre}</p>
                    <b style={{ fontFamily: FONT, fontSize: 13.5, color: white }}>Pagado: {fmtMoney(total)}</b>
                  </div>
                  <p style={{ fontFamily: FONT, fontSize: 12.5, color: gray, marginTop: 2 }}>{c.servicio || ""}{c.telefono ? ` · ${c.telefono}` : ""}{c.correo ? ` · ${c.correo}` : ""}</p>
                </div>
              );
            })}
            {colabs.length === 0 && !loading && <EmptyNote>Sin colaboradores todavía.</EmptyNote>}
          </div>
          {selColab && (
            <div className="rounded-2xl p-5 mt-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>PAGOS — {selColab.nombre.toUpperCase()}</span>
              <div className="space-y-2 mt-3">
                {pagosColab.filter((p) => p.colaborador_id === selColab.id).map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: "#0B1338", border: `1px solid ${cardAlt}` }}>
                    <div>
                      <p style={{ fontFamily: FONT, fontSize: 13, color: white }}>{fmtMoney(p.monto)} · {p.concepto || ""}{p.fecha ? ` · ${fmtFecha(p.fecha)}` : ""}</p>
                      {p.comprobante_url && <p style={{ fontFamily: FONT, fontSize: 11.5, marginTop: 2 }}><ComprobanteValor valor={p.comprobante_url} /></p>}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => pdfReciboColab({ id: p.id, colaborador: selColab.nombre, concepto: p.concepto, monto: Number(p.monto), fecha: p.fecha, metodo: p.metodo })} style={{ fontFamily: FONT, fontSize: 12.5, color: blueLight, fontWeight: 600 }}>Recibo PDF</button>
                      <button onClick={() => delPagoColab(p.id)} style={{ fontFamily: FONT, fontSize: 12.5, color: red, fontWeight: 600 }}>Eliminar</button>
                    </div>
                  </div>
                ))}
                {pagosColab.filter((p) => p.colaborador_id === selColab.id).length === 0 && <EmptyNote>Sin pagos a este colaborador.</EmptyNote>}
              </div>
              <form onSubmit={addPagoColab} className="mt-4">
                <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>REGISTRAR PAGO</span>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <input type="number" min="0.01" step="0.01" placeholder="Monto ($)" value={pcMonto} onChange={(e) => setPcMonto(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
                  <input type="date" value={pcFecha} onChange={(e) => setPcFecha(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
                  <select value={pcMetodo} onChange={(e) => setPcMetodo(e.target.value)} className="rounded-xl px-3 py-2.5" style={inputStyle}>
                    {METODOS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <input placeholder="Concepto" value={pcConcepto} onChange={(e) => setPcConcepto(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={inputStyle} />
                <input placeholder="Comprobante (nombre o nota, opcional)" value={pcComprobante} onChange={(e) => setPcComprobante(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={inputStyle} />
                <label style={{ fontFamily: FONT, fontSize: 12, color: gray, display: "block", marginTop: 8 }}>
                  O sube el archivo del comprobante (imagen o PDF, máx. 20 MB)
                  <input type="file" accept="image/*,.pdf" onChange={(e) => setPcArchivo(e.target.files?.[0] || null)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-1" style={{ ...inputStyle, padding: "8px 12px" }} />
                </label>
                {pcArchivo && <p style={{ fontFamily: FONT, fontSize: 12, color: gray, marginTop: 4 }}>Archivo elegido: {pcArchivo.name}</p>}
                <ErrorBanner message={error} />
                <div className="mt-2"><PillButton type="submit" disabled={pcSaving}>{pcSaving ? "Guardando…" : "Guardar pago"}</PillButton></div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
