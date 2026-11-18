# Google Calendar — alta de la integración del portal

**Estado 18 nov 2026: integración completa y en vivo.** Cuenta de servicio
portal-elite-podhouse@elite-podhouse-reservas.iam.gserviceaccount.com,
calendario del estudio compartido con ella, secretos guardados en Supabase
y función desplegada. Lo que sigue es probar una reserva real desde el
portal. Los pasos de abajo quedan como registro de cómo se dio de alta.

El portal ya trae el código para hablar con Google Calendar (la función
`supabase/functions/google-calendar` y los cambios en `src/App.jsx`), pero
para que funcione hay que dar de alta dos cosas que solo se pueden hacer
con las cuentas de Google y de Supabase del estudio. Son 3 pasos.

## Datos del proyecto

- Supabase (proyecto del portal): `https://oyrqkymijfheshefkwpb.supabase.co`
- Función: `https://oyrqkymijfheshefkwpb.supabase.co/functions/v1/google-calendar`
- Calendario del estudio: `elitepodhouse@gmail.com`
- Vercel: no necesita variables nuevas (la URL de la función sale de la
  URL de Supabase que ya está configurada).

## Paso 1 — Cuenta de servicio en Google Cloud

1. Entra a [console.cloud.google.com](https://console.cloud.google.com) con
   `elitepodhouse@gmail.com`.
2. Crea un proyecto (o usa uno existente) y activa la **Google Calendar API**
   (APIs y servicios → Biblioteca → Google Calendar API → Habilitar).
   **Ya existe un proyecto en la cuenta: «Elite Podhouse Reservas»
   (ID `elite-podhouse-reservas`); úsalo, no crees otro.**
3. APIs y servicios → Credenciales → Crear credenciales → **Cuenta de servicio**.
   Nombre sugerido: `portal-elite-podhouse`.
4. Dentro de la cuenta de servicio → Claves → Agregar clave → **Crear clave
   nueva → JSON**. Se descarga un archivo `.json`: guárdalo, es la llave.
   (Ese archivo nunca va al repositorio ni se comparte por chat.)

## Paso 2 — Compartir el calendario del estudio con la cuenta de servicio

1. Entra a [calendar.google.com](https://calendar.google.com) con
   `elitepodhouse@gmail.com`.
2. Configuración → Configuración de mis calendarios → el calendario del
   estudio → Compartir con personas específicas → Agregar persona.
3. Pega el correo de la cuenta de servicio (termina en
   `@...iam.gserviceaccount.com`, viene en el JSON como `client_email`).
4. Permiso: **Realizar cambios en los eventos**. Guardar.

Sin este paso la función no puede leer ni crear eventos (Google responde
404 o 403).

## Paso 3 — Secretos y despliegue en Supabase

1. Entra a [supabase.com/dashboard](https://supabase.com/dashboard) y abre
   el proyecto del portal (`oyrqkymijfheshefkwpb`).
2. Edge Functions → Secrets → Agregar:
   - `GOOGLE_SERVICE_ACCOUNT_JSON`: el contenido completo del archivo `.json`
     del paso 1 (todo el texto, tal cual).
   - `GOOGLE_CALENDAR_ID`: `elitepodhouse@gmail.com`
3. Despliega la función (desde la terminal, con Supabase CLI):
   ```bash
   supabase login
   supabase link --project-ref oyrqkymijfheshefkwpb
   supabase functions deploy google-calendar
   ```
4. Verifica en Edge Functions → Logs que no haya errores al invocarla.

## Cómo comprobar que funciona

1. Abre el portal y agenda una sesión como cliente.
2. El evento debe aparecer en el calendario del estudio
   (`elitepodhouse@gmail.com`) con el título de la sesión y el nombre
   del cliente en la descripción.
3. Si en el calendario del estudio ya hay un evento en un horario, ese
   horario ya no se ofrece en el portal.

## Si algo falla

- La función responde 401: el cliente no tenía sesión iniciada en el portal.
- La función responde 500 con "Falta el secreto": falta
  `GOOGLE_SERVICE_ACCOUNT_JSON` en los secretos.
- La función responde 404 en freeBusy o al crear: el calendario no está
  compartido con la cuenta de servicio (repite el paso 2).
- El portal sigue reservando aunque Google falle: la reserva queda guardada
  en Supabase y el cliente ve un aviso de que no se pudo agregar al
  calendario. La disponibilidad de Supabase sigue funcionando sola.
