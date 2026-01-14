-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- VERIFICAR Y AGREGAR ADMIN: falcondaniel37@gmail.com
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- PASO 1: Verificar si el usuario existe en auth.users
SELECT id, email, created_at
FROM auth.users
WHERE email = 'falcondaniel37@gmail.com';

-- Si NO aparece nada arriba, el usuario no existe en auth
-- Si SÍ aparece, copia el 'id' y continúa

-- PASO 2: Verificar si ya está en admin_roles
SELECT * FROM admin_roles
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'falcondaniel37@gmail.com'
);

-- Si NO aparece nada, el usuario NO es admin aún

-- PASO 3: Agregar como SUPER ADMIN (ejecutar SOLO si el paso 2 no mostró nada)
INSERT INTO admin_roles (user_id, role, notes)
SELECT id, 'super_admin', 'Admin principal del sistema'
FROM auth.users
WHERE email = 'falcondaniel37@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET role = 'super_admin',
    notes = 'Admin principal del sistema',
    granted_at = NOW();

-- PASO 4: Verificar que funcionó
SELECT
  ar.role,
  ar.notes,
  ar.granted_at,
  u.email
FROM admin_roles ar
JOIN auth.users u ON ar.user_id = u.id
WHERE u.email = 'falcondaniel37@gmail.com';

-- Deberías ver:
-- role: super_admin
-- email: falcondaniel37@gmail.com
