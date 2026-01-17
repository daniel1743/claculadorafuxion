-- ==============================================
-- SISTEMA DE SUSCRIPCIONES SEGURO - Dashboard FuXion
-- ==============================================
-- IMPORTANTE: Ejecutar en orden

-- =====================
-- PASO 1: Tabla de Admins (si no existe)
-- =====================
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Habilitar RLS en admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver la tabla de admins
CREATE POLICY "Only admins can view admin_users"
ON admin_users FOR SELECT
USING (
    auth.uid() IN (SELECT user_id FROM admin_users)
);

-- =====================
-- PASO 2: Agregar tu usuario como admin
-- =====================
INSERT INTO admin_users (user_id)
SELECT id FROM auth.users WHERE email = 'falcondaniel37@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- =====================
-- PASO 3: Función para verificar si es admin
-- =====================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM admin_users WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================
-- PASO 4: Tabla de Suscripciones
-- =====================
DROP TABLE IF EXISTS subscriptions;

CREATE TABLE subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan VARCHAR(20) NOT NULL CHECK (plan IN ('1_month', '3_months', '6_months', '1_year', 'perpetual')),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Índices
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_expires_at ON subscriptions(expires_at);

-- Habilitar RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- =====================
-- PASO 5: Políticas RLS SEGURAS
-- =====================

-- Política: Usuario normal solo puede ver SU PROPIA suscripción
CREATE POLICY "Users can view own subscription"
ON subscriptions FOR SELECT
USING (
    auth.uid() = user_id
);

-- Política: Admin puede ver TODAS las suscripciones
CREATE POLICY "Admins can view all subscriptions"
ON subscriptions FOR SELECT
USING (
    is_admin()
);

-- Política: Solo admin puede insertar suscripciones
CREATE POLICY "Only admins can insert subscriptions"
ON subscriptions FOR INSERT
WITH CHECK (
    is_admin()
);

-- Política: Solo admin puede actualizar suscripciones
CREATE POLICY "Only admins can update subscriptions"
ON subscriptions FOR UPDATE
USING (
    is_admin()
);

-- Política: Solo admin puede eliminar suscripciones
CREATE POLICY "Only admins can delete subscriptions"
ON subscriptions FOR DELETE
USING (
    is_admin()
);

-- =====================
-- VERIFICACIÓN FINAL
-- =====================
-- Ejecuta esto para verificar que eres admin:
-- SELECT is_admin();
-- Debe retornar TRUE si tu email está en admin_users

-- Para ver los admins registrados:
-- SELECT au.*, u.email FROM admin_users au JOIN auth.users u ON au.user_id = u.id;
