# 🎯 Plan de Acción: Implementación Sistema Fuxion V2

**Fecha de Creación**: 2025-01-28  
**Objetivo**: Transformar el sistema actual en un Dashboard Financiero Premium con contabilidad estricta para Fuxion

---

## 📋 RESUMEN EJECUTIVO

**4 Fases de Implementación:**
1. 🔴 **Fase 1: Base de Datos** (Fundación - CRÍTICO)
2. 🔴 **Fase 2: Lógica de Negocio** (Motor - CRÍTICO)
3. 🔴 **Fase 3: Frontend Core** (Interfaz - CRÍTICO)
4. 🟡 **Fase 4: Sistema de Puntos** (Optimización - ALTO)

**Tiempo Estimado Total**: 8-12 horas de desarrollo  
**Orden de Ejecución**: Secuencial (cada fase depende de la anterior)

---

## 🔴 FASE 1: BASE DE DATOS (Fundación)

**Objetivo**: Crear el esquema relacional robusto que soporte todas las funcionalidades

### Tarea 1.1: Ejecutar Script de Creación de Esquema
**Archivo**: `docs/scripts/create-schema-v2-english.sql`  
**Tiempo**: 5 minutos  
**Estado**: ✅ Script ya creado

**Pasos**:
1. Abrir Supabase SQL Editor
2. Copiar y pegar el contenido de `create-schema-v2-english.sql`
3. Ejecutar script completo
4. Verificar que no hay errores

**Verificación**:
```sql
-- Ejecutar esto después
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('products', 'transactions');
-- Debe retornar 2 filas
```

---

### Tarea 1.2: Crear Función para Actualizar PPP Automáticamente
**Archivo**: `docs/scripts/functions-update-weighted-cost.sql` (NUEVO)  
**Tiempo**: 30 minutos  
**Estado**: ⏳ Por crear

**Qué hace**:
- Trigger que se ejecuta después de INSERT en `transactions` tipo 'purchase'
- Calcula el nuevo PPP del producto
- Actualiza `products.weighted_average_cost`

**Lógica**:
```sql
-- Pseudocódigo
NUEVO_PPP = (
  (stock_actual * PPP_actual) + (cantidad_comprada * costo_unitario)
) / (stock_actual + cantidad_total_recibida)
```

**Dependencias**: Tarea 1.1 completada

---

### Tarea 1.3: Crear Función para Actualizar Inventario Dual
**Archivo**: `docs/scripts/functions-update-inventory.sql` (NUEVO)  
**Tiempo**: 45 minutos  
**Estado**: ⏳ Por crear

**Qué hace**:
- Trigger que actualiza `current_stock_boxes` y `current_marketing_stock`
- Maneja conversiones automáticas (cajas → sobres)
- Valida que no se venda más de lo disponible

**Casos a manejar**:
1. Compra: Suma a `current_stock_boxes`
2. Venta (cajas): Resta de `current_stock_boxes`
3. Venta (sobres): Resta de `current_marketing_stock` (o abre caja si falta)
4. Apertura de caja: Resta 1 de boxes, suma 28 a marketing_stock
5. Muestras: Resta sobres de `current_marketing_stock`

**Dependencias**: Tarea 1.1 completada

---

### Tarea 1.4: Migrar Datos Existentes (Si aplica)
**Archivo**: `docs/scripts/migrate-spanish-to-english.sql`  
**Tiempo**: 15 minutos  
**Estado**: ✅ Script ya creado

**Cuándo ejecutar**: Solo si tienes datos en tablas antiguas

**Pasos**:
1. Verificar que existen tablas antiguas (`transacciones`, `prices`)
2. Ejecutar script de migración
3. Verificar datos migrados

**Dependencias**: Tarea 1.1 completada

---

## 🔴 FASE 2: LÓGICA DE NEGOCIO (Motor)

**Objetivo**: Implementar las funciones JavaScript que manejan la contabilidad estricta

### Tarea 2.1: Servicio de Productos (Supabase)
**Archivo**: `src/lib/productService.js` (NUEVO)  
**Tiempo**: 1 hora  
**Estado**: ⏳ Por crear

**Funciones a crear**:
```javascript
// Obtener producto por nombre
getProductByName(userId, productName)

// Crear o actualizar producto
upsertProduct(productData)

// Obtener todos los productos del usuario
getUserProducts(userId)

// Calcular PPP manualmente (para validación)
calculateWeightedAverageCost(productId, newPurchase)
```

**Dependencias**: Fase 1 completada

---

### Tarea 2.2: Servicio de Transacciones Mejorado
**Archivo**: `src/lib/supabaseService.js` (MODIFICAR)  
**Tiempo**: 1.5 horas  
**Estado**: ⏳ Por modificar

**Cambios necesarios**:
1. Modificar `addTransaction` para usar nueva estructura:
   - `product_id` en lugar de `product_name`
   - `quantity_boxes` y `quantity_sachets`
   - `type` como enum
   - `unit_cost_snapshot` (guardar PPP del momento)

2. Nueva función `addTransactionWithProduct`:
   - Crea/actualiza producto si no existe
   - Calcula PPP antes de guardar
   - Guarda snapshot del costo

**Dependencias**: Tarea 2.1 completada

---

### Tarea 2.3: Función de Cálculo de COGS
**Archivo**: `src/lib/accountingUtils.js` (NUEVO)  
**Tiempo**: 45 minutos  
**Estado**: ⏳ Por crear

**Funciones a crear**:
```javascript
// Calcular COGS de una venta
calculateCOGS(saleTransaction, product)

// Calcular ganancia real
calculateRealProfit(saleTransaction, product)

// Calcular ganancia total del período
calculateTotalProfit(transactions, products)
```

**Lógica**:
- COGS = cantidad_vendida × PPP_del_producto
- Ganancia = precio_venta - COGS

**Dependencias**: Tarea 2.1 completada

---

### Tarea 2.4: Función de Conversión Cajas/Sobres
**Archivo**: `src/lib/inventoryUtils.js` (NUEVO)  
**Tiempo**: 30 minutos  
**Estado**: ⏳ Por crear

**Funciones a crear**:
```javascript
// Convertir cajas a sobres
boxesToSachets(boxes, sachetsPerBox = 28)

// Convertir sobres a cajas (decimal)
sachetsToBoxes(sachets, sachetsPerBox = 28)

// Validar si hay suficiente stock
validateStock(product, quantityBoxes, quantitySachets)

// Abrir caja (lógica)
openBox(productId, quantityBoxes)
```

**Dependencias**: Tarea 2.1 completada

---

## 🔴 FASE 3: FRONTEND CORE (Interfaz)

**Objetivo**: Crear los componentes de UI que usan la nueva lógica

### Tarea 3.1: Actualizar PurchaseModule
**Archivo**: `src/components/PurchaseModule.jsx` (MODIFICAR)  
**Tiempo**: 1 hora  
**Estado**: ⏳ Por modificar

**Cambios necesarios**:
1. Usar `productService.upsertProduct` en lugar de solo guardar transacción
2. Mostrar PPP actualizado después de compra
3. Validar que el producto existe antes de comprar

**Dependencias**: Tareas 2.1, 2.2 completadas

---

### Tarea 3.2: Crear ExitModule (Nuevo Formulario de Salidas)
**Archivo**: `src/components/ExitModule.jsx` (NUEVO)  
**Tiempo**: 2 horas  
**Estado**: ⏳ Por crear

**Características**:
- Selector de tipo de transacción:
  - Venta Cliente
  - Consumo Personal
  - Muestra/Regalo
  - Apertura de Caja
- Campos según tipo:
  - Venta: cantidad (cajas/sobres), precio total
  - Consumo: cantidad, descripción
  - Muestra: cantidad sobres, destinatario (opcional)
  - Apertura: cantidad cajas a abrir
- Validación de stock disponible
- Cálculo automático de ganancia (solo para ventas)

**Dependencias**: Tareas 2.2, 2.3, 2.4 completadas

---

### Tarea 3.3: Crear BoxOpeningModule
**Archivo**: `src/components/BoxOpeningModule.jsx` (NUEVO)  
**Tiempo**: 45 minutos  
**Estado**: ⏳ Por crear

**Características**:
- Selector de producto
- Cantidad de cajas a abrir
- Preview: "1 caja → 28 sobres"
- Confirmación antes de ejecutar

**Dependencias**: Tareas 2.2, 2.4 completadas

---

### Tarea 3.4: Actualizar KPIGrid con Cálculos Correctos
**Archivo**: `src/components/KPIGrid.jsx` (MODIFICAR)  
**Tiempo**: 1.5 horas  
**Estado**: ⏳ Por modificar

**Cambios necesarios**:
1. **Ganancia Neta**: Usar `calculateTotalProfit` (con COGS real)
2. **Costo Unitario Real**: Mostrar PPP promedio por producto
3. **Nuevo KPI**: "COGS Total" (costo de mercancía vendida)
4. **Separar**: Gastos de Marketing (incluye muestras)

**Dependencias**: Tarea 2.3 completada

---

### Tarea 3.5: Actualizar PriceManagement
**Archivo**: `src/components/PriceManagement.jsx` (MODIFICAR)  
**Tiempo**: 1 hora  
**Estado**: ⏳ Por modificar

**Cambios necesarios**:
1. Agregar campo "Puntos Fuxion" al formulario
2. Mostrar PPP actual en la tabla
3. Mostrar inventario dual (cajas + sobres)
4. Botón "Abrir Caja" en cada fila

**Dependencias**: Tareas 2.1, 3.3 completadas

---

### Tarea 3.6: Actualizar App.jsx
**Archivo**: `src/App.jsx` (MODIFICAR)  
**Tiempo**: 30 minutos  
**Estado**: ⏳ Por modificar

**Cambios necesarios**:
1. Cargar productos desde `productService` (no solo transacciones)
2. Agregar tab "Salidas" con `ExitModule`
3. Integrar `BoxOpeningModule` en tab de Precios
4. Actualizar `recalculateInventory` para usar productos de BD

**Dependencias**: Todas las tareas de Fase 3 anteriores

---

## 🟡 FASE 4: SISTEMA DE PUNTOS (Optimización)

**Objetivo**: Implementar funcionalidades de puntos y rangos Fuxion

### Tarea 4.1: Función de Cálculo de Puntos
**Archivo**: `src/lib/pointsService.js` (NUEVO)  
**Tiempo**: 45 minutos  
**Estado**: ⏳ Por crear

**Funciones a crear**:
```javascript
// Calcular puntos de una transacción
calculatePointsFromSale(saleTransaction, product)

// Calcular puntos totales del período
calculateTotalPoints(transactions, products, startDate, endDate)

// Calcular puntos del mes actual
calculateCurrentMonthPoints(transactions, products)
```

**Dependencias**: Fase 2 completada

---

### Tarea 4.2: Componente RankProgress
**Archivo**: `src/components/RankProgress.jsx` (NUEVO)  
**Tiempo**: 1 hora  
**Estado**: ⏳ Por crear

**Características**:
- Barra de progreso visual
- Rango actual y próximo
- Puntos actuales y necesarios
- "Te faltan X puntos para subir de rango"
- Gráfico de progreso mensual

**Dependencias**: Tarea 4.1 completada

---

### Tarea 4.3: KPI Card de Puntos
**Archivo**: `src/components/KPIGrid.jsx` (MODIFICAR)  
**Tiempo**: 30 minutos  
**Estado**: ⏳ Por modificar

**Cambios**:
- Agregar nueva MetricCard "Puntos Mes Actual"
- Mostrar puntos totales
- Click abre modal con desglose por producto

**Dependencias**: Tareas 4.1, 4.2 completadas

---

### Tarea 4.4: Configuración de Rangos
**Archivo**: `src/lib/fuxionRanks.js` (NUEVO)  
**Tiempo**: 30 minutos  
**Estado**: ⏳ Por crear

**Estructura**:
```javascript
const FUXION_RANKS = [
  { name: 'Inicial', discount: 0.20, minPoints: 0 },
  { name: 'Bronce', discount: 0.25, minPoints: 3000 },
  { name: 'Plata', discount: 0.30, minPoints: 6000 },
  // ... etc
];
```

**Dependencias**: Ninguna (configuración estática)

---

## 📊 CHECKLIST DE PROGRESO

### Fase 1: Base de Datos
- [ ] Tarea 1.1: Ejecutar script de creación
- [ ] Tarea 1.2: Función actualizar PPP
- [ ] Tarea 1.3: Función actualizar inventario
- [ ] Tarea 1.4: Migrar datos (si aplica)

### Fase 2: Lógica de Negocio
- [ ] Tarea 2.1: Servicio de productos
- [ ] Tarea 2.2: Servicio de transacciones mejorado
- [ ] Tarea 2.3: Función cálculo COGS
- [ ] Tarea 2.4: Función conversión cajas/sobres

### Fase 3: Frontend Core
- [ ] Tarea 3.1: Actualizar PurchaseModule
- [ ] Tarea 3.2: Crear ExitModule
- [ ] Tarea 3.3: Crear BoxOpeningModule
- [ ] Tarea 3.4: Actualizar KPIGrid
- [ ] Tarea 3.5: Actualizar PriceManagement
- [ ] Tarea 3.6: Actualizar App.jsx

### Fase 4: Sistema de Puntos
- [ ] Tarea 4.1: Función cálculo puntos
- [ ] Tarea 4.2: Componente RankProgress
- [ ] Tarea 4.3: KPI Card puntos
- [ ] Tarea 4.4: Configuración rangos

---

## 🚀 ORDEN DE EJECUCIÓN RECOMENDADO

### Día 1: Fundación (4-5 horas)
1. ✅ Ejecutar Fase 1 completa
2. ✅ Crear funciones de base de datos
3. ✅ Verificar que todo funciona

### Día 2: Motor (3-4 horas)
1. ✅ Implementar Fase 2 completa
2. ✅ Probar lógica de negocio
3. ✅ Validar cálculos

### Día 3: Interfaz (4-5 horas)
1. ✅ Implementar Fase 3 completa
2. ✅ Probar todos los formularios
3. ✅ Validar UX

### Día 4: Optimización (2-3 horas)
1. ✅ Implementar Fase 4
2. ✅ Probar sistema de puntos
3. ✅ Documentar cambios

---

## ⚠️ RIESGOS Y MITIGACIONES

### Riesgo 1: Datos Existentes
**Problema**: Migración puede perder datos  
**Mitigación**: 
- Hacer backup antes de migrar
- Probar migración en ambiente de desarrollo primero

### Riesgo 2: Cálculos Incorrectos
**Problema**: PPP o COGS mal calculados  
**Mitigación**:
- Crear tests unitarios para funciones de cálculo
- Validar con ejemplos manuales

### Riesgo 3: Performance
**Problema**: Triggers pueden ser lentos  
**Mitigación**:
- Usar índices en tablas
- Optimizar queries de triggers

---

## ✅ CRITERIOS DE ÉXITO

### Funcionalidad
- [ ] PPP se actualiza automáticamente en cada compra
- [ ] Ganancia se calcula usando COGS real
- [ ] Inventario dual funciona correctamente
- [ ] Tipos de salida se clasifican correctamente
- [ ] Sistema de puntos calcula correctamente

### UX
- [ ] Formularios son intuitivos
- [ ] Validaciones funcionan correctamente
- [ ] Mensajes de error son claros
- [ ] KPIs muestran información correcta

### Calidad
- [ ] No hay errores en consola
- [ ] Código está documentado
- [ ] Funciones tienen manejo de errores

---

## 📝 NOTAS IMPORTANTES

1. **No saltar fases**: Cada fase depende de la anterior
2. **Probar después de cada tarea**: No acumular errores
3. **Documentar cambios**: Comentar código complejo
4. **Backup antes de migrar**: Siempre hacer backup de datos

---

## 🎯 SIGUIENTE PASO INMEDIATO

**Empezar con**: Fase 1, Tarea 1.1  
**Acción**: Ejecutar `create-schema-v2-english.sql` en Supabase

¿Listo para empezar? 🚀

