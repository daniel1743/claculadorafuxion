# 🚀 Pasos de Instalación - Esquema V2

## ⚠️ IMPORTANTE: Ejecuta en este orden

### Paso 1: Crear las Tablas (OBLIGATORIO PRIMERO)

Ejecuta este script en Supabase SQL Editor:

**Archivo:** `create-schema-v2-english.sql`

Este script crea:
- ✅ Tabla `products` (en inglés)
- ✅ Tabla `transactions` (en inglés)
- ✅ Tipo ENUM `transaction_type`
- ✅ Políticas RLS
- ✅ Índices

### Paso 2: Verificar que Funcionó

Ejecuta este script:

**Archivo:** `check-existing-tables.sql`

Deberías ver:
- ✅ `products` existe
- ✅ `transactions` existe

### Paso 3: Migrar Datos (SOLO si tienes datos antiguos)

**⚠️ SOLO si tienes datos en `transacciones` o `prices`:**

Ejecuta este script:

**Archivo:** `migrate-spanish-to-english.sql`

Este script migra datos de las tablas antiguas a las nuevas.

## 📝 Resumen Rápido

1. **Primero:** `create-schema-v2-english.sql` ← CREA LAS TABLAS
2. **Segundo:** `check-existing-tables.sql` ← VERIFICA
3. **Tercero (opcional):** `migrate-spanish-to-english.sql` ← MIGRA DATOS

## ✅ Prueba Final

Después del Paso 1, prueba esto:

```sql
-- Ver que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'transactions');
```

Deberías ver 2 filas: `products` y `transactions`.

