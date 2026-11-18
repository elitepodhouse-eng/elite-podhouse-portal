// Supabase Edge Function: conecta el portal de Élite Podhouse con Google Calendar.
//
// Acciones (el portal las llama con supabase.functions.invoke("google-calendar")):
//   { action: "busy", from: "YYYY-MM-DD", to: "YYYY-MM-DD" }
//     → { busy: { "YYYY-MM-DD": ["09:00", ...] } } con los horarios ocupados
//       por eventos del calendario del estudio.
//   { action: "create", fecha, hora, titulo, cliente_nombre?, cliente_correo? }
//     → crea el evento de 1 hora en el calendario del estudio.
// Solo responde a clientes con sesión del portal (verifica el token).
//
// Secretos (Supabase Dashboard → Edge Functions → Secrets):
//   GOOGLE_SERVICE_ACCOUNT_JSON: el JSON completo de la llave de la cuenta de
//     servicio de Google (con client_email y private_key).
//   GOOGLE_CALENDAR_ID: el calendario del estudio (por defecto elitepodhouse@gmail.com).
//
// Despliegue: supabase functions deploy google-calendar
// Alta paso a paso: GOOGLE_CALENDAR_SETUP.md

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const TZ = "America/Hermosillo"; // Hermosillo no cambia de horario (UTC-7 todo el año)
const CALENDAR_ID = Deno.env.get("GOOGLE_CALENDAR_ID") || "elitepodhouse@gmail.com";
const SCOPES = "https://www.googleapis.com/auth/calendar";
const SLOTS = ["09:00", "10:30", "12:00", "16:00", "17:30"];
const SLOTS_SABADO = ["10:30", "12:00", "16:00"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function b64url(input: string | Uint8Array): string {
  const bin = typeof input === "string" ? input : String.fromCharCode(...input);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

// Token de acceso con la cuenta de servicio (JWT RS256 firmado con su llave).
async function getAccessToken(): Promise<string> {
  const raw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("Falta el secreto GOOGLE_SERVICE_ACCOUNT_JSON en la función.");
  const sa = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT", kid: sa.private_key_id };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    scope: SCOPES,
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const pem = String(sa.private_key)
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const keyData = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = `${unsigned}.${b64url(new Uint8Array(sig))}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google token: ${data.error_description || data.error || res.status}`);
  return data.access_token as string;
}

async function googleFetch(token: string, url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Google Calendar: ${data?.error?.message || res.status}`);
  return data;
}

// Horarios ocupados por eventos del calendario, por fecha. Toda la matemática
// es en UTC con el desfase fijo de Hermosillo, para no depender de la zona
// horaria del servidor.
function busySlots(
  from: string,
  to: string,
  busy: Array<{ start: string; end: string }>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const fromMs = Date.parse(`${from}T00:00:00-07:00`);
  const toMs = Date.parse(`${to}T00:00:00-07:00`);
  const busyMs = busy.map((b) => ({ s: Date.parse(b.start), e: Date.parse(b.end) }));
  for (let dayMs = fromMs; dayMs <= toMs; dayMs += 86400000) {
    const d = new Date(dayMs);
    const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    const wd = d.getUTCDay();
    const slots = wd === 0 ? [] : wd === 6 ? SLOTS_SABADO : SLOTS;
    const taken = slots.filter((s) => {
      const [h, m] = s.split(":").map(Number);
      const sStart = dayMs + (h * 60 + m) * 60000;
      const sEnd = sStart + 3600000;
      return busyMs.some((b) => b.s < sEnd && b.e > sStart);
    });
    if (taken.length) out[iso] = taken;
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    // Solo clientes con sesión del portal.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "No autorizado" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    const accessToken = await getAccessToken();

    if (action === "busy") {
      const from = String(body.from || "");
      const to = String(body.to || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return json({ error: "from y to deben ser fechas YYYY-MM-DD" }, 400);
      }
      const data = await googleFetch(accessToken, "https://www.googleapis.com/calendar/v3/freeBusy", {
        method: "POST",
        body: JSON.stringify({
          timeMin: `${from}T00:00:00-07:00`,
          timeMax: `${to}T23:59:59-07:00`,
          timeZone: TZ,
          items: [{ id: CALENDAR_ID }],
        }),
      });
      const busy = (data.calendars?.[CALENDAR_ID]?.busy || []) as Array<{ start: string; end: string }>;
      return json({ busy: busySlots(from, to, busy) });
    }

    if (action === "create") {
      const fecha = String(body.fecha || "");
      const hora = String(body.hora || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}$/.test(hora)) {
        return json({ error: "fecha y hora no válidas" }, 400);
      }
      const [h, m] = hora.split(":").map(Number);
      const startMs = Date.parse(`${fecha}T00:00:00-07:00`) + (h * 60 + m) * 60000;
      const endMs = startMs + 3600000;
      const event = await googleFetch(
        accessToken,
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events`,
        {
          method: "POST",
          body: JSON.stringify({
            summary: String(body.titulo || "Sesión Élite Podhouse"),
            description: `Reserva desde el portal de clientes Élite Podhouse.${body.cliente_nombre ? `\nCliente: ${body.cliente_nombre}` : ""}${body.cliente_correo ? `\nCorreo: ${body.cliente_correo}` : ""}`,
            start: { dateTime: new Date(startMs).toISOString(), timeZone: TZ },
            end: { dateTime: new Date(endMs).toISOString(), timeZone: TZ },
          }),
        },
      );
      return json({ eventId: event.id, htmlLink: event.htmlLink });
    }

    return json({ error: "Acción no válida (usa busy o create)" }, 400);
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Error interno" }, 500);
  }
});
