-- =====================================================
-- AGREGAR CAMPO REFERRER_ID A TRANSACCIONES
-- Para trackear ventas por referencia
-- =====================================================

-- Agregar campo referrer_id a tabla transactions
DO $$
BEGIN
  -- referrer_id: ID del cliente que refirió esta venta
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'referrer_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN referrer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
    CREATE INDEX idx_transactions_referrer_id ON transactions(referrer_id);

    COMMENT ON COLUMN transactions.referrer_id IS 'ID del cliente que refirió esta venta (para ventas por referencia)';
  END IF;
END $$;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Para verificar que el campo se creó correctamente:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'transactions'
-- AND column_name IN ('customer_id', 'sale_type', 'referrer_id');
-- =====================================================
