import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------- Administradores del portal ----------
// Tania y Alejandro ven TODO igual: clientes, sesiones, entregas, pagos,
// Propuestas, Cotizador, Contratos, Cobranza, Finanzas, Facturación y Ajustes.
// La lista se configura con VITE_ADMIN_EMAILS (correos separados por comas)
// en Vercel o en .env. Si no está definida, se usa la lista de abajo.
// Tania confirmó el 19 nov 2026: Alejandro Sevilla entra como admin con los
// mismos permisos que ella, incluidas Finanzas, Facturación, Cobranza y Ajustes.
const ADMIN_FALLBACK = ["elitepodhouse@gmail.com", "alejandrosevilla.work@gmail.com"];

function parseEmails(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

const fromEnv = [
  ...parseEmails(import.meta.env.VITE_ADMIN_EMAILS),
  ...parseEmails(import.meta.env.VITE_ADMIN_EMAIL),
];
export const ADMIN_EMAILS = fromEnv.length > 0
  ? [...new Set(fromEnv)]
  : ADMIN_FALLBACK;

// Compatibilidad: el primer admin (Tania).
export const ADMIN_EMAIL = ADMIN_EMAILS[0];

export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(String(email).toLowerCase());
}
