-- =====================================================
-- SCRIPT PARA AGREGAR COLUMNAS FALTANTES
-- =====================================================
-- Este script solo agrega las columnas que faltan
-- Es completamente seguro ejecutarlo
-- =====================================================

-- 1. AGREGAR COLUMNAS A LA TABLA TRANSACTIONS (si no existen)
-- =====================================================

-- Agregar product_name si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'transactions'
        AND column_name = 'product_name'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN product_name TEXT;
    END IF;
END $$;

-- Agregar quantity si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'transactions'
        AND column_name = 'quantity'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN quantity INTEGER;
    END IF;
END $$;

-- Agregar price si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'transactions'
        AND column_name = 'price'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN price NUMERIC;
    END IF;
END $$;

-- Agregar total si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'transactions'
        AND column_name = 'total'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN total NUMERIC;
    END IF;
END $$;

-- Agregar campaign_name si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'transactions'
        AND column_name = 'campaign_name'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN campaign_name TEXT;
    END IF;
END $$;

-- Agregar date si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'transactions'
        AND column_name = 'date'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN date TIMESTAMPTZ;
    END IF;
END $$;

-- Agregar description si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'transactions'
        AND column_name = 'description'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN description TEXT;
    END IF;
END $$;

-- Agregar free_units si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'transactions'
        AND column_name = 'free_units'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN free_units INTEGER DEFAULT 0;
    END IF;
END $$;

-- Agregar real_unit_cost si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'transactions'
        AND column_name = 'real_unit_cost'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN real_unit_cost NUMERIC DEFAULT 0;
    END IF;
END $$;

-- 2. CREAR ÍNDICES (si no existen)
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_product_name ON public.transactions(product_name);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

-- 3. CREAR TABLA PROFILES (si no existe)
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

-- 4. POLÍTICAS PARA PROFILES
-- =====================================================
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

-- 5. CREAR FUNCIÓN Y TRIGGER PARA AUTO-CREAR PERFIL
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
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger (eliminar primero si existe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 6. CREAR TABLA PRICES (si no existe)
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

-- Políticas para prices
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios precios" ON public.prices;
DROP POLICY IF EXISTS "Los usuarios pueden crear sus propios precios" ON public.prices;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios precios" ON public.prices;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios precios" ON public.prices;

CREATE POLICY "Los usuarios pueden ver sus propios precios"
    ON public.prices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden crear sus propios precios"
    ON public.prices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden actualizar sus propios precios"
    ON public.prices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden eliminar sus propios precios"
    ON public.prices FOR DELETE USING (auth.uid() = user_id);

-- Índices para prices
CREATE INDEX IF NOT EXISTS idx_prices_user_id ON public.prices(user_id);
CREATE INDEX IF NOT EXISTS idx_prices_product_name ON public.prices(product_name);

-- 7. CREAR TABLA PRODUCTS (si no existe)
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

-- Políticas para products
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios productos" ON public.products;
DROP POLICY IF EXISTS "Los usuarios pueden crear sus propios productos" ON public.products;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar sus propios productos" ON public.products;
DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios productos" ON public.products;

CREATE POLICY "Los usuarios pueden ver sus propios productos"
    ON public.products FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden crear sus propios productos"
    ON public.products FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden actualizar sus propios productos"
    ON public.products FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Los usuarios pueden eliminar sus propios productos"
    ON public.products FOR DELETE USING (auth.uid() = user_id);

-- Índices para products
CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(name);

-- =====================================================
-- MENSAJE DE CONFIRMACIÓN
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Script ejecutado correctamente. Todas las columnas y tablas necesarias han sido creadas o actualizadas.';
END $$;
