-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICACIÓN COMPLETA: falcondaniel37@gmail.com
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ═══════════════════════════════════════════════════════════
-- PASO 1: ¿Existe el usuario en auth.users?
-- ═══════════════════════════════════════════════════════════

SELECT
  '🔍 PASO 1: Verificar usuario en auth.users' AS paso;

SELECT
  id,
  email,
  created_at,
  confirmed_at,
  email_confirmed_at,
  last_sign_in_at,
  raw_user_meta_data
FROM auth.users
WHERE email = 'falcondaniel37@gmail.com';

-- RESULTADO ESPERADO:
-- Si aparece UNA FILA: ✅ Usuario existe
-- Si NO aparece NADA: ❌ Usuario NO existe (necesitas crearlo)

-- ═══════════════════════════════════════════════════════════
-- PASO 2: ¿Está en admin_roles?
-- ═══════════════════════════════════════════════════════════

SELECT
  '🔍 PASO 2: Verificar admin_roles' AS paso;

SELECT
  ar.user_id,
  ar.role,
  ar.created_at,
  u.email
FROM admin_roles ar
LEFT JOIN auth.users u ON ar.user_id = u.id
WHERE u.email = 'falcondaniel37@gmail.com';

-- RESULTADO ESPERADO:
-- Si aparece con role = 'super_admin': ✅ Es admin
-- Si NO aparece NADA: ❌ NO es admin (necesitas agregarlo)

-- ═══════════════════════════════════════════════════════════
-- PASO 3: ¿Tiene perfil en profiles?
-- ═══════════════════════════════════════════════════════════

SELECT
  '🔍 PASO 3: Verificar profiles' AS paso;

SELECT
  p.id,
  p.name,
  p.avatar_url,
  p.created_at,
  u.email
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE u.email = 'falcondaniel37@gmail.com';

-- RESULTADO ESPERADO:
-- Si aparece: ✅ Tiene perfil
-- Si NO aparece: ⚠️ Sin perfil (se crea automáticamente)

-- ═══════════════════════════════════════════════════════════
-- PASO 4: Verificar políticas RLS activas
-- ═══════════════════════════════════════════════════════════

SELECT
  '🔍 PASO 4: Políticas RLS activas' AS paso;

SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('admin_roles', 'profiles', 'transactions')
ORDER BY tablename, policyname;

-- ═══════════════════════════════════════════════════════════
-- SOLUCIONES SI HAY PROBLEMAS
-- ═══════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────
-- SOLUCIÓN A: Si el usuario NO existe en auth.users
-- ───────────────────────────────────────────────────────────
/*
-- Necesitas crear el usuario MANUALMENTE en la aplicación:
-- 1. Ir a la app y hacer clic en "Registrarse"
-- 2. Usar: falcondaniel37@gmail.com + tu contraseña
-- 3. Luego volver a este script y ejecutar SOLUCIÓN B
*/

-- ───────────────────────────────────────────────────────────
-- SOLUCIÓN B: Si existe en auth.users pero NO en admin_roles
-- ───────────────────────────────────────────────────────────

-- Agregar como super_admin (ejecutar SOLO si PASO 2 no mostró nada):
INSERT INTO admin_roles (user_id, role, notes)
SELECT id, 'super_admin', 'Admin principal - Agregado manualmente'
FROM auth.users
WHERE email = 'falcondaniel37@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET role = 'super_admin',
    notes = 'Admin principal - Actualizado',
    created_at = NOW();

-- ───────────────────────────────────────────────────────────
-- SOLUCIÓN C: Si getSession() sigue colgándose
-- ───────────────────────────────────────────────────────────

-- Deshabilitar RLS temporalmente en admin_roles para diagnosticar:
ALTER TABLE admin_roles DISABLE ROW LEVEL SECURITY;

-- Luego REFRESCAR la app e intentar login

-- Si funciona, el problema es RLS. Re-habilitar:
-- ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- ───────────────────────────────────────────────────────────
-- SOLUCIÓN D: Limpiar y recrear el usuario (ÚLTIMO RECURSO)
-- ───────────────────────────────────────────────────────────

-- ADVERTENCIA: Esto ELIMINA el usuario y TODOS sus datos
/*
-- 1. Eliminar de admin_roles
DELETE FROM admin_roles
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'falcondaniel37@gmail.com');

-- 2. Eliminar perfil
DELETE FROM profiles
WHERE id IN (SELECT id FROM auth.users WHERE email = 'falcondaniel37@gmail.com');

-- 3. Eliminar usuario (SOLO si estás seguro)
-- NO EJECUTAR ESTO A MENOS QUE SEA ABSOLUTAMENTE NECESARIO
-- DELETE FROM auth.users WHERE email = 'falcondaniel37@gmail.com';

-- 4. Crear usuario nuevo desde la app
-- 5. Ejecutar SOLUCIÓN B
*/

-- ═══════════════════════════════════════════════════════════
-- VERIFICACIÓN FINAL
-- ═══════════════════════════════════════════════════════════

SELECT
  '✅ VERIFICACIÓN FINAL' AS paso;

SELECT
  u.email AS "Email",
  ar.role AS "Rol Admin",
  p.name AS "Nombre Perfil",
  CASE
    WHEN ar.role IS NOT NULL THEN '✅ ES ADMIN'
    ELSE '❌ NO ES ADMIN'
  END AS "Estado Admin"
FROM auth.users u
LEFT JOIN admin_roles ar ON u.id = ar.user_id
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email = 'falcondaniel37@gmail.com';

-- RESULTADO ESPERADO:
-- Email: falcondaniel37@gmail.com
-- Rol Admin: super_admin
-- Nombre Perfil: (tu nombre)
-- Estado Admin: ✅ ES ADMIN

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- INSTRUCCIONES:
--
-- 1. EJECUTA TODO este script en Supabase SQL Editor
-- 2. REVISA los resultados de cada PASO
-- 3. Si algún paso muestra "NO aparece nada", ejecuta la SOLUCIÓN correspondiente
-- 4. REPORTA qué resultados viste en cada paso
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
