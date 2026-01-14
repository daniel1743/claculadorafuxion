-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SISTEMA DE CICLOS DE NEGOCIO (BUSINESS CYCLES)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- Este sistema permite:
-- 1. Cerrar ciclos de negocio manualmente (no meses calendario)
-- 2. Guardar snapshots inmutables de métricas
-- 3. Analytics históricos y comparaciones
-- 4. Alineado con ciclos Fuxion (no calendario tradicional)
--
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ================================================
-- 1. TABLA PRINCIPAL: business_cycles
-- ================================================

CREATE TABLE IF NOT EXISTS business_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Identificación del ciclo
  cycle_name VARCHAR(255) NOT NULL, -- "Octubre 2025", "Ciclo 1 - Nov", etc.
  cycle_number INT NOT NULL, -- 1, 2, 3... (secuencial por usuario)

  -- Fechas del ciclo
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ DEFAULT NOW(),

  -- ============================================
  -- MÉTRICAS FINANCIERAS (SNAPSHOT)
  -- ============================================

  -- Ventas
  total_sales DECIMAL(12, 2) DEFAULT 0,
  total_sales_count INT DEFAULT 0,

  -- Compras
  total_purchases DECIMAL(12, 2) DEFAULT 0,
  total_purchases_count INT DEFAULT 0,

  -- Publicidad
  total_advertising DECIMAL(12, 2) DEFAULT 0,
  total_advertising_count INT DEFAULT 0,

  -- Gastos (salidas)
  total_expenses DECIMAL(12, 2) DEFAULT 0,
  total_expenses_count INT DEFAULT 0,

  -- Préstamos
  total_loans_given DECIMAL(12, 2) DEFAULT 0,
  total_loans_received DECIMAL(12, 2) DEFAULT 0,
  total_loan_repayments DECIMAL(12, 2) DEFAULT 0,
  active_loans_count INT DEFAULT 0,

  -- Ganancias y márgenes
  gross_profit DECIMAL(12, 2) DEFAULT 0, -- Ventas - Costo de productos vendidos
  net_profit DECIMAL(12, 2) DEFAULT 0, -- Ganancia bruta - Gastos - Publicidad
  profit_margin DECIMAL(5, 2) DEFAULT 0, -- Porcentaje de ganancia

  -- ROI
  roi_percentage DECIMAL(5, 2) DEFAULT 0, -- Return on Investment

  -- ============================================
  -- MÉTRICAS DE PRODUCTOS
  -- ============================================

  products_sold JSONB DEFAULT '[]', -- [{ name, quantity, revenue, profit }]
  top_product VARCHAR(255), -- Producto más vendido
  top_product_revenue DECIMAL(12, 2) DEFAULT 0,

  -- ============================================
  -- MÉTRICAS DE CLIENTES Y CAMPAÑAS
  -- ============================================

  total_customers INT DEFAULT 0,
  new_customers INT DEFAULT 0,
  recurring_customers INT DEFAULT 0,

  campaigns JSONB DEFAULT '[]', -- [{ name, investment, sales, roi }]
  top_campaign VARCHAR(255),
  top_campaign_roi DECIMAL(5, 2) DEFAULT 0,

  -- ============================================
  -- INVENTARIO AL CIERRE
  -- ============================================

  inventory_snapshot JSONB DEFAULT '{}', -- { "product_name": quantity }
  total_inventory_boxes INT DEFAULT 0,
  inventory_value DECIMAL(12, 2) DEFAULT 0,

  -- ============================================
  -- COMPARACIÓN CON CICLO ANTERIOR
  -- ============================================

  sales_vs_previous DECIMAL(5, 2), -- % cambio vs ciclo anterior
  profit_vs_previous DECIMAL(5, 2),
  growth_rate DECIMAL(5, 2),

  -- ============================================
  -- METADATA
  -- ============================================

  notes TEXT, -- Notas del usuario sobre este ciclo
  is_locked BOOLEAN DEFAULT TRUE, -- Los ciclos cerrados son inmutables

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_business_cycles_user_id ON business_cycles(user_id);
CREATE INDEX idx_business_cycles_end_date ON business_cycles(end_date DESC);
CREATE INDEX idx_business_cycles_user_cycle ON business_cycles(user_id, cycle_number);

-- ================================================
-- 2. VINCULAR TRANSACCIONES A CICLOS
-- ================================================

-- Agregar columna cycle_id a transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS cycle_id UUID REFERENCES business_cycles(id);

CREATE INDEX IF NOT EXISTS idx_transactions_cycle_id ON transactions(cycle_id);

-- ================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ================================================

ALTER TABLE business_cycles ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo ven sus propios ciclos
CREATE POLICY "Users can view own cycles"
ON business_cycles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Los usuarios pueden crear ciclos (al cerrar)
CREATE POLICY "Users can create own cycles"
ON business_cycles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar SOLO si el ciclo NO está bloqueado
CREATE POLICY "Users can update unlocked cycles"
ON business_cycles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND is_locked = FALSE);

-- Los ciclos NO se pueden eliminar (datos históricos)
-- Si se necesita, usar soft delete (agregar campo deleted_at)

-- ================================================
-- 4. FUNCIÓN PARA AUTO-INCREMENTAR cycle_number
-- ================================================

CREATE OR REPLACE FUNCTION get_next_cycle_number(p_user_id UUID)
RETURNS INT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT MAX(cycle_number) FROM business_cycles WHERE user_id = p_user_id),
    0
  ) + 1;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- 5. VISTA AGREGADA PARA ANALYTICS
-- ================================================

CREATE OR REPLACE VIEW cycles_summary AS
SELECT
  user_id,
  COUNT(*) as total_cycles,
  SUM(total_sales) as all_time_sales,
  SUM(net_profit) as all_time_profit,
  AVG(profit_margin) as avg_margin,
  MAX(net_profit) as best_cycle_profit,
  MIN(net_profit) as worst_cycle_profit,
  MAX(end_date) as last_cycle_date
FROM business_cycles
WHERE is_locked = TRUE
GROUP BY user_id;

-- ================================================
-- 6. FUNCIÓN HELPER PARA CERRAR CICLO
-- ================================================

-- Esta función será llamada desde el backend
-- Calcula automáticamente las métricas desde transactions
CREATE OR REPLACE FUNCTION close_business_cycle(
  p_user_id UUID,
  p_cycle_name VARCHAR,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_cycle_id UUID;
  v_cycle_number INT;
  v_total_sales DECIMAL;
  v_total_purchases DECIMAL;
  v_total_ads DECIMAL;
  v_total_expenses DECIMAL;
  v_gross_profit DECIMAL;
  v_net_profit DECIMAL;
  v_margin DECIMAL;
BEGIN
  -- Obtener el siguiente número de ciclo
  v_cycle_number := get_next_cycle_number(p_user_id);

  -- Calcular métricas desde transactions
  SELECT
    COALESCE(SUM(CASE WHEN type = 'sale' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'purchase' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'ad' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0)
  INTO v_total_sales, v_total_purchases, v_total_ads, v_total_expenses
  FROM transactions
  WHERE
    user_id = p_user_id
    AND cycle_id IS NULL -- Solo transacciones no asignadas a ciclo
    AND created_at >= p_start_date
    AND created_at <= p_end_date;

  -- Calcular ganancias
  v_gross_profit := v_total_sales - v_total_purchases;
  v_net_profit := v_gross_profit - v_total_ads - v_total_expenses;

  -- Calcular margen
  IF v_total_sales > 0 THEN
    v_margin := (v_net_profit / v_total_sales) * 100;
  ELSE
    v_margin := 0;
  END IF;

  -- Crear el ciclo cerrado
  INSERT INTO business_cycles (
    user_id,
    cycle_name,
    cycle_number,
    start_date,
    end_date,
    total_sales,
    total_purchases,
    total_advertising,
    total_expenses,
    gross_profit,
    net_profit,
    profit_margin,
    notes,
    is_locked
  ) VALUES (
    p_user_id,
    p_cycle_name,
    v_cycle_number,
    p_start_date,
    p_end_date,
    v_total_sales,
    v_total_purchases,
    v_total_ads,
    v_total_expenses,
    v_gross_profit,
    v_net_profit,
    v_margin,
    p_notes,
    TRUE
  ) RETURNING id INTO v_cycle_id;

  -- Asignar transacciones a este ciclo
  UPDATE transactions
  SET cycle_id = v_cycle_id
  WHERE
    user_id = p_user_id
    AND cycle_id IS NULL
    AND created_at >= p_start_date
    AND created_at <= p_end_date;

  RETURN v_cycle_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- VERIFICACIÓN
-- ================================================

-- Ver todas las tablas creadas
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE '%cycle%';

-- Ver todas las funciones
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name LIKE '%cycle%';
