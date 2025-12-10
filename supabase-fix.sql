-- =====================================================
-- SCRIPT DE ACTUALIZACIÓN SEGURA PARA SUPABASE
-- =====================================================
-- Este script actualiza solo lo que falta sin causar errores
-- Es seguro ejecutarlo múltiples veces
-- =====================================================

-- 1. CREAR TABLA DE PERFILES (si no existe)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas si existen y crear nuevas
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden insertar su propio perfil" ON public.profiles;

CREATE POLICY "Los usuarios pueden ver su propio perfil"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden insertar su propio perfil"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- 2. CREAR FUNCIÓN Y TRIGGER PARA AUTO-CREAR PERFIL
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, avatar_url, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1), 'Usuario'),
        NEW.email,
        NULL,
        NOW()
    );
    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- Si el perfil ya existe, no hacer nada
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger (eliminar primero si existe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 3. VERIFICAR TABLA DE TRANSACCIONES
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    product_name TEXT,
    quantity INTEGER,
    price NUMERIC,
    total NUMERIC,
    campaign_name TEXT,
    date TIMESTAMPTZ,
    description TEXT,
    free_units INTEGER DEFAULT 0,
    real_unit_cost NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas y crear nuevas
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propias transacciones" ON public.transactions;
DROP POLICY IF EXISTS "Los usuarios pueden crear sus propias transacciones" ON public.transactions;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propias transacciones" ON public.transactions;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propias transacciones" ON public.transactions;

CREATE POLICY "Los usuarios pueden ver sus propias transacciones"
    ON public.transactions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus propias transacciones"
    ON public.transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propias transacciones"
    ON public.transactions
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propias transacciones"
    ON public.transactions
    FOR DELETE
    USING (auth.uid() = user_id);

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_product_name ON public.transactions(product_name);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- 4. VERIFICAR TABLA DE PRECIOS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, product_name)
);

ALTER TABLE public.prices ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas y crear nuevas
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios precios" ON public.prices;
DROP POLICY IF EXISTS "Los usuarios pueden crear sus propios precios" ON public.prices;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios precios" ON public.prices;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios precios" ON public.prices;

CREATE POLICY "Los usuarios pueden ver sus propios precios"
    ON public.prices
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus propios precios"
    ON public.prices
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propios precios"
    ON public.prices
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propios precios"
    ON public.prices
    FOR DELETE
    USING (auth.uid() = user_id);

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_prices_user_id ON public.prices(user_id);
CREATE INDEX IF NOT EXISTS idx_prices_product_name ON public.prices(product_name);

-- 5. VERIFICAR TABLA DE PRODUCTOS (V2)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    list_price NUMERIC DEFAULT 0,
    average_purchase_price NUMERIC DEFAULT 0,
    current_inventory INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas antiguas y crear nuevas
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios productos" ON public.products;
DROP POLICY IF EXISTS "Los usuarios pueden crear sus propios productos" ON public.products;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios productos" ON public.products;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios productos" ON public.products;

CREATE POLICY "Los usuarios pueden ver sus propios productos"
    ON public.products
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus propios productos"
    ON public.products
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propios productos"
    ON public.products
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propios productos"
    ON public.products
    FOR DELETE
    USING (auth.uid() = user_id);

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
-- Este script es seguro ejecutarlo múltiples veces
-- Solo crea lo que falta y actualiza lo necesario
-- =====================================================
