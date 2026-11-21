import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Eyebrow, PillButton, ErrorBanner, OkBanner, SectionTitle, EmptyNote, MissingTablesBanner, inputStyle, labelStyle, card, cardAlt, white, gray, FONT } from "../lib/ui";
import { useConfig, fmtMoney, safeSelect } from "../lib/ops";

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
  const [expSaving, setExpSaving] = useState(false);
  const [impSaving, setImpSaving] = useState(false);

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

  // Respaldo JSON (auditoría Élite OS, tanda 6): exporta todas las tablas
  // y restaura actualizando por id, en orden de dependencias.
  const TABLAS_RESPALDO = ["configuracion", "colaboradores", "clientes", "sesiones", "episodios", "pagos", "facturas", "abonos", "propuestas", "cotizaciones", "contratos", "pagos_colaboradores", "movimientos", "gastos_fijos", "facturas_fiscales", "meses_fiscales", "contenidos", "notas"];
  const CONFLICTO = { configuracion: "clave", meses_fiscales: "mes" };

  const exportar = async () => {
    setError(""); setOk(""); setExpSaving(true);
    const datos = { exportado: new Date().toISOString(), tablas: {} };
    for (const t of TABLAS_RESPALDO) {
      const r = await safeSelect(t, supabase.from(t).select("*").range(0, 4999));
      datos.tablas[t] = r.missing ? null : r.data;
    }
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `elite-podhouse-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOk("Respaldo descargado.");
    setExpSaving(false);
  };

  const importar = async (file) => {
    setError(""); setOk("");
    let datos;
    try { datos = JSON.parse(await file.text()); } catch { setError("El archivo no es un JSON válido."); return; }
    if (!datos.tablas) { setError("Ese archivo no es un respaldo del portal."); return; }
    if (!window.confirm("Esto restaura los datos del respaldo (actualiza cada registro por su id). ¿Seguro?")) return;
    setImpSaving(true);
    const resumen = [];
    for (const t of TABLAS_RESPALDO) {
      const filas = datos.tablas[t];
      if (!Array.isArray(filas) || filas.length === 0) continue;
      const { error: err } = await supabase.from(t).upsert(filas, { onConflict: CONFLICTO[t] || "id" });
      if (err) { setError(`Error en ${t}: ${err.message}`); setImpSaving(false); return; }
      resumen.push(`${t}: ${filas.length}`);
    }
    setOk(resumen.length > 0 ? `Restaurado: ${resumen.join(" · ")}` : "El respaldo no traía registros.");
    setImpSaving(false);
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

      <div className="rounded-2xl p-5 mt-5" style={{ background: card, border: `1px solid ${cardAlt}` }}>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>RESPALDO</span>
        <p style={{ fontFamily: FONT, fontSize: 12.5, color: gray, marginTop: 6, lineHeight: 1.6 }}>
          Descarga todos los datos del portal en un archivo JSON (clientes, sesiones, episodios, facturas, abonos, propuestas, cotizaciones, contratos, finanzas y más). Guárdalo en un lugar seguro: incluye los datos de pago. Restaurar actualiza cada registro por su id, sin borrar lo demás.
        </p>
        <div className="flex gap-2 mt-3 flex-wrap">
          <PillButton onClick={exportar} disabled={expSaving}>{expSaving ? "Descargando…" : "Descargar respaldo JSON"}</PillButton>
          <label className="rounded-full px-5 py-2.5" style={{ background: cardAlt, color: white, fontFamily: FONT, fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>
            Restaurar desde archivo
            <input type="file" accept="application/json,.json" onChange={(e) => { const f = e.target.files?.[0]; if (f) importar(f); e.target.value = ""; }} style={{ display: "none" }} />
          </label>
        </div>
        {impSaving && <p style={{ fontFamily: FONT, fontSize: 13, color: gray, marginTop: 8 }}>Restaurando…</p>}
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
