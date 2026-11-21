// Comprobantes con archivo (auditoría Élite OS, tanda 5): subida a
// Supabase Storage (bucket `comprobantes`, privado) y enlace para verlo.
// El campo `comprobante_url` sigue aceptando texto: un archivo guardado
// se marca como "storage:<ruta>" y se distingue del texto anterior.
// El bucket y sus políticas llegan con la migración 005
// (supabase/migrations/005_storage_comprobantes.sql); sin ella, la subida
// falla con un mensaje claro y el formulario conserva el campo de texto.
import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { FONT, blueLight, gray } from "./ui";

export const BUCKET_COMPROBANTES = "comprobantes";
const MAX_MB = 20;

export function esArchivoComprobante(valor) {
  return typeof valor === "string" && valor.startsWith("storage:");
}

export function rutaComprobante(valor) {
  return esArchivoComprobante(valor) ? valor.slice("storage:".length) : null;
}

export async function subirComprobante(file) {
  if (!file) return null;
  if (file.size > MAX_MB * 1024 * 1024) {
    throw new Error(`El archivo pesa más de ${MAX_MB} MB.`);
  }
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().slice(0, 10);
  const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_COMPROBANTES).upload(nombre, file, { cacheControl: "3600", upsert: false });
  if (error) {
    const msg = String(error.message || "");
    if (/bucket/i.test(msg)) {
      throw new Error("El almacén de comprobantes aún no está activado (migración 005 pendiente). Por ahora anota el comprobante como texto.");
    }
    throw new Error(msg || "No se pudo subir el archivo.");
  }
  return `storage:${nombre}`;
}

export async function abrirComprobante(valor) {
  const ruta = rutaComprobante(valor);
  if (!ruta) return;
  const { data, error } = await supabase.storage.from(BUCKET_COMPROBANTES).createSignedUrl(ruta, 3600);
  if (error) throw new Error(error.message || "No se pudo abrir el comprobante.");
  window.open(data.signedUrl, "_blank");
}

// Muestra un comprobante guardado: enlace "Ver comprobante" si es archivo,
// texto tal cual si es una nota anterior.
export function ComprobanteValor({ valor }) {
  const [error, setError] = useState("");
  if (!valor) return null;
  if (esArchivoComprobante(valor)) {
    return (
      <span>
        <button
          onClick={async () => { setError(""); try { await abrirComprobante(valor); } catch (e) { setError(e.message); } }}
          style={{ fontFamily: FONT, fontSize: 11.5, color: blueLight, fontWeight: 600, background: "none", border: "none", padding: 0, cursor: "pointer" }}
        >
          Ver comprobante 📎
        </button>
        {error && <span style={{ fontFamily: FONT, fontSize: 11.5, color: "#E05D5D", marginLeft: 6 }}>{error}</span>}
      </span>
    );
  }
  return <span style={{ fontFamily: FONT, fontSize: 11.5, color: gray }}>Comprobante: {valor}</span>;
}
