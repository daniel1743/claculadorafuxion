-- ============================================
-- CORREGIR POLÍTICAS RLS PARA TABLA LOANS
-- Este script elimina las políticas existentes y las recrea
-- Ejecuta este script en SQL Editor de Supabase
-- ============================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view own loans" ON loans;
DROP POLICY IF EXISTS "Users can insert own loans" ON loans;
DROP POLICY IF EXISTS "Users can update own loans" ON loans;
DROP POLICY IF EXISTS "Users can delete own loans" ON loans;

-- También eliminar políticas en español si existen
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios préstamos" ON loans;
DROP POLICY IF EXISTS "Los usuarios pueden insertar sus propios préstamos" ON loans;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios préstamos" ON loans;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios préstamos" ON loans;

-- Crear políticas (en inglés para consistencia)
CREATE POLICY "Users can view own loans"
  ON loans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loans"
  ON loans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loans"
  ON loans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loans"
  ON loans FOR DELETE
  USING (auth.uid() = user_id);

-- Verificar que se crearon correctamente
SELECT 
  '✅ Políticas RLS para loans creadas correctamente' as resultado,
  policyname as politica,
  cmd as operacion
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'loans'
ORDER BY policyname;

