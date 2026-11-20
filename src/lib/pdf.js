// PDFs generados en el navegador con jsPDF (como en Élite OS).
// Sin logo embebido: encabezado de texto con la identidad del estudio.
import { jsPDF } from "jspdf";

const AZUL = [27, 47, 189];
const AZUL_CLARO = [47, 82, 255];
const GRIS = [139, 144, 179];
const NEGRO = [10, 12, 22];

function header(doc, titulo, fecha) {
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, 210, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("ÉLITE PODHOUSE", 14, 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Hermosillo, Sonora  ·  elitepodhouse.mx  ·  662 132 1405", 196, 14, { align: "right" });
  doc.setTextColor(...NEGRO);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(titulo, 14, 36);
  if (fecha) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRIS);
    doc.text(fecha, 196, 36, { align: "right" });
  }
  doc.setDrawColor(...AZUL_CLARO);
  doc.setLineWidth(0.6);
  doc.line(14, 42, 196, 42);
  return 50;
}

function footer(doc) {
  const y = 282;
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.4);
  doc.line(14, y, 196, y);
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text("Monteverde 186, col. Balderrama, Hermosillo, Sonora", 14, y + 7);
  doc.text("Élite Podhouse", 196, y + 7, { align: "right" });
}

function parrafo(doc, texto, x, y, ancho) {
  const lineas = doc.splitTextToSize(String(texto || ""), ancho);
  doc.text(lineas, x, y);
  return y + lineas.length * 5.5;
}

function tablaPrecios(doc, filas, y) {
  // filas: [descripcion, precio]
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...NEGRO);
  doc.text("Concepto", 14, y);
  doc.text("Precio", 196, y, { align: "right" });
  doc.setDrawColor(220, 220, 220);
  doc.line(14, y + 3, 196, y + 3);
  y += 10;
  doc.setFont("helvetica", "normal");
  filas.forEach(([desc, precio]) => {
    const lineas = doc.splitTextToSize(String(desc), 130);
    doc.text(lineas, 14, y);
    doc.text(precio, 196, y, { align: "right" });
    y += Math.max(1, lineas.length) * 5.5 + 2;
  });
  return y;
}

function totalLinea(doc, etiqueta, valor, y, grande) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(grande ? 13 : 11);
  doc.setTextColor(...NEGRO);
  doc.text(etiqueta, 120, y);
  doc.text(valor, 196, y, { align: "right" });
  return y + (grande ? 8 : 6);
}

const money = (n) => `$${Number(n || 0).toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;

// ---------- Propuesta ----------
export function pdfPropuesta(p, config, preciosPaquetes) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = header(doc, "PROPUESTA PERSONALIZADA", p.fecha || "");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...NEGRO);
  y = parrafo(doc, `Hola ${p.nombre || ""},`, 14, y, 182);
  y += 4;
  y = parrafo(doc, p.mensaje || "Gracias por confiar en Élite Podhouse. Aquí va una propuesta hecha para tu proyecto: un estudio donde llegas a hablar y sales con tu podcast listo.", 14, y, 182);
  y += 8;
  const filas = preciosPaquetes.map(([nombre, sesion, mensual, recomendado]) => [
    `${nombre}${recomendado ? "  ★ Recomendado" : ""} — Sesión ${money(sesion)} · Mensual (4 episodios) ${money(mensual)}`,
    "",
  ]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Paquetes de podcast (1 hora por sesión, sin IVA)", 14, y);
  y += 7;
  filas.forEach(([desc]) => {
    y = parrafo(doc, "•  " + desc, 16, y, 178);
    y += 1;
  });
  y += 4;
  if (p.precio_edicion) {
    y = parrafo(doc, `Edición: ${money(p.precio_edicion)}`, 14, y, 182);
    y += 4;
  }
  y = parrafo(doc, "Episodio Cero: $1,499 por tiempo limitado. Renta de estudio sin asistencia desde $600 la hora.", 14, y, 182);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRIS);
  y = parrafo(doc, "¿Te late? Respóndenos por WhatsApp y agendamos tu sesión. Monteverde 186, col. Balderrama, Hermosillo.", 14, y, 182);
  footer(doc);
  doc.save(`propuesta-${(p.nombre || "elite").toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

// ---------- Cotización ----------
export function pdfCotizacion(c, opciones) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = header(doc, "COTIZACIÓN", c.fecha || "");
  doc.setFontSize(11);
  doc.setTextColor(...NEGRO);
  doc.setFont("helvetica", "bold");
  doc.text(`Cliente: ${c.nombre || ""}`, 14, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  if (c.proyecto) { y = parrafo(doc, `Proyecto: ${c.proyecto}`, 14, y, 182); y += 2; }
  if (c.telefono) { y = parrafo(doc, `Teléfono: ${c.telefono}`, 14, y, 182); y += 2; }
  if (c.intro) { y += 4; y = parrafo(doc, c.intro, 14, y, 182); y += 4; }
  const filas = (opciones || []).map((o) => [`${o.titulo || "Concepto"} × ${o.cantidad || 1}`, money(Number(o.precio || 0) * Number(o.cantidad || 1))]);
  if (filas.length === 0) {
    filas.push([`${c.paquete || "Servicio"} — ${c.tipo === "mensual" ? "Membresía mensual" : "Por sesión"}${c.cantidad ? ` × ${c.cantidad}` : ""}`, money(c.subtotal || 0)]);
  }
  y = tablaPrecios(doc, filas, y + 4);
  y += 6;
  if (c.descuento_pct) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    y = totalLinea(doc, `Descuento (${c.descuento_pct}%)`, `−${money((c.subtotal || 0) * (c.descuento_pct || 0) / 100)}`, y);
  }
  if (c.con_factura) y = totalLinea(doc, "IVA (16%)", money(c.iva || 0), y);
  y = totalLinea(doc, "TOTAL", money(c.total || 0), y + 2, true);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRIS);
  y = parrafo(doc, `Vigencia: ${c.vigencia_dias || 15} días a partir de la fecha de esta cotización. Precios sin IVA salvo que se indique factura.`, 14, y, 182);
  footer(doc);
  doc.save(`cotizacion-${(c.nombre || "elite").toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

// ---------- Contrato ----------
export function pdfContrato(c, d) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = header(doc, "CONTRATO DE PRESTACIÓN DE SERVICIOS", c.fecha || "");
  doc.setFontSize(11);
  doc.setTextColor(...NEGRO);
  doc.setFont("helvetica", "normal");
  y = parrafo(doc, `Entre Élite Podhouse, representada por ${d.prestador || "Tania Elizabeth Mino Torres"}, y ${d.cliente || c.nombre || ""}${d.rfc ? ` (RFC ${d.rfc})` : ""}, se celebra el presente contrato de prestación de servicios de producción de podcast y contenido.`, 14, y, 182);
  y += 6;
  const clausulas = [
    ["1. Servicios", d.servicios || d.proyecto || "Servicios de grabación, edición y producción de podcast y contenido, según lo acordado con el cliente."],
    ["2. Monto", `Total: ${money(c.total || d.total || 0)}. Anticipo: ${money(d.anticipo || 0)}. El resto se paga conforme a lo acordado antes de la entrega final.`],
    ["3. Revisiones", `${d.revisiones || 1} ronda(s) de revisiones incluidas. Revisiones adicionales se cotizan aparte.`],
    ["4. Entrega", "El material editado se entrega en 3 a 7 días hábiles después de la grabación, salvo acuerdo distinto por escrito."],
    ["5. Reprogramación", "La sesión se puede reprogramar con al menos 48 horas de anticipación."],
    ["6. Cancelación", d.cancelacion || "Si el cliente cancela, el anticipo no es reembolsable."],
    ["7. Jurisdicción", d.jurisdiccion || "Para la interpretación y cumplimiento de este contrato, las partes se someten a las leyes de México y a los tribunales de Hermosillo, Sonora."],
  ];
  clausulas.forEach(([titulo, texto]) => {
    doc.setFont("helvetica", "bold");
    doc.text(titulo, 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    y = parrafo(doc, texto, 14, y, 182);
    y += 5;
  });
  y += 10;
  doc.setFont("helvetica", "normal");
  doc.text("______________________________", 14, y);
  doc.text("______________________________", 120, y);
  y += 6;
  doc.text(d.prestador || "Tania Elizabeth Mino Torres", 14, y);
  doc.text(d.representante || d.cliente || c.nombre || "Cliente", 120, y);
  y += 5;
  doc.setFontSize(9);
  doc.setTextColor(...GRIS);
  doc.text("Prestador", 14, y);
  doc.text("Cliente", 120, y);
  footer(doc);
  doc.save(`contrato-${(c.nombre || "elite").toLowerCase().replace(/\s+/g, "-")}.pdf`);
}

// ---------- Recibo de pago ----------
export function pdfRecibo({ folio, cliente, concepto, monto, fecha, metodo, saldo, conIva }) {
  // Media carta (105 x 148 mm), como en Élite OS.
  const doc = new jsPDF({ unit: "mm", format: [105, 148] });
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, 105, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("ÉLITE PODHOUSE", 8, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("RECIBO DE PAGO", 97, 11, { align: "right" });
  doc.setTextColor(...NEGRO);
  doc.setFontSize(9);
  doc.text(`Folio: ${folio}`, 8, 26);
  doc.text(`Fecha: ${fecha || ""}`, 97, 26, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(money(monto), 52, 42, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let y = 54;
  y = parrafo(doc, `Cliente: ${cliente || ""}`, 8, y, 89);
  y += 2;
  y = parrafo(doc, `Concepto: ${concepto || ""}`, 8, y, 89);
  y += 2;
  y = parrafo(doc, `Método: ${metodo || ""}`, 8, y, 89);
  y += 4;
  if (conIva) { y = parrafo(doc, "Incluye IVA.", 8, y, 89); y += 2; }
  if (saldo !== undefined && saldo !== null) {
    doc.setFont("helvetica", "bold");
    y = parrafo(doc, `Saldo restante: ${money(saldo)}`, 8, y, 89);
  }
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text("Gracias por confiar en Élite Podhouse.", 52, 138, { align: "center" });
  doc.save(`recibo-${folio}.pdf`);
}

// ---------- Recibo de pago a colaborador ----------
export function pdfReciboColab({ colaborador, concepto, monto, fecha, metodo }) {
  const doc = new jsPDF({ unit: "mm", format: [105, 148] });
  doc.setFillColor(...AZUL);
  doc.rect(0, 0, 105, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("ÉLITE PODHOUSE", 8, 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("PAGO A COLABORADOR", 97, 11, { align: "right" });
  doc.setTextColor(...NEGRO);
  doc.setFontSize(9);
  doc.text(`Fecha: ${fecha || ""}`, 8, 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(money(monto), 52, 42, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let y = 54;
  y = parrafo(doc, `Colaborador: ${colaborador || ""}`, 8, y, 89);
  y += 2;
  y = parrafo(doc, `Concepto: ${concepto || ""}`, 8, y, 89);
  y += 2;
  y = parrafo(doc, `Método: ${metodo || ""}`, 8, y, 89);
  doc.setFontSize(8);
  doc.setTextColor(...GRIS);
  doc.text("Élite Podhouse — Hermosillo, Sonora", 52, 138, { align: "center" });
  doc.save(`pago-colaborador-${(colaborador || "elite").toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
