-- ============================================
-- FIX: Eliminar políticas RLS duplicadas
-- ============================================
-- Problema: Múltiples políticas permisivas en profiles
-- Solución: Dejar solo UNA política por acción
-- ============================================

-- 1. VER POLÍTICAS ACTUALES (para verificar)
SELECT
  policyname,
  cmd as accion,
  roles,
  qual as condicion_using
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- ============================================
-- 2. ELIMINAR POLÍTICAS DUPLICADAS
-- ============================================

-- Eliminar política duplicada #1
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON public.profiles;

-- Eliminar política duplicada #2
DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios perfiles" ON public.profiles;

-- Eliminar otras variaciones antiguas si existen
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- ============================================
-- 3. CREAR UNA SOLA POLÍTICA CORRECTA
-- ============================================

CREATE POLICY "user_update_own_profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- 4. VERIFICAR QUE QUEDÓ SOLO UNA
-- ============================================

SELECT
  policyname,
  cmd as accion,
  roles,
  qual as condicion
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND cmd = 'UPDATE';

-- Debería mostrar SOLO: "user_update_own_profile"
