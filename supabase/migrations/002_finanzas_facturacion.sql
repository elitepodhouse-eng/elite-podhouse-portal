-- Migración 002 — Portal Élite Podhouse: Finanzas y Facturación (Élite OS)
-- ---------------------------------------------------------------------------
-- ESTADO (19 nov 2026): la migración 001 + DDL de la hoja principal ya creó
-- facturas, abonos, propuestas, cotizaciones, contratos, colaboradores,
-- pagos_colaboradores y configuracion. Faltan estas 4 tablas, que usan los
-- módulos Finanzas y Facturación del portal. Sin RLS (igual que las demás
-- tablas del portal hoy); el acceso lo controla el login de admin del portal.
--
-- CÓMO APLICARLA (una sola vez):
--   Supabase Dashboard → SQL Editor → pegar este archivo → Run.
-- No toca las tablas existentes ni sus datos.
-- ---------------------------------------------------------------------------

-- Movimientos de Finanzas (hoja privada Movimientos!A2:H).
create table if not exists public.movimientos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('ingreso', 'egreso')),
  fecha date,
  concepto text not null,
  categoria text,
  monto numeric not null,
  metodo text,
  nota text,
  created_at timestamptz not null default now()
);

-- Gastos fijos / recurrentes (hoja privada Recurrentes!A2:F).
create table if not exists public.gastos_fijos (
  id uuid primary key default gen_random_uuid(),
  concepto text not null,
  categoria text,
  monto numeric not null,
  metodo text,
  created_at timestamptz not null default now()
);

-- Facturas fiscales (hoja privada Facturacion!A2:M).
create table if not exists public.facturas_fiscales (
  id uuid primary key default gen_random_uuid(),
  cobranza_id uuid references public.facturas(id),
  fecha date,
  folio text,
  cliente text,
  concepto text,
  subtotal numeric,
  iva numeric,
  es_moral boolean not null default false,
  cobrada boolean not null default false,
  fecha_cobro date,
  estado text not null default 'Vigente' check (estado in ('Vigente', 'Cancelada')),
  nota text,
  created_at timestamptz not null default now()
);

-- Mes fiscal / declaración RESICO (hoja privada FiscalMes!A2:D).
create table if not exists public.meses_fiscales (
  mes text primary key, -- YYYY-MM
  iva_acreditable numeric not null default 0,
  presentada text,
  nota text,
  created_at timestamptz not null default now()
);
