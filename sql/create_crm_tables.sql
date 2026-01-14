-- =====================================================
-- SISTEMA CRM - FICHA DE CLIENTE Y RECORDATORIOS
-- =====================================================

-- =====================================================
-- TABLA: customers
-- Almacena la base de datos de clientes
-- =====================================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  rut VARCHAR(20),
  phone VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_rut ON customers(rut);
CREATE INDEX IF NOT EXISTS idx_customers_full_name ON customers(full_name);

-- Habilitar RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden gestionar sus propios clientes
DROP POLICY IF EXISTS "Users can manage own customers" ON customers;
CREATE POLICY "Users can manage own customers"
ON customers FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TABLA: customer_reminders
-- Almacena recordatorios automáticos de seguimiento
-- =====================================================

CREATE TABLE IF NOT EXISTS customer_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('15_days', '30_days', 'custom')),
  due_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
  message TEXT NOT NULL,
  product_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Índices para mejorar búsquedas
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON customer_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_customer_id ON customer_reminders(customer_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON customer_reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON customer_reminders(due_date);

-- Habilitar RLS
ALTER TABLE customer_reminders ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden gestionar sus propios recordatorios
DROP POLICY IF EXISTS "Users can manage own reminders" ON customer_reminders;
CREATE POLICY "Users can manage own reminders"
ON customer_reminders FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS PARA ACTUALIZAR updated_at
-- =====================================================

-- Trigger para customers
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_customers_updated_at ON customers;
CREATE TRIGGER trigger_update_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_customers_updated_at();

-- =====================================================
-- AGREGAR CAMPOS A TABLA transactions (si no existen)
-- =====================================================

-- Agregar campos para ventas con cliente
DO $$
BEGIN
  -- customer_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
    CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
  END IF;

  -- sale_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'sale_type'
  ) THEN
    ALTER TABLE transactions ADD COLUMN sale_type VARCHAR(50);
  END IF;
END $$;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Para verificar que todo se creó correctamente:
-- SELECT * FROM customers;
-- SELECT * FROM customer_reminders;
-- =====================================================
