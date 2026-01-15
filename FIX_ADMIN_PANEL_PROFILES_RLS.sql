-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- FIX: ADMIN PANEL - PERMITIR A ADMINS VER TODOS LOS PROFILES
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- PROBLEMA:
-- El AdminPanel necesita ver todos los usuarios para mostrar estadísticas
-- Pero la política RLS actual solo permite ver el perfil propio
-- Los admins necesitan ver TODOS los perfiles

-- SOLUCIÓN:
-- Agregar política que permita a usuarios en admin_roles ver todos los profiles

-- ═══════════════════════════════════════════════════════════
-- PASO 1: AGREGAR POLÍTICA PARA ADMINS
-- ═══════════════════════════════════════════════════════════

-- Eliminar política si ya existe (para evitar duplicados)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;

-- Crear nueva política para admins
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT TO authenticated
USING (
  -- El usuario actual está en la tabla admin_roles
  auth.uid() IN (SELECT user_id FROM admin_roles)
);

-- ═══════════════════════════════════════════════════════════
-- PASO 2: VERIFICAR POLÍTICAS ACTUALES
-- ═══════════════════════════════════════════════════════════

SELECT
  '🔍 VERIFICACIÓN: Políticas RLS en profiles' AS paso;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY policyname;

-- RESULTADO ESPERADO:
-- Deberías ver 4 políticas:
-- 1. "Admins can view all profiles" (nueva)
-- 2. "Users can view own profile"
-- 3. "Users can insert own profile"
-- 4. "Users can update own profile"

-- ═══════════════════════════════════════════════════════════
-- PASO 3: PROBAR LA POLÍTICA (COMO ADMIN)
-- ═══════════════════════════════════════════════════════════

-- Nota: Esta query solo funcionará si ejecutas como el usuario admin
-- (falcondaniel37@gmail.com)

SELECT
  '🧪 PRUEBA: ¿Puedo ver todos los profiles como admin?' AS paso;

SELECT
  id,
  name,
  email,
  created_at
FROM profiles
ORDER BY created_at DESC
LIMIT 10;

-- Si ves MÚLTIPLES usuarios (no solo tu perfil), la política funciona ✅
-- Si solo ves TU perfil, hay un problema ❌

-- ═══════════════════════════════════════════════════════════
-- PASO 4: VERIFICAR ADMIN_ROLES
-- ═══════════════════════════════════════════════════════════

SELECT
  '🔍 VERIFICACIÓN: Estado de admin_roles' AS paso;

-- Verificar si RLS está habilitado
SELECT
  tablename,
  CASE
    WHEN rowsecurity THEN '✅ RLS HABILITADO'
    ELSE '❌ RLS DESHABILITADO'
  END AS estado_rls
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'admin_roles';

-- Verificar si falcondaniel37@gmail.com es admin
SELECT
  u.email,
  ar.role,
  ar.created_at,
  '✅ ES ADMIN' AS estado
FROM admin_roles ar
JOIN auth.users u ON ar.user_id = u.id
WHERE u.email = 'falcondaniel37@gmail.com';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- INSTRUCCIONES:
--
-- 1. EJECUTA TODO este script en Supabase SQL Editor
-- 2. REVISA los resultados de cada PASO
-- 3. Si el PASO 3 muestra MÚLTIPLES usuarios → ✅ Funciona
-- 4. RECARGA la aplicación y abre el AdminPanel
-- 5. El dashboard debería mostrar estadísticas correctamente
--
-- NOTAS:
-- - Si admin_roles tiene RLS DESHABILITADO, la política funcionará igual
-- - Si admin_roles está HABILITADO, asegúrate de tener las políticas
--   correctas (ya están en create_admin_system.sql)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
