# 📋 Instrucciones Fase 1: Base de Datos

## 🎯 Objetivo

Crear el esquema de base de datos completo con funciones automáticas que actualicen:
- ✅ Costo Promedio Ponderado (PPP) en cada compra
- ✅ Inventario dual (cajas y sobres) en cada transacción

---

## 📝 Orden de Ejecución

Ejecuta los scripts en este orden exacto:

### Paso 1: Crear Esquema Base (5 minutos)

**Archivo**: `docs/scripts/create-schema-v2-english.sql`

1. Abre Supabase SQL Editor
2. Copia y pega el contenido completo del archivo
3. Ejecuta el script
4. Verifica que no hay errores

**Verificación**:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'transactions');
```
Deberías ver 2 filas: `products` y `transactions`

---

### Paso 2: Crear Función de PPP (5 minutos)

**Archivo**: `docs/scripts/functions-update-weighted-cost.sql`

1. Abre Supabase SQL Editor (nueva pestaña o consulta)
2. Copia y pega el contenido completo del archivo
3. Ejecuta el script
4. Verifica que no hay errores

**Verificación**:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'update_weighted_average_cost';
```
Deberías ver 1 fila con `update_weighted_average_cost`

---

### Paso 3: Crear Función de Inventario (5 minutos)

**Archivo**: `docs/scripts/functions-update-inventory.sql`

1. Abre Supabase SQL Editor (nueva pestaña o consulta)
2. Copia y pega el contenido completo del archivo
3. Ejecuta el script
4. Verifica que no hay errores

**Verificación**:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'update_inventory_dual';
```
Deberías ver 1 fila con `update_inventory_dual`

---

### Paso 4: Verificar Triggers (2 minutos)

**Ejecuta esto para verificar que los triggers se crearon**:

```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN (
  'trigger_update_weighted_average_cost', 
  'trigger_update_inventory_dual'
)
ORDER BY trigger_name;
```

Deberías ver 2 filas:
- `trigger_update_weighted_average_cost` en tabla `transactions`
- `trigger_update_inventory_dual` en tabla `transactions`

---

## ✅ Prueba Completa

### Test 1: Crear Producto y Compra

```sql
-- 1. Crear producto
INSERT INTO products (user_id, name, list_price, sachets_per_box)
VALUES (
  'tu-user-id-aqui',  -- Reemplaza con tu UUID real
  'Prunex 1 Test',
  10000,
  28
);

-- 2. Obtener el ID del producto
SELECT id, name, weighted_average_cost, current_stock_boxes 
FROM products 
WHERE name = 'Prunex 1 Test';

-- 3. Insertar compra (reemplaza product_id con el ID obtenido)
INSERT INTO transactions (
  user_id, 
  product_id, 
  type, 
  quantity_boxes, 
  total_amount, 
  unit_cost_snapshot
)
VALUES (
  'tu-user-id-aqui',
  'product-id-obtenido',  -- Reemplaza con el ID real
  'purchase',
  4,  -- 4 cajas
  40000,  -- $40,000 total
  0  -- Se actualizará automáticamente
);

-- 4. Verificar que el PPP se actualizó
SELECT 
  name, 
  weighted_average_cost,  -- Debería ser 10000 (40000/4)
  current_stock_boxes,     -- Debería ser 4
  current_marketing_stock  -- Debería ser 0
FROM products 
WHERE name = 'Prunex 1 Test';
```

**Resultado Esperado**:
- `weighted_average_cost` = 10000
- `current_stock_boxes` = 4
- `current_marketing_stock` = 0

---

### Test 2: Abrir Caja

```sql
-- Abrir 1 caja (usando el mismo product_id)
INSERT INTO transactions (
  user_id, 
  product_id, 
  type, 
  quantity_boxes, 
  total_amount, 
  unit_cost_snapshot
)
VALUES (
  'tu-user-id-aqui',
  'product-id-obtenido',
  'box_opening',
  1,  -- 1 caja
  0,
  0
);

-- Verificar que se abrió
SELECT 
  name, 
  current_stock_boxes,     -- Debería ser 3 (4-1)
  current_marketing_stock  -- Debería ser 28 (0+28)
FROM products 
WHERE name = 'Prunex 1 Test';
```

**Resultado Esperado**:
- `current_stock_boxes` = 3
- `current_marketing_stock` = 28

---

### Test 3: Dar Muestras

```sql
-- Dar 3 sobres de muestra
INSERT INTO transactions (
  user_id, 
  product_id, 
  type, 
  quantity_boxes,
  quantity_sachets,
  total_amount, 
  unit_cost_snapshot
)
VALUES (
  'tu-user-id-aqui',
  'product-id-obtenido',
  'marketing_sample',
  0,  -- 0 cajas
  3,  -- 3 sobres
  0,
  0
);

-- Verificar que se descontaron
SELECT 
  name, 
  current_stock_boxes,     -- Debería seguir siendo 3
  current_marketing_stock  -- Debería ser 25 (28-3)
FROM products 
WHERE name = 'Prunex 1 Test';
```

**Resultado Esperado**:
- `current_stock_boxes` = 3
- `current_marketing_stock` = 25

---

## ⚠️ Solución de Problemas

### Error: "La tabla products no existe"
**Solución**: Ejecuta primero `create-schema-v2-english.sql`

### Error: "La función ya existe"
**Solución**: Es normal, las funciones se recrean. Continúa.

### Error: "El trigger ya existe"
**Solución**: Es normal, los triggers se recrean. Continúa.

### Error: "Stock insuficiente"
**Solución**: Verifica que tienes suficiente inventario antes de la transacción.

---

## ✅ Checklist de Completación

- [ ] Script de esquema base ejecutado sin errores
- [ ] Función de PPP creada y verificada
- [ ] Función de inventario creada y verificada
- [ ] Triggers creados y verificados
- [ ] Test 1 (Compra) funcionando
- [ ] Test 2 (Abrir Caja) funcionando
- [ ] Test 3 (Muestras) funcionando

---

## 🎉 Siguiente Paso

Una vez completada la Fase 1, puedes continuar con:
- **Fase 2**: Lógica de Negocio (JavaScript)
- O probar manualmente las funciones desde Supabase

¿Todo funcionando? ¡Continúa con la Fase 2! 🚀

