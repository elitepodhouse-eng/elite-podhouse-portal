-- ================================================================
-- 006 — RLS para las tablas expuestas del portal
-- Portal: elite-podhouse-portal | Proyecto Supabase: cápsula de élite
-- (ref oyrqkymijfheshefkwpb)
-- Fecha: 24 nov 2026
--
-- POR QUÉ: el correo de Supabase del 22 nov 2026
-- (rls_disabled_in_public) avisó que hay tablas públicas sin
-- seguridad a nivel de fila. Verificado el 24 nov 2026 con la llave
-- anónima pública (la misma que lleva el frontend en Vercel), sin
-- login: 13 tablas devolvían datos reales y la escritura anónima
-- también estaba permitida (PATCH con filtro imposible -> 204).
--
-- QUÉ CUBRE: activa RLS y crea políticas en 16 tablas:
--   Con lectura de cliente (solo sus propias filas):
--     facturas, abonos, propuestas, cotizaciones, contratos,
--     episodios, contenidos, notas
--   Solo admin (Tania y Alejandro, sin acceso de clientes):
--     configuracion, movimientos, gastos_fijos, colaboradores,
--     pagos_colaboradores, facturas_fiscales, meses_fiscales, visitas
--
-- QUÉ NO TOCA (a propósito):
--   clientes, sesiones y pagos YA tienen RLS (la prueba anónima
--   devolvió 0 filas y la auditoría del 24 nov confirmó que RLS
--   bloquea la lectura anónima de sesiones). Sus 10 políticas del
--   21 nov 2026 se aplicaron por dashboard y NO están guardadas en
--   ningún archivo del repo, así que no se pueden reproducir aquí
--   sin verlas primero. No se tocan para no romperlas.
--
-- CÓMO APLICARLA (una sola vez):
--   Supabase Dashboard → SQL Editor → pegar este archivo → Run.
--   Es idempotente: se puede correr de nuevo sin duplicar nada
--   (cada política se borra antes de crearse).
--   NO usar el botón "Resolver problema" del correo de Supabase:
--   activa RLS sin políticas y el portal dejaría de leer todo.
--
-- CÓMO SE DECIDIÓ CADA POLÍTICA: leyendo el código del portal
-- (src/App.jsx, src/admin/*.jsx, src/lib/ops.js) y el DDL real de
-- las migraciones. El cliente se identifica por auth.uid(), que es
-- clientes.id (ver App.jsx línea 2398: ClientPortal recibe
-- userId = session.user.id). Los admins se identifican por correo,
-- igual que la corrección del 21 nov 2026:
--   lower(auth.jwt()->>'email') IN ('elitepodhouse@gmail.com',
--                                     'alejandrosevilla.work@gmail.com')
--
-- VERIFICACIÓN (después de aplicar, ver consultas comentadas al final).
-- ================================================================

-- ---------- facturas ----------
-- DDL: cliente_id uuid not null -> clientes(id).
-- La lee el cliente ("Lo que debes", App.jsx ClientPortal: select *
--   where cliente_id = userId) y el admin (Cobranza, ClienteDetalle,
--   Hoy, Facturacion). Solo el admin escribe (Cobranza: insert/delete).
alter table public.facturas enable row level security;
revoke all on public.facturas from anon;
drop policy if exists "facturas_admin_all" on public.facturas;
create policy "facturas_admin_all" on public.facturas
  for all to authenticated
  using (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'));
drop policy if exists "facturas_cliente_select" on public.facturas;
create policy "facturas_cliente_select" on public.facturas
  for select to authenticated
  using (cliente_id = auth.uid());

-- ---------- abonos ----------
-- DDL: factura_id uuid not null -> facturas(id). Sin cliente_id propio:
--   el cliente se resuelve por la factura (EXISTS sobre facturas).
-- El cliente los lee (ClientPortal los carga todos y filtra en JS por
--   sus factura_id; con RLS solo recibe los suyos y el filtro sigue
--   funcionando). Solo el admin escribe (Cobranza: insert/delete).
alter table public.abonos enable row level security;
revoke all on public.abonos from anon;
drop policy if exists "abonos_admin_all" on public.abonos;
create policy "abonos_admin_all" on public.abonos
  for all to authenticated
  using (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'));
drop policy if exists "abonos_cliente_select" on public.abonos;
create policy "abonos_cliente_select" on public.abonos
  for select to authenticated
  using (exists (
    select 1 from public.facturas as f
    where f.id = factura_id
      and f.cliente_id = auth.uid()
  ));

-- ---------- propuestas ----------
-- DDL: cliente_id uuid null -> clientes(id) + nombre text. Las filas
--   con cliente_id NULL son prospectos sin cliente ligado: ningún
--   cliente las ve (NULL <> auth.uid()).
-- Hoy SOLO la lee/escribe el admin (Propuestas.jsx, Hoy, ClienteDetalle).
-- Se da SELECT al cliente sobre sus propias filas para que una futura
--   vista de cliente pueda mostrarlas sin tocar RLS; hoy el frontend
--   no las consulta como cliente, así que no cambia nada visible.
alter table public.propuestas enable row level security;
revoke all on public.propuestas from anon;
drop policy if exists "propuestas_admin_all" on public.propuestas;
create policy "propuestas_admin_all" on public.propuestas
  for all to authenticated
  using (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'));
drop policy if exists "propuestas_cliente_select" on public.propuestas;
create policy "propuestas_cliente_select" on public.propuestas
  for select to authenticated
  using (cliente_id = auth.uid());

-- ---------- cotizaciones ----------
-- DDL: cliente_id uuid null -> clientes(id) + nombre text. Igual que
--   propuestas: solo admin en el frontend (Cotizador.jsx, Contratos.jsx,
--   ClienteDetalle); SELECT al cliente solo sobre sus propias filas.
alter table public.cotizaciones enable row level security;
revoke all on public.cotizaciones from anon;
drop policy if exists "cotizaciones_admin_all" on public.cotizaciones;
create policy "cotizaciones_admin_all" on public.cotizaciones
  for all to authenticated
  using (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'));
drop policy if exists "cotizaciones_cliente_select" on public.cotizaciones;
create policy "cotizaciones_cliente_select" on public.cotizaciones
  for select to authenticated
  using (cliente_id = auth.uid());

-- ---------- contratos ----------
-- DDL: cliente_id uuid null -> clientes(id), cotizacion_id -> cotizaciones(id).
-- Solo admin en el frontend (Contratos.jsx, ClienteDetalle); SELECT al
--   cliente solo sobre sus propias filas, igual que propuestas.
alter table public.contratos enable row level security;
revoke all on public.contratos from anon;
drop policy if exists "contratos_admin_all" on public.contratos;
create policy "contratos_admin_all" on public.contratos
  for all to authenticated
  using (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'));
drop policy if exists "contratos_cliente_select" on public.contratos;
create policy "contratos_cliente_select" on public.contratos
  for select to authenticated
  using (cliente_id = auth.uid());

-- ---------- episodios ----------
-- DDL: cliente_id uuid -> clientes(id).
-- El cliente los lee ("Mis entregas", select where cliente_id = userId)
--   y APRUEBA el episodio: DeliveriesView (App.jsx) hace update de
--   `estado` ("Episodio aprobado"). Por eso el cliente tiene UPDATE
--   sobre sus propias filas. Límite conocido: la política de UPDATE no
--   puede restringir la columna; un cliente podría, vía API directa,
--   cambiar otros campos de SUS episodios, pero nunca los de otro
--   cliente. El frontend solo actualiza `estado`. El admin hace ALL
--   (AdminEntregas, AdminProduccion, EpisodioDetalle: select/insert/
--   update de estado, responsable, comentarios, etc.).
alter table public.episodios enable row level security;
revoke all on public.episodios from anon;
drop policy if exists "episodios_admin_all" on public.episodios;
create policy "episodios_admin_all" on public.episodios
  for all to authenticated
  using (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'));
drop policy if exists "episodios_cliente_select" on public.episodios;
create policy "episodios_cliente_select" on public.episodios
  for select to authenticated
  using (cliente_id = auth.uid());
drop policy if exists "episodios_cliente_update" on public.episodios;
create policy "episodios_cliente_update" on public.episodios
  for update to authenticated
  using (cliente_id = auth.uid())
  with check (cliente_id = auth.uid());

-- ---------- contenidos ----------
-- DDL: sin cliente_id. Columnas: id, tipo ('tip'|'noticia'), titulo,
--   cuerpo, publicado, created_at.
-- El cliente solo lee los publicados (ClientPortal: select where
--   publicado = true, vista Tips y noticias). El admin hace ALL
--   (AdminTips: insert/update de publicado/delete).
alter table public.contenidos enable row level security;
revoke all on public.contenidos from anon;
drop policy if exists "contenidos_admin_all" on public.contenidos;
create policy "contenidos_admin_all" on public.contenidos
  for all to authenticated
  using (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'));
drop policy if exists "contenidos_cliente_select" on public.contenidos;
create policy "contenidos_cliente_select" on public.contenidos
  for select to authenticated
  using (publicado is true);

-- ---------- configuracion ----------
-- DDL: clave text primary key, valor, nombre. Sin cliente_id.
-- Solo la lee/escribe el admin (useConfig en Propuestas, Cotizador,
--   Contratos, Ajustes y Finanzas; upsert en Ajustes). El cliente NO
--   la consulta en ningún componente: los precios que ve vienen fijos
--   del código (PRECIOS_DEFAULT en lib/ops.js). Solo admin.
alter table public.configuracion enable row level security;
revoke all on public.configuracion from anon;
drop policy if exists "configuracion_admin_all" on public.configuracion;
create policy "configuracion_admin_all" on public.configuracion
  for all to authenticated
  using (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'));

-- ---------- movimientos ----------
-- DDL: id, tipo ('ingreso'|'egreso'), fecha, concepto, categoria,
--   monto, metodo, nota. Sin cliente_id. Es la hoja privada de
--   Finanzas: solo admin (Finanzas.jsx: select/insert/update/delete).
alter table public.movimientos enable row level security;
revoke all on public.movimientos from anon;
drop policy if exists "movimientos_admin_all" on public.movimientos;
create policy "movimientos_admin_all" on public.movimientos
  for all to authenticated
  using (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'));

-- ---------- gastos_fijos ----------
-- DDL: id, concepto, categoria, monto, metodo. Sin cliente_id.
-- Solo admin (Finanzas.jsx: select/insert/update/delete).
alter table public.gastos_fijos enable row level security;
revoke all on public.gastos_fijos from anon;
drop policy if exists "gastos_fijos_admin_all" on public.gastos_fijos;
create policy "gastos_fijos_admin_all" on public.gastos_fijos
  for all to authenticated
  using (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'));

-- ---------- colaboradores ----------
-- DDL: id, nombre, servicio, telefono, correo. Sin cliente_id.
-- Solo admin: Finanzas.jsx (select/insert/update) y el desplegable
--   de responsable en AdminEntregas/AdminProduccion (useColaboradores).
--   El cliente nunca lo consulta.
alter table public.colaboradores enable row level security;
revoke all on public.colaboradores from anon;
drop policy if exists "colaboradores_admin_all" on public.colaboradores;
create policy "colaboradores_admin_all" on public.colaboradores
  for all to authenticated
  using (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'));

-- ---------- pagos_colaboradores ----------
-- DDL: colaborador_id uuid not null -> colaboradores(id). Sin cliente_id.
-- Solo admin (Finanzas.jsx: select/insert/delete).
alter table public.pagos_colaboradores enable row level security;
revoke all on public.pagos_colaboradores from anon;
drop policy if exists "pagos_colaboradores_admin_all" on public.pagos_colaboradores;
create policy "pagos_colaboradores_admin_all" on public.pagos_colaboradores
  for all to authenticated
  using (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'));

-- ---------- facturas_fiscales ----------
-- DDL: cobranza_id uuid -> facturas(id), cliente text (nombre, no id).
--   Solo admin (Facturacion.jsx: select/insert/update de cobrada y
--   estado). El cliente nunca la consulta en el frontend, así que
--   queda solo admin aunque se podría ligar por facturas.cliente_id.
alter table public.facturas_fiscales enable row level security;
revoke all on public.facturas_fiscales from anon;
drop policy if exists "facturas_fiscales_admin_all" on public.facturas_fiscales;
create policy "facturas_fiscales_admin_all" on public.facturas_fiscales
  for all to authenticated
  using (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'));

-- ---------- meses_fiscales ----------
-- DDL: mes text primary key (YYYY-MM), iva_acreditable, presentada, nota.
--   Sin cliente_id. Solo admin (Facturacion.jsx: select/upsert).
alter table public.meses_fiscales enable row level security;
revoke all on public.meses_fiscales from anon;
drop policy if exists "meses_fiscales_admin_all" on public.meses_fiscales;
create policy "meses_fiscales_admin_all" on public.meses_fiscales
  for all to authenticated
  using (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'));

-- ---------- notas ----------
-- DDL: id, cliente_id uuid -> clientes(id), tipo, contenido.
-- El cliente lee las suyas ("Mi set", ClientPortal: select where
--   cliente_id = userId). Solo el admin escribe (AdminNotas: insert
--   con cliente_id del cliente elegido). El admin nunca hace select
--   de esta tabla en el frontend (las notas que ve en ClienteDetalle
--   son la columna clientes.notas, otra cosa).
alter table public.notas enable row level security;
revoke all on public.notas from anon;
drop policy if exists "notas_admin_all" on public.notas;
create policy "notas_admin_all" on public.notas
  for all to authenticated
  using (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'));
drop policy if exists "notas_cliente_select" on public.notas;
create policy "notas_cliente_select" on public.notas
  for select to authenticated
  using (cliente_id = auth.uid());

-- ---------- visitas ----------
-- DDL (migración 004): cliente_id uuid null -> clientes(id), nombre,
--   telefono, fecha, hora, duracion, notas.
-- Solo admin (AdminSesiones en App.jsx: select/insert/delete). El
--   cliente nunca la consulta.
alter table public.visitas enable row level security;
revoke all on public.visitas from anon;
drop policy if exists "visitas_admin_all" on public.visitas;
create policy "visitas_admin_all" on public.visitas
  for all to authenticated
  using (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'));

-- ---------- pagos (agregado 24 nov 2026, tras verificar) ----------
-- La verificación posterior encontró que pagos tenía rowsecurity=false
--   y CERO políticas: no estaba protegida, solo parecía estarlo porque
--   hoy está vacía (0 filas). Pero el portal SÍ la usa: el cliente lee
--   sus pagos (App.jsx:1189, select where cliente_id = userId) y el
--   admin los lee/inserta/borra (App.jsx:2077, 2102, 2113;
--   ClienteDetalle.jsx:67). En cuanto el estudio registrara un pago
--   manual, quedaba público. Mismo patrón que facturas: admin ALL +
--   cliente SELECT de sus propias filas (cliente_id = auth.uid()).
alter table public.pagos enable row level security;
revoke all on public.pagos from anon;
drop policy if exists "pagos_admin_all" on public.pagos;
create policy "pagos_admin_all" on public.pagos
  for all to authenticated
  using (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'))
  with check (lower((auth.jwt() ->> 'email')) in ('elitepodhouse@gmail.com', 'alejandrosevilla.work@gmail.com'));
drop policy if exists "pagos_cliente_select" on public.pagos;
create policy "pagos_cliente_select" on public.pagos
  for select to authenticated
  using (cliente_id = auth.uid());

-- ---------- notas: borrar 2 políticas viejas duplicadas ----------
-- Al aplicar la 006 aparecieron 2 políticas previas en notas que no
--   estaban en ningún archivo: admin_gestiona_notas (ALL, rol public,
--   qual = correos admin) y cliente_ve_sus_notas (SELECT, rol public,
--   qual auth.uid() = cliente_id). Tienen EL MISMO EFECTO que las
--   nuevas notas_admin_all y notas_cliente_select y no abren ningún
--   hueco (verificado por su qual y por la prueba anónima: notas -> 401).
--   Se borran para no dejar duplicados que confundan.
drop policy if exists "admin_gestiona_notas" on public.notas;
drop policy if exists "cliente_ve_sus_notas" on public.notas;

-- ================================================================
-- VERIFICACIÓN (correr DESPUÉS de aplicar, en el SQL Editor;
--   son solo lecturas, no cambian datos):
--
-- 1) RLS activo en las 16 tablas (rowsecurity = true, 16 filas):
-- select schemaname, tablename, rowsecurity
--   from pg_tables
--   where schemaname = 'public'
--     and tablename in ('facturas','abonos','propuestas','cotizaciones',
--       'contratos','episodios','contenidos','configuracion','movimientos',
--       'gastos_fijos','colaboradores','pagos_colaboradores',
--       'facturas_fiscales','meses_fiscales','notas','visitas')
--   order by tablename;
--
-- 2) Políticas creadas por esta migración (25 políticas):
--    admin ALL x16 (una por tabla) + cliente_select x8 (facturas,
--    abonos, propuestas, cotizaciones, contratos, episodios,
--    contenidos, notas) + episodios_cliente_update x1 = 25.
-- select schemaname, tablename, policyname, permissive, roles, cmd
--   from pg_policies
--   where schemaname = 'public'
--     and tablename in ('facturas','abonos','propuestas','cotizaciones',
--       'contratos','episodios','contenidos','configuracion','movimientos',
--       'gastos_fijos','colaboradores','pagos_colaboradores',
--       'facturas_fiscales','meses_fiscales','notas','visitas')
--   order by tablename, policyname;
--
-- 3) IMPORTANTE: revisar que NO quede ninguna otra política en estas
--    tablas (por ejemplo, alguna permisiva del 21 nov 2026 con otro
--    nombre, del tipo "select para authenticated sin filtro"): las
--    políticas permisivas se SUMAN (OR), así que una política vieja
--    y amplia dejaría el hueco abierto aunque esta migración esté
--    aplicada. Si aparece alguna que no sea de esta lista, revisarla
--    y borrarla con: drop policy if exists "<nombre>" on public.<tabla>;
--
-- 4) Prueba anónima (repetir la del 24 nov con la llave anónima):
--    cada tabla debe devolver 0 filas / 401. Y entrar al portal como
--    admin (elitepodhouse@gmail.com) y como cliente (p. ej. Luis
--    David): el admin ve todo; el cliente solo ve sus facturas,
--    abonos, episodios y notas, y los contenidos publicados.
-- ================================================================
