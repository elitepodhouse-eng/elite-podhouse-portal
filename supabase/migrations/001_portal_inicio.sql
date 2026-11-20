-- Migración 001 — Portal Élite Podhouse: inicio interactivo del cliente
-- ---------------------------------------------------------------------------
-- ESTADO (19 nov 2026): las tablas episodios, pagos y contenidos YA EXISTEN
-- en Supabase (creadas 19 nov, con datos de ejemplo del cliente de prueba).
-- Esquema real:
--   episodios : id, cliente_id, titulo, tipo, set, estado
--               ('grabado' | 'en_edicion' | 'en_revision' | 'publicado'),
--               fecha_grabacion, fecha_entrega, video_url, audio_url, notas
--   pagos     : id, cliente_id, concepto, monto, estado
--               ('pagado' | 'pendiente'), fecha_vencimiento, fecha_pago
--   contenidos: id, tipo ('tip' | 'noticia'), titulo, cuerpo, publicado
--
-- ESTE ARCHIVO YA NO CREA ESAS TABLAS. Solo agrega 3 columnas OPCIONALES a
-- `clientes` para que el portal pueda mostrar lo que hoy deriva o deja en
-- blanco:
--   modalidad          ('mensual' o 'sesion') — para decir "Mensual" o
--                      "Por sesión" junto al paquete y no solo los precios.
--   set                ('OCRE' | 'INDIGO' | 'NOGAL' | 'ONIX') — el set
--                      asignado al cliente. Hoy el portal muestra el set del
--                      último episodio grabado, que es dato real.
--   sesiones_incluidas (int, p. ej. 4) — para mostrar "2 de 4 sesiones"
--                      con barra de avance. Hoy solo se muestra el conteo
--                      de sesiones del mes, sin denominador inventado.
--
-- CÓMO APLICARLA (opcional, una sola vez):
--   Supabase Dashboard → SQL Editor → pegar este archivo → Run.
-- No toca las tablas existentes ni sus datos.

alter table public.clientes add column if not exists modalidad text
  check (modalidad is null or modalidad in ('mensual', 'sesion'));
alter table public.clientes add column if not exists set text
  check (set is null or set in ('OCRE', 'INDIGO', 'NOGAL', 'ONIX'));
alter table public.clientes add column if not exists sesiones_incluidas int
  check (sesiones_incluidas is null or sesiones_incluidas > 0);
