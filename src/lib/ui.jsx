import React from "react";
import { Mic, AlertCircle, Loader2 } from "lucide-react";

// Misma identidad que App.jsx — no duplicar valores distintos.
export const navy = "#0B1338";
export const card = "#12152B";
export const cardAlt = "#1E2447";
export const blue = "#2F52FF";
export const blueDeep = "#1B2FBD";
export const blueLight = "#9FB0FF";
export const blueSoft = "rgba(47,82,255,0.18)";
export const white = "#FFFFFF";
export const gray = "#8B90B3";
export const red = "#E05D5D";
export const green = "#7ED9A0";
export const greenBg = "rgba(46,160,90,0.18)";
export const amber = "#F5C46A";
export const amberBg = "rgba(245,166,35,0.16)";
export const gradBlue = `linear-gradient(135deg, ${blueDeep}, ${blue})`;
export const FONT = "Poppins";

export const inputStyle = {
  background: navy,
  border: `1px solid ${cardAlt}`,
  color: white,
  fontFamily: FONT,
  fontSize: 14,
};
export const selectStyle = {
  background: card,
  border: `1px solid ${cardAlt}`,
  color: white,
  fontFamily: FONT,
  fontSize: 14,
};
export const labelStyle = {
  fontFamily: FONT,
  fontWeight: 600,
  fontSize: 12,
  color: gray,
  display: "block",
  marginBottom: 6,
};

export function Eyebrow({ children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ width: 6, height: 6, background: blue, borderRadius: 2 }} />
      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: blueLight, letterSpacing: 1.5 }}>{children}</span>
      <span style={{ width: 6, height: 6, background: blue, borderRadius: 2 }} />
    </div>
  );
}

export function PillButton({ children, onClick, disabled, full, type = "button", ghost }) {
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-full px-5 py-2.5 ${full ? "w-full" : ""}`}
      style={{
        background: ghost ? "transparent" : disabled ? "#2A2E4A" : blue,
        border: ghost ? `1px solid ${blue}` : "none",
        color: ghost ? blueLight : white,
        fontFamily: FONT, fontWeight: 600, fontSize: 14, opacity: disabled ? 0.7 : 1,
      }}>
      {children}
    </button>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl px-3 py-2.5 mb-4" style={{ background: "rgba(224,93,93,0.12)", border: `1px solid ${red}55` }}>
      <AlertCircle size={15} color={red} className="mt-0.5 shrink-0" />
      <span style={{ fontFamily: FONT, fontSize: 12.5, color: "#F3A9A9" }}>{message}</span>
    </div>
  );
}

export function OkBanner({ message }) {
  if (!message) return null;
  return (
    <div className="rounded-xl px-3 py-2.5 mb-4" style={{ background: greenBg, border: `1px solid ${green}55` }}>
      <span style={{ fontFamily: FONT, fontSize: 12.5, color: green }}>{message}</span>
    </div>
  );
}

export function Logo({ size = 28 }) {
  return (
    <div className="flex items-center justify-center shrink-0" style={{ width: size, height: size, background: gradBlue, borderRadius: 8 }}>
      <Mic size={size * 0.55} color={white} strokeWidth={2.4} />
    </div>
  );
}

export function Spin({ size = 15 }) {
  return <Loader2 size={size} className="animate-spin" />;
}

// Aviso cuando una tabla aún no existe en Supabase (PGRST205).
export function MissingTablesBanner({ migration = "supabase/migrations/002_finanzas_facturacion.sql", text }) {
  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: amberBg, border: `1px solid ${amber}44` }}>
      <p style={{ fontFamily: FONT, fontSize: 13, color: amber, lineHeight: 1.55 }}>
        {text || "Faltan tablas en Supabase para este módulo. Aplica una vez la migración"}
        <span style={{ fontWeight: 700 }}> {migration} </span>
        en el SQL Editor de Supabase y recarga.
      </p>
    </div>
  );
}

export function Kpi({ label, value, color }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: card, border: `1px solid ${cardAlt}` }}>
      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: gray, letterSpacing: 1 }}>{label}</span>
      <p style={{ fontFamily: FONT, fontWeight: 600, fontSize: 22, color: color || white, marginTop: 6 }}>{value}</p>
    </div>
  );
}

export function SectionTitle({ children }) {
  return <h1 style={{ fontFamily: FONT, fontWeight: 600, fontSize: 26, color: white }}>{children}</h1>;
}

export function EmptyNote({ children }) {
  return <p style={{ fontFamily: FONT, fontSize: 13.5, color: gray, lineHeight: 1.6 }}>{children}</p>;
}
