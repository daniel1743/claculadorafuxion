-- ============================================
-- FUNCIÓN: Actualizar Costo Promedio Ponderado (PPP)
-- Se ejecuta automáticamente después de cada compra
-- ============================================

-- ============================================
-- PASO 1: Crear función que calcula y actualiza el PPP
-- ============================================
CREATE OR REPLACE FUNCTION update_weighted_average_cost()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_current_stock INTEGER;
  v_current_ppp NUMERIC;
  v_purchase_cost NUMERIC;
  v_purchase_quantity INTEGER;
  v_total_units INTEGER;
  v_new_ppp NUMERIC;
BEGIN
  -- Solo procesar si es una compra (purchase)
  IF NEW.type != 'purchase' THEN
    RETURN NEW;
  END IF;

  -- Obtener product_id
  v_product_id := NEW.product_id;
  
  -- Si no hay product_id, no podemos actualizar
  IF v_product_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener estado actual del producto
  SELECT 
    current_stock_boxes,
    weighted_average_cost
  INTO 
    v_current_stock,
    v_current_ppp
  FROM products
  WHERE id = v_product_id;

  -- Si el producto no existe, no hacer nada
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Calcular costo y cantidad de la compra
  -- Si quantity_boxes > 0, usar eso; si no, calcular desde total_amount
  IF NEW.quantity_boxes > 0 THEN
    v_purchase_quantity := NEW.quantity_boxes;
    -- Calcular costo unitario de la compra
    v_purchase_cost := NEW.total_amount / NEW.quantity_boxes;
  ELSE
    -- Si no hay quantity_boxes, asumir que es 1 caja
    v_purchase_quantity := 1;
    v_purchase_cost := NEW.total_amount;
  END IF;

  -- Calcular nuevo PPP usando fórmula de promedio ponderado
  -- PPP = (Stock_Actual × PPP_Actual + Compra_Cantidad × Compra_Costo) / (Stock_Actual + Compra_Cantidad)
  
  -- Si es la primera compra (stock = 0), el PPP es simplemente el costo de compra
  IF v_current_stock = 0 OR v_current_ppp = 0 THEN
    v_new_ppp := v_purchase_cost;
  ELSE
    -- Calcular total de unidades después de la compra
    v_total_units := v_current_stock + v_purchase_quantity;
    
    -- Calcular nuevo PPP ponderado
    v_new_ppp := (
      (v_current_stock * v_current_ppp) + 
      (v_purchase_quantity * v_purchase_cost)
    ) / v_total_units;
  END IF;

  -- Actualizar el producto con el nuevo PPP
  UPDATE products
  SET 
    weighted_average_cost = v_new_ppp,
    updated_at = NOW()
  WHERE id = v_product_id;

  -- Guardar el PPP del momento en la transacción (snapshot histórico)
  NEW.unit_cost_snapshot := v_new_ppp;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PASO 2: Crear trigger que ejecuta la función
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_weighted_average_cost ON transactions;

CREATE TRIGGER trigger_update_weighted_average_cost
  BEFORE INSERT ON transactions
  FOR EACH ROW
  WHEN (NEW.type = 'purchase')
  EXECUTE FUNCTION update_weighted_average_cost();

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Para probar, ejecuta:
-- 1. Crear un producto
-- 2. Insertar una compra
-- 3. Verificar que weighted_average_cost se actualizó

-- Ejemplo de prueba:
/*
-- Crear producto de prueba
INSERT INTO products (user_id, name, list_price, sachets_per_box)
VALUES ('tu-user-id', 'Producto Test', 10000, 28);

-- Obtener el ID del producto
SELECT id FROM products WHERE name = 'Producto Test';

-- Insertar compra (reemplaza product_id con el ID real)
INSERT INTO transactions (user_id, product_id, type, quantity_boxes, total_amount, unit_cost_snapshot)
VALUES (
  'tu-user-id',
  'product-id-aqui',
  'purchase',
  4,  -- 4 cajas
  40000,  -- $40,000 total
  0  -- Se actualizará automáticamente
);

-- Verificar que el PPP se actualizó
SELECT name, weighted_average_cost, current_stock_boxes 
FROM products 
WHERE name = 'Producto Test';
-- Debería mostrar: weighted_average_cost = 10000 (40000/4)
*/

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Esta función se ejecuta ANTES de insertar la transacción
-- 2. Actualiza el PPP del producto automáticamente
-- 3. Guarda el PPP del momento en unit_cost_snapshot
-- 4. Solo procesa transacciones tipo 'purchase'
-- 5. Si el producto no existe, no hace nada (evita errores)
-- ============================================

