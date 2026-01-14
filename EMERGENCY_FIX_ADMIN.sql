-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- EMERGENCIA: DESHABILITAR RLS EN ADMIN_ROLES
-- ERROR 500 en las políticas RLS
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- PASO 1: DESHABILITAR RLS COMPLETAMENTE
ALTER TABLE admin_roles DISABLE ROW LEVEL SECURITY;

-- PASO 2: VERIFICAR SI EL USUARIO EXISTE
SELECT
  '🔍 VERIFICACIÓN: ¿Está falcondaniel37@gmail.com en admin_roles?' AS paso;

SELECT
  ar.user_id,
  ar.role,
  ar.created_at,
  u.email
FROM admin_roles ar
JOIN auth.users u ON ar.user_id = u.id
WHERE u.email = 'falcondaniel37@gmail.com';

-- PASO 3: SI NO APARECE NADA, AGREGAR AHORA
INSERT INTO admin_roles (user_id, role, notes)
SELECT id, 'super_admin', 'Admin principal - Agregado de emergencia'
FROM auth.users
WHERE email = 'falcondaniel37@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET role = 'super_admin',
    notes = 'Admin principal - Actualizado',
    created_at = NOW();

-- PASO 4: VERIFICAR QUE SE AGREGÓ
SELECT
  '✅ VERIFICACIÓN FINAL' AS paso;

SELECT
  ar.user_id,
  ar.role,
  u.email,
  '✅ ES SUPER ADMIN' AS estado
FROM admin_roles ar
JOIN auth.users u ON ar.user_id = u.id
WHERE u.email = 'falcondaniel37@gmail.com';

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- RESULTADO ESPERADO:
-- Deberías ver:
-- email: falcondaniel37@gmail.com
-- role: super_admin
-- estado: ✅ ES SUPER ADMIN
--
-- AHORA RECARGA LA APP Y DEBERÍA FUNCIONAR
-- (RLS está DESACTIVADO, así que no hay error 500)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
