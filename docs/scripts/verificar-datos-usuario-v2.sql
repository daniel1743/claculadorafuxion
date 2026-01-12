-- ============================================
-- SCRIPT DE VERIFICACIÓN DE DATOS (VERSIÓN 2)
-- Ejecuta este script en SQL Editor de Supabase
-- Este script usa auth.uid() automáticamente - NO necesitas cambiar nada
-- ============================================

-- PASO 1: Obtener tu user_id actual
SELECT 
  'Tu User ID' as informacion,
  auth.uid()::text as user_id;

-- PASO 2: Verificar transacciones en tabla V2 (nueva estructura)
SELECT 
  'Transacciones V2' as tabla,
  COUNT(*) as total_registros
FROM transactions
WHERE user_id = auth.uid();

-- PASO 3: Verificar productos
SELECT 
  'Productos' as tabla,
  COUNT(*) as total_registros
FROM products
WHERE user_id = auth.uid();

-- PASO 4: Verificar préstamos
SELECT 
  'Préstamos' as tabla,
  COUNT(*) as total_registros
FROM loans
WHERE user_id = auth.uid();

-- PASO 5: Verificar precios
SELECT 
  'Precios' as tabla,
  COUNT(*) as total_registros
FROM prices
WHERE user_id = auth.uid();

-- PASO 6: Ver detalles de transacciones V2 (primeras 10)
SELECT 
  id,
  type,
  product_id,
  quantity_boxes,
  quantity_sachets,
  total_amount,
  created_at
FROM transactions
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;

-- PASO 7: Verificar si hay problemas con productos relacionados
SELECT 
  t.id as transaction_id,
  t.type,
  t.product_id,
  p.name as product_name,
  CASE 
    WHEN p.id IS NULL THEN 'PRODUCTO NO ENCONTRADO'
    ELSE 'OK'
  END as estado_producto
FROM transactions t
LEFT JOIN products p ON t.product_id = p.id
WHERE t.user_id = auth.uid()
ORDER BY t.created_at DESC
LIMIT 10;

-- PASO 8: RESUMEN COMPLETO - Todas las tablas
SELECT 
  'RESUMEN GENERAL' as tipo,
  (SELECT COUNT(*) FROM transactions WHERE user_id = auth.uid()) as transacciones,
  (SELECT COUNT(*) FROM products WHERE user_id = auth.uid()) as productos,
  (SELECT COUNT(*) FROM loans WHERE user_id = auth.uid()) as prestamos,
  (SELECT COUNT(*) FROM prices WHERE user_id = auth.uid()) as precios;


