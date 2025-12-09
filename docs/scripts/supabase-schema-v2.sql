-- ============================================
-- SCRIPT DE MIGRACIÓN A ESQUEMA V2
-- Dashboard Financiero Fuxion - Sistema de Contabilidad Estricta
-- Ejecuta este script en SQL Editor de Supabase
-- ============================================

-- ============================================
-- PASO 1: Crear tipo ENUM para tipos de transacción
-- ============================================
-- Eliminar tipo si existe (para recrearlo si hay cambios)
DROP TYPE IF EXISTS transaction_type CASCADE;

CREATE TYPE transaction_type AS ENUM (
  'purchase',
  'sale',
  'personal_consumption',
  'marketing_sample',
  'box_opening'
);

-- ============================================
-- PASO 2: Crear tabla PRODUCTS (Productos)
-- ============================================
-- Eliminar tabla si existe (CUIDADO: Esto elimina datos)
-- DROP TABLE IF EXISTS products CASCADE;

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
-- PASO 3: Crear tabla TRANSACTIONS (Transacciones)
-- ============================================
-- Eliminar tabla si existe (CUIDADO: Esto elimina datos)
-- DROP TABLE IF EXISTS transactions CASCADE;

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
-- PASO 4: ÍNDICES para mejorar el rendimiento
-- ============================================
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- ============================================
-- PASO 5: HABILITAR RLS (Row Level Security)
-- ============================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 6: POLÍTICAS RLS para PRODUCTS
-- ============================================
-- Eliminar políticas existentes si hay
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
-- PASO 7: POLÍTICAS RLS para TRANSACTIONS
-- ============================================
-- Eliminar políticas existentes si hay
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
-- PASO 8: FUNCIÓN para actualizar updated_at automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PASO 9: TRIGGERS para updated_at
-- ============================================
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
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Este esquema reemplaza el sistema anterior
-- 2. La tabla 'products' ahora maneja inventario dual (cajas y sobres)
-- 3. weighted_average_cost se actualiza dinámicamente con cada compra
-- 4. unit_cost_snapshot guarda el costo histórico para reportes
-- 5. Los tipos de transacción permiten rastrear diferentes movimientos
-- 6. RLS está habilitado para seguridad multi-usuario
-- ============================================

