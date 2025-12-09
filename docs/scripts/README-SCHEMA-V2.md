# 📋 Guía de Instalación del Esquema V2

## ⚠️ Solución de Errores

Si recibes errores como:
- `ERROR: la relación "productos" no existe`
- `ERROR: la columna "product_id" no existe`

**Sigue estos pasos en orden:**

## 🔍 Paso 1: Diagnóstico

Ejecuta primero el script de verificación para ver qué tablas existen:

```sql
-- Ejecuta: docs/scripts/verify-schema-v2.sql
```

Esto te mostrará:
- Qué tablas existen
- Qué columnas tienen
- Qué políticas RLS están configuradas

## 🔧 Paso 2: Corrección

### Opción A: Si NO tienes datos importantes (Recomendado para empezar limpio)

1. Ejecuta el script de corrección completo:
   ```sql
   -- Ejecuta: docs/scripts/fix-schema-v2.sql
   ```

2. Este script:
   - Elimina políticas y triggers existentes
   - Crea el tipo ENUM
   - Crea las tablas `products` y `transactions`
   - Configura RLS correctamente

### Opción B: Si SÍ tienes datos que preservar

1. **PRIMERO**: Haz backup de tus datos
   ```sql
   SELECT * FROM transactions;
   SELECT * FROM prices;
   ```

2. Ejecuta el script principal:
   ```sql
   -- Ejecuta: docs/scripts/supabase-schema-v2.sql
   ```

3. Luego migra los datos:
   ```sql
   -- Ejecuta: docs/scripts/migrate-data-v1-to-v2.sql
   ```

## ✅ Paso 3: Verificación

Después de ejecutar los scripts, verifica que todo esté correcto:

```sql
-- Verificar que las tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'transactions');

-- Verificar columnas de products
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products';

-- Verificar columnas de transactions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions';
```

## 📝 Estructura Esperada

### Tabla `products`
- `id` (UUID)
- `user_id` (UUID)
- `name` (TEXT)
- `sachets_per_box` (INTEGER, default 28)
- `current_stock_boxes` (INTEGER)
- `current_marketing_stock` (INTEGER)
- `weighted_average_cost` (NUMERIC)
- `list_price` (NUMERIC)
- `points` (INTEGER)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Tabla `transactions`
- `id` (UUID)
- `user_id` (UUID)
- `created_at` (TIMESTAMP)
- `product_id` (UUID, FK a products)
- `type` (transaction_type ENUM)
- `quantity_boxes` (INTEGER)
- `quantity_sachets` (INTEGER)
- `total_amount` (NUMERIC)
- `unit_cost_snapshot` (NUMERIC)
- `notes` (TEXT)
- `updated_at` (TIMESTAMP)

## 🚨 Problemas Comunes

### Error: "la relación 'productos' no existe"
**Causa**: Estás intentando usar nombres en español, pero las tablas están en inglés.

**Solución**: 
- Las tablas se llaman `products` y `transactions` (en inglés)
- Asegúrate de usar estos nombres en tus consultas

### Error: "la columna 'product_id' no existe"
**Causa**: La tabla `transactions` no se creó correctamente o tiene el esquema antiguo.

**Solución**:
1. Ejecuta `fix-schema-v2.sql` para recrear las tablas
2. Verifica con `verify-schema-v2.sql`

### Error: "tipo 'transaction_type' no existe"
**Causa**: El tipo ENUM no se creó.

**Solución**:
1. Ejecuta `supabase-schema-v2.sql` completo
2. O ejecuta `fix-schema-v2.sql` que lo recrea

## 📞 Orden de Ejecución Recomendado

1. ✅ `verify-schema-v2.sql` - Ver qué hay
2. ✅ `fix-schema-v2.sql` - Corregir/Crear todo
3. ✅ `verify-schema-v2.sql` - Verificar que quedó bien
4. ✅ (Opcional) `migrate-data-v1-to-v2.sql` - Si tienes datos antiguos

## 🎯 Resultado Esperado

Después de ejecutar correctamente, deberías poder:

```sql
-- Insertar un producto
INSERT INTO products (user_id, name, list_price) 
VALUES ('tu-user-id', 'Producto Test', 100.00);

-- Insertar una transacción
INSERT INTO transactions (user_id, product_id, type, quantity_boxes, total_amount, unit_cost_snapshot)
VALUES ('tu-user-id', 'product-id', 'purchase', 1, 100.00, 100.00);
```

Si estas consultas funcionan, ¡el esquema está correcto! ✅

