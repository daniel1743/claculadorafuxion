-- =====================================================
-- SISTEMA DE ADMINISTRACIÓN
-- Roles de admin y tracking de actividad
-- =====================================================

-- =====================================================
-- TABLA: admin_roles
-- Define qué usuarios son administradores
-- =====================================================

CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  UNIQUE(user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_admin_roles_user_id ON admin_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_roles_role ON admin_roles(role);

-- Habilitar RLS
ALTER TABLE admin_roles ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins pueden ver roles
DROP POLICY IF EXISTS "Only admins can view admin roles" ON admin_roles;
CREATE POLICY "Only admins can view admin roles"
ON admin_roles FOR SELECT TO authenticated
USING (
  auth.uid() IN (SELECT user_id FROM admin_roles)
);

-- Política: Solo super_admins pueden modificar roles
DROP POLICY IF EXISTS "Only super admins can modify roles" ON admin_roles;
CREATE POLICY "Only super admins can modify roles"
ON admin_roles FOR ALL TO authenticated
USING (
  auth.uid() IN (SELECT user_id FROM admin_roles WHERE role = 'super_admin')
)
WITH CHECK (
  auth.uid() IN (SELECT user_id FROM admin_roles WHERE role = 'super_admin')
);

-- =====================================================
-- TABLA: user_activity_log
-- Log de actividad de usuarios (opcional)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created_at ON user_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_action ON user_activity_log(action);

-- Habilitar RLS
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins pueden ver logs
DROP POLICY IF EXISTS "Only admins can view activity logs" ON user_activity_log;
CREATE POLICY "Only admins can view activity logs"
ON user_activity_log FOR SELECT TO authenticated
USING (
  auth.uid() IN (SELECT user_id FROM admin_roles)
);

-- Política: Sistema puede insertar logs
DROP POLICY IF EXISTS "System can insert activity logs" ON user_activity_log;
CREATE POLICY "System can insert activity logs"
ON user_activity_log FOR INSERT TO authenticated
WITH CHECK (true);

-- =====================================================
-- FUNCIÓN: Verificar si un usuario es admin
-- =====================================================

CREATE OR REPLACE FUNCTION is_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN: Verificar si un usuario es super admin
-- =====================================================

CREATE OR REPLACE FUNCTION is_super_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_roles
    WHERE user_id = check_user_id
    AND role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN: Log de actividad automático
-- =====================================================

CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_activity_log (user_id, action, details)
  VALUES (
    auth.uid(),
    TG_TABLE_NAME || '_' || TG_OP,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'timestamp', NOW()
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CREAR PRIMER SUPER ADMIN
-- IMPORTANTE: Ejecutar esto UNA VEZ con el email del primer admin
-- =====================================================

-- INSTRUCCIONES:
-- 1. Crea un usuario normal en la aplicación
-- 2. Reemplaza 'admin@fuxion.internal' con el email de ese usuario
-- 3. Ejecuta la siguiente línea SOLO UNA VEZ

-- INSERT INTO admin_roles (user_id, role, notes)
-- SELECT id, 'super_admin', 'Primer administrador del sistema'
-- FROM auth.users
-- WHERE email = 'admin@fuxion.internal'
-- ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- VISTA: Usuarios con información completa
-- =====================================================

CREATE OR REPLACE VIEW admin_users_view AS
SELECT
  u.id,
  u.email,
  u.created_at,
  u.last_sign_in_at,
  u.banned_until,
  u.raw_user_meta_data->>'name' as name,
  CASE
    WHEN u.banned_until IS NOT NULL AND u.banned_until > NOW() THEN 'banned'
    WHEN u.last_sign_in_at IS NULL THEN 'never_logged_in'
    WHEN u.last_sign_in_at > NOW() - INTERVAL '24 hours' THEN 'active_today'
    WHEN u.last_sign_in_at > NOW() - INTERVAL '7 days' THEN 'active_week'
    ELSE 'inactive'
  END as status,
  ar.role as admin_role,
  (
    SELECT COUNT(*)
    FROM transactions t
    WHERE t.user_id = u.id
  ) as transaction_count
FROM auth.users u
LEFT JOIN admin_roles ar ON u.id = ar.user_id;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Para verificar que todo se creó correctamente:
-- SELECT * FROM admin_roles;
-- SELECT * FROM user_activity_log;
-- SELECT * FROM admin_users_view;
-- =====================================================
