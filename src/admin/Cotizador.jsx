import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Eyebrow, PillButton, ErrorBanner, OkBanner, SectionTitle, EmptyNote, MissingTablesBanner, inputStyle, selectStyle, labelStyle, card, cardAlt, white, gray, blueLight, blueSoft, green, greenBg, amber, amberBg, red, FONT } from "../lib/ui";
import { safeSelect, safeLoadClientes, waUrl, fmtMoney, fmtFecha, todayISO, useConfig, precioPaquete, precioReels, PAQUETES, r2 } from "../lib/ops";
import { pdfCotizacion } from "../lib/pdf";

const ESTADOS = ["Pendiente", "Aceptada", "Rechazada"];

function estadoColor(e) {
  if (e === "Aceptada") return { background: greenBg, color: green };
  if (e === "Rechazada") return { background: "rgba(224,93,93,0.12)", color: red };
  return { background: amberBg, color: amber };
}

export default function AdminCotizador() {
  const [items, setItems] = useState([]);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("Todos");
  const [clientes, setClientes] = useState([]);
  const { config } = useConfig();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  // Form
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [proyecto, setProyecto] = useState("");
  const [modo, setModo] = useState("estandar");
  const [paquete, setPaquete] = useState("Impacto");
  const [tipo, setTipo] = useState("sesion");
  const [cantidad, setCantidad] = useState(1);
  const [nivelReels, setNivelReels] = useState("Esencial");
  const [cantidadReels, setCantidadReels] = useState(4);
  const [horasExtra, setHorasExtra] = useState(0);
  const [tarifaHora, setTarifaHora] = useState(600);
  const [descuento, setDescuento] = useState(0);
  const [conFactura, setConFactura] = useState(false);
  const [vigencia, setVigencia] = useState(15);
  const [estado, setEstado] = useState("Pendiente");
  const [nota, setNota] = useState("");
  const [intro, setIntro] = useState("");
  const [opciones, setOpciones] = useState([]); // personalizada: [{titulo, cantidad, precio}]
  const [opTitulo, setOpTitulo] = useState("");
  const [opCantidad, setOpCantidad] = useState(1);
  const [opPrecio, setOpPrecio] = useState("");

  const load = useCallback(async () => {
    const res = await safeSelect("cotizaciones", supabase.from("cotizaciones").select("*").order("created_at", { ascending: false }));
    setItems(res.data);
    setMissing(res.missing);
    setLoading(false);
  }, []);
  useEffect(() => { load(); safeLoadClientes().then(setClientes); }, [load]);

  // Conceptos según el modo
  const conceptos = () => {
    if (modo === "personalizada") return opciones;
    if (modo === "reels") return [{ titulo: `Paquete de reels ${nivelReels} · ${cantidadReels} reels`, cantidad: 1, precio: precioReels(config, nivelReels, cantidadReels) }];
    return [{ titulo: `Paquete ${paquete} · ${tipo === "mensual" ? "Membresía mensual (4 episodios)" : "Por sesión"}`, cantidad: Number(cantidad) || 1, precio: precioPaquete(config, paquete, tipo) }];
  };
  const base = conceptos().reduce((a, o) => a + Number(o.precio || 0) * Number(o.cantidad || 1), 0)
    + Number(horasExtra || 0) * Number(tarifaHora || 0);
  const subtotal = r2(base * (1 - Number(descuento || 0) / 100));
  const iva = conFactura ? r2(subtotal * 0.16) : 0;
  const total = r2(subtotal + iva);

  const guardar = async (e) => {
    e.preventDefault();
    setError(""); setOk("");
    if (!nombre.trim()) { setError("Escribe el nombre del cliente."); return; }
    if (modo === "personalizada" && opciones.length === 0) { setError("Agrega al menos una opción a la cotización."); return; }
    setSaving(true);
    const match = clientes.find((c) => (c.nombre || "").toLowerCase() === nombre.trim().toLowerCase());
    const { error } = await supabase.from("cotizaciones").insert({
      fecha: todayISO(),
      cliente_id: match ? match.id : null,
      nombre: nombre.trim(),
      telefono: telefono || null,
      proyecto: proyecto || null,
      paquete: modo === "estandar" ? paquete : modo === "reels" ? `Reels ${nivelReels}` : "Personalizada",
      tipo: modo === "estandar" ? tipo : null,
      cantidad: modo === "estandar" ? Number(cantidad) : modo === "reels" ? Number(cantidadReels) : null,
      horas_extra: Number(horasExtra) || 0,
      tarifa_hora: Number(tarifaHora) || 0,
      descuento_pct: Number(descuento) || 0,
      con_factura: conFactura,
      subtotal, iva, total,
      vigencia_dias: Number(vigencia) || 15,
      estado,
      nota: nota || null,
      opciones: conceptos(),
      modo,
      intro: intro || null,
    });
    if (error) setError(error.message);
    else {
      setOk("Cotización guardada.");
      setNombre(""); setTelefono(""); setProyecto(""); setNota(""); setIntro(""); setOpciones([]);
      load();
    }
    setSaving(false);
  };

  const cambiarEstado = async (c, nuevo) => {
    await supabase.from("cotizaciones").update({ estado: nuevo }).eq("id", c.id);
    load();
  };
  const eliminar = async (id) => { await supabase.from("cotizaciones").delete().eq("id", id); load(); };

  const filtradas = filtro === "Todos" ? items : items.filter((c) => c.estado === filtro);

  return (
    <div>
      <Eyebrow>ADMINISTRACIÓN</Eyebrow>
      <SectionTitle>Cotizador</SectionTitle>
      {missing && <div className="mt-4"><MissingTablesBanner migration="supabase/migrations/001_portal_inicio.sql" text="Falta la tabla de cotizaciones. Aplica una vez la migración" /></div>}
      {!missing && !loading && items.length === 0 && (
        <p className="mt-4" style={{ fontFamily: FONT, fontSize: 13.5, color: gray, lineHeight: 1.6 }}>Aún no hay cotizaciones. Arma la primera abajo.</p>
      )}

      <div className="flex gap-2 mt-5 flex-wrap">
        {["Todos", ...ESTADOS].map((e) => (
          <button key={e} onClick={() => setFiltro(e)} className="px-3 py-1.5 rounded-full"
            style={{ background: filtro === e ? blueSoft : card, border: `1px solid ${cardAlt}`, color: filtro === e ? blueLight : gray, fontFamily: FONT, fontSize: 12, fontWeight: 600 }}>
            {e} ({e === "Todos" ? items.length : items.filter((c) => c.estado === e).length})
          </button>
        ))}
      </div>

      <div className="space-y-2 mt-4">
        {filtradas.map((c) => (
          <div key={c.id} className="rounded-2xl p-4" style={{ background: card, border: `1px solid ${cardAlt}` }}>
            <div className="flex items-center justify-between gap-2">
              <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: white }}>{c.nombre}{c.proyecto ? ` — ${c.proyecto}` : ""}</p>
              <span className="px-2.5 py-1 rounded-full shrink-0" style={{ ...estadoColor(c.estado), fontFamily: FONT, fontSize: 10.5, fontWeight: 600 }}>{c.estado}</span>
            </div>
            <p style={{ fontFamily: FONT, fontSize: 12.5, color: gray, marginTop: 4 }}>
              {c.paquete || ""}{c.fecha ? ` · ${fmtFecha(c.fecha)}` : ""} · Vigencia {c.vigencia_dias || 15} días
            </p>
            <div className="flex items-center justify-between mt-2">
              <b style={{ fontFamily: FONT, fontSize: 15, color: white }}>{fmtMoney(c.total)}</b>
              <div className="flex gap-3 items-center">
                <button onClick={() => pdfCotizacion(c, c.opciones)} style={{ fontFamily: FONT, fontSize: 12.5, color: blueLight, fontWeight: 600 }}>PDF</button>
                {c.telefono && (
                  <a href={waUrl(c.telefono, `Hola ${c.nombre}, te comparto tu cotización de Élite Podhouse por ${fmtMoney(c.total)}${c.con_factura ? " (con factura)" : ""}. Quedo atenta a tus comentarios.`)} target="_blank" rel="noreferrer" style={{ fontFamily: FONT, fontSize: 12.5, color: green, fontWeight: 600 }}>WhatsApp</a>
                )}
                {c.estado !== "Aceptada" && <button onClick={() => cambiarEstado(c, "Aceptada")} style={{ fontFamily: FONT, fontSize: 12.5, color: green, fontWeight: 600 }}>Aceptada</button>}
                {c.estado !== "Rechazada" && <button onClick={() => cambiarEstado(c, "Rechazada")} style={{ fontFamily: FONT, fontSize: 12.5, color: amber, fontWeight: 600 }}>Rechazada</button>}
                <button onClick={() => eliminar(c.id)} style={{ fontFamily: FONT, fontSize: 12.5, color: red, fontWeight: 600 }}>Eliminar</button>
              </div>
            </div>
            {c.estado === "Aceptada" && (
              <p style={{ fontFamily: FONT, fontSize: 12, color: gray, marginTop: 6 }}>Aceptada: puedes alimentarla a un contrato desde el módulo Contratos.</p>
            )}
          </div>
        ))}
        {filtradas.length === 0 && !loading && <EmptyNote>No hay cotizaciones en este filtro.</EmptyNote>}
      </div>

      <form onSubmit={guardar} className="mt-6 rounded-2xl p-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>NUEVA COTIZACIÓN</span>
        <input list="clientes-cotizador" placeholder="Cliente *" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-3" style={inputStyle} />
        <datalist id="clientes-cotizador">{clientes.map((c) => <option key={c.id} value={c.nombre || ""} />)}</datalist>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <input placeholder="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
          <input placeholder="Proyecto" value={proyecto} onChange={(e) => setProyecto(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <select value={modo} onChange={(e) => setModo(e.target.value)} className="rounded-xl px-3 py-2.5" style={inputStyle}>
            <option value="estandar">Paquete estándar</option>
            <option value="reels">Paquete de reels</option>
            <option value="personalizada">Personalizada</option>
          </select>
          {modo === "estandar" && (
            <>
              <select value={paquete} onChange={(e) => setPaquete(e.target.value)} className="rounded-xl px-3 py-2.5" style={inputStyle}>
                {PAQUETES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-xl px-3 py-2.5" style={inputStyle}>
                <option value="sesion">Por sesión</option>
                <option value="mensual">Membresía mensual</option>
              </select>
            </>
          )}
          {modo === "reels" && (
            <>
              <select value={nivelReels} onChange={(e) => setNivelReels(e.target.value)} className="rounded-xl px-3 py-2.5" style={inputStyle}>
                {["Esencial", "Pro", "Full Brand"].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <select value={cantidadReels} onChange={(e) => setCantidadReels(Number(e.target.value))} className="rounded-xl px-3 py-2.5" style={inputStyle}>
                {[4, 8, 12, 16].map((n) => <option key={n} value={n}>{n} reels</option>)}
              </select>
            </>
          )}
        </div>
        {modo === "estandar" && (
          <div className="mt-2">
            <label style={labelStyle}>CANTIDAD (SESIONES O MESES)</label>
            <input type="number" min="1" value={cantidad} onChange={(e) => setCantidad(Number(e.target.value))} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
          </div>
        )}
        {modo === "personalizada" && (
          <div className="mt-3">
            <label style={labelStyle}>OPCIONES</label>
            {opciones.map((o, i) => (
              <p key={i} style={{ fontFamily: FONT, fontSize: 13, color: white, marginBottom: 4 }}>
                {o.titulo} × {o.cantidad} — {fmtMoney(Number(o.precio) * Number(o.cantidad))}
                <button type="button" onClick={() => setOpciones(opciones.filter((_, j) => j !== i))} style={{ color: red, marginLeft: 8, fontWeight: 600 }}>Quitar</button>
              </p>
            ))}
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="Concepto" value={opTitulo} onChange={(e) => setOpTitulo(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
              <input type="number" min="1" placeholder="Cant." value={opCantidad} onChange={(e) => setOpCantidad(Number(e.target.value))} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
              <input type="number" min="0" step="0.01" placeholder="Precio c/u" value={opPrecio} onChange={(e) => setOpPrecio(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
            </div>
            <div className="mt-2">
              <PillButton type="button" ghost onClick={() => { if (opTitulo && opPrecio) { setOpciones([...opciones, { titulo: opTitulo, cantidad: opCantidad || 1, precio: Number(opPrecio) }]); setOpTitulo(""); setOpPrecio(""); } }}>+ Agregar opción</PillButton>
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div>
            <label style={labelStyle}>HORAS EXTRA</label>
            <input type="number" min="0" value={horasExtra} onChange={(e) => setHorasExtra(Number(e.target.value))} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>TARIFA / HORA ($)</label>
            <input type="number" min="0" value={tarifaHora} onChange={(e) => setTarifaHora(Number(e.target.value))} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>DESCUENTO (%)</label>
            <input type="number" min="0" max="100" value={descuento} onChange={(e) => setDescuento(Number(e.target.value))} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <label className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: navy, border: `1px solid ${cardAlt}`, fontFamily: FONT, fontSize: 13, color: white }}>
            <input type="checkbox" checked={conFactura} onChange={(e) => setConFactura(e.target.checked)} /> Con factura (IVA 16%)
          </label>
          <div>
            <label style={labelStyle}>VIGENCIA (DÍAS)</label>
            <input type="number" min="1" value={vigencia} onChange={(e) => setVigencia(Number(e.target.value))} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>ESTADO</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-full rounded-xl px-3 py-2.5" style={inputStyle}>
              {ESTADOS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <textarea placeholder="Introducción para el PDF (opcional)…" value={intro} onChange={(e) => setIntro(e.target.value)} rows={2} className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={{ ...inputStyle, resize: "none" }} />
        <textarea placeholder="Nota interna (opcional)…" value={nota} onChange={(e) => setNota(e.target.value)} rows={2} className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={{ ...inputStyle, resize: "none" }} />

        <div className="rounded-2xl p-4 mt-3" style={{ background: navy, border: `1px solid ${cardAlt}` }}>
          <p style={{ fontFamily: FONT, fontSize: 13.5, color: gray }}>Subtotal: <b style={{ color: white }}>{fmtMoney(subtotal)}</b></p>
          {conFactura && <p style={{ fontFamily: FONT, fontSize: 13.5, color: gray }}>IVA (16%): <b style={{ color: white }}>{fmtMoney(iva)}</b></p>}
          <p style={{ fontFamily: FONT, fontSize: 16, color: white, marginTop: 4 }}>Total: <b>{fmtMoney(total)}</b></p>
        </div>
        <ErrorBanner message={error} />
        <OkBanner message={ok} />
        <div className="mt-3"><PillButton type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar cotización"}</PillButton></div>
      </form>
    </div>
  );
}
