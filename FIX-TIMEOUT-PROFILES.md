# 🔧 Solución al Problema de Timeout en Perfiles

## 🐛 Problema Identificado

La aplicación muestra errores de timeout al intentar:
1. Obtener el perfil del usuario desde Supabase
2. Crear un perfil nuevo cuando no existe

```
[App] ⚠️ Error/Timeout obteniendo perfil: Timeout obteniendo perfil
[App] ❌ Error/Timeout creando perfil: Timeout creando perfil
```

## ✅ Soluciones Aplicadas

### 1. Aumentar Timeouts (YA APLICADO)
- ✅ Timeout de perfiles: **3s → 15s**
- ✅ Timeout de creación: **3s → 15s**
- ✅ Mejor manejo de errores con logging detallado

### 2. Script de Verificación (NUEVO)
- ✅ Creado `verify-supabase-config.js`
- ✅ Mide tiempos de respuesta reales
- ✅ Detecta problemas de RLS policies
- ✅ Verifica que todas las tablas sean accesibles

## 🚀 Pasos para Resolver el Problema

### Paso 1: Verificar la Configuración de Supabase

Primero, asegúrate de que tienes una sesión activa iniciando la aplicación:

```bash
npm run dev
```

Luego inicia sesión en la aplicación con tu cuenta (falcond313@gmail.com).

### Paso 2: Ejecutar el Script de Verificación

En una nueva terminal, ejecuta:

```bash
npm run verify-supabase
```

Este script te mostrará:
- ⏱️ Tiempos de respuesta reales de las queries
- ✅ Si las tablas son accesibles
- ❌ Errores específicos de RLS policies
- 💡 Sugerencias de solución

### Paso 3: Interpretar los Resultados

#### Si ves tiempos > 3000ms:
```
⏱️ Tiempo de respuesta: 5234ms
```
**Solución:** Los timeouts ya fueron aumentados a 15s. La aplicación debería funcionar ahora.

#### Si ves errores de RLS policies:
```
❌ Error consultando profiles: {code: 'PGRST301', message: 'JWTInvalid'}
```
**Solución:** Las políticas de seguridad están bloqueando el acceso.

**Ejecuta este SQL en Supabase:**

1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Abre tu proyecto: `oxoirfrlnpnefuzspldd`
3. Ve a **SQL Editor** → **New Query**
4. Pega y ejecuta:

```sql
-- Verificar que las policies existen
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Si no existen, crearlas:
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Borrar policies existentes si hay problemas
DROP POLICY IF EXISTS "Los usuarios pueden ver su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Los usuarios pueden insertar su propio perfil" ON public.profiles;

-- Recrear policies correctamente
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
```

#### Si el perfil no existe:
```
⚠️ No se encontró perfil para este usuario
```
**Solución:** El trigger no está funcionando o el perfil nunca se creó.

**Ejecuta este SQL en Supabase:**

```sql
-- Crear el perfil manualmente para tu usuario
INSERT INTO public.profiles (id, name, email, avatar_url, updated_at)
VALUES (
    '225d0886-659a-4ee3-aaa3-cd63e631173d', -- Tu user ID
    'falcond313',
    'falcond313@gmail.com',
    NULL,
    NOW()
)
ON CONFLICT (id) DO UPDATE
SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    updated_at = NOW();
```

**Luego verifica que el trigger existe:**

```sql
-- Verificar trigger
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Si no existe, recrearlo:
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

### Paso 4: Verificar que Todo Funciona

1. Recarga la aplicación en el navegador
2. Observa los logs en la consola
3. Deberías ver:
   ```
   ✅ Perfil obtenido: falcond313
   ```

## 📊 Diagnóstico Rápido

| Síntoma | Causa Probable | Solución |
|---------|---------------|----------|
| Timeout < 3s | Timeouts muy cortos | ✅ Ya resuelto (15s) |
| Timeout 3-15s | Latencia de red/DB | Verificar ubicación servidor |
| Error 401/403 | RLS policies | Ejecutar SQL de policies |
| Perfil null | Trigger no funciona | Crear perfil manual + trigger |
| Error PGRST116 | Tabla no existe | Ejecutar supabase-setup.sql |

## 🔍 Comandos Útiles

```bash
# Verificar configuración
npm run verify-supabase

# Ver logs de desarrollo
npm run dev

# Limpiar y reinstalar
rm -rf node_modules package-lock.json
npm install
```

## 📝 Notas Importantes

- **Los timeouts ya fueron aumentados a 15 segundos**
- El script de verificación te dará información exacta del problema
- La aplicación puede funcionar sin perfil en BD (modo degradado)
- Los perfiles son opcionales - solo mejoran la UX

## 🆘 Si Nada Funciona

Si después de seguir todos los pasos el problema persiste:

1. Comparte el output completo de `npm run verify-supabase`
2. Comparte un screenshot de la consola del navegador
3. Verifica que el proyecto de Supabase esté activo (no pausado)
4. Considera cambiar la región del proyecto si está muy lejos

## 🎯 Próximos Pasos

1. ✅ Los cambios de código ya están aplicados
2. 🔄 Ejecuta `npm run verify-supabase` para diagnosticar
3. 🔧 Aplica las soluciones SQL según los resultados
4. ✨ Recarga la aplicación y verifica los logs
