-- ============================================
-- SCRIPT DE MIGRACIÓN DE DATOS V1 → V2
-- ⚠️ EJECUTAR SOLO DESPUÉS DE CREAR EL ESQUEMA V2
-- Este script migra datos de las tablas antiguas a las nuevas
-- ============================================

-- ============================================
-- VERIFICACIÓN PREVIA: Asegurar que las tablas existen
-- ============================================
DO $$
BEGIN
  -- Verificar que la tabla products existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'products'
  ) THEN
    RAISE EXCEPTION 'ERROR: La tabla "products" no existe. Debes ejecutar primero supabase-schema-v2.sql';
  END IF;

  -- Verificar que la tabla transactions existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions'
  ) THEN
    RAISE EXCEPTION 'ERROR: La tabla "transactions" no existe. Debes ejecutar primero supabase-schema-v2.sql';
  END IF;

  RAISE NOTICE '✅ Verificación exitosa: Las tablas products y transactions existen';
END $$;

-- ============================================
-- PASO 1: Migrar productos desde 'prices' a 'products'
-- ============================================
INSERT INTO products (user_id, name, list_price, weighted_average_cost, created_at, updated_at)
SELECT DISTINCT
  p.user_id,
  p.product_name AS name,
  p.price AS list_price,
  COALESCE(
    (SELECT AVG(real_unit_cost) 
     FROM transactions t 
     WHERE t.product_name = p.product_name 
     AND t.user_id = p.user_id 
     AND t.type = 'compra' 
     AND t.real_unit_cost IS NOT NULL 
     AND t.real_unit_cost > 0),
    p.price
  ) AS weighted_average_cost,
  MIN(p.created_at) AS created_at,
  MAX(p.updated_at) AS updated_at
FROM prices p
WHERE NOT EXISTS (
  SELECT 1 FROM products pr 
  WHERE pr.user_id = p.user_id 
  AND pr.name = p.product_name
)
GROUP BY p.user_id, p.product_name, p.price;

-- ============================================
-- PASO 2: Calcular inventario inicial desde transacciones antiguas
-- ============================================
UPDATE products p
SET 
  current_stock_boxes = COALESCE((
    SELECT 
      SUM(
        CASE 
          WHEN t.type = 'compra' THEN t.quantity
          WHEN t.type = 'venta' THEN -t.quantity
          ELSE 0
        END
      )
    FROM transactions t
    WHERE t.product_name = p.name
    AND t.user_id = p.user_id
    AND t.type IN ('compra', 'venta')
  ), 0),
  current_marketing_stock = 0  -- Inicializar en 0, se ajustará con nuevas transacciones
WHERE EXISTS (
  SELECT 1 FROM transactions t
  WHERE t.product_name = p.name
  AND t.user_id = p.user_id
);

-- ============================================
-- PASO 3: Migrar transacciones antiguas a nuevo formato
-- ============================================
INSERT INTO transactions (
  user_id,
  created_at,
  product_id,
  type,
  quantity_boxes,
  quantity_sachets,
  total_amount,
  unit_cost_snapshot,
  notes,
  updated_at
)
SELECT 
  t.user_id,
  COALESCE(t.date, t.created_at) AS created_at,
  pr.id AS product_id,
  CASE 
    WHEN t.type = 'compra' THEN 'purchase'::transaction_type
    WHEN t.type = 'venta' THEN 'sale'::transaction_type
    ELSE 'purchase'::transaction_type  -- Default para otros tipos
  END AS type,
  t.quantity AS quantity_boxes,
  0 AS quantity_sachets,  -- Las transacciones antiguas no tenían sobres separados
  COALESCE(t.total, t.price * t.quantity) AS total_amount,
  COALESCE(t.real_unit_cost, t.price, 0) AS unit_cost_snapshot,
  COALESCE(t.description, t.campaign_name) AS notes,
  t.updated_at
FROM transactions t
LEFT JOIN products pr ON pr.user_id = t.user_id AND pr.name = t.product_name
WHERE t.type IN ('compra', 'venta')
AND pr.id IS NOT NULL
AND NOT EXISTS (
  -- Evitar duplicados si ya migraste antes
  SELECT 1 FROM transactions t2
  WHERE t2.user_id = t.user_id
  AND t2.created_at = COALESCE(t.date, t.created_at)
  AND t2.product_id = pr.id
  AND t2.type::text = CASE 
    WHEN t.type = 'compra' THEN 'purchase'
    WHEN t.type = 'venta' THEN 'sale'
    ELSE 'purchase'
  END
);

-- ============================================
-- PASO 4: Migrar transacciones de publicidad (sin producto)
-- ============================================
-- Nota: Las transacciones de publicidad no tienen producto asociado
-- Puedes mantenerlas en la tabla antigua o crear un producto especial "Publicidad"
-- Por ahora, las dejamos en la tabla antigua para referencia histórica

-- ============================================
-- VERIFICACIÓN: Revisar datos migrados
-- ============================================
-- Ejecuta estas consultas para verificar la migración:

-- Ver productos migrados
SELECT COUNT(*) as total_products FROM products;

-- Ver transacciones migradas
SELECT 
  type,
  COUNT(*) as count
FROM transactions
GROUP BY type;

-- Verificar inventario calculado
SELECT 
  name,
  current_stock_boxes,
  current_marketing_stock,
  weighted_average_cost,
  list_price
FROM products
ORDER BY name;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Este script asume que las transacciones antiguas usaban solo cajas
-- 2. quantity_sachets se inicializa en 0 para transacciones antiguas
-- 3. Las transacciones de publicidad no se migran (no tienen producto)
-- 4. Revisa los resultados antes de eliminar las tablas antiguas
-- 5. Puedes mantener las tablas antiguas como backup por un tiempo
-- ============================================

