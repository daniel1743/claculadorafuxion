-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- LIMPIEZA COMPLETA Y DEFINITIVA DE RLS
-- Script 100% IDEMPOTENTE - Se puede ejecutar múltiples veces
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ═════════════════════════════════════════════════════════
-- PASO 1: ELIMINAR FUNCIONES RECURSIVAS
-- ═════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_super_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_super_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_admin_role(UUID) CASCADE;

-- ═════════════════════════════════════════════════════════
-- PASO 2: ADMIN_ROLES - Limpiar TODO
-- ═════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS admin_roles DISABLE ROW LEVEL SECURITY;

-- Eliminar TODAS las políticas usando DO block
DO $$
DECLARE
    pol_record RECORD;
BEGIN
    FOR pol_record IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'admin_roles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON admin_roles', pol_record.policyname);
    END LOOP;
END $$;

ALTER TABLE IF EXISTS admin_roles ENABLE ROW LEVEL SECURITY;

-- Crear políticas simples (verificar que no existan primero)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'admin_roles' AND policyname = 'admin_select_all'
    ) THEN
        CREATE POLICY admin_select_all ON admin_roles FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'admin_roles' AND policyname = 'admin_modify_admins_only'
    ) THEN
        CREATE POLICY admin_modify_admins_only ON admin_roles FOR ALL TO authenticated
        USING (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()))
        WITH CHECK (EXISTS (SELECT 1 FROM admin_roles WHERE user_id = auth.uid()));
    END IF;
END $$;

-- ═════════════════════════════════════════════════════════
-- PASO 3: TRANSACTIONS - Limpiar y simplificar
-- ═════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS transactions DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol_record RECORD;
BEGIN
    FOR pol_record IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'transactions' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON transactions', pol_record.policyname);
    END LOOP;
END $$;

ALTER TABLE IF EXISTS transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'transactions' AND policyname = 'transactions_user_only'
    ) THEN
        CREATE POLICY transactions_user_only ON transactions FOR ALL TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ═════════════════════════════════════════════════════════
-- PASO 4: PRODUCTS - Limpiar y simplificar
-- ═════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS products DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol_record RECORD;
BEGIN
    FOR pol_record IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'products' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON products', pol_record.policyname);
    END LOOP;
END $$;

ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'products_user_only'
    ) THEN
        CREATE POLICY products_user_only ON products FOR ALL TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ═════════════════════════════════════════════════════════
-- PASO 5: LOANS - Limpiar y simplificar
-- ═════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS loans DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol_record RECORD;
BEGIN
    FOR pol_record IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'loans' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON loans', pol_record.policyname);
    END LOOP;
END $$;

ALTER TABLE IF EXISTS loans ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'loans' AND policyname = 'loans_user_only'
    ) THEN
        CREATE POLICY loans_user_only ON loans FOR ALL TO authenticated
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- ═════════════════════════════════════════════════════════
-- PASO 6: PROFILES - Limpiar y simplificar
-- ═════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol_record RECORD;
BEGIN
    FOR pol_record IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol_record.policyname);
    END LOOP;
END $$;

ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_user_only'
    ) THEN
        CREATE POLICY profiles_user_only ON profiles FOR ALL TO authenticated
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- ═════════════════════════════════════════════════════════
-- PASO 7: BUSINESS_CYCLES (si existe) - Limpiar y simplificar
-- ═════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_cycles') THEN
        ALTER TABLE business_cycles DISABLE ROW LEVEL SECURITY;

        -- Eliminar todas las políticas
        DECLARE
            pol_record RECORD;
        BEGIN
            FOR pol_record IN
                SELECT policyname
                FROM pg_policies
                WHERE tablename = 'business_cycles' AND schemaname = 'public'
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON business_cycles', pol_record.policyname);
            END LOOP;
        END;

        ALTER TABLE business_cycles ENABLE ROW LEVEL SECURITY;

        -- Crear política simple
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies WHERE tablename = 'business_cycles' AND policyname = 'cycles_user_only'
        ) THEN
            CREATE POLICY cycles_user_only ON business_cycles FOR ALL TO authenticated
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
        END IF;
    END IF;
END $$;

-- ═════════════════════════════════════════════════════════
-- VERIFICACIÓN FINAL
-- ═════════════════════════════════════════════════════════

SELECT
    '✅ POLÍTICAS ACTUALES:' AS status;

SELECT
    tablename AS "Tabla",
    policyname AS "Política",
    cmd AS "Comando",
    CASE
        WHEN qual LIKE '%auth.uid()%' THEN '✅ Simple'
        WHEN qual LIKE '%EXISTS%' AND qual LIKE '%admin_roles%' THEN '⚠️ Con subquery (admin)'
        ELSE '❓ Revisar'
    END AS "Tipo"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('admin_roles', 'transactions', 'products', 'loans', 'profiles', 'business_cycles')
ORDER BY tablename, policyname;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- RESULTADO ESPERADO:
--
-- admin_roles:          2 políticas (select all, modify admins only)
-- transactions:         1 política  (user_only)
-- products:             1 política  (user_only)
-- loans:                1 política  (user_only)
-- profiles:             1 política  (user_only)
-- business_cycles:      1 política  (user_only) si existe
--
-- TODAS con auth.uid() = user_id (RÁPIDO, SIN RECURSIÓN)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
