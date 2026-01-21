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
-- VERIFICACIÓN: Ejecuta esto para confirmar que el trigger está activo
-- ============================================
SELECT
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_inventory_dual';
