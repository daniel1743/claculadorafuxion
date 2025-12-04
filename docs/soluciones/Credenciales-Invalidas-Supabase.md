# Solución: Error "Invalid login credentials" en Supabase

## Problema

Al intentar iniciar sesión, aparece el error:
```
Invalid login credentials
```

## Causa

Este error puede ocurrir por varias razones:

1. **El usuario no existe**: No te has registrado aún
2. **Contraseña incorrecta**: La contraseña ingresada no coincide
3. **Correo incorrecto**: El correo electrónico no está registrado
4. **Las tablas no están creadas**: No se ejecutó el script SQL en Supabase

## Soluciones

### 1. Verificar que estés registrado

Si es tu primera vez usando la aplicación:

1. Haz clic en **"¿No tienes cuenta? Regístrate gratis"**
2. Completa el formulario con:
   - Tu nombre completo
   - Un correo electrónico válido
   - Una contraseña (mínimo 6 caracteres)
3. Haz clic en **"Registrarse"**

### 2. Verificar credenciales

Si ya tienes una cuenta:

1. Verifica que el correo electrónico esté escrito correctamente
2. Verifica que la contraseña sea la correcta
3. Intenta escribir la contraseña de nuevo para descartar errores de tipeo

### 3. Ejecutar el Script SQL (IMPORTANTE)

**Este es el paso más importante**: Si no has ejecutado el script SQL en Supabase, la autenticación no funcionará correctamente.

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard/project/oxoirfrlnpnefuzspldd
2. Haz clic en **SQL Editor** en el menú lateral
3. Haz clic en **New Query**
4. Abre el archivo `docs/scripts/supabase-schema.sql`
5. Copia todo el contenido y pégalo en el editor
6. Haz clic en **Run** para ejecutar

### 4. Confirmar correo electrónico

Si tu proyecto de Supabase tiene confirmación de correo habilitada:

1. Revisa tu bandeja de entrada
2. Busca el correo de confirmación de Supabase
3. Haz clic en el enlace de confirmación
4. Intenta iniciar sesión nuevamente

## Verificación

Después de seguir estos pasos:

1. ✅ Intenta registrarte con un correo nuevo
2. ✅ Si funciona, luego podrás iniciar sesión
3. ✅ Si aún no funciona, verifica que el script SQL se ejecutó correctamente

## Notas

- El error "Invalid login credentials" es un error normal cuando las credenciales son incorrectas
- Asegúrate de haber ejecutado el script SQL antes de intentar registrarte
- La contraseña debe tener al menos 6 caracteres

## Si el problema persiste

1. Verifica en la consola del navegador (F12) si hay otros errores
2. Asegúrate de que el archivo `.env` tenga las credenciales correctas
3. Verifica en Supabase que las tablas `auth.users` y `profiles` existan
4. Revisa `docs/reparaciones/2025-01-28-Errores-Autenticacion-Supabase.md` para más detalles técnicos

