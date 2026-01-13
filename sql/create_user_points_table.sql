-- =====================================================
-- TABLA: user_points
-- Almacena los puntos base (editables) de cada usuario
-- =====================================================

-- Crear tabla user_points
CREATE TABLE IF NOT EXISTS user_points (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  base_points INTEGER DEFAULT 0 CHECK (base_points >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para mejorar búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver y editar sus propios puntos
DROP POLICY IF EXISTS "Users can manage own points" ON user_points;
CREATE POLICY "Users can manage own points"
ON user_points
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_user_points_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_user_points_updated_at ON user_points;
CREATE TRIGGER trigger_update_user_points_updated_at
BEFORE UPDATE ON user_points
FOR EACH ROW
EXECUTE FUNCTION update_user_points_updated_at();

-- =====================================================
-- NOTA IMPORTANTE:
-- =====================================================
-- Este script debe ejecutarse en el SQL Editor de Supabase
--
-- Después de ejecutar, verifica que:
-- 1. La tabla user_points existe
-- 2. Las políticas RLS están activas
-- 3. El trigger funciona correctamente
--
-- Para verificar:
-- SELECT * FROM user_points;
-- =====================================================
