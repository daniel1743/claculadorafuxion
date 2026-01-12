-- ============================================
-- AGREGAR 'loan' AL ENUM transaction_type
-- Ejecuta este script en SQL Editor de Supabase
-- ============================================

-- Agregar 'loan' al enum transaction_type
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'loan';

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Para verificar que se agregó correctamente, ejecuta:
-- SELECT unnest(enum_range(NULL::transaction_type));

