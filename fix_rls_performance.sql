-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- SCRIPT DE OPTIMIZACIÓN: Eliminar RLS Problemático
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
--
-- Este script elimina políticas RLS que pueden causar:
-- - Queries lentas
-- - Recursión infinita
-- - Timeouts en getSession()
--
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- PASO 1: DESACTIVAR TEMPORALMENTE RLS EN ADMIN_ROLES
ALTER TABLE IF EXISTS admin_roles DISABLE ROW LEVEL SECURITY;

-- PASO 2: ELIMINAR TODAS LAS POLÍTICAS EXISTENTES DE ADMIN_ROLES
DO $$
DECLARE
    pol_name text;
BEGIN
    FOR pol_name IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'admin_roles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON admin_roles', pol_name);
    END LOOP;
END $$;

-- PASO 3: ELIMINAR FUNCIONES RECURSIVAS (causan lentitud)
DROP FUNCTION IF EXISTS is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS is_super_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS check_admin_role(UUID) CASCADE;

-- PASO 4: REACTIVAR RLS CON POLÍTICAS SIMPLES (SIN FUNCIONES)
ALTER TABLE IF EXISTS admin_roles ENABLE ROW LEVEL SECURITY;

-- POLÍTICA 1: Todos pueden leer admin_roles (autenticados)
CREATE POLICY "admin_roles_select_public"
ON admin_roles FOR SELECT
TO authenticated
USING (true);

-- POLÍTICA 2: Solo el propio usuario puede insertar su rol (protección básica)
CREATE POLICY "admin_roles_insert_self"
ON admin_roles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- POLÍTICA 3: No permitir updates (los roles se establecen manualmente en SQL)
-- Si necesitas actualizar roles, hazlo directamente con SQL sin políticas

-- PASO 5: OPTIMIZAR TABLAS PRINCIPALES (transactions, products, etc.)

-- Asegurar que transactions solo use auth.uid() sin subqueries
DO $$
DECLARE
    pol_name text;
BEGIN
    FOR pol_name IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'transactions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON transactions', pol_name);
    END LOOP;
END $$;

-- Política simple para transactions
CREATE POLICY "transactions_policy_simple"
ON transactions
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- PASO 6: OPTIMIZAR products
DO $$
DECLARE
    pol_name text;
BEGIN
    FOR pol_name IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'products'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON products', pol_name);
    END LOOP;
END $$;

CREATE POLICY "products_policy_simple"
ON products
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- PASO 7: OPTIMIZAR loans
DO $$
DECLARE
    pol_name text;
BEGIN
    FOR pol_name IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'loans'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON loans', pol_name);
    END LOOP;
END $$;

CREATE POLICY "loans_policy_simple"
ON loans
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- PASO 8: OPTIMIZAR profiles
DO $$
DECLARE
    pol_name text;
BEGIN
    FOR pol_name IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol_name);
    END LOOP;
END $$;

CREATE POLICY "profiles_policy_simple"
ON profiles
FOR ALL
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- PASO 9: VERIFICAR RESULTADO
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- RESULTADO ESPERADO:
-- - RLS simple en todas las tablas
-- - SIN funciones recursivas
-- - SIN subqueries complejas
-- - SOLO auth.uid() = user_id/id
--
-- Esto debería hacer que getSession() sea INSTANTÁNEO
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
