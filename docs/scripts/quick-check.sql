-- ============================================
-- VERIFICACIÓN RÁPIDA - ¿Qué tablas existen?
-- Ejecuta esto primero para diagnosticar
-- ============================================

-- Ver todas las tablas en el esquema public
SELECT 
  table_name,
  CASE 
    WHEN table_name = 'products' THEN '✅ Necesaria para V2'
    WHEN table_name = 'transactions' THEN '✅ Necesaria para V2'
    WHEN table_name = 'prices' THEN '⚠️ Tabla antigua (V1)'
    WHEN table_name = 'profiles' THEN 'ℹ️ Tabla de perfiles'
    ELSE '❓ Otra tabla'
  END AS estado
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verificar si products existe y tiene las columnas correctas
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'products'
    ) THEN '✅ La tabla products EXISTE'
    ELSE '❌ La tabla products NO EXISTE - Necesitas ejecutar supabase-schema-v2.sql'
  END AS resultado_products;

-- Verificar si transactions existe y tiene las columnas correctas
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'transactions'
    ) THEN '✅ La tabla transactions EXISTE'
    ELSE '❌ La tabla transactions NO EXISTE - Necesitas ejecutar supabase-schema-v2.sql'
  END AS resultado_transactions;

-- Si products existe, mostrar sus columnas
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'products'
ORDER BY ordinal_position;

-- Si transactions existe, mostrar sus columnas
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'transactions'
ORDER BY ordinal_position;

