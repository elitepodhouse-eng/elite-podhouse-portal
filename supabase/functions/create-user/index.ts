// Supabase Edge Function: crea o migra usuarios con usuario (sin correo).
//
// El portal la llama con supabase.functions.invoke("create-user") desde
// Clientes (solo admins). Supabase exige un correo por dentro, así que cada
// usuario recibe uno interno sintético `usuario@elitepodhouse.local` que
// nadie ve ni usa: la persona entra al portal solo con su usuario y su
// contraseña.
//
// Acciones:
//   { action: "create", nombre?, usuario, password }
//     → crea el usuario en Auth (email confirmado) y devuelve { id }.
//       El trigger on_auth_user_created crea su fila vacía en `clientes`;
//       el portal luego hace upsert con nombre, usuario y paquete.
//   { action: "migrate", usuario, password, userId }
//     → cambia el correo de un usuario existente al interno sintético,
//       le pone la contraseña nueva y guarda el usuario en user_metadata.
//       El portal luego actualiza clientes.usuario de esa fila.
//       Después de migrar, esa persona ya no entra con su correo: entra
//       con su usuario y contraseña.
//
// Solo admins pueden llamarla (elitepodhouse@gmail.com y
// alejandrosevilla.work@gmail.com, la misma lista del portal).
//
// Secretos (Supabase Dashboard → Edge Functions → Secrets):
//   SUPABASE_SERVICE_ROLE_KEY: la llave service_role del proyecto
//     (Settings → API). Sin ella la función no puede crear usuarios.
//     SUPABASE_URL y SUPABASE_ANON_KEY los inyecta Supabase solos.
//
// Despliegue: supabase functions deploy create-user
// (o desde el editor del dashboard: Edge Functions → create-user).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const ADMIN_EMAILS = ["elitepodhouse@gmail.com", "alejandrosevilla.work@gmail.com"];
const USUARIO_DOMINIO = "@elitepodhouse.local";

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

// Usuario válido: minúsculas, al menos 3 caracteres, solo letras, números,
// punto, guion y guion bajo.
function validarUsuario(raw: unknown): string | null {
  const texto = String(raw || "").trim().toLowerCase();
  return /^[a-z0-9._-]{3,}$/.test(texto) ? texto : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey) return json({ error: "Falta la configuración de Supabase en la función." }, 500);
    if (!serviceKey) return json({ error: "Falta el secreto SUPABASE_SERVICE_ROLE_KEY en la función." }, 500);

    // Solo admins del portal.
    const supabase = createClient(supabaseUrl, anonKey);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "No autorizado" }, 401);
    if (!ADMIN_EMAILS.includes(String(user.email || "").toLowerCase())) {
      return json({ error: "Solo Tania o Alejandro pueden crear usuarios." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const usuario = validarUsuario(body.usuario);
    if (!usuario) {
      return json({ error: "El usuario debe tener al menos 3 caracteres: solo letras, números, punto, guion y guion bajo." }, 400);
    }
    const password = String(body.password || "");
    if (password.length < 6) {
      return json({ error: "La contraseña debe tener al menos 6 caracteres." }, 400);
    }
    const email = `${usuario}${USUARIO_DOMINIO}`;

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // El usuario no debe existir ya en otro cliente (el índice único de
    // clientes.usuario es el respaldo; esto da el error claro antes).
    const { data: existente } = await admin.from("clientes").select("id").eq("usuario", usuario).maybeSingle();
    if (existente && (action !== "migrate" || existente.id !== body.userId)) {
      return json({ error: `El usuario ${usuario} ya existe. Elige otro.` }, 400);
    }

    if (action === "create") {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nombre: String(body.nombre || ""), usuario },
      });
      if (error) return json({ error: error.message }, 400);
      return json({ id: data.user.id, usuario });
    }

    if (action === "migrate") {
      const userId = String(body.userId || "");
      if (!userId) return json({ error: "Falta el id del cliente a migrar." }, 400);
      const { error } = await admin.auth.admin.updateUserById(userId, {
        email,
        password,
        email_confirm: true,
        user_metadata: { usuario },
      });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true, usuario });
    }

    return json({ error: "Acción no válida (usa create o migrate)" }, 400);
  } catch (err) {
    console.error(err);
    return json({ error: err instanceof Error ? err.message : "Error interno" }, 500);
  }
});
