# 📋 Guía de Migración a Esquema V2

## 🎯 Objetivo

Migrar de un esquema simple a un sistema relacional robusto que soporte:
- ✅ Inventario dual (Cajas vs Sobres)
- ✅ Precios Promedio Ponderados
- ✅ Contabilidad estricta
- ✅ Trazabilidad histórica de costos

## ⚠️ IMPORTANTE: Antes de Ejecutar

### Opción A: Base de Datos Nueva (Recomendado para pruebas)
Si estás empezando o puedes perder los datos actuales:
1. Ejecuta directamente `supabase-schema-v2.sql` en Supabase SQL Editor

### Opción B: Migración con Preservación de Datos
Si necesitas mantener datos existentes, sigue estos pasos:

## 📝 Pasos de Migración

### 1. Backup de Datos Actuales
```sql
-- Exporta tus datos actuales antes de continuar
SELECT * FROM transactions;
SELECT * FROM prices;
```

### 2. Ejecutar Script Principal
Ejecuta `supabase-schema-v2.sql` completo en Supabase SQL Editor.

### 3. Migrar Datos Existentes (Opcional)
Si tienes datos en `transactions` y `prices`, puedes migrarlos con el script de migración de datos.

## 🔄 Diferencias Clave

### Esquema Anterior (V1)
- `transactions` con `product_name` (texto libre)
- `prices` separado por producto
- Sin inventario
- Sin costos promedio

### Nuevo Esquema (V2)
- `products` como tabla maestra
- `transactions` con `product_id` (relación FK)
- Inventario dual: `current_stock_boxes` + `current_marketing_stock`
- `weighted_average_cost` calculado dinámicamente
- `unit_cost_snapshot` para historial

## 📊 Tipos de Transacción

| Tipo | Descripción |
|------|-------------|
| `purchase` | Compra de productos |
| `sale` | Venta de productos |
| `personal_consumption` | Consumo personal |
| `marketing_sample` | Muestra de marketing (sobres sueltos) |
| `box_opening` | Apertura de caja (convierte cajas a sobres) |

## 🔐 Seguridad (RLS)

Todas las tablas tienen RLS habilitado:
- Cada usuario solo ve sus propios datos
- No puede acceder a datos de otros usuarios
- Políticas completas para SELECT, INSERT, UPDATE, DELETE

## 🚀 Próximos Pasos

1. Ejecutar el script SQL en Supabase
2. Actualizar el código de la aplicación para usar el nuevo esquema
3. Implementar lógica de cálculo de `weighted_average_cost`
4. Implementar lógica de actualización de inventario

