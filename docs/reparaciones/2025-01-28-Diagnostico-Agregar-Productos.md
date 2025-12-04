# Diagnóstico: Problema al Agregar Productos

**Fecha**: 2025-01-28
**Estado**: En Investigación

## 🔍 Problema Reportado

No se pueden agregar productos en la sección de "Gestión de Precios". La lógica existe pero no se ejecuta correctamente.

## 🔎 Posibles Causas

### 1. **Tabla `prices` No Existe en Supabase**

**Síntoma**: Error al intentar hacer upsert en la tabla prices

**Solución**: Ejecutar el script SQL en Supabase

### 2. **Row Level Security (RLS) No Configurado**

**Síntoma**: Error de permisos al intentar insertar

**Solución**: Verificar que las políticas RLS estén creadas

### 3. **Usuario No Autenticado**

**Síntoma**: Error "Usuario no autenticado"

**Solución**: Verificar que la sesión esté activa

### 4. **Error en la Función `upsertPrice`**

**Síntoma**: Error específico de Supabase

**Solución**: Revisar logs de consola

## 🛠️ Pasos de Diagnóstico

### Paso 1: Verificar que las Tablas Existen

1. Ve a Supabase: https://supabase.com/dashboard/project/oxoirfrlnpnefuzspldd
2. Ve a **Table Editor**
3. Verifica que exista la tabla `prices`

**Si NO existe**: Ejecuta el script `docs/scripts/supabase-schema.sql`

### Paso 2: Verificar Políticas RLS

1. En Supabase, ve a **Authentication** → **Policies**
2. Verifica que la tabla `prices` tenga políticas para:
   - SELECT
   - INSERT
   - UPDATE
   - DELETE

**Si NO existen**: Ejecuta el script SQL completo

### Paso 3: Verificar Consola del Navegador

1. Abre la consola (F12)
2. Intenta agregar un producto
3. Busca errores que mencionen:
   - "prices"
   - "permission denied"
   - "table does not exist"
   - "RLS"

### Paso 4: Verificar Autenticación

1. Verifica que hayas iniciado sesión
2. Verifica en la consola si aparece "Usuario no autenticado"

## 🐛 Errores Comunes y Soluciones

### Error: "relation 'prices' does not exist"

**Causa**: La tabla no existe en Supabase

**Solución**: Ejecutar el script SQL en Supabase

### Error: "new row violates row-level security policy"

**Causa**: Las políticas RLS no están configuradas

**Solución**: Ejecutar el script SQL completo (incluye políticas)

### Error: "Usuario no autenticado"

**Causa**: No hay sesión activa

**Solución**: Iniciar sesión correctamente

### Error: "duplicate key value violates unique constraint"

**Causa**: El producto ya existe para ese usuario

**Solución**: Esto es normal, el upsert debería actualizarlo

## ✅ Verificación Rápida

Ejecuta esto en la consola del navegador cuando estés logueado:

```javascript
// Verificar si estás autenticado
const { data: { user } } = await window.supabase.auth.getUser();
console.log('Usuario:', user);

// Intentar leer precios (debería funcionar)
const { data, error } = await window.supabase
  .from('prices')
  .select('*');
console.log('Precios:', data, 'Error:', error);
```

## 📝 Logs a Revisar

Cuando intentes agregar un producto, revisa:

1. **Consola del navegador**: Errores de JavaScript
2. **Network tab**: Respuestas de Supabase
3. **Supabase Logs**: Ve a Logs en el dashboard

## 🔧 Correcciones Implementadas

1. ✅ `handleSave` ahora es async y espera la operación
2. ✅ Mejor manejo de errores con mensajes específicos
3. ✅ Estado de carga (isSaving) para mejor UX
4. ✅ Recarga de precios después de agregar

## 📞 Siguiente Paso

Si el problema persiste después de verificar todo lo anterior, revisa:
1. Los logs de Supabase en el dashboard
2. La consola del navegador para errores específicos
3. Que el script SQL se haya ejecutado correctamente

