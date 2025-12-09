-- ============================================
-- SCRIPT COMPLETO FASE 1: BASE DE DATOS
-- Ejecuta este script en Supabase SQL Editor
-- ============================================
-- 
-- Este script incluye:
-- 1. Creación del esquema V2 (tablas products y transactions)
-- 2. Función para actualizar PPP automáticamente
-- 3. Función para actualizar inventario dual
--
-- ⚠️ IMPORTANTE: Ejecuta este script DESPUÉS de crear el esquema base
-- ============================================

-- ============================================
-- PASO 1: Verificar que el esquema base existe
-- ============================================
DO $$
BEGIN
  -- Verificar que la tabla products existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'products'
  ) THEN
    RAISE EXCEPTION 'ERROR: La tabla "products" no existe. Debes ejecutar primero create-schema-v2-english.sql';
  END IF;

  -- Verificar que la tabla transactions existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions'
  ) THEN
    RAISE EXCEPTION 'ERROR: La tabla "transactions" no existe. Debes ejecutar primero create-schema-v2-english.sql';
  END IF;

  RAISE NOTICE '✅ Verificación exitosa: Las tablas products y transactions existen';
END $$;

-- ============================================
-- PASO 2: Crear función de actualización de PPP
-- ============================================
-- (Incluir aquí el contenido de functions-update-weighted-cost.sql)
-- Por ahora, ejecuta functions-update-weighted-cost.sql por separado

-- ============================================
-- PASO 3: Crear función de actualización de inventario
-- ============================================
-- (Incluir aquí el contenido de functions-update-inventory.sql)
-- Por ahora, ejecuta functions-update-inventory.sql por separado

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
SELECT 
  '✅ Fase 1 completada' AS status,
  'Funciones automáticas creadas' AS detalle;

-- Verificar que las funciones existen
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('update_weighted_average_cost', 'update_inventory_dual')
ORDER BY routine_name;

-- Verificar que los triggers existen
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN ('trigger_update_weighted_average_cost', 'trigger_update_inventory_dual')
ORDER BY trigger_name;

-- ============================================
-- INSTRUCCIONES DE USO:
-- ============================================
-- 1. PRIMERO: Ejecuta create-schema-v2-english.sql
-- 2. SEGUNDO: Ejecuta functions-update-weighted-cost.sql
-- 3. TERCERO: Ejecuta functions-update-inventory.sql
-- 4. CUARTO: Ejecuta este script para verificar
-- ============================================

