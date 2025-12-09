-- ============================================
-- MIGRAR DATOS DE TABLAS EN ESPAÑOL A INGLÉS
-- ⚠️ EJECUTAR SOLO DESPUÉS DE:
--   1. Ejecutar create-schema-v2-english.sql
--   2. Verificar que products y transactions existen
-- ============================================

-- ============================================
-- VERIFICACIÓN PREVIA
-- ============================================
DO $$
BEGIN
  -- Verificar que la tabla products existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'products'
  ) THEN
    RAISE EXCEPTION 'ERROR: La tabla "products" no existe. Ejecuta primero create-schema-v2-english.sql';
  END IF;

  -- Verificar que la tabla transactions existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions'
  ) THEN
    RAISE EXCEPTION 'ERROR: La tabla "transactions" no existe. Ejecuta primero create-schema-v2-english.sql';
  END IF;

  RAISE NOTICE '✅ Verificación exitosa: Las tablas products y transactions existen';
END $$;

-- ============================================
-- PASO 1: Migrar productos desde 'prices' a 'products'
-- ============================================
-- Si existe la tabla 'prices' (inglés)
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
GROUP BY p.user_id, p.product_name, p.price
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 2: Migrar desde 'transacciones' (español) si existe
-- ============================================
-- Primero, crear productos desde transacciones antiguas
INSERT INTO products (user_id, name, list_price, weighted_average_cost, created_at, updated_at)
SELECT DISTINCT
  t.user_id,
  t.nombre_del_prod AS name,
  COALESCE(t.precio, 0) AS list_price,
  COALESCE(
    (SELECT AVG(costo_unitario) 
     FROM transacciones t2 
     WHERE t2.nombre_del_prod = t.nombre_del_prod 
     AND t2.user_id = t.user_id 
     AND t2.tipo = 'compra' 
     AND t2.costo_unitario IS NOT NULL 
     AND t2.costo_unitario > 0),
    COALESCE(t.precio, 0)
  ) AS weighted_average_cost,
  MIN(COALESCE(t.fecha, t.creado_en)) AS created_at,
  MAX(t.actualizado_en) AS updated_at
FROM transacciones t
WHERE t.nombre_del_prod IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM products pr 
  WHERE pr.user_id = t.user_id 
  AND pr.name = t.nombre_del_prod
)
GROUP BY t.user_id, t.nombre_del_prod, t.precio
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 3: Calcular inventario inicial desde transacciones antiguas
-- ============================================
-- Desde 'transacciones' (español)
UPDATE products p
SET 
  current_stock_boxes = COALESCE((
    SELECT 
      SUM(
        CASE 
          WHEN t.tipo = 'compra' THEN t.cantidad
          WHEN t.tipo = 'venta' THEN -t.cantidad
          ELSE 0
        END
      )
    FROM transacciones t
    WHERE t.nombre_del_prod = p.name
    AND t.user_id = p.user_id
    AND t.tipo IN ('compra', 'venta')
  ), 0),
  current_marketing_stock = 0
WHERE EXISTS (
  SELECT 1 FROM transacciones t
  WHERE t.nombre_del_prod = p.name
  AND t.user_id = p.user_id
);

-- ============================================
-- PASO 4: Migrar transacciones desde 'transacciones' (español) a 'transactions' (inglés)
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
  COALESCE(t.fecha, t.creado_en) AS created_at,
  pr.id AS product_id,
  CASE 
    WHEN t.tipo = 'compra' THEN 'purchase'::transaction_type
    WHEN t.tipo = 'venta' THEN 'sale'::transaction_type
    ELSE 'purchase'::transaction_type
  END AS type,
  COALESCE(t.cantidad, 0) AS quantity_boxes,
  0 AS quantity_sachets,
  COALESCE(t.total, t.precio * COALESCE(t.cantidad, 0), 0) AS total_amount,
  COALESCE(t.costo_unitario, t.precio, 0) AS unit_cost_snapshot,
  COALESCE(t.descripcion, t.nombre_de_campa) AS notes,
  t.actualizado_en AS updated_at
FROM transacciones t
LEFT JOIN products pr ON pr.user_id = t.user_id AND pr.name = t.nombre_del_prod
WHERE t.tipo IN ('compra', 'venta')
AND pr.id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM transactions t2
  WHERE t2.user_id = t.user_id
  AND t2.created_at = COALESCE(t.fecha, t.creado_en)
  AND t2.product_id = pr.id
  AND t2.type::text = CASE 
    WHEN t.tipo = 'compra' THEN 'purchase'
    WHEN t.tipo = 'venta' THEN 'sale'
    ELSE 'purchase'
  END
);

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
SELECT 
  '✅ Migración completada' AS status,
  (SELECT COUNT(*) FROM products) AS total_productos,
  (SELECT COUNT(*) FROM transactions) AS total_transacciones;

