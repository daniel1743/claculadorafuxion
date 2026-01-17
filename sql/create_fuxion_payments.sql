-- =====================================================
-- TABLA: fuxion_payments
-- Pagos/Cheques recibidos de FuXion (devoluciones, bonos, comisiones)
-- =====================================================

-- Crear tabla
CREATE TABLE IF NOT EXISTS fuxion_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_fuxion_payments_user_id ON fuxion_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_fuxion_payments_date ON fuxion_payments(payment_date);

-- Habilitar RLS
ALTER TABLE fuxion_payments ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios solo pueden ver/gestionar sus propios pagos
DROP POLICY IF EXISTS "Users can manage own fuxion_payments" ON fuxion_payments;
CREATE POLICY "Users can manage own fuxion_payments"
ON fuxion_payments FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_fuxion_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_fuxion_payments_updated_at ON fuxion_payments;
CREATE TRIGGER trigger_update_fuxion_payments_updated_at
BEFORE UPDATE ON fuxion_payments
FOR EACH ROW
EXECUTE FUNCTION update_fuxion_payments_updated_at();

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- SELECT * FROM fuxion_payments;
-- =====================================================
