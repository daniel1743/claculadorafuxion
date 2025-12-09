-- ============================================
-- SCRIPT: Corregir Estructura de Tablas Existentes
-- Este script verifica y corrige las tablas si ya existen
-- ============================================

-- ============================================
-- PASO 1: Verificar si transactions existe y tiene product_id
-- ============================================
DO $$
BEGIN
  -- Verificar si la columna product_id existe en transactions
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions' 
    AND column_name = 'product_id'
  ) THEN
    RAISE NOTICE '✅ La tabla transactions ya tiene product_id';
  ELSE
    -- Si transactions existe pero no tiene product_id, necesitamos recrearla
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'transactions'
    ) THEN
      RAISE NOTICE '⚠️ La tabla transactions existe pero NO tiene product_id';
      RAISE NOTICE '⚠️ Se recomienda eliminar la tabla antigua y crear la nueva';
    END IF;
  END IF;
END $$;

-- ============================================
-- PASO 2: Crear tipo ENUM si no existe
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE transaction_type AS ENUM (
      'purchase',
      'sale',
      'personal_consumption',
      'marketing_sample',
      'box_opening'
    );
    RAISE NOTICE '✅ Tipo transaction_type creado';
  ELSE
    RAISE NOTICE '✅ Tipo transaction_type ya existe';
  END IF;
END $$;

-- ============================================
-- PASO 3: Crear tabla PRODUCTS si no existe
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sachets_per_box INTEGER NOT NULL DEFAULT 28,
  current_stock_boxes INTEGER NOT NULL DEFAULT 0,
  current_marketing_stock INTEGER NOT NULL DEFAULT 0,
  weighted_average_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  list_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- ============================================
-- PASO 4: Eliminar tabla TRANSACTIONS antigua si existe sin product_id
-- ============================================
DO $$
BEGIN
  -- Si transactions existe pero NO tiene product_id, eliminarla
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'transactions' 
    AND column_name = 'product_id'
  ) THEN
    -- Eliminar triggers y políticas primero
    DROP TRIGGER IF EXISTS trigger_update_weighted_average_cost ON transactions;
    DROP TRIGGER IF EXISTS trigger_update_inventory_dual ON transactions;
    DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
    
    -- Eliminar políticas RLS
    DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias transacciones" ON transactions;
    DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias transacciones" ON transactions;
    DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias transacciones" ON transactions;
    DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias transacciones" ON transactions;
    
    -- Eliminar la tabla
    DROP TABLE transactions CASCADE;
    RAISE NOTICE '⚠️ Tabla transactions antigua eliminada (no tenía product_id)';
  END IF;
END $$;

-- ============================================
-- PASO 5: Crear tabla TRANSACTIONS nueva (con product_id)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  type transaction_type NOT NULL,
  quantity_boxes INTEGER NOT NULL DEFAULT 0,
  quantity_sachets INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL,
  unit_cost_snapshot NUMERIC(12, 2) NOT NULL,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PASO 6: Crear índices
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- ============================================
-- PASO 7: Habilitar RLS
-- ============================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 8: Crear políticas RLS para PRODUCTS
-- ============================================
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios productos" ON products;
DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios productos" ON products;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios productos" ON products;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios productos" ON products;

CREATE POLICY "Los usuarios pueden ver sus propios productos"
  ON products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden insertar sus propios productos"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propios productos"
  ON products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propios productos"
  ON products FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- PASO 9: Crear políticas RLS para TRANSACTIONS
-- ============================================
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias transacciones" ON transactions;
DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propias transacciones" ON transactions;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias transacciones" ON transactions;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias transacciones" ON transactions;

CREATE POLICY "Los usuarios pueden ver sus propias transacciones"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden insertar sus propias transacciones"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propias transacciones"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propias transacciones"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- PASO 10: Función updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PASO 11: Función para actualizar PPP
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
  IF NEW.type != 'purchase' THEN
    RETURN NEW;
  END IF;

  v_product_id := NEW.product_id;
  
  IF v_product_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT 
    current_stock_boxes,
    weighted_average_cost
  INTO 
    v_current_stock,
    v_current_ppp
  FROM products
  WHERE id = v_product_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF NEW.quantity_boxes > 0 THEN
    v_purchase_quantity := NEW.quantity_boxes;
    v_purchase_cost := NEW.total_amount / NEW.quantity_boxes;
  ELSE
    v_purchase_quantity := 1;
    v_purchase_cost := NEW.total_amount;
  END IF;

  IF v_current_stock = 0 OR v_current_ppp = 0 THEN
    v_new_ppp := v_purchase_cost;
  ELSE
    v_total_units := v_current_stock + v_purchase_quantity;
    v_new_ppp := (
      (v_current_stock * v_current_ppp) + 
      (v_purchase_quantity * v_purchase_cost)
    ) / v_total_units;
  END IF;

  UPDATE products
  SET 
    weighted_average_cost = v_new_ppp,
    updated_at = NOW()
  WHERE id = v_product_id;

  NEW.unit_cost_snapshot := v_new_ppp;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PASO 12: Trigger para PPP
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_weighted_average_cost ON transactions;

CREATE TRIGGER trigger_update_weighted_average_cost
  BEFORE INSERT ON transactions
  FOR EACH ROW
  WHEN (NEW.type = 'purchase')
  EXECUTE FUNCTION update_weighted_average_cost();

-- ============================================
-- PASO 13: Función para actualizar inventario
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
BEGIN
  v_product_id := NEW.product_id;
  
  IF v_product_id IS NULL THEN
    RETURN NEW;
  END IF;

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

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF v_sachets_per_box IS NULL OR v_sachets_per_box = 0 THEN
    v_sachets_per_box := 28;
  END IF;

  CASE NEW.type
    WHEN 'purchase' THEN
      v_current_boxes := v_current_boxes + COALESCE(NEW.quantity_boxes, 0);
      v_current_sachets := v_current_sachets + COALESCE(NEW.quantity_sachets, 0);

    WHEN 'sale' THEN
      IF NEW.quantity_boxes > 0 THEN
        IF v_current_boxes >= NEW.quantity_boxes THEN
          v_current_boxes := v_current_boxes - NEW.quantity_boxes;
        ELSE
          RAISE EXCEPTION 'Stock insuficiente: Se requieren % cajas, pero solo hay % disponibles', 
            NEW.quantity_boxes, v_current_boxes;
        END IF;
      END IF;

      IF NEW.quantity_sachets > 0 THEN
        IF v_current_sachets < NEW.quantity_sachets THEN
          v_sachets_needed := NEW.quantity_sachets - v_current_sachets;
          v_boxes_to_open := CEIL(v_sachets_needed::NUMERIC / v_sachets_per_box);
          
          IF v_current_boxes < v_boxes_to_open THEN
            RAISE EXCEPTION 'Stock insuficiente: Se requieren % sobres, pero solo hay % sobres y % cajas disponibles', 
              NEW.quantity_sachets, v_current_sachets, v_current_boxes;
          END IF;

          v_current_boxes := v_current_boxes - v_boxes_to_open;
          v_current_sachets := v_current_sachets + (v_boxes_to_open * v_sachets_per_box);
        END IF;

        v_current_sachets := v_current_sachets - NEW.quantity_sachets;
      END IF;

    WHEN 'box_opening' THEN
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
      IF NEW.quantity_sachets > 0 THEN
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
      IF NEW.quantity_boxes > 0 THEN
        IF v_current_boxes >= NEW.quantity_boxes THEN
          v_current_boxes := v_current_boxes - NEW.quantity_boxes;
        ELSE
          RAISE EXCEPTION 'Stock insuficiente para consumo personal: Se requieren % cajas, pero solo hay % disponibles', 
            NEW.quantity_boxes, v_current_boxes;
        END IF;
      END IF;

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
      RETURN NEW;
  END CASE;

  IF v_current_boxes < 0 THEN
    v_current_boxes := 0;
  END IF;
  IF v_current_sachets < 0 THEN
    v_current_sachets := 0;
  END IF;

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
-- PASO 14: Trigger para inventario
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_inventory_dual ON transactions;

CREATE TRIGGER trigger_update_inventory_dual
  AFTER INSERT ON transactions
  FOR EACH ROW
  WHEN (NEW.product_id IS NOT NULL)
  EXECUTE FUNCTION update_inventory_dual();

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
SELECT 
  '✅ Fase 1 completada exitosamente' AS status,
  'Tablas, funciones y triggers creados' AS detalle;

-- Verificar que product_id existe en transactions
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'transactions'
AND column_name = 'product_id';

-- Verificar tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'transactions')
ORDER BY table_name;

-- Verificar funciones
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('update_weighted_average_cost', 'update_inventory_dual')
ORDER BY routine_name;

-- Verificar triggers
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN ('trigger_update_weighted_average_cost', 'trigger_update_inventory_dual')
ORDER BY trigger_name;

