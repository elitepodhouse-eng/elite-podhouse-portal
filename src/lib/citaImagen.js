// Imagen de cita para visitas al estudio (canvas 1080×1350), réplica del
// diseño de drawConfirmation del artifact de Claude (Élite OS).
// El logo es el oficial de Élite Podhouse. El JPG oficial tiene fondo
// blanco y la imagen va sobre azul profundo (#0B1338), así que aquí se usa
// la variante oficial transparente (mismo logo, sin el blanco del borde),
// hecha para fondos oscuros. El JPG oficial queda en
// src/assets/logo-elite-podhouse-oficial.jpg como archivo canónico.
import logoTransparente from "../assets/logo-elite-podhouse-oficial-transparente.png";

const HUESO = "#EDEFF7";
const GRIS = "#8B90B3";
const AZUL = "#1B2FBD";
const BRILLANTE = "#2F52FF";
const DEEP = "#0B1338";
const P = "'Poppins', system-ui, sans-serif";
const M = "'IBM Plex Mono', ui-monospace, monospace";
const ADDRESS = "Monteverde 186, col. Balderrama, Hermosillo";

const loadImg = (src) => new Promise((res) => {
  const i = new Image();
  i.onload = () => res(i);
  i.onerror = () => res(null);
  i.src = src;
});

function rrect(x, px, py, w, h, r) {
  x.beginPath();
  if (x.roundRect) x.roundRect(px, py, w, h, r);
  else {
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  }
}

function fitFont(x, text, maxW, size, weight, family, min = 22) {
  let s = size;
  for (;;) {
    x.font = `${weight} ${s}px ${family}`;
    if (x.measureText(text).width <= maxW || s <= min) break;
    s -= 2;
  }
  return s;
}

// "2026-11-27" -> "viernes 27 de noviembre de 2026"
export function fechaLarga(fechaISO) {
  if (!fechaISO) return "";
  const [y, m, d] = fechaISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const s = new Intl.DateTimeFormat("es-MX", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(dt);
  return s.replace(",", "");
}

// "16:00" -> "4:00 p. m."
export function horaCorta(hora) {
  if (!hora) return "";
  const [h0, m0] = hora.split(":").map(Number);
  const h = h0 % 12 || 12;
  const ap = h0 >= 12 ? "p. m." : "a. m.";
  return `${h}:${String(m0).padStart(2, "0")} ${ap}`;
}

// "16:00" + 30 min -> "4:00 p. m. – 4:30 p. m."
export function rangoHora(hora, duracion) {
  if (!hora) return "";
  const [h0, m0] = hora.split(":").map(Number);
  const fin = new Date(2000, 0, 1, h0, m0 + (duracion || 30));
  const finStr = `${String(fin.getHours()).padStart(2, "0")}:${String(fin.getMinutes()).padStart(2, "0")}`;
  return `${horaCorta(hora)} – ${horaCorta(finStr)}`;
}

export function nombreArchivoCita(visita) {
  return `visita-elite-podhouse-${visita.fecha}.png`;
}

// Genera el canvas de la imagen de cita para una visita
// ({ nombre, fecha, hora, duracion }).
export async function generarImagenCita(visita) {
  try {
    await Promise.all([
      document.fonts.load("800 100px Poppins"),
      document.fonts.load("700 80px Poppins"),
      document.fonts.load("600 40px Poppins"),
      document.fonts.load("500 40px Poppins"),
      document.fonts.load('500 30px "IBM Plex Mono"'),
    ]);
  } catch { /* las fuentes del sistema cubren el dibujo si la carga falla */ }
  const logo = await loadImg(logoTransparente);
  const W = 1080, H = 1350, c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = DEEP;
  x.fillRect(0, 0, W, H);
  x.textBaseline = "alphabetic";
  x.textAlign = "left";
  if (logo) {
    const h = 64, w = Math.min(360, logo.width * (h / logo.height));
    x.drawImage(logo, 80, 64, w, w * (logo.height / logo.width));
  } else {
    x.fillStyle = HUESO;
    x.font = `600 42px ${P}`;
    x.fillText("Élite Podhouse", 80, 118);
  }
  x.fillStyle = GRIS;
  x.font = `500 30px ${M}`;
  x.textAlign = "right";
  x.fillText("@elitepodhouse", W - 80, 116);
  x.textAlign = "left";
  x.fillStyle = HUESO;
  const hs = fitFont(x, "programada.", 920, 150, 800, P);
  x.font = `800 ${hs}px ${P}`;
  x.fillText("Visita", 80, 330);
  x.fillText("programada.", 80, 330 + Math.round(hs * 0.98));
  const first = String(visita.nombre || "").split(/\s+/)[0];
  fitFont(x, `Te esperamos, ${first}.`, 920, 56, 500, P);
  x.fillText(`Te esperamos, ${first}.`, 80, 586);
  x.fillStyle = AZUL;
  rrect(x, 80, 650, 920, 360, 36);
  x.fill();
  x.fillStyle = HUESO;
  fitFont(x, fechaLarga(visita.fecha), 824, 38, 500, M);
  x.fillText(fechaLarga(visita.fecha), 128, 716);
  fitFont(x, rangoHora(visita.hora, visita.duracion), 824, 92, 700, P);
  x.fillText(rangoHora(visita.hora, visita.duracion), 128, 832);
  x.fillStyle = "rgba(237,239,247,.28)";
  x.fillRect(128, 872, 824, 2);
  x.fillStyle = HUESO;
  fitFont(x, "Visita al estudio", 824, 40, 600, P, 26);
  x.fillText("Visita al estudio", 128, 930);
  x.fillStyle = "#C7CEFF";
  fitFont(x, ADDRESS, 824, 28, 500, M, 18);
  x.fillText(ADDRESS, 128, 978);
  const n = 40, bw = 14, step = 23, x0 = 80, cy = 1140;
  for (let i = 0; i < n; i++) {
    const h = 36 + Math.abs(Math.sin(i * 0.55 + 1) * Math.cos(i * 0.21)) * 110 + (i % 7 === 0 ? 24 : 0);
    x.fillStyle = i % 9 === 4 ? "#8EA2FF" : BRILLANTE;
    rrect(x, x0 + i * step, cy - h / 2, bw, h, 7);
    x.fill();
  }
  x.fillStyle = GRIS;
  fitFont(x, "Vas a conocer el estudio y ver los sets", 920, 28, 500, M, 18);
  x.fillText("Vas a conocer el estudio y ver los sets", 80, 1272);
  fitFont(x, "Si necesitas reprogramar, avísanos con tiempo", 920, 28, 500, M, 18);
  x.fillText("Si necesitas reprogramar, avísanos con tiempo", 80, 1314);
  return c;
}

export async function imagenCitaDataURL(visita) {
  const c = await generarImagenCita(visita);
  return c.toDataURL("image/png");
}

export async function descargarImagenCita(visita) {
  const c = await generarImagenCita(visita);
  const blob = await new Promise((res) => c.toBlob(res, "image/png"));
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivoCita(visita);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

// ---------- Imagen de cita para sesiones ----------
// Misma plantilla 1080×1350 que las visitas, pero para una sesión de
// grabación: "Sesión programada.", fecha y hora (60 min), set/paquete
// y "Llega 10 minutos antes." La sesión llega como fila de `sesiones`
// con clientes.nombre en sesion.clientes?.nombre.
export function nombreArchivoSesion(sesion) {
  return `sesion-elite-podhouse-${sesion.fecha}.png`;
}

export async function generarImagenSesion(sesion) {
  const nombre = sesion.clientes?.nombre || sesion.nombre || "";
  const first = String(nombre).split(/\s+/)[0];
  try {
    await Promise.all([
      document.fonts.load("800 100px Poppins"),
      document.fonts.load("700 80px Poppins"),
      document.fonts.load("600 40px Poppins"),
      document.fonts.load("500 40px Poppins"),
      document.fonts.load('500 30px "IBM Plex Mono"'),
    ]);
  } catch { /* las fuentes del sistema cubren el dibujo si la carga falla */ }
  const logo = await loadImg(logoTransparente);
  const W = 1080, H = 1350, c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = DEEP;
  x.fillRect(0, 0, W, H);
  x.textBaseline = "alphabetic";
  x.textAlign = "left";
  if (logo) {
    const h = 64, w = Math.min(360, logo.width * (h / logo.height));
    x.drawImage(logo, 80, 64, w, w * (logo.height / logo.width));
  } else {
    x.fillStyle = HUESO;
    x.font = `600 42px ${P}`;
    x.fillText("Élite Podhouse", 80, 118);
  }
  x.fillStyle = GRIS;
  x.font = `500 30px ${M}`;
  x.textAlign = "right";
  x.fillText("@elitepodhouse", W - 80, 116);
  x.textAlign = "left";
  x.fillStyle = HUESO;
  const hs = fitFont(x, "programada.", 920, 150, 800, P);
  x.font = `800 ${hs}px ${P}`;
  x.fillText("Sesión", 80, 330);
  x.fillText("programada.", 80, 330 + Math.round(hs * 0.98));
  fitFont(x, `Te esperamos, ${first}.`, 920, 56, 500, P);
  x.fillText(`Te esperamos, ${first}.`, 80, 586);
  x.fillStyle = AZUL;
  rrect(x, 80, 650, 920, 360, 36);
  x.fill();
  x.fillStyle = HUESO;
  fitFont(x, fechaLarga(sesion.fecha), 824, 38, 500, M);
  x.fillText(fechaLarga(sesion.fecha), 128, 716);
  fitFont(x, rangoHora(sesion.hora, 60), 824, 92, 700, P);
  x.fillText(rangoHora(sesion.hora, 60), 128, 832);
  x.fillStyle = "rgba(237,239,247,.28)";
  x.fillRect(128, 872, 824, 2);
  x.fillStyle = HUESO;
  const detalle = [sesion.set ? `Set ${sesion.set}` : "", sesion.paquete ? `Paquete ${sesion.paquete}` : ""].filter(Boolean).join(" · ") || (sesion.titulo || "Sesión en el estudio");
  fitFont(x, detalle, 824, 40, 600, P, 26);
  x.fillText(detalle, 128, 930);
  x.fillStyle = "#C7CEFF";
  fitFont(x, ADDRESS, 824, 28, 500, M, 18);
  x.fillText(ADDRESS, 128, 978);
  const n = 40, bw = 14, step = 23, x0 = 80, cy = 1140;
  for (let i = 0; i < n; i++) {
    const h = 36 + Math.abs(Math.sin(i * 0.55 + 1) * Math.cos(i * 0.21)) * 110 + (i % 7 === 0 ? 24 : 0);
    x.fillStyle = i % 9 === 4 ? "#8EA2FF" : BRILLANTE;
    rrect(x, x0 + i * step, cy - h / 2, bw, h, 7);
    x.fill();
  }
  x.fillStyle = GRIS;
  fitFont(x, "Llega 10 minutos antes.", 920, 28, 500, M, 18);
  x.fillText("Llega 10 minutos antes.", 80, 1272);
  fitFont(x, "Si necesitas reprogramar, avísanos con tiempo", 920, 28, 500, M, 18);
  x.fillText("Si necesitas reprogramar, avísanos con tiempo", 80, 1314);
  return c;
}

export async function imagenSesionDataURL(sesion) {
  const c = await generarImagenSesion(sesion);
  return c.toDataURL("image/png");
}

export async function descargarImagenSesion(sesion) {
  const c = await generarImagenSesion(sesion);
  const blob = await new Promise((res) => c.toBlob(res, "image/png"));
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivoSesion(sesion);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
