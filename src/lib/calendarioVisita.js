// Enlace de Google Calendar para una visita al estudio, igual que el
// artifact de Claude (Élite OS): plantilla con la visita ya llenada, en
// hora local de Hermosillo (ctz=America/Hermosillo, sin sufijo Z), y el
// mensaje de WhatsApp que lo incluye con "Agrégala a tu calendario:".
import { fechaLarga, rangoHora } from "./citaImagen";

const ADDRESS_CAL = "Monteverde 186, col. Balderrama, Hermosillo, Sonora";

// "2026-11-27" + "16:00" -> "20261127T160000"
function compact(fechaISO, horaStr) {
  const [h, m] = horaStr.split(":").map(Number);
  return `${fechaISO.replace(/-/g, "")}T${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
}

// Hora de fin como "HH:MM", y si cruza medianoche la fecha del día siguiente.
function finVisita(visita) {
  const [h0, m0] = (visita.hora || "00:00").split(":").map(Number);
  const total = h0 * 60 + m0 + (visita.duracion || 30);
  const finHora = `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  let fechaFin = visita.fecha;
  if (total >= 24 * 60) {
    const [y, mo, d] = visita.fecha.split("-").map(Number);
    const dt = new Date(Date.UTC(y, mo - 1, d + 1));
    fechaFin = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
  }
  return { fechaFin, finHora };
}

export function enlaceGoogleCalendar(visita) {
  const { fechaFin, finHora } = finVisita(visita);
  const detalles = `Visita para conocer el estudio y ver los sets.${visita.telefono ? `\nTeléfono: ${visita.telefono}` : ""}${visita.notas ? `\n${visita.notas}` : ""}`;
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: `Visita al estudio – ${visita.nombre}`,
    dates: `${compact(visita.fecha, visita.hora)}/${compact(fechaFin, finHora)}`,
    details: detalles,
    location: ADDRESS_CAL,
    ctz: "America/Hermosillo",
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

// Mensaje de confirmación por WhatsApp, mismo formato del artifact de
// Claude: fecha, hora, dirección y el enlace de Google Calendar.
export function mensajeWhatsAppVisita(visita) {
  const first = String(visita.nombre || "").split(/\s+/)[0];
  return [
    `Hola ${first}, tu visita a Élite Podhouse quedó programada.`,
    "",
    `📅 ${fechaLarga(visita.fecha)}`,
    `🕐 ${rangoHora(visita.hora, visita.duracion)}`,
    "📍 Monteverde 186, Col. Balderrama, Hermosillo (local en el segundo piso)",
    "",
    "Vas a conocer el estudio y ver los sets.",
    "Agrégala a tu calendario:",
    enlaceGoogleCalendar(visita),
    "",
    "Si necesitas reprogramar, avísanos con tiempo.",
    "",
    "Te esperamos. @elitepodhouse",
  ].join("\n");
}
