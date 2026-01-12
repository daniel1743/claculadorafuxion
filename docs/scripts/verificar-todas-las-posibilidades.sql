-- ============================================
-- VERIFICACIÓN COMPLETA - TODAS LAS POSIBILIDADES
-- Este script verifica datos en todas las estructuras posibles
-- ============================================

-- 1. Obtener tu User ID
SELECT 
  'Tu User ID' as informacion,
  auth.uid()::text as user_id;

-- 2. Verificar si hay datos en tabla transactions V2 (nueva estructura)
SELECT 
  'Transacciones V2 (con product_id)' as tipo,
  COUNT(*) as total
FROM transactions
WHERE user_id = auth.uid()
  AND product_id IS NOT NULL;

-- 3. Verificar si hay datos en tabla transactions antigua (con product_name)
SELECT 
  'Transacciones Antigua (con product_name)' as tipo,
  COUNT(*) as total
FROM transactions
WHERE user_id = auth.uid()
  AND product_name IS NOT NULL;

-- 4. Verificar TODAS las transacciones sin importar estructura
SELECT 
  'TODAS las Transacciones' as tipo,
  COUNT(*) as total
FROM transactions
WHERE user_id = auth.uid();

-- 5. Verificar productos
SELECT 
  'Productos' as tipo,
  COUNT(*) as total
FROM products
WHERE user_id = auth.uid();

-- 6. Verificar préstamos
SELECT 
  'Préstamos' as tipo,
  COUNT(*) as total
FROM loans
WHERE user_id = auth.uid();

-- 7. Verificar precios
SELECT 
  'Precios' as tipo,
  COUNT(*) as total
FROM prices
WHERE user_id = auth.uid();

-- 8. Ver TODOS los usuarios en la base de datos (para verificar si hay datos de otro usuario)
SELECT 
  'Usuarios en BD' as tipo,
  COUNT(DISTINCT user_id) as total_usuarios
FROM transactions;

-- 9. Ver estructura de la tabla transactions (para entender qué columnas tiene)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'transactions'
ORDER BY ordinal_position;

-- 10. Ver muestra de datos (si existen)
SELECT 
  'MUESTRA DE DATOS' as tipo,
  id,
  type,
  product_id,
  product_name,
  quantity_boxes,
  quantity,
  created_at
FROM transactions
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;


