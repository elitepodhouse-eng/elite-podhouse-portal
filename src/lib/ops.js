import { useState, useEffect, useCallback } from "react";
import { supabase, isAdminEmail } from "../supabaseClient";

// ---------- Formato ----------
export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const fmtMoney = (n) => `$${Number(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;
export const fmtFecha = (iso) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} de ${MESES[m - 1]} de ${y}`;
};
export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;

// ---------- Consultas tolerantes (tabla inexistente -> missing) ----------
export async function safeSelect(table, query) {
  try {
    const res = await query;
    if (res.error) {
      if (res.error.code === "PGRST205" || res.status === 404) return { data: [], missing: true };
      throw res.error;
    }
    return { data: res.data || [], missing: false };
  } catch {
    return { data: [], missing: true };
  }
}

export async function safeLoadClientes() {
  const { data } = await supabase.from("clientes").select("id, nombre, correo, telefono, paquete").order("created_at", { ascending: false });
  return filtrarClientes(data);
}

// Las cuentas del estudio (Tania y Alejandro) NO son clientes: nunca se
// listan como clientes en ningún desplegable ni lista. Sus filas siguen en
// la base; solo no se muestran.
export function esCuentaEstudio(c) {
  return !!c?.correo && isAdminEmail(c.correo);
}
export function filtrarClientes(rows) {
  return (rows || []).filter((c) => !esCuentaEstudio(c));
}

// ---------- Saldo único del cliente ----------
// Las facturas de Cobranza son la fuente de verdad del adeudo
// (saldo = monto − abonos); los pagos manuales de la tabla `pagos` se
// suman aparte, sin duplicar. No escribe nada: solo deriva en lectura.
export function saldoCliente(facturas, abonos, pagos) {
  const abonosPorFactura = {};
  (abonos || []).forEach((a) => { abonosPorFactura[a.factura_id] = (abonosPorFactura[a.factura_id] || 0) + Number(a.monto || 0); });
  let pendienteF = 0, pagadoF = 0;
  (facturas || []).forEach((f) => {
    const m = Number(f.monto || 0);
    const ab = Math.min(m, abonosPorFactura[f.id] || 0);
    pagadoF += ab;
    pendienteF += Math.max(0, m - ab);
  });
  const pagadoM = (pagos || []).filter((p) => p.estado === "pagado").reduce((a, p) => a + Number(p.monto || 0), 0);
  const pendienteM = (pagos || []).filter((p) => p.estado === "pendiente").reduce((a, p) => a + Number(p.monto || 0), 0);
  return { pendiente: pendienteF + pendienteM, pagado: pagadoF + pagadoM, pendienteFacturas: pendienteF, pagadoFacturas: pagadoF };
}

// ---------- WhatsApp ----------
// Teléfono mexicano de 10 dígitos -> prefijo 52, como en Élite OS.
export function waPhone(tel) {
  const d = String(tel || "").replace(/\D/g, "");
  if (d.length === 10) return `52${d}`;
  if (d.length === 12 && d.startsWith("52")) return d;
  return d;
}
export function waUrl(tel, mensaje) {
  const p = waPhone(tel);
  if (!p) return "";
  return `https://wa.me/${p}?text=${encodeURIComponent(mensaje)}`;
}

// ---------- Configuración (tabla `configuracion`: clave/valor/nombre) ----------
// Precios por defecto (iguales a los de la migración) por si una clave falta.
export const PRECIOS_DEFAULT = {
  "pkg.Esencia.sesion": 1499, "pkg.Esencia.mensual": 4999,
  "pkg.Impacto.sesion": 2499, "pkg.Impacto.mensual": 7999,
  "pkg.Identidad.sesion": 3499, "pkg.Identidad.mensual": 10999,
  "pkg.Expansión.sesion": 3999, "pkg.Expansión.mensual": 12999,
  "exterior.sesion": 1599, "exterior.mensual": 5399,
  "reels.Esencial.4": 1950, "reels.Esencial.8": 3650, "reels.Esencial.12": 5250, "reels.Esencial.16": 6650,
  "reels.Pro.4": 2350, "reels.Pro.8": 4350, "reels.Pro.12": 6250, "reels.Pro.16": 7950,
  "reels.Full Brand.4": 2950, "reels.Full Brand.8": 5500, "reels.Full Brand.12": 8000, "reels.Full Brand.16": 10400,
  "horas.1.solo": 600, "horas.2.solo": 1099, "horas.3.solo": 1599, "horas.4.solo": 1999,
  anticipo: 500,
};

export function precioDe(config, clave) {
  const v = config?.[clave];
  if (v !== undefined && v !== null && v !== "") return Number(v);
  return PRECIOS_DEFAULT[clave] ?? 0;
}
export function precioPaquete(config, paquete, tipo) {
  return precioDe(config, `pkg.${paquete}.${tipo === "mensual" ? "mensual" : "sesion"}`);
}
export function precioReels(config, nivel, cantidad) {
  return precioDe(config, `reels.${nivel}.${cantidad}`);
}
export function precioHoras(config, horas) {
  return precioDe(config, `horas.${horas}.solo`);
}

export function useConfig() {
  const [config, setConfig] = useState(null); // { clave: valor }
  const [configRows, setConfigRows] = useState([]);
  const [missing, setMissing] = useState(false);
  const load = useCallback(async () => {
    const res = await safeSelect("configuracion", supabase.from("configuracion").select("*").order("clave"));
    if (res.missing) { setMissing(true); return; }
    setConfigRows(res.data);
    const map = {};
    res.data.forEach((r) => { map[r.clave] = r.valor; });
    setConfig(map);
  }, []);
  useEffect(() => { load(); }, [load]);
  return { config: config || {}, configRows, configMissing: missing, reloadConfig: load };
}

export const PAQUETES = ["Esencia", "Impacto", "Identidad", "Expansión"];
export const INCLUYE = {
  Esencia: [
    "Grabación en set decorado, 3 cámaras 4K y micrófonos profesionales",
    "Iluminación profesional",
    "Personal de producción en apoyo constante",
    "Video directo + audio",
  ],
  Impacto: ["Edición, color y audio de cada episodio", "Hasta 7 reels por episodio", "Trailer de 30 segundos"],
  Identidad: ["Edición con gráficos personalizados", "4 thumbnails para YouTube", "Títulos con SEO", "Publicación en YouTube y podcast"],
  "Expansión": ["Producción y edición Premium 360°", "Estrategia de distribución y calendario editorial", "Preferencia en agenda"],
};
export function incluyePaquete(paquete) {
  const order = ["Esencia", "Impacto", "Identidad", "Expansión"];
  const idx = order.indexOf(paquete);
  if (idx < 0) return [];
  return order.slice(0, idx + 1).flatMap((p) => INCLUYE[p]);
}
