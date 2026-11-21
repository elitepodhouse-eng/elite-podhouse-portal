-- ================================================================
-- 004 — Agenda del admin + registro de visitas
-- Portal: elite-podhouse-portal | Proyecto: oyrqkymijfheshefkwpb
-- Estado: NO APLICADA. Aplicar en el SQL Editor de Supabase
-- (pegar el archivo completo y Run una sola vez). Es idempotente:
-- se puede correr de nuevo sin duplicar nada.
--
-- Qué agrega:
-- 1) Columnas extra en `sesiones` para la agenda del admin
--    (paquete, set, anticipo, telefono, nota). El código del portal
--    detecta si existen: si no se ha aplicado esta migración, la
--    agenda funciona igual pero sin esos datos.
-- 2) Tabla `visitas` para el registro de visitas al estudio
--    (nombre, teléfono, fecha, hora, duración, notas, cliente opcional).
--    Sin ella, la sección de visitas muestra un aviso y no el formulario.
-- Sin RLS, igual que el resto del portal hoy.
-- ================================================================

alter table public.sesiones add column if not exists paquete text;
alter table public.sesiones add column if not exists set text;
alter table public.sesiones add column if not exists anticipo numeric;
alter table public.sesiones add column if not exists telefono text;
alter table public.sesiones add column if not exists nota text;

create table if not exists public.visitas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id),
  nombre text not null,
  telefono text,
  fecha date not null,
  hora text not null,
  duracion integer default 30,
  notas text,
  created_at timestamptz default now()
);

-- Verificación (correr después de aplicar):
-- select count(*) from public.visitas;  -- 0
-- select column_name from information_schema.columns
--   where table_schema = 'public' and table_name = 'sesiones'
--   and column_name in ('paquete','set','anticipo','telefono','nota');  -- 5 filas
