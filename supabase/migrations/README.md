# Migraciones del portal Élite Podhouse

- `001_portal_inicio.sql` — columnas opcionales `modalidad`, `set`, `sesiones_incluidas` en `clientes` (aplicada 19 nov 2026).
- `002_finanzas_facturacion.sql` — tablas `movimientos`, `gastos_fijos`, `facturas_fiscales`, `meses_fiscales` (aplicada 19 nov 2026).
- `003_usuarios_y_produccion.sql` — columna `usuario` en `clientes` + índice único parcial (aplicada 21 nov 2026).

## Nota: el DDL de las tablas de Élite OS NO está aquí

Las tablas `facturas`, `abonos`, `propuestas`, `cotizaciones`, `contratos`, `colaboradores`, `pagos_colaboradores` y `configuracion` se crearon el 19 nov 2026 desde el archivo `migracion.sql` (que vive en `~/workspace/goals/lite-podhouse-client-portal/hidden_files/migracion-hoja-principal/`), aplicado en el SQL Editor de Supabase junto con los ALTERs de `clientes` y `episodios` de esa migración. Ese archivo contiene datos reales de la hoja (y la CLABE/RFC de Tania), así que no se copia al repo. Si hay que recrear la base desde cero, primero se aplica `migracion.sql` (solo su parte DDL) y luego las migraciones 001–003 de esta carpeta.
