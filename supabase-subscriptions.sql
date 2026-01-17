-- ==============================================
-- TABLA DE SUSCRIPCIONES - Dashboard FuXion
-- ==============================================
-- Ejecutar este SQL en el Editor SQL de Supabase

-- Eliminar tabla si existe (para recrear limpio)
DROP TABLE IF EXISTS subscriptions;

-- Crear tabla de suscripciones
CREATE TABLE subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan VARCHAR(20) NOT NULL CHECK (plan IN ('1_month', '3_months', '6_months', '1_year', 'perpetual')),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- NULL para plan perpetuo
    assigned_by UUID REFERENCES auth.users(id), -- Admin que asignó el plan
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Índices para mejor rendimiento
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_expires_at ON subscriptions(expires_at);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan);

-- RLS (Row Level Security)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden ver su propia suscripción
CREATE POLICY "Users can view own subscription"
ON subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- Política: Cualquier usuario autenticado puede gestionar suscripciones
-- (En producción, deberías limitar esto a admins específicos)
CREATE POLICY "Authenticated users can insert subscriptions"
ON subscriptions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update subscriptions"
ON subscriptions FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete subscriptions"
ON subscriptions FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Función para verificar si un usuario tiene suscripción activa
CREATE OR REPLACE FUNCTION has_active_subscription(check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    sub RECORD;
BEGIN
    SELECT * INTO sub FROM subscriptions WHERE user_id = check_user_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Plan perpetuo siempre activo
    IF sub.plan = 'perpetual' THEN
        RETURN TRUE;
    END IF;

    -- Verificar si no ha expirado (incluyendo 7 días de gracia)
    IF sub.expires_at IS NULL OR sub.expires_at + INTERVAL '7 days' > NOW() THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- VERIFICACIÓN
-- ==============================================
-- Ejecuta esto para verificar que la tabla se creó:
-- SELECT * FROM subscriptions;
-- ==============================================
