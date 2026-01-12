# 🔧 SOLUCIÓN: Error "Timeout obteniendo usuario" al Guardar Precios

## ❌ PROBLEMA IDENTIFICADO

Al intentar guardar precios, aparece el error:

```
Error en upsertProduct: Error: Timeout obteniendo usuario
Error: Timeout obteniendo usuario at productService.js:123:31
```

## 🔍 CAUSA DEL PROBLEMA

El error ocurre porque:

1. **La base de datos no está configurada** - Las tablas no existen en Supabase
2. **El servicio está intentando obtener el usuario** pero las tablas no están creadas
3. **El timeout de 20 segundos se excede** porque la operación no puede completarse

## ✅ SOLUCIÓN

### 🔴 **PASO CRÍTICO: Configurar Base de Datos en Supabase**

**Este es el problema principal.** Las tablas necesarias no existen en Supabase.

### Pasos para Configurar la Base de Datos:

1. **Ir a Supabase Dashboard:**
   - URL: https://app.supabase.com
   - Iniciar sesión con tu cuenta
   - Abrir proyecto: `oxoirfrlnpnefuzspldd`

2. **Ejecutar Script SQL:**
   - Ir a **SQL Editor** → **New Query**
   - Abrir archivo: `supabase-setup.sql` (en la raíz del proyecto)
   - O usar: `docs/scripts/supabase-schema-v2.sql`
   - Copiar **TODO** el contenido del archivo
   - Pegar en el editor SQL
   - Ejecutar (Ctrl+Enter o botón "Run")
   - Esperar a que termine (verás mensaje de éxito)

3. **Verificar Tablas Creadas:**
   - Ir a **Table Editor** en Supabase
   - Deberías ver estas tablas:
     - ✅ `profiles` - Perfiles de usuarios
     - ✅ `transactions` - Transacciones
     - ✅ `products` - Productos (V2)
     - ✅ `prices` - Precios
     - ✅ `loans` - Préstamos

4. **Verificar Políticas RLS:**
   - En cada tabla, ir a la pestaña **Policies**
   - Verificar que existan políticas de seguridad (SELECT, INSERT, UPDATE, DELETE)

### Después de Configurar la Base de Datos:

1. **Recargar la aplicación** en el navegador (Ctrl+Shift+R)

2. **Intentar guardar un precio nuevamente**

3. **Verificar que funciona:**
   - Deberías poder guardar precios sin errores
   - Los datos deberían aparecer en Supabase Table Editor

---

## 🔍 VERIFICACIÓN ADICIONAL

### Verificar que Supabase está conectado:

1. Abre la consola del navegador (F12)
2. Busca: `[Supabase] Configuración:`
3. Debería mostrar:
   ```javascript
   {
     hasUrl: true,
     hasKey: true,
     url: "https://oxoirfrlnpnefuzspldd.supabase.co",
     keyPrefix: "eyJhbGciOiJIUzI1NiIs..."
   }
   ```
4. Busca: `[Supabase] Cliente creado: true`

### Si las variables no se cargan:

1. **Verificar archivo .env:**
   ```bash
   # En PowerShell
   Get-Content .env
   ```

2. **Reiniciar el servidor:**
   ```bash
   # Detener (Ctrl+C)
   npm run dev
   ```

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "relation products does not exist"

**Causa:** La tabla `products` no existe en Supabase.

**Solución:**
1. Ejecutar el script SQL `supabase-setup.sql` en Supabase SQL Editor
2. Verificar en Table Editor que la tabla existe

### Error: "RLS policy violation"

**Causa:** Las políticas de seguridad (RLS) no están configuradas.

**Solución:**
1. Verificar que el script SQL incluya las políticas RLS
2. Si no están, ejecutar el script completo nuevamente

### Error: "Timeout obteniendo usuario" persiste

**Causa:** Puede haber un problema con la autenticación o la conexión.

**Solución:**
1. Cerrar sesión y volver a iniciar sesión
2. Verificar que estás autenticado (verificar en consola)
3. Limpiar caché del navegador (Ctrl+Shift+R)
4. Verificar que el archivo `.env` está correcto

---

## 📋 CHECKLIST DE VERIFICACIÓN

- [ ] Archivo `.env` existe y tiene las credenciales correctas
- [ ] Servidor de desarrollo reiniciado después de crear `.env`
- [ ] Script SQL ejecutado en Supabase SQL Editor
- [ ] Tabla `products` existe en Supabase Table Editor
- [ ] Tabla `prices` existe en Supabase Table Editor
- [ ] Políticas RLS activas en las tablas
- [ ] Usuario autenticado en la aplicación
- [ ] Sin errores en consola del navegador (excepto el timeout)

---

## 🚀 PASOS RECOMENDADOS

### Orden de Ejecución:

1. ✅ **Verificar archivo .env** (ya está creado)
2. ✅ **Reiniciar servidor** (si no lo has hecho)
3. ⚠️ **Ejecutar scripts SQL en Supabase** ⚠️ **PENDIENTE - CRÍTICO**
4. ✅ **Recargar aplicación en navegador**
5. ✅ **Probar guardar un precio**

---

## ⚠️ NOTA IMPORTANTE

**El problema principal es que la base de datos no está configurada.** 

Sin las tablas creadas en Supabase, la aplicación no puede guardar datos. Una vez que ejecutes el script SQL, el problema debería resolverse.

---

**Estado Actual:** ⚠️ **Base de datos no configurada**  
**Acción Requerida:** 🔴 **Ejecutar scripts SQL en Supabase** (10 minutos)

---

*Generado: 2025-01-28*

