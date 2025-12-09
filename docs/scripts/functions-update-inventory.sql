-- ============================================
-- FUNCIÓN: Actualizar Inventario Dual (Cajas y Sobres)
-- Se ejecuta automáticamente después de cada transacción
-- ============================================

-- ============================================
-- PASO 1: Función para actualizar inventario según tipo de transacción
-- ============================================
CREATE OR REPLACE FUNCTION update_inventory_dual()
RETURNS TRIGGER AS $$
DECLARE
  v_product_id UUID;
  v_current_boxes INTEGER;
  v_current_sachets INTEGER;
  v_sachets_per_box INTEGER;
  v_boxes_to_open INTEGER;
  v_sachets_needed INTEGER;
  v_remaining_sachets INTEGER;
BEGIN
  -- Obtener product_id
  v_product_id := NEW.product_id;
  
  -- Si no hay product_id, no podemos actualizar
  IF v_product_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener estado actual del producto
  SELECT 
    current_stock_boxes,
    current_marketing_stock,
    sachets_per_box
  INTO 
    v_current_boxes,
    v_current_sachets,
    v_sachets_per_box
  FROM products
  WHERE id = v_product_id;

  -- Si el producto no existe, no hacer nada
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Si sachets_per_box es NULL, usar default 28
  IF v_sachets_per_box IS NULL OR v_sachets_per_box = 0 THEN
    v_sachets_per_box := 28;
  END IF;

  -- Procesar según el tipo de transacción
  CASE NEW.type
    WHEN 'purchase' THEN
      -- COMPRA: Sumar cajas al inventario principal
      v_current_boxes := v_current_boxes + COALESCE(NEW.quantity_boxes, 0);
      -- También puede venir con sobres (raro, pero posible)
      v_current_sachets := v_current_sachets + COALESCE(NEW.quantity_sachets, 0);

    WHEN 'sale' THEN
      -- VENTA: Restar del inventario
      -- Primero restar cajas
      IF NEW.quantity_boxes > 0 THEN
        IF v_current_boxes >= NEW.quantity_boxes THEN
          v_current_boxes := v_current_boxes - NEW.quantity_boxes;
        ELSE
          RAISE EXCEPTION 'Stock insuficiente: Se requieren % cajas, pero solo hay % disponibles', 
            NEW.quantity_boxes, v_current_boxes;
        END IF;
      END IF;

      -- Luego restar sobres
      IF NEW.quantity_sachets > 0 THEN
        -- Si no hay suficientes sobres, abrir cajas automáticamente
        IF v_current_sachets < NEW.quantity_sachets THEN
          v_sachets_needed := NEW.quantity_sachets - v_current_sachets;
          -- Calcular cuántas cajas necesitamos abrir
          v_boxes_to_open := CEIL(v_sachets_needed::NUMERIC / v_sachets_per_box);
          
          -- Verificar que hay suficientes cajas
          IF v_current_boxes < v_boxes_to_open THEN
            RAISE EXCEPTION 'Stock insuficiente: Se requieren % sobres, pero solo hay % sobres y % cajas disponibles', 
              NEW.quantity_sachets, v_current_sachets, v_current_boxes;
          END IF;

          -- Abrir las cajas necesarias
          v_current_boxes := v_current_boxes - v_boxes_to_open;
          v_current_sachets := v_current_sachets + (v_boxes_to_open * v_sachets_per_box);
        END IF;

        -- Restar los sobres
        v_current_sachets := v_current_sachets - NEW.quantity_sachets;
      END IF;

    WHEN 'box_opening' THEN
      -- APERTURA DE CAJA: Convertir cajas a sobres
      IF NEW.quantity_boxes > 0 THEN
        IF v_current_boxes >= NEW.quantity_boxes THEN
          v_current_boxes := v_current_boxes - NEW.quantity_boxes;
          v_current_sachets := v_current_sachets + (NEW.quantity_boxes * v_sachets_per_box);
        ELSE
          RAISE EXCEPTION 'Stock insuficiente: Se intentan abrir % cajas, pero solo hay % disponibles', 
            NEW.quantity_boxes, v_current_boxes;
        END IF;
      END IF;

    WHEN 'marketing_sample' THEN
      -- MUESTRAS: Restar sobres del inventario de marketing
      IF NEW.quantity_sachets > 0 THEN
        -- Si no hay suficientes sobres, abrir cajas automáticamente
        IF v_current_sachets < NEW.quantity_sachets THEN
          v_sachets_needed := NEW.quantity_sachets - v_current_sachets;
          v_boxes_to_open := CEIL(v_sachets_needed::NUMERIC / v_sachets_per_box);
          
          IF v_current_boxes < v_boxes_to_open THEN
            RAISE EXCEPTION 'Stock insuficiente para muestras: Se requieren % sobres, pero solo hay % sobres y % cajas disponibles', 
              NEW.quantity_sachets, v_current_sachets, v_current_boxes;
          END IF;

          v_current_boxes := v_current_boxes - v_boxes_to_open;
          v_current_sachets := v_current_sachets + (v_boxes_to_open * v_sachets_per_box);
        END IF;

        v_current_sachets := v_current_sachets - NEW.quantity_sachets;
      END IF;

    WHEN 'personal_consumption' THEN
      -- CONSUMO PERSONAL: Restar del inventario principal (cajas)
      IF NEW.quantity_boxes > 0 THEN
        IF v_current_boxes >= NEW.quantity_boxes THEN
          v_current_boxes := v_current_boxes - NEW.quantity_boxes;
        ELSE
          RAISE EXCEPTION 'Stock insuficiente para consumo personal: Se requieren % cajas, pero solo hay % disponibles', 
            NEW.quantity_boxes, v_current_boxes;
        END IF;
      END IF;

      -- También puede consumir sobres
      IF NEW.quantity_sachets > 0 THEN
        IF v_current_sachets < NEW.quantity_sachets THEN
          v_sachets_needed := NEW.quantity_sachets - v_current_sachets;
          v_boxes_to_open := CEIL(v_sachets_needed::NUMERIC / v_sachets_per_box);
          
          IF v_current_boxes < v_boxes_to_open THEN
            RAISE EXCEPTION 'Stock insuficiente para consumo personal: Se requieren % sobres, pero solo hay % sobres y % cajas disponibles', 
              NEW.quantity_sachets, v_current_sachets, v_current_boxes;
          END IF;

          v_current_boxes := v_current_boxes - v_boxes_to_open;
          v_current_sachets := v_current_sachets + (v_boxes_to_open * v_sachets_per_box);
        END IF;

        v_current_sachets := v_current_sachets - NEW.quantity_sachets;
      END IF;

    ELSE
      -- Otros tipos de transacción no afectan inventario
      RETURN NEW;
  END CASE;

  -- Asegurar que no haya valores negativos
  IF v_current_boxes < 0 THEN
    v_current_boxes := 0;
  END IF;
  IF v_current_sachets < 0 THEN
    v_current_sachets := 0;
  END IF;

  -- Actualizar el producto con el nuevo inventario
  UPDATE products
  SET 
    current_stock_boxes = v_current_boxes,
    current_marketing_stock = v_current_sachets,
    updated_at = NOW()
  WHERE id = v_product_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PASO 2: Crear trigger que ejecuta la función
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_inventory_dual ON transactions;

CREATE TRIGGER trigger_update_inventory_dual
  AFTER INSERT ON transactions
  FOR EACH ROW
  WHEN (NEW.product_id IS NOT NULL)
  EXECUTE FUNCTION update_inventory_dual();

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Para probar, ejecuta estos pasos:

/*
-- 1. Crear producto de prueba
INSERT INTO products (user_id, name, list_price, sachets_per_box, current_stock_boxes)
VALUES ('tu-user-id', 'Prunex Test', 10000, 28, 0);

-- 2. Obtener el ID
SELECT id, name, current_stock_boxes, current_marketing_stock 
FROM products 
WHERE name = 'Prunex Test';

-- 3. Insertar compra (reemplaza product_id)
INSERT INTO transactions (user_id, product_id, type, quantity_boxes, total_amount, unit_cost_snapshot)
VALUES (
  'tu-user-id',
  'product-id-aqui',
  'purchase',
  5,  -- 5 cajas
  50000,  -- $50,000
  0
);

-- 4. Verificar inventario actualizado
SELECT name, current_stock_boxes, current_marketing_stock 
FROM products 
WHERE name = 'Prunex Test';
-- Debería mostrar: current_stock_boxes = 5

-- 5. Abrir 1 caja
INSERT INTO transactions (user_id, product_id, type, quantity_boxes, total_amount, unit_cost_snapshot)
VALUES (
  'tu-user-id',
  'product-id-aqui',
  'box_opening',
  1,  -- 1 caja
  0,
  0
);

-- 6. Verificar que se abrió
SELECT name, current_stock_boxes, current_marketing_stock 
FROM products 
WHERE name = 'Prunex Test';
-- Debería mostrar: current_stock_boxes = 4, current_marketing_stock = 28

-- 7. Dar 3 muestras
INSERT INTO transactions (user_id, product_id, type, quantity_sachets, total_amount, unit_cost_snapshot)
VALUES (
  'tu-user-id',
  'product-id-aqui',
  'marketing_sample',
  0,  -- 0 cajas
  3,  -- 3 sobres (usando quantity_sachets)
  0
);
-- ERROR: quantity_sachets no es un campo válido en total_amount
-- CORRECCIÓN: Usar quantity_sachets correctamente

INSERT INTO transactions (user_id, product_id, type, quantity_boxes, quantity_sachets, total_amount, unit_cost_snapshot)
VALUES (
  'tu-user-id',
  'product-id-aqui',
  'marketing_sample',
  0,  -- 0 cajas
  3,  -- 3 sobres
  0,
  0
);

-- 8. Verificar muestras
SELECT name, current_stock_boxes, current_marketing_stock 
FROM products 
WHERE name = 'Prunex Test';
-- Debería mostrar: current_stock_boxes = 4, current_marketing_stock = 25
*/

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Esta función se ejecuta DESPUÉS de insertar la transacción
-- 2. Actualiza automáticamente el inventario según el tipo
-- 3. Abre cajas automáticamente si faltan sobres
-- 4. Valida que haya suficiente stock antes de restar
-- 5. Lanza excepciones si no hay suficiente inventario
-- 6. Maneja conversiones automáticas (cajas → sobres)
-- ============================================

