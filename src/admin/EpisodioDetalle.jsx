// Detalle del episodio (auditoría Élite OS, tanda 3): checklist marcable,
// enlaces, comentarios con registro automático de cambios, notas, prioridad,
// paquete, video/audio y aviso de vencimiento. Se usa en Entregas y en
// Producción; el cliente ve los enlaces de video/audio en Mis entregas.
import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { card, cardAlt, white, gray, blueLight, green, amber, red, FONT } from "../lib/ui";
import { fmtFecha, waUrl, PAQUETES, todayISO } from "../lib/ops";

const PRIORIDADES = ["Baja", "Normal", "Alta"];
const PASOS_DEFAULT = ["Brief y guion", "Grabación", "Edición", "Revisión del cliente", "Entrega final"];
const ETAPA_TEXTO = { por_grabar: "por grabar", grabado: "grabado", en_edicion: "en edición", en_revision: "en revisión", publicado: "publicado" };

export function vencimientoDe(ep) {
  if (!ep.fecha_entrega || ep.estado === "publicado") return null;
  const hoy = todayISO();
  if (ep.fecha_entrega < hoy) return { texto: "ATRASADO", color: red };
  if (ep.fecha_entrega === hoy) return { texto: "ENTREGA HOY", color: amber };
  const dias = Math.round((new Date(ep.fecha_entrega) - new Date(hoy)) / 86400000);
  if (dias <= 2) return { texto: `ENTREGA EN ${dias} DÍA${dias === 1 ? "" : "S"}`, color: amber };
  return null;
}

const inputStyle = { background: "#0A0D1E", border: `1px solid ${cardAlt}`, color: white, fontFamily: FONT, fontSize: 13 };
const labelStyle = { fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1, display: "block", marginBottom: 4 };

export default function EpisodioDetalle({ ep, clienteNombre, telefono, onChanged }) {
  const [open, setOpen] = useState(false);
  const [checklist, setChecklist] = useState(Array.isArray(ep.checklist) ? ep.checklist : []);
  const [enlaces, setEnlaces] = useState(Array.isArray(ep.enlaces) ? ep.enlaces : []);
  const [comentarios, setComentarios] = useState(Array.isArray(ep.comentarios) ? ep.comentarios : []);
  const [notas, setNotas] = useState(ep.notas || "");
  const [prioridad, setPrioridad] = useState(ep.prioridad || "Normal");
  const [paquete, setPaquete] = useState(ep.paquete || "");
  const [videoUrl, setVideoUrl] = useState(ep.video_url || "");
  const [audioUrl, setAudioUrl] = useState(ep.audio_url || "");
  const [nuevoEnlaceNombre, setNuevoEnlaceNombre] = useState("");
  const [nuevoEnlaceUrl, setNuevoEnlaceUrl] = useState("");
  const [nuevoComentario, setNuevoComentario] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const guardar = async (patch, autoTexto) => {
    setSaving(true);
    setError("");
    setSaved("");
    let comentariosNuevos = comentarios;
    if (autoTexto) {
      comentariosNuevos = [...comentarios, { fecha: new Date().toISOString(), texto: autoTexto, auto: true }];
    }
    const { error: err } = await supabase.from("episodios").update({ ...patch, ...(autoTexto ? { comentarios: comentariosNuevos } : {}) }).eq("id", ep.id);
    setSaving(false);
    if (err) { setError(err.message); return false; }
    if (autoTexto) setComentarios(comentariosNuevos);
    setSaved("Guardado.");
    if (onChanged) onChanged();
    return true;
  };

  const toggleChecklist = (i) => {
    const item = checklist[i];
    const nuevo = checklist.map((c, j) => (j === i ? { ...c, d: !c.d } : c));
    setChecklist(nuevo);
    guardar({ checklist: nuevo }, `Checklist: ${item.t} — ${!item.d ? "hecho" : "pendiente"}`);
  };

  const cargarPasos = () => {
    const nuevo = PASOS_DEFAULT.map((t) => ({ t, d: false }));
    setChecklist(nuevo);
    guardar({ checklist: nuevo }, "Checklist de producción creado.");
  };

  const agregarEnlace = () => {
    if (!nuevoEnlaceUrl.trim()) return;
    const nuevo = [...enlaces, { nombre: nuevoEnlaceNombre.trim() || "Enlace", url: nuevoEnlaceUrl.trim() }];
    setEnlaces(nuevo);
    setNuevoEnlaceNombre("");
    setNuevoEnlaceUrl("");
    guardar({ enlaces: nuevo });
  };

  const agregarComentario = () => {
    if (!nuevoComentario.trim()) return;
    const nuevo = [...comentarios, { fecha: new Date().toISOString(), texto: nuevoComentario.trim(), auto: false }];
    setComentarios(nuevo);
    setNuevoComentario("");
    guardar({ comentarios: nuevo });
  };

  const guardarMeta = () => {
    guardar({ notas: notas || null, prioridad, paquete: paquete || null, video_url: videoUrl || null, audio_url: audioUrl || null });
  };

  const venc = vencimientoDe(ep);
  const wa = telefono
    ? waUrl(telefono, `Hola ${clienteNombre || ""}, te escribe Élite Podhouse. Tu episodio "${ep.titulo}" está ${ETAPA_TEXTO[ep.estado] || ep.estado}${ep.fecha_entrega ? ` y la entrega es el ${fmtFecha(ep.fecha_entrega)}` : ""}.`)
    : "";

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setOpen(!open)} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: blueLight, background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          {open ? "Ocultar detalle ↑" : "Ver detalle ↓"}
        </button>
        {venc && (
          <span className="px-2 py-0.5 rounded-full" style={{ background: "rgba(224,93,93,0.12)", color: venc.color, fontFamily: FONT, fontSize: 10.5, fontWeight: 700 }}>{venc.texto}</span>
        )}
        {ep.prioridad && ep.prioridad !== "Normal" && (
          <span className="px-2 py-0.5 rounded-full" style={{ background: cardAlt, color: white, fontFamily: FONT, fontSize: 10.5, fontWeight: 600 }}>Prioridad {ep.prioridad}</span>
        )}
      </div>
      {open && (
        <div className="mt-3 rounded-xl p-4" style={{ background: "#0A0D1E", border: `1px solid ${cardAlt}` }}>
          <span style={labelStyle}>CHECKLIST DE PRODUCCIÓN</span>
          {checklist.length === 0 ? (
            <button onClick={cargarPasos} disabled={saving} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: blueLight, background: "none", border: "none", padding: 0, cursor: "pointer" }}>
              Agregar los 5 pasos (Brief y guion, Grabación, Edición, Revisión, Entrega)
            </button>
          ) : (
            <div className="space-y-1 mt-1">
              {checklist.map((c, i) => (
                <label key={i} className="flex items-center gap-2" style={{ fontFamily: FONT, fontSize: 13, color: c.d ? gray : white, cursor: "pointer" }}>
                  <input type="checkbox" checked={!!c.d} onChange={() => toggleChecklist(i)} disabled={saving} />
                  <span style={{ textDecoration: c.d ? "line-through" : "none" }}>{c.t}</span>
                </label>
              ))}
            </div>
          )}

          <div className="mt-4">
            <span style={labelStyle}>ENLACES</span>
            {enlaces.length === 0 && <p style={{ fontFamily: FONT, fontSize: 12.5, color: gray }}>Sin enlaces todavía.</p>}
            {enlaces.map((l, i) => (
              <p key={i} style={{ fontFamily: FONT, fontSize: 13, marginTop: 4 }}>
                <a href={l.url} target="_blank" rel="noreferrer" style={{ color: blueLight }}>{l.nombre || l.url}</a>
              </p>
            ))}
            <div className="flex gap-2 mt-2">
              <input placeholder="Nombre (p. ej. Video final)" value={nuevoEnlaceNombre} onChange={(e) => setNuevoEnlaceNombre(e.target.value)} className="flex-1 rounded-lg px-3 py-2 outline-none" style={inputStyle} />
              <input placeholder="https://…" value={nuevoEnlaceUrl} onChange={(e) => setNuevoEnlaceUrl(e.target.value)} className="flex-1 rounded-lg px-3 py-2 outline-none" style={inputStyle} />
              <button onClick={agregarEnlace} disabled={saving} className="rounded-lg px-3 py-2" style={{ background: cardAlt, color: white, fontFamily: FONT, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}>Agregar</button>
            </div>
          </div>

          <div className="mt-4">
            <span style={labelStyle}>VIDEO Y AUDIO PARA EL CLIENTE</span>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="URL del video" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="rounded-lg px-3 py-2 outline-none" style={inputStyle} />
              <input placeholder="URL del audio" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} className="rounded-lg px-3 py-2 outline-none" style={inputStyle} />
            </div>
            <p style={{ fontFamily: FONT, fontSize: 11.5, color: gray, marginTop: 4 }}>El cliente ve estos enlaces en Mis entregas como “Ver video” y “Escuchar audio”.</p>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4">
            <div>
              <label style={labelStyle}>PRIORIDAD</label>
              <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="w-full rounded-lg px-3 py-2 outline-none" style={inputStyle}>
                {PRIORIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>PAQUETE</label>
              <select value={paquete} onChange={(e) => setPaquete(e.target.value)} className="w-full rounded-lg px-3 py-2 outline-none" style={inputStyle}>
                <option value="">Sin paquete</option>
                {PAQUETES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label style={labelStyle}>NOTAS</label>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="w-full rounded-lg px-3 py-2 outline-none" style={inputStyle} />
          </div>

          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <button onClick={guardarMeta} disabled={saving} className="rounded-full px-4 py-2" style={{ background: "#2F52FF", color: "white", fontFamily: FONT, fontWeight: 600, fontSize: 12.5, border: "none", cursor: "pointer" }}>
              {saving ? "Guardando…" : "Guardar detalle"}
            </button>
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="rounded-full px-4 py-2" style={{ background: "#25D366", color: "white", fontFamily: FONT, fontWeight: 600, fontSize: 12.5, textDecoration: "none" }}>
                Avisar al cliente por WhatsApp
              </a>
            )}
            {saved && <span style={{ fontFamily: FONT, fontSize: 12, color: green }}>{saved}</span>}
            {error && <span style={{ fontFamily: FONT, fontSize: 12, color: red }}>{error}</span>}
          </div>

          <div className="mt-4">
            <span style={labelStyle}>COMENTARIOS</span>
            {comentarios.length === 0 && <p style={{ fontFamily: FONT, fontSize: 12.5, color: gray }}>Sin comentarios todavía.</p>}
            {comentarios.map((c, i) => (
              <p key={i} style={{ fontFamily: FONT, fontSize: 12.5, color: gray, marginTop: 4, lineHeight: 1.5 }}>
                {c.fecha ? `${fmtFecha(String(c.fecha).slice(0, 10))} · ` : ""}<span style={{ color: white }}>{c.texto || c.t}</span>{c.auto ? " (automático)" : ""}
              </p>
            ))}
            <div className="flex gap-2 mt-2">
              <input placeholder="Escribe un comentario…" value={nuevoComentario} onChange={(e) => setNuevoComentario(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") agregarComentario(); }} className="flex-1 rounded-lg px-3 py-2 outline-none" style={inputStyle} />
              <button onClick={agregarComentario} disabled={saving} className="rounded-lg px-3 py-2" style={{ background: cardAlt, color: white, fontFamily: FONT, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}>Comentar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
