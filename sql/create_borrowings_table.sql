-- =====================================================
-- SISTEMA DE PRÉSTAMOS BIDIRECCIONAL
-- Tabla: borrowings (Préstamos Recibidos de Socios)
-- =====================================================

-- Esta tabla complementa la tabla 'loans' existente:
-- - loans: Préstamos DADOS (tú debes producto porque vendiste sin stock)
-- - borrowings: Préstamos RECIBIDOS (producto que pediste prestado a un socio)

CREATE TABLE IF NOT EXISTS borrowings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Cantidad prestada
  quantity_boxes INTEGER NOT NULL DEFAULT 0,
  quantity_sachets INTEGER NOT NULL DEFAULT 0,

  -- De quién pediste prestado
  partner_name VARCHAR(255) NOT NULL, -- Nombre del socio que te prestó
  partner_phone VARCHAR(50), -- Teléfono del socio (opcional)

  -- Estado del préstamo
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'returned')),

  -- Cantidades devueltas (para tracking parcial)
  returned_boxes INTEGER NOT NULL DEFAULT 0,
  returned_sachets INTEGER NOT NULL DEFAULT 0,

  -- Notas y fechas
  notes TEXT,
  due_date TIMESTAMPTZ, -- Fecha prometida de devolución (opcional)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  returned_at TIMESTAMPTZ -- Fecha de devolución completa
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_borrowings_user_id ON borrowings(user_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_product_id ON borrowings(product_id);
CREATE INDEX IF NOT EXISTS idx_borrowings_status ON borrowings(status);
CREATE INDEX IF NOT EXISTS idx_borrowings_partner_name ON borrowings(partner_name);

-- Habilitar RLS
ALTER TABLE borrowings ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden gestionar sus propios préstamos recibidos
DROP POLICY IF EXISTS "Users can manage own borrowings" ON borrowings;
CREATE POLICY "Users can manage own borrowings"
ON borrowings FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_borrowings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_borrowings_updated_at ON borrowings;
CREATE TRIGGER trigger_update_borrowings_updated_at
BEFORE UPDATE ON borrowings
FOR EACH ROW
EXECUTE FUNCTION update_borrowings_updated_at();

-- =====================================================
-- VISTA ÚTIL: Resumen de préstamos pendientes por socio
-- =====================================================
CREATE OR REPLACE VIEW borrowings_summary AS
SELECT
  b.user_id,
  b.partner_name,
  p.name as product_name,
  SUM(b.quantity_boxes - b.returned_boxes) as pending_boxes,
  SUM(b.quantity_sachets - b.returned_sachets) as pending_sachets,
  COUNT(*) as total_transactions
FROM borrowings b
JOIN products p ON b.product_id = p.id
WHERE b.status != 'returned'
GROUP BY b.user_id, b.partner_name, p.name;

-- =====================================================
-- COMENTARIOS
-- =====================================================
COMMENT ON TABLE borrowings IS 'Préstamos recibidos de socios - productos que te prestaron y debes devolver';
COMMENT ON COLUMN borrowings.partner_name IS 'Nombre del socio que te prestó el producto';
COMMENT ON COLUMN borrowings.status IS 'Estado: pending (pendiente), partial (parcialmente devuelto), returned (devuelto completamente)';
COMMENT ON COLUMN borrowings.returned_boxes IS 'Cantidad de cajas ya devueltas';
COMMENT ON COLUMN borrowings.due_date IS 'Fecha prometida de devolución (opcional)';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- SELECT * FROM borrowings;
-- SELECT * FROM borrowings_summary;
-- =====================================================
