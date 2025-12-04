# Análisis: Almacenamiento de Datos en Base de Datos

**Fecha**: 2025-01-28
**Estado**: En Análisis

## 📊 Resumen Ejecutivo

Este documento analiza qué datos se están guardando en la base de datos y cuáles se calculan en tiempo real, identificando áreas de mejora para asegurar que toda la información importante quede resguardada.

## ✅ Datos que YA se Guardan en Supabase

### 1. **Transacciones** (`transactions` table)
- ✅ Compras completas
- ✅ Ventas completas  
- ✅ Gastos de publicidad
- ✅ Productos gratis (free_units)
- ✅ Costo unitario real (real_unit_cost)
- ✅ Campañas asociadas
- ✅ Descripciones y fechas

**Campos guardados:**
- `id`, `user_id`, `type`, `product_name`, `quantity`, `price`, `total`
- `campaign_name`, `description`, `free_units`, `real_unit_cost`, `date`

### 2. **Precios de Productos** (`prices` table)
- ✅ Precios unitarios por producto
- ✅ Relación con usuario

### 3. **Perfiles de Usuario** (`profiles` table)
- ✅ Nombre del usuario
- ✅ Avatar (opcional)

## 📈 Datos que se Calculan (No se Guardan - Es Correcto)

Estos datos se calculan dinámicamente desde las transacciones guardadas:

1. **Inventario Actual** - Se calcula sumando compras y restando ventas
2. **KPIs y Métricas** - Se calculan desde las transacciones:
   - Gasto total de publicidad
   - Inversión en compras
   - Ventas totales
   - Ganancia neta
   - Productos gratis totales
   - Valor de productos gratis
   - Costo unitario real promedio
   - Valor del inventario
   - Mejor campaña (ROI)
3. **Campañas** - Se extraen de las transacciones de publicidad y ventas

**Razón**: Estos son datos derivados que pueden recalcularse en cualquier momento desde las transacciones. Guardarlos sería redundante y podría causar inconsistencias.

## ⚠️ Problemas Identificados

### 1. **Renombrar Producto no Actualiza Transacciones en BD**

**Problema**: Cuando se renombra un producto, solo se actualiza el estado local, pero las transacciones en la base de datos mantienen el nombre antiguo.

**Impacto**: 
- Al recargar la página, el producto vuelve a aparecer con el nombre antiguo
- Inconsistencia entre estado local y base de datos

**Ubicación**: `src/App.jsx` - `handleRenameProduct()`

### 2. **Eliminar Producto no Elimina Transacciones en BD**

**Problema**: Al eliminar un producto, solo se filtran las transacciones localmente, pero en la BD permanecen.

**Impacto**:
- Al recargar, el producto vuelve a aparecer
- Las transacciones quedan huérfanas en la BD

**Ubicación**: `src/App.jsx` - `handleDeleteProduct()`

### 3. **Falta Función para Actualizar Múltiples Transacciones**

**Problema**: No existe una función en `supabaseService.js` para actualizar múltiples transacciones a la vez.

**Necesidad**: Requerida para renombrar productos en todas sus transacciones.

## 🔧 Mejoras Necesarias

### Prioridad Alta

1. **Crear función `updateMultipleTransactions()`**
   - Para actualizar `product_name` en múltiples transacciones
   - Usada al renombrar un producto

2. **Mejorar `handleRenameProduct()`**
   - Actualizar transacciones en BD además del estado local
   - Asegurar consistencia

3. **Mejorar `handleDeleteProduct()`**
   - Eliminar transacciones de la BD además del estado local
   - O decidir si queremos mantener historial (soft delete)

### Prioridad Media

4. **Documentar estructura de datos**
   - Explicar qué se guarda y qué se calcula
   - Guía para desarrolladores

5. **Agregar validaciones**
   - Verificar que todos los campos importantes se guarden
   - Validar integridad de datos

## 📝 Estructura de Datos Actual

### Transacción (Transaction)
```typescript
{
  id: string
  type: 'compra' | 'venta' | 'publicidad'
  productName: string
  quantity: number
  price?: number
  total: number
  campaignName?: string
  description?: string
  freeUnits?: number        // Solo en compras
  realUnitCost?: number     // Solo en compras
  date: string
}
```

### Precio (Price)
```typescript
{
  product_name: string
  price: number
}
```

## 🎯 Recomendaciones

1. **Mantener cálculo dinámico** de inventario y KPIs (correcto como está)
2. **Implementar actualización en BD** al renombrar/eliminar productos
3. **Considerar soft delete** para mantener historial de transacciones eliminadas
4. **Agregar migración de datos** si es necesario para corregir inconsistencias

## 📚 Referencias

- `src/lib/supabaseService.js` - Servicios de base de datos
- `src/App.jsx` - Lógica principal de la aplicación
- `docs/scripts/supabase-schema.sql` - Esquema de base de datos

