import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";
import { Eyebrow, PillButton, ErrorBanner, OkBanner, SectionTitle, EmptyNote, MissingTablesBanner, inputStyle, labelStyle, card, cardAlt, white, gray, blueLight, blueSoft, green, greenBg, amber, amberBg, red, FONT } from "../lib/ui";
import { safeSelect, safeLoadClientes, waUrl, fmtMoney, fmtFecha, todayISO, useConfig, r2 } from "../lib/ops";
import { pdfContrato } from "../lib/pdf";

const ESTADOS = ["Borrador", "Enviado", "Firmado"];
const TIPOS_SERVICIO = [
  { id: "grabacion", label: "Solo grabación" },
  { id: "grabacion_edicion", label: "Grabación y edición" },
  { id: "edicion", label: "Solo edición" },
];

function estadoColor(e) {
  if (e === "Firmado") return { background: greenBg, color: green };
  if (e === "Enviado") return { background: blueSoft, color: blueLight };
  return { background: amberBg, color: amber };
}

export default function AdminContratos() {
  const [items, setItems] = useState([]);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("Todos");
  const [clientes, setClientes] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const { config } = useConfig();
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  // Form
  const [cotizacionId, setCotizacionId] = useState("");
  const [nombre, setNombre] = useState("");
  const [rfc, setRfc] = useState("");
  const [representante, setRepresentante] = useState("");
  const [domicilio, setDomicilio] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [proyecto, setProyecto] = useState("");
  const [servicios, setServicios] = useState("");
  const [subtotal, setSubtotal] = useState("");
  const [iva, setIva] = useState("");
  const [total, setTotal] = useState("");
  const [anticipo, setAnticipo] = useState("");
  const [tipoServicio, setTipoServicio] = useState("grabacion_edicion");
  const [revisiones, setRevisiones] = useState(1);
  const [portafolio, setPortafolio] = useState("si");
  const [jurisdiccion, setJurisdiccion] = useState("Para la interpretación y cumplimiento de este contrato, las partes se someten a las leyes de México y a los tribunales de Hermosillo, Sonora.");
  const [prestador, setPrestador] = useState("Tania Elizabeth Mino Torres");

  const load = useCallback(async () => {
    const res = await safeSelect("contratos", supabase.from("contratos").select("*").order("created_at", { ascending: false }));
    setItems(res.data);
    setMissing(res.missing);
    const cots = await safeSelect("cotizaciones", supabase.from("cotizaciones").select("*").eq("estado", "Aceptada").order("created_at", { ascending: false }));
    setCotizaciones(cots.data);
    setLoading(false);
  }, []);
  useEffect(() => { load(); safeLoadClientes().then(setClientes); }, [load]);

  const desdeCotizacion = (id) => {
    setCotizacionId(id);
    const c = cotizaciones.find((x) => x.id === id);
    if (!c) return;
    setNombre(c.nombre || "");
    setTelefono(c.telefono || "");
    setProyecto(c.proyecto || "");
    setSubtotal(c.subtotal != null ? String(c.subtotal) : "");
    setIva(c.iva != null ? String(c.iva) : "");
    setTotal(c.total != null ? String(c.total) : "");
    setServicios(c.paquete ? `Paquete ${c.paquete}${c.tipo ? ` (${c.tipo === "mensual" ? "membresía mensual" : "por sesión"})` : ""}` : "");
    const match = clientes.find((x) => (x.nombre || "").toLowerCase() === (c.nombre || "").toLowerCase());
    if (match) setEmail(match.correo || "");
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError(""); setOk("");
    if (!nombre.trim()) { setError("Escribe el nombre del cliente."); return; }
    setSaving(true);
    const match = clientes.find((c) => (c.nombre || "").toLowerCase() === nombre.trim().toLowerCase());
    const datos = {
      cliente: nombre.trim(), rfc, representante, domicilio, telefono, email,
      proyecto, servicios, subtotal: Number(subtotal) || 0, iva: Number(iva) || 0,
      total: Number(total) || 0, anticipo: Number(anticipo) || 0,
      tipoServicio, revisiones: Number(revisiones) || 1, portafolio, jurisdiccion, prestador,
      cancelacion: "Si el cliente cancela, el anticipo no es reembolsable.",
    };
    const { error } = await supabase.from("contratos").insert({
      cotizacion_id: cotizacionId || null,
      fecha: todayISO(),
      cliente_id: match ? match.id : null,
      nombre: nombre.trim(),
      estado: "Borrador",
      total: Number(total) || 0,
      datos,
    });
    if (error) setError(error.message);
    else {
      setOk("Contrato guardado como borrador.");
      setCotizacionId(""); setNombre(""); setRfc(""); setRepresentante(""); setDomicilio("");
      setTelefono(""); setEmail(""); setProyecto(""); setServicios("");
      setSubtotal(""); setIva(""); setTotal(""); setAnticipo("");
      load();
    }
    setSaving(false);
  };

  const cambiarEstado = async (c, nuevo) => {
    await supabase.from("contratos").update({ estado: nuevo }).eq("id", c.id);
    load();
  };
  const eliminar = async (id) => { await supabase.from("contratos").delete().eq("id", id); load(); };

  const filtrados = filtro === "Todos" ? items : items.filter((c) => c.estado === filtro);
  const anticipoDefault = Number(config?.anticipo || 500);

  return (
    <div>
      <Eyebrow>ADMINISTRACIÓN</Eyebrow>
      <SectionTitle>Contratos</SectionTitle>
      {missing && <div className="mt-4"><MissingTablesBanner migration="supabase/migrations/001_portal_inicio.sql" text="Falta la tabla de contratos. Aplica una vez la migración" /></div>}
      {!missing && !loading && items.length === 0 && (
        <p className="mt-4" style={{ fontFamily: FONT, fontSize: 13.5, color: gray, lineHeight: 1.6 }}>Aún no hay contratos. Crea el primero abajo, desde una cotización aceptada o desde cero.</p>
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
        {filtrados.map((c) => {
          const d = c.datos || {};
          return (
            <div key={c.id} className="rounded-2xl p-4" style={{ background: card, border: `1px solid ${cardAlt}` }}>
              <div className="flex items-center justify-between gap-2">
                <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 14, color: white }}>{c.nombre}</p>
                <span className="px-2.5 py-1 rounded-full shrink-0" style={{ ...estadoColor(c.estado), fontFamily: FONT, fontSize: 10.5, fontWeight: 600 }}>{c.estado}</span>
              </div>
              <p style={{ fontFamily: FONT, fontSize: 12.5, color: gray, marginTop: 4 }}>
                {d.proyecto ? `${d.proyecto} · ` : ""}{c.fecha ? fmtFecha(c.fecha) : ""}{d.tipoServicio ? ` · ${TIPOS_SERVICIO.find((t) => t.id === d.tipoServicio)?.label || d.tipoServicio}` : ""}
              </p>
              <div className="flex items-center justify-between mt-2">
                <b style={{ fontFamily: FONT, fontSize: 15, color: white }}>{fmtMoney(c.total)}</b>
                <div className="flex gap-3 items-center">
                  <button onClick={() => pdfContrato(c, d)} style={{ fontFamily: FONT, fontSize: 12.5, color: blueLight, fontWeight: 600 }}>PDF</button>
                  {d.telefono && (
                    <a href={waUrl(d.telefono, `Hola ${c.nombre}, te comparto tu contrato de Élite Podhouse. Cuando lo revises me confirmas para firmarlo.`)} target="_blank" rel="noreferrer" style={{ fontFamily: FONT, fontSize: 12.5, color: green, fontWeight: 600 }}>WhatsApp</a>
                  )}
                  {c.estado !== "Enviado" && <button onClick={() => cambiarEstado(c, "Enviado")} style={{ fontFamily: FONT, fontSize: 12.5, color: blueLight, fontWeight: 600 }}>Enviado</button>}
                  {c.estado !== "Firmado" && <button onClick={() => cambiarEstado(c, "Firmado")} style={{ fontFamily: FONT, fontSize: 12.5, color: green, fontWeight: 600 }}>Firmado</button>}
                  <button onClick={() => eliminar(c.id)} style={{ fontFamily: FONT, fontSize: 12.5, color: red, fontWeight: 600 }}>Eliminar</button>
                </div>
              </div>
            </div>
          );
        })}
        {filtrados.length === 0 && !loading && <EmptyNote>No hay contratos en este filtro.</EmptyNote>}
      </div>

      <form onSubmit={guardar} className="mt-6 rounded-2xl p-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>NUEVO CONTRATO</span>
        {cotizaciones.length > 0 && (
          <div className="mt-3">
            <label style={labelStyle}>DESDE UNA COTIZACIÓN ACEPTADA (OPCIONAL)</label>
            <select value={cotizacionId} onChange={(e) => desdeCotizacion(e.target.value)} className="w-full rounded-xl px-3 py-2.5" style={inputStyle}>
              <option value="">Sin cotización — desde cero</option>
              {cotizaciones.map((c) => <option key={c.id} value={c.id}>{c.nombre} — {c.paquete || ""} · {fmtMoney(c.total)}</option>)}
            </select>
          </div>
        )}
        <input list="clientes-contratos" placeholder="Cliente *" value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-3" style={inputStyle} />
        <datalist id="clientes-contratos">{clientes.map((c) => <option key={c.id} value={c.nombre || ""} />)}</datalist>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <input placeholder="RFC" value={rfc} onChange={(e) => setRfc(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
          <input placeholder="Representante" value={representante} onChange={(e) => setRepresentante(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
        </div>
        <input placeholder="Domicilio" value={domicilio} onChange={(e) => setDomicilio(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={inputStyle} />
        <div className="grid grid-cols-2 gap-2 mt-2">
          <input placeholder="Teléfono" value={telefono} onChange={(e) => setTelefono(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
          <input placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
        </div>
        <input placeholder="Proyecto" value={proyecto} onChange={(e) => setProyecto(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={inputStyle} />
        <textarea placeholder="Servicios contratados…" value={servicios} onChange={(e) => setServicios(e.target.value)} rows={3} className="w-full rounded-xl px-3 py-2.5 outline-none mt-2" style={{ ...inputStyle, resize: "none" }} />
        <div className="grid grid-cols-4 gap-2 mt-2">
          <div><label style={labelStyle}>SUBTOTAL ($)</label><input type="number" min="0" step="0.01" value={subtotal} onChange={(e) => { setSubtotal(e.target.value); setTotal(String(r2(Number(e.target.value || 0) + Number(iva || 0)))); }} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} /></div>
          <div><label style={labelStyle}>IVA ($)</label><input type="number" min="0" step="0.01" value={iva} onChange={(e) => { setIva(e.target.value); setTotal(String(r2(Number(subtotal || 0) + Number(e.target.value || 0)))); }} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} /></div>
          <div><label style={labelStyle}>TOTAL ($)</label><input type="number" min="0" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} /></div>
          <div><label style={labelStyle}>ANTICIPO ($)</label><input type="number" min="0" step="0.01" placeholder={String(anticipoDefault)} value={anticipo} onChange={(e) => setAnticipo(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label style={labelStyle}>TIPO DE SERVICIO</label>
            <select value={tipoServicio} onChange={(e) => setTipoServicio(e.target.value)} className="w-full rounded-xl px-3 py-2.5" style={inputStyle}>
              {TIPOS_SERVICIO.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>REVISIONES INCLUIDAS</label>
            <input type="number" min="0" value={revisiones} onChange={(e) => setRevisiones(Number(e.target.value))} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
          </div>
        </div>
        <div className="mt-2">
          <label style={labelStyle}>PORTAFOLIO (¿EL CLIENTE AUTORIZA USAR SU MATERIAL COMO PORTAFOLIO?)</label>
          <select value={portafolio} onChange={(e) => setPortafolio(e.target.value)} className="w-full rounded-xl px-3 py-2.5" style={inputStyle}>
            <option value="si">Sí, autoriza</option>
            <option value="no">No autoriza</option>
          </select>
        </div>
        <div className="mt-2">
          <label style={labelStyle}>JURISDICCIÓN</label>
          <input value={jurisdiccion} onChange={(e) => setJurisdiccion(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
        </div>
        <div className="mt-2">
          <label style={labelStyle}>PRESTADOR</label>
          <input value={prestador} onChange={(e) => setPrestador(e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
        </div>
        <ErrorBanner message={error} />
        <OkBanner message={ok} />
        <div className="mt-3"><PillButton type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar contrato (borrador)"}</PillButton></div>
      </form>
    </div>
  );
}
