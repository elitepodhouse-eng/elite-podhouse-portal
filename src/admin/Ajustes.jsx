import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Eyebrow, PillButton, ErrorBanner, OkBanner, SectionTitle, EmptyNote, MissingTablesBanner, inputStyle, labelStyle, card, cardAlt, white, gray, FONT } from "../lib/ui";
import { useConfig, fmtMoney } from "../lib/ops";

const GRUPOS = [
  { titulo: "PAQUETES DE PODCAST (SIN IVA)", prefijo: "pkg." },
  { titulo: "REELS", prefijo: "reels." },
  { titulo: "RENTA DE ESTUDIO SIN ASISTENCIA", prefijo: "horas." },
  { titulo: "GRABACIÓN EN EXTERIOR", prefijo: "exterior." },
];

export default function AdminAjustes() {
  const { configRows, configMissing, reloadConfig } = useConfig();
  const [valores, setValores] = useState({});
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const map = {};
    configRows.forEach((r) => { map[r.clave] = r.valor ?? ""; });
    setValores(map);
  }, [configRows]);

  const set = (clave, valor) => setValores((v) => ({ ...v, [clave]: valor }));

  const guardar = async (claves) => {
    setError(""); setOk("");
    setSaving(true);
    for (const clave of claves) {
      const { error } = await supabase.from("configuracion").upsert({ clave, valor: String(valores[clave] ?? "") });
      if (error) { setError(error.message); setSaving(false); return; }
    }
    setOk("Guardado. Los módulos ya usan los nuevos precios.");
    reloadConfig();
    setSaving(false);
  };

  const guardarTodo = async () => {
    await guardar(Object.keys(valores));
  };

  const filasDe = (prefijo) => configRows.filter((r) => r.clave.startsWith(prefijo));
  const pago = ["banco", "clabe", "titular", "anticipo"];
  const meta = valores.metaMensual ?? "";

  return (
    <div>
      <Eyebrow>ADMINISTRACIÓN</Eyebrow>
      <SectionTitle>Ajustes</SectionTitle>
      {configMissing && <div className="mt-4"><MissingTablesBanner migration="supabase/migrations/001_portal_inicio.sql" text="Falta la tabla de configuración. Aplica una vez la migración" /></div>}
      <p className="mt-4" style={{ fontFamily: FONT, fontSize: 13.5, color: gray, lineHeight: 1.6 }}>
        Precios en MXN, sin IVA. Los usan Propuestas, Cotizador, Cobranza y Agenda. Cambiar un precio aquí lo cambia en todo el portal.
      </p>

      {GRUPOS.map((g) => {
        const filas = filasDe(g.prefijo);
        if (filas.length === 0) return null;
        return (
          <div key={g.prefijo} className="rounded-2xl p-5 mt-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>{g.titulo}</span>
            <div className="space-y-2 mt-3">
              {filas.map((r) => (
                <div key={r.clave} className="flex items-center justify-between gap-3">
                  <p style={{ fontFamily: FONT, fontSize: 13, color: white }}>{r.nombre || r.clave}</p>
                  <input type="number" min="0" step="0.01" value={valores[r.clave] ?? ""} onChange={(e) => set(r.clave, e.target.value)}
                    className="rounded-xl px-3 py-2 outline-none text-right" style={{ ...inputStyle, width: 130 }} />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div className="rounded-2xl p-5 mt-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>DATOS DE PAGO</span>
        <p style={{ fontFamily: FONT, fontSize: 12.5, color: gray, marginTop: 6, lineHeight: 1.6 }}>Salen en los mensajes para pedir el anticipo y en las cotizaciones.</p>
        <div className="space-y-2 mt-3">
          {pago.map((clave) => (
            <div key={clave}>
              <label style={labelStyle}>{clave.toUpperCase()}</label>
              <input value={valores[clave] ?? ""} onChange={(e) => set(clave, e.target.value)} className="w-full rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-5 mt-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>META MENSUAL DE INGRESOS</span>
        <p style={{ fontFamily: FONT, fontSize: 12.5, color: gray, marginTop: 6 }}>Se muestra en Finanzas con el avance del mes.</p>
        <input type="number" min="0" step="0.01" placeholder="Ej. 30000" value={meta} onChange={(e) => set("metaMensual", e.target.value)}
          className="w-full rounded-xl px-3 py-2.5 outline-none mt-3" style={inputStyle} />
      </div>

      <ErrorBanner message={error} />
      <OkBanner message={ok} />
      <div className="mt-5">
        <PillButton onClick={guardarTodo} disabled={saving}>{saving ? "Guardando…" : "Guardar todos los cambios"}</PillButton>
      </div>
      {configRows.length === 0 && !configMissing && <div className="mt-4"><EmptyNote>Sin precios cargados todavía.</EmptyNote></div>}
    </div>
  );
}
