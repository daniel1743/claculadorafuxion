# 📋 Guía de Configuración de Supabase

## ⚠️ Problema Identificado

La aplicación mostraba pantalla negra y errores 406 porque:
1. La tabla `profiles` no existe en Supabase
2. No hay un trigger automático para crear perfiles de usuario
3. Las otras tablas necesarias tampoco están configuradas

## ✅ Soluciones Aplicadas

### 1. Código Actualizado (Ya aplicado)
- ✅ Modificado `supabaseService.js` para manejar perfiles faltantes
- ✅ Agregada función `createUserProfile()` para crear perfiles manualmente
- ✅ Actualizado `App.jsx` para crear perfiles automáticamente si no existen
- ✅ Actualizado `AuthModal.jsx` para crear perfiles durante el registro
- ✅ Simplificado `vite.config.js` eliminando plugins problemáticos

### 2. Base de Datos en Supabase (Requiere acción manual)

## 🔧 Instrucciones para Configurar Supabase

### Paso 1: Acceder a Supabase
1. Ve a [https://app.supabase.com](https://app.supabase.com)
2. Inicia sesión con tu cuenta
3. Abre el proyecto: **oxoirfrlnpnefuzspldd**

### Paso 2: Ejecutar el Script SQL
1. En el panel lateral, haz clic en **SQL Editor**
2. Haz clic en **+ New Query**
3. Abre el archivo `supabase-setup.sql` que está en la raíz del proyecto
4. Copia y pega **TODO** el contenido del archivo en el editor
5. Haz clic en **Run** (o presiona Ctrl+Enter)
6. Espera a que termine de ejecutarse (verás un mensaje de éxito)

### Paso 3: Verificar que las Tablas se Crearon
1. En el panel lateral, haz clic en **Table Editor**
2. Deberías ver estas tablas:
   - ✅ `profiles` - Perfiles de usuarios
   - ✅ `transactions` - Transacciones de compra/venta
   - ✅ `prices` - Precios de productos
   - ✅ `products` - Productos V2

### Paso 4: Verificar las Políticas de Seguridad (RLS)
1. En Table Editor, haz clic en cada tabla
2. Ve a la pestaña **Policies**
3. Verifica que cada tabla tenga políticas de seguridad activas (debería haber 3-4 políticas por tabla)

### Paso 5: Probar la Aplicación
1. Recarga la página de tu aplicación en `http://localhost:3004`
2. Intenta registrar un nuevo usuario
3. Si todo está bien configurado:
   - ✅ No verás errores 406 en la consola
   - ✅ El perfil se creará automáticamente
   - ✅ Podrás acceder al dashboard sin problemas

## 🔍 Verificar que Todo Funciona

### Verificar en la Consola del Navegador
Después de registrarte o iniciar sesión, NO deberías ver estos errores:
- ❌ `GET https://...supabase.co/rest/v1/profiles?... 406 (Not Acceptable)`
- ❌ `Error en getUserProfile: {code: 'PGRST116', ...}`

### Verificar en Supabase
1. Ve a **Table Editor** → **profiles**
2. Deberías ver tu perfil con:
   - Tu ID de usuario
   - Tu nombre
   - Tu email
   - Fecha de creación

## 🐛 Solución de Problemas

### Si sigues viendo el error 406:
1. Verifica que ejecutaste el script SQL completo
2. Verifica que la tabla `profiles` existe en Table Editor
3. Verifica que las políticas RLS están activas
4. Intenta cerrar sesión y volver a iniciar sesión

### Si el trigger no funciona:
1. Ve a SQL Editor
2. Ejecuta solo la sección del trigger:
```sql
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

### Si la aplicación sigue mostrando pantalla negra:
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Busca errores en rojo
4. Envíame los errores para ayudarte mejor

## 📝 Notas Importantes

- **Trigger Automático**: Una vez configurado el trigger, cada nuevo usuario que se registre tendrá su perfil creado automáticamente
- **Usuarios Existentes**: Para usuarios que ya existen (como el que usaste para probar), la aplicación creará el perfil automáticamente la primera vez que inicien sesión después de esta actualización
- **Seguridad RLS**: Todas las tablas tienen Row Level Security activado, lo que significa que cada usuario solo puede ver y modificar sus propios datos

## ✨ Qué se Arregló

### Problema Original:
- ❌ Pantalla negra al cargar
- ❌ Servidor Vite no iniciaba (atascado)
- ❌ Errores 406 al consultar perfiles
- ❌ Tabla `profiles` no existía

### Solución:
- ✅ Servidor Vite funcionando correctamente
- ✅ Aplicación carga correctamente
- ✅ Modal de autenticación visible
- ✅ Código actualizado para crear perfiles automáticamente
- ✅ Script SQL listo para ejecutar
- ✅ Documentación completa de configuración

## 🚀 Próximos Pasos

1. **Ejecuta el script SQL en Supabase** (instrucciones arriba)
2. **Recarga la aplicación** en el navegador
3. **Registra un nuevo usuario** o inicia sesión con uno existente
4. **Verifica que todo funcione** sin errores

Si después de seguir estos pasos sigues teniendo problemas, por favor comparte los errores que ves en la consola del navegador para poder ayudarte mejor.
