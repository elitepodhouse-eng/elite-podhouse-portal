import React, { useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "../supabaseClient";
import { Eyebrow, PillButton, inputStyle, selectStyle, card, cardAlt, white, gray, blueLight, green, red, amber, FONT } from "../lib/ui";
import { safeSelect, fmtFecha, todayISO, filtrarClientes, waUrl } from "../lib/ops";
import { generarImagenCita, descargarImagenCita, nombreArchivoCita } from "../lib/citaImagen";
import { enlaceGoogleCalendar, mensajeWhatsAppVisita } from "../lib/calendarioVisita";

// Registro de visitas al estudio: nombre, fecha y hora obligatorios;
// teléfono, duración (30 min por defecto) y notas opcionales. El cliente
// es opcional y no se crea usuario: la visita se guarda solo con el nombre.
export function VisitasPanel() {
  const [clientes, setClientes] = useState([]);
  const [visitas, setVisitas] = useState([]);
  const [visitasMissing, setVisitasMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [vNombre, setVNombre] = useState("");
  const [vTelefono, setVTelefono] = useState("");
  const [vCliente, setVCliente] = useState("");
  const [vFecha, setVFecha] = useState("");
  const [vHora, setVHora] = useState("");
  const [vDuracion, setVDuracion] = useState("30");
  const [vNotas, setVNotas] = useState("");
  const [vSaving, setVSaving] = useState(false);
  const [preview, setPreview] = useState(null); // { visita, url }
  const [busyId, setBusyId] = useState(null); // id de la visita generando imagen
  const [gcalAviso, setGcalAviso] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: cls } = await supabase.from("clientes").select("id, nombre, correo, telefono").order("created_at", { ascending: false });
    setClientes(filtrarClientes(cls));
    const v = await safeSelect("visitas", supabase.from("visitas").select("*").order("fecha", { ascending: false }));
    setVisitas(v.data);
    setVisitasMissing(v.missing);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const crearVisita = async (e) => {
    e.preventDefault();
    setError(""); setOkMsg(""); setGcalAviso(false);
    if (!vNombre || !vFecha || !vHora) { setError("La visita necesita nombre, fecha y hora."); return; }
    setVSaving(true);
    const { data, error: err } = await supabase.from("visitas").insert({
      cliente_id: vCliente || null, nombre: vNombre, telefono: vTelefono || null,
      fecha: vFecha, hora: vHora, duracion: parseInt(vDuracion, 10) || 30, notas: vNotas || null,
    }).select().single();
    setVSaving(false);
    if (err) { setError(err.message); return; }
    // Google Calendar: mejor esfuerzo, como en las sesiones del admin.
    // La visita queda guardada aunque el evento no se pueda crear.
    try {
      const { error: gcalError } = await supabase.functions.invoke("google-calendar", {
        body: {
          action: "create", fecha: vFecha, hora: vHora,
          duracion: parseInt(vDuracion, 10) || 30,
          titulo: `Visita al estudio – ${vNombre}`,
          cliente_nombre: vNombre, cliente_telefono: vTelefono || undefined,
          ubicacion: "Monteverde 186, Colonia Balderrama, Hermosillo, Sonora",
          tipo: "visita",
        },
      });
      if (gcalError) setGcalAviso(true);
    } catch { setGcalAviso(true); }
    setVNombre(""); setVTelefono(""); setVCliente(""); setVFecha(""); setVHora(""); setVDuracion("30"); setVNotas("");
    setOkMsg("Visita registrada.");
    load();
    // Vista previa de la imagen de cita de la visita recién registrada.
    if (data) {
      setBusyId(data.id);
      try {
        const c = await generarImagenCita(data);
        setPreview({ visita: data, url: c.toDataURL("image/png") });
      } catch { /* la imagen se puede generar desde la lista */ }
      setBusyId(null);
    }
  };

  const eliminarVisita = async (id) => {
    const { error: err } = await supabase.from("visitas").delete().eq("id", id);
    if (err) setError(err.message);
    else {
      if (preview && preview.visita.id === id) setPreview(null);
      load();
    }
  };

  const verImagen = async (v) => {
    setBusyId(v.id);
    try {
      const c = await generarImagenCita(v);
      setPreview({ visita: v, url: c.toDataURL("image/png") });
    } catch { setError("No se pudo generar la imagen de cita."); }
    setBusyId(null);
  };

  const descargar = async (v) => {
    setBusyId(v.id);
    const ok = await descargarImagenCita(v);
    if (!ok) setError("No se pudo generar la imagen de cita.");
    setBusyId(null);
  };

  if (visitasMissing) {
    return (
      <p style={{ fontFamily: FONT, fontSize: 13, color: gray, marginTop: 8, lineHeight: 1.55 }}>
        El registro de visitas aún no está activado en la base (tabla `visitas`, migración 004 pendiente). Cuando se aplique, aquí se registran las visitas con nombre, teléfono, fecha, hora y duración.
      </p>
    );
  }

  return (
    <div>
      {error && <p style={{ fontFamily: FONT, fontSize: 13, color: red, marginTop: 12 }}>{error}</p>}
      {okMsg && <p style={{ fontFamily: FONT, fontSize: 13, color: green, marginTop: 12 }}>{okMsg}</p>}
      {gcalAviso && <p style={{ fontFamily: FONT, fontSize: 13, color: amber, marginTop: 12 }}>Visita guardada, pero no se creó el evento en Google Calendar. Puedes agregarlo con el enlace de la visita.</p>}
      <form onSubmit={crearVisita} className="mt-3 rounded-2xl p-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>NUEVA VISITA</span>
        <input placeholder="Nombre de quien visita" value={vNombre} onChange={(e) => setVNombre(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-3" style={inputStyle} />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <input placeholder="Teléfono" value={vTelefono} onChange={(e) => setVTelefono(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
          <select value={vCliente} onChange={(e) => setVCliente(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={selectStyle}>
            <option value="">Cliente (opcional)</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre || c.correo}</option>)}
          </select>
          <input type="date" min={todayISO()} value={vFecha} onChange={(e) => setVFecha(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
          <input type="time" value={vHora} onChange={(e) => setVHora(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
          <select value={vDuracion} onChange={(e) => setVDuracion(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={selectStyle}>
            <option value="30">30 minutos</option>
            <option value="45">45 minutos</option>
            <option value="60">60 minutos</option>
          </select>
          <input placeholder="Notas (opcional)" value={vNotas} onChange={(e) => setVNotas(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
        </div>
        <div className="mt-3">
          <PillButton type="submit" disabled={vSaving}>{vSaving ? <Loader2 size={15} className="animate-spin" /> : "Registrar visita"}</PillButton>
        </div>
      </form>

      {preview && (
        <div className="mt-4 rounded-2xl p-4" style={{ background: card, border: `1px solid ${cardAlt}` }}>
          <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>IMAGEN DE CITA — {preview.visita.nombre}</span>
          <img src={preview.url} alt="Imagen de cita" className="w-full rounded-xl mt-3" style={{ maxWidth: 540 }} />
          <div className="flex gap-3 mt-3 flex-wrap items-center">
            <PillButton onClick={() => descargar(preview.visita)} disabled={busyId === preview.visita.id}>
              {busyId === preview.visita.id ? <Loader2 size={15} className="animate-spin" /> : "Descargar imagen de cita"}
            </PillButton>
            <a href={enlaceGoogleCalendar(preview.visita)} target="_blank" rel="noreferrer" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: blueLight }}>Agregar a Google Calendar</a>
            {preview.visita.telefono && <a href={waUrl(preview.visita.telefono, mensajeWhatsAppVisita(preview.visita))} target="_blank" rel="noreferrer" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: green }}>Confirmar por WhatsApp</a>}
            <button onClick={() => setPreview(null)} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: gray, background: "none", border: "none", padding: 0, cursor: "pointer" }}>Cerrar</button>
          </div>
          <p style={{ fontFamily: FONT, fontSize: 11.5, color: gray, marginTop: 8 }}>{nombreArchivoCita(preview.visita)}</p>
        </div>
      )}

      <div className="space-y-2 mt-3">
        {loading && <p style={{ fontFamily: FONT, fontSize: 13, color: gray }}>Cargando…</p>}
        {!loading && visitas.length === 0 && <p style={{ fontFamily: FONT, fontSize: 13, color: gray }}>Aún no hay visitas registradas.</p>}
        {visitas.map((v) => {
          const waV = v.telefono ? waUrl(v.telefono, mensajeWhatsAppVisita(v)) : "";
          return (
            <div key={v.id} className="flex items-center justify-between p-4 rounded-2xl" style={{ background: card, border: `1px solid ${cardAlt}` }}>
              <div>
                <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: white }}>{v.nombre}</p>
                <p style={{ fontFamily: FONT, fontSize: 11.5, color: gray, marginTop: 3 }}>{fmtFecha(v.fecha)} · {v.hora} · {v.duracion || 30} min{v.notas ? ` · ${v.notas}` : ""}</p>
              </div>
              <div className="flex gap-3 flex-wrap justify-end">
                <button onClick={() => verImagen(v)} disabled={busyId === v.id} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: blueLight, background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                  {busyId === v.id ? "Generando…" : "Imagen de cita"}
                </button>
                <button onClick={() => descargar(v)} disabled={busyId === v.id} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: blueLight, background: "none", border: "none", padding: 0, cursor: "pointer" }}>Descargar imagen de cita</button>
                <a href={enlaceGoogleCalendar(v)} target="_blank" rel="noreferrer" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: blueLight }}>Agregar a Google Calendar</a>
                {waV && <a href={waV} target="_blank" rel="noreferrer" style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: green }}>Confirmar por WhatsApp</a>}
                <button onClick={() => eliminarVisita(v.id)} style={{ fontFamily: FONT, fontWeight: 600, fontSize: 12, color: gray, background: "none", border: "none", padding: 0, cursor: "pointer" }}>Eliminar</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminVisitas() {
  return (
    <div>
      <Eyebrow>ADMINISTRACIÓN</Eyebrow>
      <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: white }}>Visitas</h1>
      <p style={{ fontFamily: FONT, fontSize: 13.5, color: gray, marginTop: 6 }}>Registra visitas para conocer el estudio. No hace falta crear usuario ni elegir cliente.</p>
      <VisitasPanel />
    </div>
  );
}
