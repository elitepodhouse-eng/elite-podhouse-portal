// PDFs generados en el navegador con jsPDF.
//
// IDENTIDAD: reproduce la de Élite OS (el artifact de Claude de Tania).
// - Logo: el lockup horizontal oficial, importado tal cual de ./logo.js
//   (base64 exacto del archivo de Claude, PNG 560x292 con transparencia).
// - Colores: Azul Élite (27,47,189), Azul brillante (47,82,255), Tinta
//   (10,12,22) y grises de Claude. Tipografía: helvetica (la que usa
//   jsPDF en Élite OS; Poppins/IBM Plex Mono son de la web, no del PDF).
// - Encabezados con logo a la izquierda y título/folio a la derecha,
//   regla azul, pies con la dirección y folios COT- / CT- / EP- / PC-.
// - La propuesta incluye la tabla de reels (Esencial/Pro/Full Brand) y la
//   tabla de renta por horas, como en Claude. El contrato usa las
//   cláusulas por tipo de servicio (plantillas DEF de Claude).
// Los datos (precios, saldos, folios) siguen viniendo del portal; aquí
// solo cambia la presentación.
import { jsPDF } from "jspdf";
import { LOGO } from "./logo";

// ---------- Colores y constantes de Élite OS ----------
const AZUL = [27, 47, 189];
const AZUL_BRILLANTE = [47, 82, 255];
const GRIS = [120, 124, 150];
const GRIS_MEDIO = [90, 94, 120];
const GRIS_OSCURO = [60, 64, 90];
const GRIS_TEXTO = [110, 114, 140];
const NEGRO = [10, 12, 22];
const LINEA = [220, 222, 235];
const FONDO_CLARO = [244, 245, 250];
const FONDO_NOTAS = [238, 240, 250];
const IVA = 0.16;
const IG = "@elitepodhouse";
const WEB = "elitepodhouse.mx";
const BOOKING_URL = "https://calendar.app.google/8TBVcD9NNxSpdenh7";

const money = (n) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(n || 0));
const r2 = (n) => Math.round(Number(n || 0) * 100) / 100;
const safeName = (t) => String(t || "").replace(/[^\w\sáéíóúñÁÉÍÓÚÑ.-]/g, "").trim().slice(0, 80);
const fechaLarga = (iso) => {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
};
const fechaCorta = (iso) => (iso ? fechaLarga(iso) : "");

// ---------- Catálogo (textos de Élite OS; precios desde configuracion) ----------
const PKGS_TXT = {
  Esencia: { d: "Todo lo que necesitas para grabar un podcast profesional, sin preocuparte por la parte técnica.", f: ["3 cámaras y micrófonos profesionales", "Set decorado e iluminación profesional", "Personal de producción en apoyo constante", "Acompañamiento y guía básica antes de grabar", "Entrega de video directo de Switcher + audio multicontrol", "Respaldo de material: 15 días"] },
  Impacto: { d: "Grabación + edición: Esencia, más edición pensada para publicar en redes.", f: ["Edición de video estándar (cortes dinámicos + ritmo)", "Corrección de color y limpieza de audio", "Hasta 7 shorts / reels verticales por episodio, con subtítulos dinámicos", "1 tráiler / teaser de 30 seg por episodio", "Respaldo de material: 30 días"] },
  Identidad: { d: "Producción + diseño + gestión: Impacto, más presencia y publicación gestionada en plataformas.", f: ["Edición de video con gráficos personalizados", "Diseño de 4 thumbnails / miniaturas para YouTube", "Resumen, títulos con SEO y copys para redes por episodio", "Publicación y gestión en YouTube, Spotify y Apple Podcasts", "Asesoría creativa de contenido"] },
  "Expansión": { d: "Producción 360 + estrategia y promoción: Identidad, más acompañamiento estratégico continuo para crecer el canal.", f: ["Producción y edición premium 360", "Estrategia de distribución en redes y calendario editorial", "Promoción estratégica para crecimiento de audiencia", "Acompañamiento creativo continuo (ideas, temas, crecimiento)", "Preferencia en agenda de grabación"] },
};
const TAM = [{ n: 4, ses: "1 sesión de 1 hora" }, { n: 8, ses: "1 sesión de 2 horas" }, { n: 12, ses: "2 sesiones de 90 minutos" }, { n: 16, ses: "2 sesiones de 2 horas" }];
const TIERS = [
  { n: "Esencial", sub: "edición básica", d: "Grabación en estudio con operador técnico. Edición básica: cortes de ritmo limpios, subtítulos estándar y música de fondo, lista para publicar.", l: ["Uso de sets disponibles y cambios de vestuario para dinamismo visual.", "Edición básica: cortes de ritmo limpios, subtítulos estándar y música de fondo lista para publicar."] },
  { n: "Pro", sub: "edición avanzada", d: "Todo lo de Esencial, con dirección creativa en set y edición avanzada: subtítulos animados, motion graphics, B-roll, sound design y efectos de sonido.", l: ["Dirección creativa en set.", "Acceso a diferentes sets personalizables y cambios de vestuario.", "Edición dinámica avanzada: subtítulos animados, motion graphics, recursos visuales (B-roll), sound design y efectos de sonido."] },
  { n: "Full Brand", sub: "estrategia y guiones", d: "Todo lo de Pro, más estrategia y guiones: guiones estratégicos con ganchos de alta retención y llamados a la acción, con estructura narrativa llave en mano para tu marca (teleprompter incluido).", l: ["Todo lo de Pro (grabación con dirección en set y edición avanzada).", "Estrategia y guiones: guiones estratégicos con ganchos de alta retención (hooks) y llamados a la acción (CTA).", "Estructura narrativa llave en mano alineada a tu negocio o marca personal (teleprompter incluido)."] },
];
const PREC_REELS_DEF = { Esencial: [1950, 3650, 5250, 6650], Pro: [2350, 4350, 6250, 7950], "Full Brand": [2950, 5500, 8000, 10400] };
const HORAS_DEF = [600, 1099, 1599, 1999];
const HDESC = "El estudio con el set que elijas, equipado con iluminación, cámaras 4K, micrófonos de calidad y el mobiliario que solicites. Sin asistencia ni operador técnico.";
const INCLUYE_HORAS = ["Set elegido, equipado y listo para grabar", "Iluminación y cámaras 4K", "Micrófonos de calidad", "Mobiliario que solicites", "Horas utilizables durante el mes o en dos meses, según agenda"];
const INCLUYE_EXT = ["Montaje 20 minutos antes de la grabación", "1 hora de grabación", "Audio con hasta 4 micrófonos profesionales", "Iluminación profesional", "3 cámaras 4K", "Entrega del material el mismo día"];
const INCLUYE_REELS = ["Grabación en estudio con operador técnico", "4 sets personalizables y cambios de vestuario", "Equipamiento profesional: cámaras, micrófonos e iluminación", "Estación de café con snacks y bebidas"];
const INCLUYE = ["Sesión de 1 hora, con opción de más tiempo", "4 sets variables y set de pantalla verde", "Hasta 4 personas al micrófono", "Maquillaje para eliminar brillo", "Agua, café y snacks", "Entrega editada en 3 a 7 días hábiles (paquetes con edición)"];
const INFO_PKG = { Esencia: "Solo grabación.", Impacto: "Grabación + edición.", Identidad: "Producción + diseño + gestión.", "Expansión": "Producción 360° + estrategia y promoción." };
const EDITADOS = ["Impacto", "Identidad", "Expansión"];

// Precios desde configuracion (mapa clave -> valor) con los valores de
// Élite OS como respaldo cuando una clave falta.
function precioDe(config, clave, respaldo) {
  const v = config?.[clave];
  if (v !== undefined && v !== null && v !== "") return Number(v);
  return respaldo;
}
function preciosReels(config) {
  const out = {};
  TIERS.forEach((t) => {
    out[t.n] = TAM.map((s, i) => precioDe(config, `reels.${t.n}.${s.n}`, PREC_REELS_DEF[t.n][i]));
  });
  return out;
}
function preciosHoras(config) {
  return [1, 2, 3, 4].map((h) => precioDe(config, `horas.${h}.solo`, HORAS_DEF[h - 1]));
}
function preciosExterior(config) {
  return { sesion: precioDe(config, "exterior.sesion", 1599), mensual: precioDe(config, "exterior.mensual", 5399) };
}

// ---------- Propuesta ----------
function reelsBlock(doc, q, y, L, R, precReels) {
  const x0 = L + 62, cw = 39;
  y += 4;
  TIERS.forEach((t, i) => {
    const rec = q.recomendado === t.n;
    doc.setFillColor(rec ? 47 : 27, rec ? 82 : 47, rec ? 255 : 189);
    doc.rect(x0 + i * cw, y, cw, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(t.n, x0 + i * cw + cw / 2, y + 6.5, { align: "center" });
    if (rec) {
      doc.setFontSize(6);
      doc.setTextColor(...AZUL_BRILLANTE);
      doc.text("RECOMENDADO", x0 + i * cw + cw / 2, y - 1.2, { align: "center" });
    }
  });
  let yy = y + 10;
  TAM.forEach((s, r) => {
    if (r % 2 === 0) {
      doc.setFillColor(...FONDO_CLARO);
      doc.rect(L, yy, R - L, 14, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NEGRO);
    doc.text(`${s.n} reels`, L + 3, yy + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRIS_TEXTO);
    doc.text(s.ses, L + 3, yy + 11);
    TIERS.forEach((t, i) => { doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...AZUL); doc.text(money(precReels[t.n][r]), x0 + i * cw + cw / 2, yy + 8.5, { align: "center" }); });
    yy += 14;
  });
  doc.setDrawColor(...LINEA);
  doc.line(L, yy, R, yy);
  y = yy + 7;
  TIERS.forEach((t) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...AZUL);
    doc.text(`${t.n} (${t.sub})`, L, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRIS_OSCURO);
    const ls = doc.splitTextToSize(t.d, R - L);
    doc.text(ls, L, y + 4.5);
    y += 4.5 + ls.length * 3.8 + 3;
  });
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRIS_OSCURO);
  const nl = doc.splitTextToSize("Todas las opciones se graban en estudio; si necesitas grabar en otro lugar, el precio se ajusta. Si necesitas más reels, dinos y armamos una propuesta personalizada que se adapte a lo que necesitas.", R - L);
  doc.text(nl, L, y + 1);
  y += nl.length * 3.8 + 5;
  return y;
}

function horasBlock(doc, q, y, L, R, precHoras, precioEsenciaSesion) {
  const x0 = L + 90, cw = 90;
  y += 4;
  doc.setFillColor(...AZUL);
  doc.rect(x0, y, cw, 10, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text("Renta sin asistencia", x0 + cw / 2, y + 6.5, { align: "center" });
  let yy = y + 10;
  precHoras.forEach((precio, idx) => {
    const h = idx + 1;
    if (idx % 2 === 0) {
      doc.setFillColor(...FONDO_CLARO);
      doc.rect(L, yy, R - L, 12, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...NEGRO);
    doc.text(`${h} ${h === 1 ? "hora" : "horas"}`, L + 3, yy + 7.5);
    doc.setTextColor(...AZUL);
    doc.text(money(precio), x0 + cw / 2, yy + 7.5, { align: "center" });
    yy += 12;
  });
  doc.setDrawColor(...LINEA);
  doc.line(L, yy, R, yy);
  y = yy + 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRIS_OSCURO);
  const ls = doc.splitTextToSize(HDESC, R - L);
  doc.text(ls, L, y);
  y += ls.length * 3.8 + 3;
  doc.setFont("helvetica", "italic");
  const nl = doc.splitTextToSize("Las horas se pueden usar durante el mes o en un periodo de dos meses, con previa disponibilidad de agenda.", R - L);
  doc.text(nl, L, y + 1);
  y += nl.length * 4 + 6;
  doc.setDrawColor(...AZUL);
  doc.setLineWidth(0.6);
  doc.roundedRect(L, y, R - L, 24, 2.5, 2.5, "S");
  doc.setLineWidth(0.2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...AZUL);
  doc.text("¿Prefieres operador técnico?", L + 5, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRIS_OSCURO);
  const el = doc.splitTextToSize(`Es el paquete Esencia: solo grabación con operador técnico, ${money(precioEsenciaSesion)} por sesión de hasta 1 hora.`, R - L - 10);
  doc.text(el, L + 5, y + 14);
  y += 24 + 6;
  return y;
}

// Tarjetas de paquetes según el interés (como en Élite OS). Los precios
// de paquetes vienen de preciosPaquetes ([nombre, sesion, mensual,
// recomendado]); reels y horas usan sus propios bloques.
function tarjetasPropuesta(q, preciosPaquetes, ext) {
  const porNombre = {};
  (preciosPaquetes || []).forEach(([nombre, sesion, mensual, rec]) => { porNombre[nombre] = { a: sesion, b: mensual, rec: !!rec }; });
  const paquetesDe = (i) => (i === "reels" || i === "exterior" || i === "horas" ? [] : i === "grabacion" ? ["Esencia"] : i === "edicion" ? [] : i === "ambos" ? ["Impacto", "Identidad", "Expansión"] : ["Esencia", "Impacto", "Identidad", "Expansión"]);
  if (q.interes === "reels") return [];
  if (q.interes === "exterior") {
    return [{ t: "Grabación en exterior", d: "Vamos a donde grabas: montaje 20 minutos antes, 1 hora de grabación y entrega del material el mismo día.", a: ext.sesion, b: ext.mensual, u: `por grabación · o ${money(ext.mensual)} al mes (4 grabaciones)`, rec: false }];
  }
  const t = paquetesDe(q.interes).map((n) => ({ t: n, d: PKGS_TXT[n].d, f: PKGS_TXT[n].f, a: porNombre[n]?.a ?? null, b: porNombre[n]?.b ?? null, rec: q.recomendado === n || porNombre[n]?.rec || false }));
  if (q.interes === "edicion" || q.interes === "todos") {
    const pr = Number(q.precio_edicion) || 0;
    if (pr > 0 || q.interes === "edicion") {
      t.push({ t: "Edición profesional", d: "Editamos tu material grabado: cortes limpios, audio y entrega lista para publicar.", a: pr > 0 ? pr : null, b: null, desde: true, rec: q.recomendado === "Edición profesional" });
    }
  }
  return t;
}

export function pdfPropuesta(p, config, preciosPaquetes) {
  const q = { ...p, precioEdicion: p.precio_edicion };
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const L = 15, R = 195;
  const precReels = preciosReels(config);
  const precHoras = preciosHoras(config);
  const ext = preciosExterior(config);
  const precioEsencia = (preciosPaquetes || []).find(([n]) => n === "Esencia");
  const precioEsenciaSesion = precioEsencia ? precioEsencia[1] : precioDe(config, "pkg.Esencia.sesion", 1499);

  doc.addImage(LOGO, "PNG", L, 10, 46, 23.6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...AZUL);
  doc.text("PROPUESTA PERSONALIZADA", R, 20, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRIS);
  doc.text(fechaCorta(q.fecha), R, 25, { align: "right" });
  doc.setDrawColor(...AZUL);
  doc.setLineWidth(0.6);
  doc.line(L, 37, R, 37);
  doc.setLineWidth(0.2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...NEGRO);
  doc.text(`Hola ${String(q.nombre || "").slice(0, 40)},`, L, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const intro = q.mensaje || `Gracias por escribirnos${q.proyecto ? " sobre «" + q.proyecto + "»" : ""}. Por lo que nos cuentas, estas son las opciones que mejor se adaptan a ti.`;
  const il = doc.splitTextToSize(intro, R - L);
  doc.text(il, L, 58);
  let y = 58 + il.length * 4.6 + 6;
  if (q.interes === "reels") y = reelsBlock(doc, q, y, L, R, precReels);
  if (q.interes === "horas") y = horasBlock(doc, q, y, L, R, precHoras, precioEsenciaSesion);
  tarjetasPropuesta(q, preciosPaquetes, ext).forEach((c) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const dl = doc.splitTextToSize(c.d, 105);
    const fl = (c.f || []).map((x) => doc.splitTextToSize(x, R - L - 14));
    const h = 13 + dl.length * 4 + (fl.length ? 2 + fl.reduce((a, l) => a + l.length * 4.1, 0) : 0) + 3;
    if (y + h > 272) { doc.addPage(); y = 20; }
    doc.setDrawColor(c.rec ? 27 : 220, c.rec ? 47 : 222, c.rec ? 189 : 235);
    doc.setLineWidth(c.rec ? 0.7 : 0.3);
    doc.roundedRect(L, y, R - L, h, 2.5, 2.5, "S");
    doc.setLineWidth(0.2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...NEGRO);
    doc.text(c.t, L + 5, y + 8);
    if (c.rec) {
      const tw = doc.getTextWidth(c.t);
      doc.setFillColor(...AZUL);
      doc.roundedRect(L + 5 + tw + 3, y + 3.6, 26, 5.4, 1.5, 1.5, "F");
      doc.setFontSize(6.5);
      doc.setTextColor(255, 255, 255);
      doc.text("RECOMENDADO", L + 5 + tw + 16, y + 7.3, { align: "center" });
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRIS_TEXTO);
    doc.text(dl, L + 5, y + 13);
    if (fl.length) {
      let fy = y + 13 + dl.length * 4 + 2.5;
      doc.setTextColor(40, 44, 70);
      fl.forEach((ls) => { doc.setFillColor(...AZUL); doc.rect(L + 5, fy - 2, 1.5, 1.5, "F"); doc.text(ls, L + 9, fy); fy += ls.length * 4.1; });
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...AZUL);
    doc.text(c.a ? `${c.desde ? "Desde " : ""}${money(c.a)}` : "Cotización según tu material", R - 5, y + 8, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRIS_TEXTO);
    if (c.u) doc.text(c.u, R - 5, y + 13, { align: "right" });
    else if (c.a && c.b) doc.text(`por sesión · o ${money(c.b)} al mes (4 episodios)`, R - 5, y + 13, { align: "right" });
    else if (c.a && !c.desde) doc.text("por sesión", R - 5, y + 13, { align: "right" });
    y += h + 3.5;
  });
  const inc = q.interes === "horas" ? INCLUYE_HORAS : q.interes === "exterior" ? INCLUYE_EXT : q.interes === "reels" ? INCLUYE_REELS : INCLUYE;
  if (y > 232) { doc.addPage(); y = 20; }
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...AZUL);
  doc.text(q.interes === "exterior" || q.interes === "horas" ? "Incluye" : q.interes === "reels" ? "Todas las opciones incluyen" : "Todos los paquetes incluyen", L, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...NEGRO);
  inc.forEach((x, i) => { doc.text("- " + x, i % 2 ? 108 : L, y + 6 + Math.floor(i / 2) * 5); });
  y += 6 + Math.ceil(inc.length / 2) * 5 + 4;
  doc.setFillColor(...AZUL);
  doc.roundedRect(L, y, R - L, 27, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("Reserva tu sesión", L + 6, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (q.interes === "exterior") {
    doc.text("Cuéntanos dónde y cuándo quieres grabar y apartamos tu fecha.", L + 6, y + 15);
    doc.text(`Escríbenos por Instagram ${IG} · ${WEB}`, L + 6, y + 21);
  } else {
    doc.text("Elige tu día y hora aquí:", L + 6, y + 15);
    doc.textWithLink(BOOKING_URL, L + 6, y + 20, { url: BOOKING_URL });
    doc.text(`También por Instagram ${IG} · ${WEB}`, L + 6, y + 25);
  }
  doc.setFontSize(7.5);
  doc.setTextColor(...GRIS);
  doc.text("Precios en pesos mexicanos, no incluyen IVA; si necesitas factura se agrega el 16%. Propuesta válida por 15 días. La sesión se paga por adelantado al reservar.", L, 287, { maxWidth: R - L });
  doc.save(`Propuesta ${safeName(q.nombre)} ${q.fecha || ""}.pdf`);
}

// ---------- Cotización ----------
// El portal guarda: id, fecha, nombre, telefono, proyecto, paquete, tipo
// ("sesion"/"mensual"), cantidad, horas_extra, tarifa_hora, descuento_pct,
// con_factura (booleano), vigencia_dias, estado, nota, opciones
// ([{titulo, cantidad, precio (unitario), sesiones?, detalles?}]), modo
// ("estandar" | "reels" | "personalizada"), intro.
const folioCot = (id) => `COT-${String(id || "").slice(-5).toUpperCase()}`;

function condicionesCot(c) {
  return [
    `Precios en pesos mexicanos (MXN). ${c.con_factura ? "El total incluye IVA del 16%." : "No incluyen IVA; si requieres factura se agrega el 16%."}`,
    "La sesión se paga por adelantado al reservar.",
    "Reprogramaciones con 48 horas de anticipación.",
    "Métodos de pago: tarjeta de débito o crédito, transferencia y efectivo.",
    `Vigencia de esta cotización: ${c.vigencia_dias || 15} días.`,
  ];
}
function incluyeCot(c) {
  const l = [INFO_PKG[c.paquete] || (c.modo === "reels" ? "Paquete de reels en estudio." : "Servicio personalizado según lo acordado."), c.tipo === "mensual" ? "Membresía mensual de 4 episodios." : "Sesión de 1 hora en estudio, con opción de contratar más tiempo."];
  if (EDITADOS.includes(c.paquete)) l.push("Material editado entregado en 3 a 7 días hábiles.");
  l.push("3 cámaras y micrófonos profesionales.", "Sets decorados, maquillaje anti brillo, agua, café y snacks.");
  return l;
}

function pdfCotizacionMulti(c, opciones) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const L = 15, R = 195;
  const folio = folioCot(c.id);
  const nombre = c.nombre || "";
  const fecha = fechaCorta(c.fecha);
  doc.addImage(LOGO, "PNG", L, 12, 40, 21);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...AZUL_BRILLANTE);
  doc.text("COTIZACIÓN", R, 19, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text(`Para ${nombre} - ${fecha}`, R, 24, { align: "right" });
  doc.text(folio, R, 28.5, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...NEGRO);
  const first = String(nombre).split(" ")[0];
  doc.text(`¡Hola ${first}!`, L, 53);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRIS_OSCURO);
  const intro = c.intro || "Gracias por escribirnos. Aquí está tu cotización.";
  const il = doc.splitTextToSize(intro, R - L);
  doc.text(il, L, 60);
  let y = 60 + il.length * 4.6 + 7;
  opciones.forEach((o, i) => {
    const sub = r2(Number(o.precio || 0) * Number(o.cantidad || 1));
    const iva = c.con_factura ? r2(sub * IVA) : 0;
    const total = r2(sub + iva);
    const detalles = Array.isArray(o.detalles) ? o.detalles : (o.detalles ? String(o.detalles).split("\n") : []);
    let h = 26;
    const resumen = c.modo === "reels" && o.sesiones ? `${o.sesiones} sesiones de grabación + ${o.cantidad} reels` : c.modo === "reels" && o.cantidad ? `${o.cantidad} reels` : "";
    if (resumen) h += 5;
    h += detalles.length * 5;
    if (y + h > 264) { doc.addPage(); y = 20; }
    doc.setDrawColor(...LINEA);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(L, y, R - L, h, 2.5, 2.5, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...AZUL_BRILLANTE);
    doc.text(`OPCIÓN ${["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"][i] || i + 1}`, L + 5, y + 7);
    doc.setFontSize(12);
    doc.setTextColor(...NEGRO);
    const titulo = o.titulo || (c.modo === "reels" ? "Paquete de reels" : "Opción personalizada");
    doc.text(doc.splitTextToSize(titulo, 125)[0], L + 5, y + 13);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRIS_OSCURO);
    let yy = y + 19;
    if (resumen) { doc.text(resumen, L + 5, yy); yy += 5; }
    detalles.forEach((b) => { doc.text("- " + b, L + 5, yy); yy += 5; });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...AZUL_BRILLANTE);
    doc.text(money(total), R - 5, y + 13, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRIS_TEXTO);
    doc.text(`Subtotal ${money(sub)}${iva ? ` + IVA ${money(iva)}` : ""}`, R - 5, y + 19, { align: "right" });
    y += h + 4;
  });
  if (y > 232) { doc.addPage(); y = 20; }
  y += 4;
  doc.setFillColor(...FONDO_NOTAS);
  doc.roundedRect(L, y, R - L, 33, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NEGRO);
  doc.text("Notas:", L + 5, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRIS_OSCURO);
  const nl = doc.splitTextToSize(`${condicionesCot(c).join(" ")}${c.nota ? ` Nota: ${c.nota}` : ""}`, R - L - 10);
  doc.text(nl, L + 5, y + 12.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...AZUL_BRILLANTE);
  doc.text(WEB.toUpperCase(), (L + R) / 2, 287, { align: "center" });
  doc.save(`Cotizacion ${folio} ${safeName(nombre)}.pdf`);
}

function pdfCotizacionEstandar(c, opciones) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const L = 15, R = 195;
  const folio = folioCot(c.id);
  const nombre = c.nombre || "";
  const fecha = fechaCorta(c.fecha);
  doc.addImage(LOGO, "PNG", L, 12, 52, 27);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...AZUL);
  doc.text("COTIZACIÓN", R, 20, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text(folio, R, 26, { align: "right" });
  doc.text(`Fecha: ${fecha}`, R, 31, { align: "right" });
  doc.setDrawColor(...AZUL);
  doc.setLineWidth(0.6);
  doc.line(L, 45, R, 45);
  doc.setLineWidth(0.2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text("PARA", L, 53);
  doc.setFontSize(13);
  doc.setTextColor(...NEGRO);
  doc.text(String(nombre).slice(0, 50), L, 59);
  if (c.proyecto) { doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(c.proyecto, L, 64); }
  let y = 73;
  const X1 = 90, X2 = 155, X3 = 195;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRIS);
  doc.text("CONCEPTO", L, y);
  doc.text("CANT.", X1, y);
  doc.text("IMPORTE", X3, y, { align: "right" });
  doc.setDrawColor(...LINEA);
  doc.line(L, y + 2, R, y + 2);
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...NEGRO);
  const base = (opciones || []).reduce((a, o) => a + Number(o.precio || 0) * Number(o.cantidad || 1), 0);
  const extra = Number(c.horas_extra || 0) * Number(c.tarifa_hora || 0);
  const desc = r2((base + extra) * (Number(c.descuento_pct || 0) / 100));
  const tipoLabel = c.tipo === "mensual" ? "Membresía mensual" : "Por sesión";
  const lineas = [
    { d: `${c.paquete || ""} - ${tipoLabel}`, c: c.cantidad, t: base },
    ...(extra > 0 ? [{ d: "Horas extra", c: c.horas_extra, t: extra }] : []),
    ...(desc > 0 ? [{ d: `Descuento (${c.descuento_pct}%)`, c: "", t: -desc }] : []),
  ];
  lineas.forEach((l) => {
    doc.text(doc.splitTextToSize(l.d, 70)[0], L, y);
    doc.text(String(l.c), X1, y);
    doc.text(money(l.t), X3, y, { align: "right" });
    y += 6;
    doc.setDrawColor(...LINEA);
    doc.line(L, y, R, y);
    y += 5;
  });
  y += 1;
  const totalLinea = (label, val, bold) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 13 : 10);
    doc.setTextColor(...NEGRO);
    doc.text(label, X2, y);
    doc.text(money(val), X3, y, { align: "right" });
    y += bold ? 8 : 6.5;
  };
  totalLinea("Subtotal", Number(c.subtotal ?? r2(base + extra - desc)));
  if (Number(c.iva) > 0) totalLinea("IVA 16%", Number(c.iva));
  totalLinea("Total", Number(c.total ?? r2(Number(c.subtotal || 0) + Number(c.iva || 0))), true);
  if (y > 232) { doc.addPage(); y = 20; }
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...AZUL);
  doc.text("Incluye", L, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...NEGRO);
  y += 6;
  incluyeCot(c).forEach((x) => { const ls = doc.splitTextToSize(x, R - L - 6); doc.text("- " + ls[0], L + 2, y); ls.slice(1).forEach((s) => { y += 4.5; doc.text("  " + s, L + 2, y); }); y += 5.2; });
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...AZUL);
  doc.text("Condiciones", L, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...NEGRO);
  y += 6;
  condicionesCot(c).forEach((x) => { const ls = doc.splitTextToSize(x, R - L - 6); doc.text("- " + ls[0], L + 2, y); ls.slice(1).forEach((s) => { y += 4.5; doc.text("  " + s, L + 2, y); }); y += 5.2; });
  if (c.nota) { y += 3; doc.setFont("helvetica", "italic"); doc.setFontSize(9); doc.setTextColor(...GRIS_OSCURO); const nl = doc.splitTextToSize(`Nota: ${c.nota}`, R - L); doc.text(nl, L, y); }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text(`Élite Podhouse · ${IG} · Monteverde 186, col. Balderrama, Hermosillo, Sonora`, (L + R) / 2, 286, { align: "center" });
  doc.save(`Cotizacion ${folio} ${safeName(nombre)}.pdf`);
}

export function pdfCotizacion(c, opciones) {
  const esMulti = (c.modo === "reels" || c.modo === "personalizada") && Array.isArray(opciones) && opciones.length > 0;
  if (esMulti) return pdfCotizacionMulti(c, opciones);
  return pdfCotizacionEstandar(c, opciones);
}

// ---------- Contrato ----------
const TIPO_TXT = { grabacion: "Grabación de podcast", edicion: "Edición de podcast", grabacion_edicion: "Grabación y edición de podcast" };
const TIPO_LABEL = { grabacion: "Grabación", edicion: "Edición", grabacion_edicion: "Grabación y edición" };
const DEF = {
  grabacion: { sesiones: "1 sesión de grabación de 1 hora en el estudio de Élite Podhouse, en la fecha y horario acordados por las partes.", entrega: "EL PRESTADOR entregará al CLIENTE el audio y video grabado, editado en su versión final, en un plazo de 3 a 7 días hábiles.", pago: "El cliente deberá pagar el anticipo de $500 al reservar. El resto deberá pagarse antes de la grabación o antes de la entrega del material, según lo acordado." },
  edicion: { sesiones: "1 episodio editado a partir del material proporcionado por EL CLIENTE.", entrega: "EL PRESTADOR entregará el episodio editado en su versión final en un plazo de 3 a 7 días hábiles a partir de la recepción del material.", pago: "El cliente deberá pagar el anticipo de $500 al reservar. El resto deberá pagarse antes de la entrega del material editado." },
  grabacion_edicion: { sesiones: "1 sesión de grabación de 1 hora y la edición completa del episodio resultante.", entrega: "EL PRESTADOR entregará el episodio editado en su versión final en un plazo de 3 a 7 días hábiles.", pago: "El cliente deberá pagar el anticipo de $500 al reservar. El resto deberá pagarse antes de la grabación o antes de la entrega del material, según lo acordado." },
};
const JURIS0 = "las leyes aplicables de los Estados Unidos Mexicanos y a los tribunales competentes de Hermosillo, Sonora";
const PRESTADOR0 = { nombre: "Tania Elizabeth Mino Torres", rfc: "", domicilio: "" };
const ORD = ["PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "SEXTA", "SÉPTIMA", "OCTAVA", "NOVENA", "DÉCIMA", "DÉCIMA PRIMERA", "DÉCIMA SEGUNDA", "DÉCIMA TERCERA"];

function clausulasContrato(c) {
  const tipo = c.tipoServicio || "grabacion_edicion";
  const d = DEF[tipo] || DEF.grabacion_edicion;
  const prestador = { ...PRESTADOR0, ...(c.prestador || {}) };
  const sesiones = c.sesiones || d.sesiones;
  const entrega = c.entrega || d.entrega;
  const pago = c.pago || d.pago;
  const servicios = (c.servicios || "").split("\n").filter(Boolean);
  const total = Number(c.total || 0);
  const anticipo = Number(c.anticipo || 0);
  const saldo = r2(total - anticipo);
  const rev = c.revisiones ?? 1;
  const cancelacion = (c.cancelacion || "").trim();
  const portafolio = c.portafolio;
  // El formulario del portal guarda la jurisdicción como frase completa
  // ("Para la interpretación y cumplimiento... se someten a las leyes..."),
  // mientras que en Claude solo se guardaba la cola ("las leyes...").
  // Se quita el prefijo si ya viene, para no duplicarlo en la cláusula.
  const juris = String(c.jurisdiccion || JURIS0).trim().replace(/^Para la interpretación y cumplimiento de este contrato, las partes se someten a\s*/i, "").replace(/\.\s*$/, "");
  const intro = `El presente contrato se celebra entre ${prestador.nombre}${prestador.rfc ? `, con RFC ${prestador.rfc}` : ""}, a quien en adelante se le denominará "EL PRESTADOR", y ${c.cliente || ""}${c.rfc ? `, con RFC ${c.rfc}` : ""}${c.representante ? `, representado por ${c.representante}` : ""}, a quien en adelante se le denominará "EL CLIENTE", de conformidad con las siguientes declaraciones y cláusulas.`;
  const decl = [
    `EL PRESTADOR declara ser una persona física con actividad empresarial, dedicada a la prestación de servicios de producción audiovisual, grabación y edición de podcast, con domicilio en ${prestador.domicilio || "Monteverde 186, col. Balderrama, Hermosillo, Sonora"}, y cuenta con la capacidad, el equipo y la experiencia para prestar los servicios objeto de este contrato.`,
    `EL CLIENTE declara ${c.representante ? `que ${c.representante} cuenta con facultades suficientes para representarlo en la celebración de este contrato, y` : "ser una persona física o moral con capacidad legal para contratar, y"} que desea contratar los servicios de EL PRESTADOR para ${c.proyecto ? `su proyecto "${c.proyecto}"` : "su proyecto"}.`,
  ];
  const cls = [
    { t: "Objeto", b: `EL PRESTADOR se obliga a prestar los servicios de ${TIPO_TXT[tipo] || "servicios de podcast"} para EL CLIENTE, consistentes en: ${sesiones}${servicios.length ? ` Los servicios contratados incluyen: ${servicios.join(", ")}.` : ""}` },
    { t: "Precio", b: `El precio total de los servicios es de ${money(total)}${c.iva ? `, desglosado en ${money(Number(c.subtotal || 0))} más IVA de ${money(Number(c.iva || 0))}` : ""}.` },
    { t: "Forma de pago", b: `${pago} El anticipo es de ${money(anticipo)} y el saldo restante de ${money(saldo)}.` },
    { t: "Calendario y entrega", b: `${entrega} El servicio incluye ${rev} ${rev === 1 ? "revisión" : "revisiones"} sin costo adicional; las revisiones adicionales se cotizan por separado.` },
    ...(cancelacion ? [{ t: "Reprogramaciones y cancelaciones", b: cancelacion }] : []),
    { t: "Obligaciones de EL CLIENTE", b: "EL CLIENTE se obliga a acudir puntualmente a la sesión de grabación, proporcionar la información y materiales necesarios con anticipación, y pagar el precio pactado en los términos establecidos en este contrato." },
    { t: "Propiedad intelectual", b: "El material producido (audio, video y ediciones) es propiedad de EL CLIENTE una vez liquidado el precio total. EL PRESTADOR conserva el derecho de usar fragmentos del material para fines de portafolio y promoción, salvo que EL CLIENTE indique lo contrario por escrito." },
    { t: "Confidencialidad", b: "Ambas partes se obligan a mantener confidencial la información que intercambien con motivo de este contrato, y a no divulgarla a terceros sin autorización previa y por escrito." },
    { t: "Vigencia y terminación", b: "Este contrato estará vigente desde su firma hasta la entrega de los servicios contratados. Cualquiera de las partes podrá darlo por terminado por incumplimiento de la otra, previo aviso por escrito con al menos 5 días de anticipación." },
    { t: "Comunicaciones", b: `Las partes acuerdan que las comunicaciones relacionadas con este contrato se realizarán por correo electrónico o WhatsApp. Las notificaciones a EL CLIENTE se enviarán a ${c.email || c.telefono || "los datos de contacto proporcionados"} y las dirigidas a EL PRESTADOR a los datos de contacto de Élite Podhouse.` },
    { t: "Jurisdicción", b: `Para la interpretación y cumplimiento de este contrato, las partes se someten a ${juris}, renunciando a cualquier otro fuero que pudiera corresponderles.` },
  ];
  const cierre = `Leído que fue el presente contrato y enteradas las partes de su contenido y alcance legal, lo firman por duplicado en la ciudad de Hermosillo, Sonora, el día ${fechaLarga(c.fecha)}.`;
  const notaPortafolio = portafolio === "si" ? "EL CLIENTE autoriza expresamente a EL PRESTADOR a utilizar fragmentos del material producido para su portafolio y promoción." : "EL PRESTADOR no utilizará el material producido para fines de portafolio o promoción sin autorización previa y por escrito de EL CLIENTE.";
  return { intro, decl, cls, cierre, notaPortafolio };
}

export function pdfContrato(c, d) {
  // c es la fila de contratos; d son sus datos completos (datos jsonb).
  const k = { ...(d || {}), id: c.id, fecha: c.fecha, cliente: (d && d.cliente) || c.nombre || "", total: c.total ?? (d && d.total) };
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const L = 20, R = 190, maxY = 268;
  const folio = `CT-${String(k.id || "").slice(-5).toUpperCase()}`;
  const nombre = k.cliente || c.nombre || "";
  doc.addImage(LOGO, "PNG", L, 12, 44, 22.6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...AZUL);
  doc.text(folio, R, 20, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRIS);
  doc.text(`Hermosillo, Sonora · ${fechaLarga(k.fecha)}`, R, 25, { align: "right" });
  doc.setDrawColor(...AZUL);
  doc.setLineWidth(0.6);
  doc.line(L, 38, R, 38);
  doc.setLineWidth(0.2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...NEGRO);
  doc.text("CONTRATO DE PRESTACIÓN DE SERVICIOS", L, 48);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text((TIPO_TXT[k.tipoServicio] || "Servicios de podcast").toUpperCase(), L, 53.5);
  let y = 62;
  const cls = clausulasContrato(k);
  const esc = (t, x, yy, size = 9.5, lh = 4.7) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(40, 44, 70);
    const ls = doc.splitTextToSize(t, R - L);
    let cy = yy;
    ls.forEach((s) => {
      if (cy > maxY) { doc.addPage(); cy = 20; }
      doc.text(s, x, cy);
      cy += lh;
    });
    return cy + 2;
  };
  const heading = (t, yy) => {
    if (yy > maxY - 10) { doc.addPage(); yy = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...AZUL);
    doc.text(t, L, yy);
    return yy + 7;
  };
  y = esc(cls.intro, L, y);
  y = heading("DECLARACIONES", y);
  cls.decl.forEach((s, i) => { y = esc(`${["I.", "II."][i] || ""} ${s}`, L, y); });
  y = heading("CLÁUSULAS", y);
  cls.cls.forEach((cl, i) => {
    if (y > maxY - 14) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...NEGRO);
    doc.text(`${ORD[i] || i + 1}. ${cl.t}`, L, y);
    y += 6;
    y = esc(cl.b, L, y);
  });
  y = esc(cls.cierre, L, y);
  y = esc(cls.notaPortafolio, L, y, 9);
  if (y + 30 > maxY) { doc.addPage(); y = 26; }
  y += 10;
  doc.setDrawColor(...NEGRO);
  doc.line(L + 10, y, L + 70, y);
  doc.line(R - 70, y, R - 10, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...NEGRO);
  doc.text("EL PRESTADOR", L + 40, y + 6, { align: "center" });
  doc.text("EL CLIENTE", R - 40, y + 6, { align: "center" });
  doc.setFontSize(8.5);
  doc.setTextColor(...GRIS);
  doc.text((k.prestador?.nombre || PRESTADOR0.nombre).slice(0, 40), L + 40, y + 11, { align: "center" });
  doc.text(String(nombre).slice(0, 40), R - 40, y + 11, { align: "center" });
  const np = doc.getNumberOfPages();
  for (let i = 1; i <= np; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text(`${folio} · Página ${i} de ${np}`, (L + R) / 2, 289, { align: "center" });
  }
  doc.save(`Contrato ${folio} ${safeName(nombre)}.pdf`);
}

// ---------- Recibo de pago ----------
export function pdfRecibo({ folio, cliente, concepto, monto, fecha, metodo, saldo, conIva, iva }) {
  const doc = new jsPDF({ unit: "mm", format: [105, 148] });
  doc.addImage(LOGO, "PNG", 8, 5, 36, 18.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...AZUL);
  doc.text("RECIBO DE PAGO", 97, 13, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...GRIS);
  doc.text(folio, 97, 18, { align: "right" });
  doc.setDrawColor(...AZUL);
  doc.setLineWidth(0.6);
  doc.line(8, 27, 97, 27);
  doc.setLineWidth(0.2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text("PAGO RECIBIDO", 8, 40);
  doc.setFontSize(24);
  doc.setTextColor(...NEGRO);
  doc.text(money(monto), 8, 51);
  let y = 66;
  const cut = (t) => String(t || "").slice(0, 30);
  const row = (label, val) => {
    doc.setDrawColor(...LINEA);
    doc.line(8, y, 97, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text(label, 8, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...NEGRO);
    doc.text(cut(val), 97, y + 5, { align: "right" });
    y += 10;
  };
  row("Cliente", cliente);
  row("Concepto", concepto);
  row("Fecha", fechaCorta(fecha));
  row("Método", metodo);
  if (conIva) row("IVA incluido en la factura", money(iva));
  row("Saldo restante", money(saldo));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text("Gracias por confiar en nosotros.", 8, 136);
  doc.text(`${IG} · Hermosillo, Sonora`, 8, 141);
  doc.save(`Recibo ${folio}.pdf`);
}

// ---------- Recibo a colaborador ----------
export function pdfReciboColab({ colaborador, concepto, monto, fecha, metodo, id }) {
  const doc = new jsPDF({ unit: "mm", format: [148, 210] });
  const folio = `PC-${String(id || "").slice(-5).toUpperCase()}`;
  doc.addImage(LOGO, "PNG", 10, 6, 40, 20.5);
  doc.setDrawColor(...AZUL);
  doc.setLineWidth(0.6);
  doc.line(10, 30, 138, 30);
  doc.setLineWidth(0.2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...AZUL);
  doc.text("RECIBO DE PAGO A PRESTADOR DE SERVICIOS", 10, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text(folio, 138, 36, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...NEGRO);
  const para = `Recibí de Élite Podhouse la cantidad de ${money(monto)} MXN por concepto de: ${concepto || ""}.`;
  const pl = doc.splitTextToSize(para, 128);
  doc.text(pl, 10, 44);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(money(monto), 10, 70);
  let y = 86;
  const row = (label, val) => {
    doc.setDrawColor(...LINEA);
    doc.line(10, y, 138, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GRIS);
    doc.text(label, 10, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...NEGRO);
    doc.text(String(val || ""), 138, y + 5, { align: "right" });
    y += 10;
  };
  row("Prestador", colaborador);
  row("Servicio", concepto);
  row("Fecha de pago", fechaCorta(fecha));
  row("Método", metodo);
  y = 168;
  doc.setDrawColor(...NEGRO);
  doc.line(16, y, 60, y);
  doc.line(88, y, 132, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...NEGRO);
  doc.text("Firma del prestador", 38, y + 5, { align: "center" });
  doc.text(String(colaborador || "").slice(0, 30), 38, y + 10, { align: "center" });
  doc.text("Élite Podhouse", 110, y + 5, { align: "center" });
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text("Comprobante interno de pago.", 10, 200);
  doc.save(`Recibo ${folio} ${safeName(colaborador)}.pdf`);
}
