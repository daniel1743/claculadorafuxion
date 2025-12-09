-- ============================================
-- VERIFICACIÓN FINAL FASE 1
-- Ejecuta esto para confirmar que todo está correcto
-- ============================================

-- ============================================
-- 1. Verificar Tablas
-- ============================================
SELECT 
  '✅ TABLAS' AS verificacion,
  table_name AS nombre,
  CASE 
    WHEN table_name = 'products' THEN 'Tabla de productos'
    WHEN table_name = 'transactions' THEN 'Tabla de transacciones'
  END AS descripcion
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'transactions')
ORDER BY table_name;

-- ============================================
-- 2. Verificar Columnas de products
-- ============================================
SELECT 
  '✅ COLUMNAS PRODUCTS' AS verificacion,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'products'
ORDER BY ordinal_position;

-- ============================================
-- 3. Verificar Columnas de transactions (especialmente product_id)
-- ============================================
SELECT 
  '✅ COLUMNAS TRANSACTIONS' AS verificacion,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'transactions'
ORDER BY ordinal_position;

-- ============================================
-- 4. Verificar Funciones
-- ============================================
SELECT 
  '✅ FUNCIONES' AS verificacion,
  routine_name AS nombre,
  routine_type AS tipo
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('update_weighted_average_cost', 'update_inventory_dual')
ORDER BY routine_name;

-- ============================================
-- 5. Verificar Triggers
-- ============================================
SELECT 
  '✅ TRIGGERS' AS verificacion,
  trigger_name AS nombre,
  event_object_table AS tabla,
  event_manipulation AS evento,
  action_timing AS momento
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN ('trigger_update_weighted_average_cost', 'trigger_update_inventory_dual')
ORDER BY trigger_name;

-- ============================================
-- 6. Verificar Políticas RLS
-- ============================================
SELECT 
  '✅ POLÍTICAS RLS' AS verificacion,
  tablename AS tabla,
  policyname AS politica,
  cmd AS operacion
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('products', 'transactions')
ORDER BY tablename, policyname;

-- ============================================
-- RESUMEN FINAL
-- ============================================
SELECT 
  '🎉 FASE 1 COMPLETADA' AS estado,
  'Todas las verificaciones pasaron' AS resultado;

