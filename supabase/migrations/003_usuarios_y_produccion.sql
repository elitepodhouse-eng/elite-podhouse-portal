-- Migración 003 — Login con usuario (sin correo) y columna de responsable
-- ---------------------------------------------------------------------------
-- Agrega `usuario` a `clientes`: el nombre de usuario con el que cada
-- persona entra al portal sin correo. Por dentro, Supabase exige un correo,
-- así que cada usuario tiene uno interno sintético
-- `usuario@elitepodhouse.local` (nadie lo ve ni lo usa); el usuario solo
-- escribe su usuario y su contraseña.
--
-- El índice único parcial impide dos clientes con el mismo usuario y
-- permite NULL (los clientes que siguen entrando con su correo no
-- tienen usuario).
--
-- CÓMO APLICARLA (una sola vez):
--   Supabase Dashboard → SQL Editor → pegar este archivo → Run.
-- No toca ninguna tabla ni ningún dato existente.
-- Sin RLS, igual que las migraciones 001 y 002.

alter table public.clientes add column if not exists usuario text;

create unique index if not exists clientes_usuario_unique
  on public.clientes (usuario) where usuario is not null;
