import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Eyebrow, PillButton, ErrorBanner, OkBanner, SectionTitle, EmptyNote, MissingTablesBanner, Kpi, inputStyle, selectStyle, labelStyle, card, cardAlt, white, gray, blueLight, blueSoft, green, greenBg, amber, amberBg, red, FONT } from "../lib/ui";
import { safeSelect, safeLoadClientes, waUrl, fmtMoney, fmtFecha, todayISO, useConfig, precioPaquete, PAQUETES } from "../lib/ops";
import { pdfPropuesta } from "../lib/pdf";

const ESTADOS = ["Nuevo", "Propuesta enviada", "Respondió", "Agendó", "Sin respuesta", "Perdido"];
const INTERESES = ["Solo grabación", "Solo edición", "Ambos", "Solo reels", "Grabación en exterior", "Renta de estudio por hora", "Todos los paquetes"];

function estadoColor(e) {
  if (e === "Agendó") return { background: greenBg, color: green };
  if (e === "Perdido") return { background: "rgba(224,93,93,0.12)", color: red };
  if (e === "Respondió") return { background: blueSoft, color: blueLight };
  if (e === "Sin respuesta") return { background: amberBg, color: amber };
  return { background: cardAlt, color: gray };
}

export default function AdminPropuestas() {
  const [items, setItems] = useState([]);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("Todos");
  const [sel, setSel] = useState(null);
  const [clientes, setClientes] = useState([]);
  const { config } = useConfig();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  // Form nuevo
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [proyecto, setProyecto] = useState("");
  const [interes, setInteres] = useState("Ambos");
  const [recomendado, setRecomendado] = useState("Impacto");
  const [precioEdicion, setPrecioEdicion] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const res = await safeSelect("propuestas", supabase.from("propuestas").select("*").order("created_at", { ascending: false }));
    setItems(res.data);
    setMissing(res.missing);
    setLoading(false);
  }, []);

  useEffect(() => { load(); safeLoadClientes().then(setClientes); }, [load]);

  const crear = async (e) => {
    e.preventDefault();
    setError(""); setOk("");
    if (!nombre.trim()) { setError("Escribe el nombre del prospecto."); return; }
    setSaving(true);
    const match = clientes.find((c) => (c.nombre || "").toLowerCase() === nombre.trim().toLowerCase());
    const { error } = await supabase.from("propuestas").insert({
      fecha: todayISO(),
      cliente_id: match ? match.id : null,
      nombre: nombre.trim(),
      telefono: telefono || null,
      proyecto: proyecto || null,
      interes,
      recomendado,
      precio_edicion: precioEdicion ? Number(precioEdicion) : null,
      mensaje: mensaje || null,
      estado: "Nuevo",
    });
    if (error) setError(error.message);
    else {
      setNombre(""); setTelefono(""); setProyecto(""); setPrecioEdicion(""); setMensaje("");
      setOk("Propuesta guardada.");
      load();
    }
    setSaving(false);
  };

  const guardarDetalle = async () => {
    if (!sel) return;
    setError(""); setOk("");
    const { error } = await supabase.from("propuestas").update({
      estado: sel.estado,
      siguiente_contacto: sel.siguiente_contacto || null,
      nota: sel.nota || null,
    }).eq("id", sel.id);
    if (error) setError(error.message);
    else { setOk("Cambios guardados."); load(); }
  };

  const eliminar = async (id) => {
    await supabase.from("propuestas").delete().eq("id", id);
    setSel(null);
    load();
  };

  const generarPdf = (p) => {
    const precios = PAQUETES.map((pkg) => [
      pkg,
      precioPaquete(config, pkg, "sesion"),
      precioPaquete(config, pkg, "mensual"),
      pkg === p.recomendado,
    ]);
    pdfPropuesta({ ...p, precio_edicion: p.precio_edicion }, config, precios);
  };

  const filtrados = filtro === "Todos" ? items : items.filter((p) => p.estado === filtro);
  const conteo = (e) => items.filter((p) => p.estado === e).length;

  return (
    <div>
      <Eyebrow>ADMINISTRACIÓN</Eyebrow>
      <SectionTitle>Propuestas</SectionTitle>
      {missing && <div className="mt-4"><MissingTablesBanner migration="supabase/migrations/001_portal_inicio.sql" text="Falta la tabla de propuestas. Aplica una vez la migración" /></div>}
      {!missing && !loading && items.length === 0 && (
        <p className="mt-4" style={{ fontFamily: FONT, fontSize: 13.5, color: gray, lineHeight: 1.6 }}>
          Aún no hay propuestas. Cuando registres una, aquí se le da seguimiento hasta que agenda.
        </p>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mt-5 flex-wrap">
        {["Todos", ...ESTADOS].map((e) => (
          <button key={e} onClick={() => setFiltro(e)} className="px-3 py-1.5 rounded-full"
            style={{ background: filtro === e ? blueSoft : card, border: `1px solid ${cardAlt}`, color: filtro === e ? blueLight : gray, fontFamily: FONT, fontSize: 12, fontWeight: 600 }}>
            {e}{e !== "Todos" ? ` (${conteo(e)})` : ` (${items.length})`}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div className="space-y-2 mt-4">
        {filtrados.map((p) => (
          <div key={p.id} onClick={() => setSel(p)} className="rounded-2xl p-4" style={{ background: card, border: `1px solid ${sel?.id === p.id ? blueLight : cardAlt}`, cursor: "pointer" }}>
            <div className="flex items-center justify-between gap-2">
              <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: white }}>{p.nombre}</p>
              <span className="px-2.5 py-1 rounded-full shrink-0" style={{ ...estadoColor(p.estado), fontFamily: FONT, fontSize: 10.5, fontWeight: 600 }}>{p.estado}</span>
            </div>
            <p style={{ fontFamily: FONT, fontSize: 12.5, color: gray, marginTop: 4 }}>
              {p.proyecto ? `${p.proyecto} · ` : ""}{p.interes || ""}{p.recomendado ? ` · Recomendado: ${p.recomendado}` : ""}
            </p>
            <p style={{ fontFamily: FONT, fontSize: 11.5, color: gray, marginTop: 2 }}>
              {p.fecha ? fmtFecha(p.fecha) : ""}{p.siguiente_contacto ? ` · Siguiente contacto: ${fmtFecha(p.siguiente_contacto)}` : ""}
            </p>
          </div>
        ))}
        {filtrados.length === 0 && !loading && <EmptyNote>No hay propuestas en este filtro.</EmptyNote>}
      </div>

      {/* Detalle */}
      {sel && (
        <div className="rounded-2xl p-5 mt-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>SEGUIMIENTO — {sel.nombre?.toUpperCase()}</span>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div>
              <label style={labelStyle}>ESTADO</label>
              <select value={sel.estado || "Nuevo"} onChange={(e) => setSel({ ...sel, estado: e.target.value })} className="w-full rounded-xl px-3 py-2.5" style={inputStyle}>
                {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>SIGUIENTE CONTACTO</label>
              <input type="date" value={sel.siguiente_contacto || ""} onChange={(e) => setSel({ ...sel, siguiente_contacto: e.target.value })} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
            </div>
          </div>
          <label style={{ ...labelStyle, marginTop: 10 }}>NOTA</label>
          <textarea value={sel.nota || ""} onChange={(e) => setSel({ ...sel, nota: e.target.value })} rows={2} className="w-full rounded-xl px-3 py-2.5 outline-none" style={{ ...inputStyle, resize: "none" }} placeholder="Qué se habló, qué sigue…" />
          <ErrorBanner message={error} />
          <OkBanner message={ok} />
          <div className="flex gap-2 flex-wrap mt-2">
            <PillButton onClick={guardarDetalle}>Guardar cambios</PillButton>
            <PillButton ghost onClick={() => generarPdf(sel)}>Descargar PDF</PillButton>
            {sel.telefono && waUrl(sel.telefono, `Hola ${sel.nombre}, te comparto la propuesta de Élite Podhouse para tu proyecto. ¿Te late que la revisemos?`) && (
              <a href={waUrl(sel.telefono, `Hola ${sel.nombre}, te comparto la propuesta de Élite Podhouse para tu proyecto. ¿Te late que la revisemos?`)} target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-full px-5 py-2.5"
                style={{ background: "transparent", border: `1px solid ${green}`, color: green, fontFamily: FONT, fontWeight: 600, fontSize: 14 }}>
                WhatsApp
              </a>
            )}
            <button onClick={() => eliminar(sel.id)} style={{ fontFamily: FONT, fontSize: 13, color: red, fontWeight: 600 }}>Eliminar</button>
          </div>
        </div>
      )}

      {/* Nueva propuesta */}
      <form onSubmit={crear} className="mt-6 rounded-2xl p-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>NUEVA PROPUESTA</span>
        <input list="clientes-propuestas" placeholder="Nombre del prospecto o cliente *" value={nombre} onChange={(e) => setNombre(e.target.value)}
          className="w-full rounded-xl px-3 py-2.5 outline-none mt-3" style={inputStyle} />
        <datalist id="clientes-propuestas">
          {clientes.map((c) => <option key={c.id} value={c.nombre || ""} />)}
        </datalist>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <input placeholder="Teléfono (WhatsApp)" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
          <input placeholder="Proyecto o idea" value={proyecto} onChange={(e) => setProyecto(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <select value={interes} onChange={(e) => setInteres(e.target.value)} className="rounded-xl px-3 py-2.5" style={inputStyle}>
            {INTERESES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <select value={recomendado} onChange={(e) => setRecomendado(e.target.value)} className="rounded-xl px-3 py-2.5" style={inputStyle}>
            {PAQUETES.map((p) => <option key={p} value={p}>Recomendado: {p} ({fmtMoney(precioPaquete(config, p, "sesion"))})</option>)}
          </select>
        </div>
        <input type="number" min="0" step="0.01" placeholder="Precio de la edición (MXN, si aplica)" value={precioEdicion} onChange={(e) => setPrecioEdicion(e.target.value)}
          className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={inputStyle} />
        <textarea placeholder="Mensaje personalizado (opcional, reemplaza la introducción del PDF)…" value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={3}
          className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={{ ...inputStyle, resize: "none" }} />
        <ErrorBanner message={error} />
        <div className="mt-2"><PillButton type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar propuesta"}</PillButton></div>
        <p style={{ fontFamily: FONT, fontSize: 12.5, color: gray, marginTop: 10 }}>Los precios del PDF salen de Ajustes (tabla configuracion), no de valores fijos.</p>
      </form>
    </div>
  );
}
