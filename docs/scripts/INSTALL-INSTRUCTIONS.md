# 🚀 Instrucciones de Instalación - Esquema V2

## ⚠️ IMPORTANTE: Orden de Ejecución

**DEBES ejecutar los scripts en este orden exacto:**

## Paso 1: Crear el Esquema (OBLIGATORIO PRIMERO)

Ejecuta este script en Supabase SQL Editor:

```sql
-- Archivo: docs/scripts/supabase-schema-v2.sql
```

**O si tienes problemas, usa el script de corrección:**

```sql
-- Archivo: docs/scripts/fix-schema-v2.sql
```

Este script:
- ✅ Crea el tipo ENUM `transaction_type`
- ✅ Crea la tabla `products`
- ✅ Crea la tabla `transactions`
- ✅ Configura RLS (Row Level Security)
- ✅ Crea índices

## Paso 2: Verificar que Funcionó

Ejecuta este script para verificar:

```sql
-- Archivo: docs/scripts/verify-schema-v2.sql
```

Deberías ver:
- ✅ `products` existe
- ✅ `transactions` existe
- ✅ Columnas correctas en ambas tablas

## Paso 3: Migrar Datos (SOLO si tienes datos antiguos)

**⚠️ SOLO ejecuta esto si:**
- Ya ejecutaste el Paso 1
- Tienes datos en las tablas antiguas (`transactions` y `prices`)
- Quieres preservar esos datos

```sql
-- Archivo: docs/scripts/migrate-data-v1-to-v2.sql
```

Este script ahora verifica automáticamente que las tablas existan antes de migrar.

## ❌ Error Común: "la relación 'productos' no existe"

### Causa:
Estás ejecutando el script de migración **ANTES** de crear las tablas.

### Solución:
1. **PRIMERO** ejecuta `supabase-schema-v2.sql` o `fix-schema-v2.sql`
2. **LUEGO** ejecuta `migrate-data-v1-to-v2.sql` (solo si tienes datos)

### Verificación Rápida:

Ejecuta esto para ver qué tablas tienes:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'transactions', 'prices');
```

Si no ves `products` y `transactions`, necesitas ejecutar el Paso 1 primero.

## 📋 Checklist de Instalación

- [ ] Paso 1: Ejecuté `supabase-schema-v2.sql` o `fix-schema-v2.sql`
- [ ] Paso 2: Ejecuté `verify-schema-v2.sql` y vi que las tablas existen
- [ ] (Opcional) Paso 3: Ejecuté `migrate-data-v1-to-v2.sql` si tengo datos antiguos

## ✅ Prueba Final

Después de instalar, prueba insertar un producto:

```sql
-- Reemplaza 'tu-user-id' con tu UUID de usuario real
INSERT INTO products (user_id, name, list_price) 
VALUES (
  'tu-user-id-aqui', 
  'Producto Test', 
  100.00
);
```

Si esto funciona sin errores, ¡el esquema está correcto! ✅

