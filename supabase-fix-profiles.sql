-- =====================================================
-- AGREGAR COLUMNAS FALTANTES A LA TABLA PROFILES
-- =====================================================
-- Este script agrega solo las columnas que faltan
-- Es seguro ejecutarlo múltiples veces
-- =====================================================

-- 1. AGREGAR COLUMNA EMAIL (si no existe)
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'email'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
        RAISE NOTICE '✅ Columna "email" agregada';
    ELSE
        RAISE NOTICE 'ℹ️  Columna "email" ya existe';
    END IF;
END $$;

-- 2. AGREGAR COLUMNA NAME (si no existe)
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'name'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN name TEXT;
        RAISE NOTICE '✅ Columna "name" agregada';
    ELSE
        RAISE NOTICE 'ℹ️  Columna "name" ya existe';
    END IF;
END $$;

-- 3. AGREGAR COLUMNA AVATAR_URL (si no existe)
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE '✅ Columna "avatar_url" agregada';
    ELSE
        RAISE NOTICE 'ℹ️  Columna "avatar_url" ya existe';
    END IF;
END $$;

-- 4. AGREGAR COLUMNA CREATED_AT (si no existe)
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE '✅ Columna "created_at" agregada';
    ELSE
        RAISE NOTICE 'ℹ️  Columna "created_at" ya existe';
    END IF;
END $$;

-- 5. AGREGAR COLUMNA UPDATED_AT (si no existe)
-- =====================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE '✅ Columna "updated_at" agregada';
    ELSE
        RAISE NOTICE 'ℹ️  Columna "updated_at" ya existe';
    END IF;
END $$;

-- 6. HABILITAR RLS
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. CONFIGURAR POLÍTICAS DE SEGURIDAD
-- =====================================================
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden insertar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Permitir inserción automática de perfiles" ON public.profiles;

CREATE POLICY "Los usuarios pueden ver su propio perfil"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden insertar su propio perfil"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Permitir inserción automática de perfiles"
    ON public.profiles FOR INSERT
    WITH CHECK (true);

-- 8. CREAR FUNCIÓN PARA AUTO-CREAR PERFILES
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, avatar_url, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1),
            'Usuario'
        ),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET
        name = COALESCE(EXCLUDED.name, public.profiles.name),
        email = EXCLUDED.email,
        updated_at = NOW();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error creando perfil para usuario %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- 9. CREAR TRIGGER
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 10. CREAR PERFILES PARA USUARIOS EXISTENTES
-- =====================================================
INSERT INTO public.profiles (id, name, email, avatar_url, created_at, updated_at)
SELECT
    au.id,
    COALESCE(
        au.raw_user_meta_data->>'name',
        split_part(au.email, '@', 1),
        'Usuario'
    ),
    au.email,
    au.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO UPDATE
SET
    email = EXCLUDED.email,
    updated_at = NOW();

-- 11. MENSAJE FINAL
-- =====================================================
DO $$
DECLARE
    total_users INTEGER;
    total_profiles INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_users FROM auth.users;
    SELECT COUNT(*) INTO total_profiles FROM public.profiles;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CONFIGURACIÓN COMPLETADA';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total de usuarios: %', total_users;
    RAISE NOTICE 'Total de perfiles: %', total_profiles;
    RAISE NOTICE '';
    RAISE NOTICE 'El sistema está listo para:';
    RAISE NOTICE '✅ Registrar nuevos usuarios';
    RAISE NOTICE '✅ Iniciar sesión sin errores';
    RAISE NOTICE '✅ Auto-crear perfiles';
    RAISE NOTICE '========================================';
END $$;
