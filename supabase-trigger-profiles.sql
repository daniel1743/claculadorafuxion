-- =====================================================
-- CONFIGURACIÓN FINAL: TRIGGER PARA AUTO-CREAR PERFILES
-- =====================================================
-- Este script configura el trigger que crea automáticamente
-- un perfil cuando un usuario se registra
-- =====================================================

-- 1. ASEGURAR QUE LA TABLA PROFILES EXISTE
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

-- 2. CREAR/ACTUALIZAR POLÍTICAS DE SEGURIDAD
-- =====================================================
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden insertar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Permitir inserción automática de perfiles" ON public.profiles;

-- Política para VER tu propio perfil
CREATE POLICY "Los usuarios pueden ver su propio perfil"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Política para ACTUALIZAR tu propio perfil
CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id);

-- Política para INSERTAR tu propio perfil
CREATE POLICY "Los usuarios pueden insertar su propio perfil"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Política adicional para permitir inserción automática por el trigger
CREATE POLICY "Permitir inserción automática de perfiles"
    ON public.profiles
    FOR INSERT
    WITH CHECK (true);

-- 3. CREAR FUNCIÓN PARA AUTO-CREAR PERFILES
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Intentar insertar el perfil
    INSERT INTO public.profiles (id, name, email, avatar_url, updated_at)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1),
            'Usuario'
        ),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url',
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET
        email = EXCLUDED.email,
        updated_at = NOW();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Si hay error, registrarlo pero no fallar la creación del usuario
        RAISE WARNING 'Error creando perfil para usuario %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- 4. CREAR TRIGGER
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 5. VERIFICAR QUE EL TRIGGER ESTÁ ACTIVO
-- =====================================================
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
    AND event_object_table = 'users';

    IF trigger_count > 0 THEN
        RAISE NOTICE '✅ Trigger "on_auth_user_created" está activo y funcionando';
    ELSE
        RAISE NOTICE '❌ ERROR: El trigger no se creó correctamente';
    END IF;
END $$;

-- 6. CREAR PERFILES PARA USUARIOS EXISTENTES (si no tienen)
-- =====================================================
-- Este código crea perfiles para usuarios que ya existen pero no tienen perfil
INSERT INTO public.profiles (id, name, email, avatar_url, updated_at)
SELECT
    au.id,
    COALESCE(
        au.raw_user_meta_data->>'name',
        split_part(au.email, '@', 1),
        'Usuario'
    ) as name,
    au.email,
    au.raw_user_meta_data->>'avatar_url' as avatar_url,
    NOW()
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- 7. MENSAJE FINAL
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CONFIGURACIÓN COMPLETADA';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'El sistema de perfiles está listo:';
    RAISE NOTICE '1. ✅ Tabla profiles creada';
    RAISE NOTICE '2. ✅ Políticas de seguridad configuradas';
    RAISE NOTICE '3. ✅ Trigger automático activado';
    RAISE NOTICE '4. ✅ Perfiles existentes actualizados';
    RAISE NOTICE '';
    RAISE NOTICE 'Ahora puedes:';
    RAISE NOTICE '- Registrar nuevos usuarios';
    RAISE NOTICE '- Iniciar sesión sin errores';
    RAISE NOTICE '- Los perfiles se crearán automáticamente';
    RAISE NOTICE '========================================';
END $$;
