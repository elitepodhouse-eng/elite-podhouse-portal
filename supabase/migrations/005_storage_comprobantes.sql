-- ================================================================
-- 005 — Storage: bucket `comprobantes` para subir archivos
-- Portal: elite-podhouse-portal | Proyecto: oyrqkymijfheshefkwpb
-- Estado: NO APLICADA. Aplicar en el SQL Editor de Supabase
-- (pegar el archivo completo y Run una sola vez). Es idempotente:
-- se puede correr de nuevo sin duplicar nada.
--
-- Qué agrega:
-- 1) Bucket privado `comprobantes` (los archivos NO son públicos;
--    el portal genera enlaces firmados de 1 hora para verlos).
-- 2) Políticas en storage.objects: solo usuarios con sesión
--    (rol authenticated) pueden subir, ver y borrar archivos del bucket.
-- Sin esta migración, la subida de comprobantes en Cobranza y en
-- Finanzas muestra un mensaje claro y el campo de texto sigue
-- funcionando como antes.
-- ================================================================

insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

drop policy if exists "comprobantes_select_auth" on storage.objects;
create policy "comprobantes_select_auth" on storage.objects
  for select to authenticated using (bucket_id = 'comprobantes');

drop policy if exists "comprobantes_insert_auth" on storage.objects;
create policy "comprobantes_insert_auth" on storage.objects
  for insert to authenticated with check (bucket_id = 'comprobantes');

drop policy if exists "comprobantes_delete_auth" on storage.objects;
create policy "comprobantes_delete_auth" on storage.objects
  for delete to authenticated using (bucket_id = 'comprobantes');

-- Verificación (correr después de aplicar):
-- select id, name, public from storage.buckets where id = 'comprobantes';  -- 1 fila, public = false
