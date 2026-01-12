-- ============================================
-- SCRIPT SIMPLIFICADO: Obtener User ID y Verificar Datos
-- Ejecuta este script en SQL Editor de Supabase
-- ============================================

-- PASO 1: Obtener tu User ID
-- Copia este resultado y úsalo en los siguientes pasos
SELECT 
  'TU_USER_ID' as informacion,
  auth.uid()::text as user_id;

-- PASO 2: Verificar todas las tablas de una vez
-- Este query usa auth.uid() automáticamente
SELECT 
  'RESUMEN DE DATOS' as tipo,
  (SELECT COUNT(*) FROM transactions WHERE user_id = auth.uid()) as transacciones,
  (SELECT COUNT(*) FROM products WHERE user_id = auth.uid()) as productos,
  (SELECT COUNT(*) FROM loans WHERE user_id = auth.uid()) as prestamos,
  (SELECT COUNT(*) FROM prices WHERE user_id = auth.uid()) as precios;

-- PASO 3: Ver detalles de transacciones (si existen)
SELECT 
  'DETALLES TRANSACCIONES' as tipo,
  id,
  type,
  product_id,
  quantity_boxes,
  total_amount,
  created_at
FROM transactions
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;

-- PASO 4: Verificar productos
SELECT 
  'DETALLES PRODUCTOS' as tipo,
  id,
  name,
  list_price,
  current_stock_boxes,
  weighted_average_cost
FROM products
WHERE user_id = auth.uid()
ORDER BY name
LIMIT 10;


