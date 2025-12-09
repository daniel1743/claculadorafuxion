-- ============================================
-- SCRIPT DE VERIFICACIÓN Y DIAGNÓSTICO
-- Ejecuta este script para verificar el estado del esquema
-- ============================================

-- Verificar si el tipo ENUM existe
SELECT EXISTS (
  SELECT 1 FROM pg_type WHERE typname = 'transaction_type'
) AS enum_exists;

-- Verificar si las tablas existen
SELECT 
  table_name,
  CASE WHEN table_name = 'products' THEN '✅ Existe' ELSE '❌ No existe' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'transactions', 'productos', 'transacciones')
ORDER BY table_name;

-- Verificar columnas de products (si existe)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'products'
ORDER BY ordinal_position;

-- Verificar columnas de transactions (si existe)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'transactions'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('products', 'transactions')
ORDER BY tablename, policyname;

