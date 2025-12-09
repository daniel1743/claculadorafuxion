-- ============================================
-- VERIFICAR TABLAS EXISTENTES (Español vs Inglés)
-- Ejecuta esto para ver qué tablas tienes realmente
-- ============================================

-- Ver TODAS las tablas en el esquema public
SELECT 
  table_name AS nombre_tabla,
  CASE 
    WHEN table_name = 'products' THEN '✅ Tabla V2 (Inglés)'
    WHEN table_name = 'productos' THEN '⚠️ Tabla antigua (Español)'
    WHEN table_name = 'transactions' THEN '✅ Tabla V2 (Inglés)'
    WHEN table_name = 'transacciones' THEN '⚠️ Tabla antigua (Español)'
    WHEN table_name = 'prices' THEN 'ℹ️ Tabla V1 (Inglés)'
    WHEN table_name = 'precios' THEN 'ℹ️ Tabla V1 (Español)'
    ELSE '❓ Otra tabla'
  END AS estado
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verificar columnas de transacciones (si existe en español)
SELECT 
  'transacciones' AS tabla,
  column_name AS columna,
  data_type AS tipo_dato,
  is_nullable AS puede_ser_nulo
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'transacciones'
ORDER BY ordinal_position;

-- Verificar columnas de transactions (si existe en inglés)
SELECT 
  'transactions' AS tabla,
  column_name AS columna,
  data_type AS tipo_dato,
  is_nullable AS puede_ser_nulo
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'transactions'
ORDER BY ordinal_position;

-- Verificar si existe productos (español)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'productos'
    ) THEN '✅ Existe tabla "productos" (español)'
    ELSE '❌ No existe tabla "productos"'
  END AS resultado;

-- Verificar si existe products (inglés)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'products'
    ) THEN '✅ Existe tabla "products" (inglés)'
    ELSE '❌ No existe tabla "products"'
  END AS resultado;

