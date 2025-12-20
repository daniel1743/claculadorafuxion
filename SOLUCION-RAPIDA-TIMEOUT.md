# ⚡ SOLUCIÓN RÁPIDA: Timeout en Perfiles

## 🎯 El Problema

Tu aplicación muestra estos errores:
```
[App] ⚠️ Error/Timeout obteniendo perfil: Timeout obteniendo perfil
[App] ❌ Error/Timeout creando perfil: Timeout creando perfil
```

**Causa:** La tabla `profiles` probablemente **NO EXISTE** en tu base de datos de Supabase.

## ✅ Solución en 3 Pasos

### Paso 1: Verificar si la tabla existe

Ejecuta este comando para hacer un diagnóstico:

```bash
npm run test-supabase
```

Cuando te pida la contraseña, ingrésala y presiona Enter.

**Si ves:**
```
❌ LA TABLA PROFILES NO EXISTE
```

Pasa al **Paso 2**.

**Si ves:**
```
🐌 LA CONSULTA A PROFILES ES EXTREMADAMENTE LENTA O NUNCA RESPONDE
```

Significa que la tabla existe pero las RLS policies tienen un problema. Pasa al **Paso 2** de todas formas.

### Paso 2: Ejecutar el Script SQL en Supabase

1. **Abre Supabase**
   - Ve a: https://app.supabase.com
   - Inicia sesión
   - Abre tu proyecto: `oxoirfrlnpnefuzspldd`

2. **Abre el SQL Editor**
   - En el menú lateral izquierdo, haz clic en **SQL Editor**
   - Haz clic en **+ New Query**

3. **Ejecuta el Script**
   - Abre el archivo `supabase-setup.sql` (está en la raíz de tu proyecto)
   - Copia **TODO** su contenido
   - Pégalo en el SQL Editor de Supabase
   - Haz clic en **Run** (o presiona Ctrl+Enter)

4. **Espera a que termine**
   - Deberías ver: ✅ **Success. No rows returned**
   - Esto es NORMAL y significa que todo se ejecutó correctamente

### Paso 3: Crear tu perfil manualmente

Si el trigger no funciona automáticamente, crea tu perfil ejecutando esto en el SQL Editor:

```sql
-- Crear perfil para tu usuario
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

Haz clic en **Run**.

### Paso 4: Verificar que funciona

1. **Recarga** tu aplicación en el navegador (F5)
2. Deberías ver en la consola:
   ```
   ✅ Perfil obtenido: falcond313
   ```

## 🔍 Diagnóstico Detallado

Si quieres ver información más detallada del problema, usa estos comandos:

```bash
# Con sesión activa del navegador
npm run verify-supabase

# Sin sesión (hace login directamente)
npm run test-supabase
```

## 📋 Checklist Rápido

- [ ] Ejecuté `npm run test-supabase` para diagnosticar
- [ ] La tabla profiles no existe o las RLS policies fallan
- [ ] Ejecuté `supabase-setup.sql` en Supabase SQL Editor
- [ ] Vi el mensaje "Success. No rows returned"
- [ ] Creé mi perfil manualmente con el INSERT
- [ ] Recargué la aplicación
- [ ] Ya no veo errores de timeout

## ❓ Preguntas Frecuentes

### ¿Por qué tardó más de 15 segundos?

Las queries a tablas que **NO EXISTEN** nunca responden correctamente en Supabase. Por eso ves el timeout.

### ¿Ya aumentaste los timeouts?

Sí, ya están en **15 segundos** (antes eran 3). Pero si la tabla no existe, ningún timeout es suficiente.

### ¿Por qué no se creó automáticamente?

El trigger que auto-crea perfiles solo funciona si:
1. La tabla `profiles` existe
2. El trigger está configurado en Supabase
3. El usuario es nuevo (no existía antes)

Para usuarios existentes (como tú), hay que crear el perfil manualmente.

## 🆘 Si Nada Funciona

Si después de seguir todos los pasos sigues viendo el error:

1. Ejecuta `npm run test-supabase` y comparte el output completo
2. Toma un screenshot del **Table Editor** en Supabase mostrando las tablas
3. Verifica que tu proyecto de Supabase no esté pausado o en mantenimiento

## ✨ Resultado Esperado

Después de seguir estos pasos, deberías ver en la consola:

```
[App] 🔄 Obteniendo perfil...
[App] ✅ Perfil obtenido: falcond313
[App] 👤 Usuario preparado: falcond313
[App] 📦 Cargando datos del usuario...
[App] ✅ CheckSession completado exitosamente
```

Y la aplicación debería cargar normalmente sin errores.
