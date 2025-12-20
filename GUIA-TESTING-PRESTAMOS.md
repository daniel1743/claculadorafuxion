# 🧪 Guía de Testing - Sistema de Préstamos

## 📋 Checklist Pre-Testing

Antes de comenzar, verifica:

- [ ] La tabla `loans` está creada en Supabase
- [ ] El servidor de desarrollo está corriendo (`npm run dev`)
- [ ] Tienes al menos 2 productos en el sistema
- [ ] Tienes inventario de al menos 1 producto (ej: 2 cajas de Prunex)

---

## 🔧 PASO 1: Verificar Base de Datos

### 1.1 Verificar que la tabla loans existe

```sql
-- Ejecutar en Supabase SQL Editor
SELECT * FROM public.loans LIMIT 1;
```

**Resultado esperado**: Query ejecutada sin error (puede estar vacía)

Si da error "relation does not exist":
1. Ir a `supabase-setup.sql` línea 196
2. Copiar el bloque CREATE TABLE loans (líneas 196-225)
3. Ejecutar en SQL Editor de Supabase

---

## 🧪 TESTING FUNCIONAL

### TEST 1: Venta Normal (Stock Suficiente)

**Objetivo**: Verificar que ventas con stock suficiente NO crean préstamos

**Pasos**:
1. Ir al tab "Salidas"
2. Verificar inventario de un producto (ej: Prunex = 5 cajas)
3. Vender 2 cajas de Prunex por $20,000
4. Click en "Finalizar Venta"

**Resultado Esperado**:
- ✅ Venta registrada exitosamente
- ✅ Inventario actualizado: Prunex = 3 cajas
- ✅ NO aparece toast de préstamo
- ✅ Dashboard > Préstamos Activos = 0 (o sin cambios)

**Resultado Obtenido**: _________

---

### TEST 2: Venta Excedente (Stock Insuficiente)

**Objetivo**: Verificar que se crea préstamo automático cuando vendes más del stock

**Pasos**:
1. Ir al tab "Salidas"
2. Verificar inventario de Prunex = 3 cajas
3. Agregar al carrito: 5 cajas de Prunex por $50,000
4. Observar warning "Stock Insuficiente"
5. Click en "Finalizar Venta"

**Resultado Esperado**:
- ✅ Toast amarillo: "Necesitas 2 unidades adicionales. Se registrarán como préstamo."
- ✅ Venta registrada: 5 cajas por $50,000
- ✅ Inventario de Prunex = 0 (NO negativo)
- ✅ Dashboard > Préstamos Activos = 2 cajas
- ✅ Tarjeta de préstamos muestra "Prunex: 2 cajas"
- ✅ Ventas Totales aumenta en $50,000
- ✅ Ganancia calculada completa (no reducida por préstamo)

**Resultado Obtenido**: _________

---

### TEST 3: Verificar Detalles de Préstamos

**Objetivo**: Ver préstamos detallados en modal

**Pasos**:
1. En Dashboard, click en tarjeta "Préstamos Activos"
2. Se abre modal

**Resultado Esperado**:
- ✅ Título: "Préstamos por Producto"
- ✅ Lista de productos con préstamos:
  - Nombre del producto
  - Cantidad (ej: "2 cajas")
  - Notas del préstamo

**Resultado Obtenido**: _________

---

### TEST 4: Devolución Parcial

**Objetivo**: Devolver parte del préstamo

**Pasos**:
1. Ir al tab "Préstamos"
2. En el módulo "Devolver Préstamo":
   - Seleccionar producto: Prunex
   - Ver "Préstamo Actual: 2 cajas"
3. Cantidad a Devolver: 1
4. Notas: "Compré 1 caja para reponer"
5. Click "Registrar Devolución"

**Resultado Esperado**:
- ✅ Toast verde: "Se registraron 1 cajas devueltas de Prunex. Restante: 1 cajas."
- ✅ Dashboard > Préstamos Activos = 1 caja
- ✅ Inventario de Prunex = 0 (SIN CAMBIOS - no se suma al inventario)
- ✅ Historial de Devoluciones muestra 1 registro:
  - Tipo: loan_repayment
  - Producto: Prunex
  - Cantidad: 1
  - Total: $0 (no tiene valor monetario)

**Resultado Obtenido**: _________

---

### TEST 5: Devolución Total

**Objetivo**: Saldar completamente el préstamo

**Pasos**:
1. En tab "Préstamos"
2. Seleccionar Prunex (debe tener 1 caja pendiente)
3. Cantidad: 1
4. Click "Registrar Devolución"

**Resultado Esperado**:
- ✅ Toast: "Restante: 0 cajas"
- ✅ Dashboard > Préstamos Activos = 0
- ✅ Tarjeta de préstamos ya no muestra Prunex
- ✅ En módulo de devolución, mensaje: "No tienes préstamos activos"
- ✅ Inventario sigue en 0 (correcto, el préstamo es deuda, no inventario físico)

**Resultado Obtenido**: _________

---

### TEST 6: Intento de Devolver Más de lo Debido

**Objetivo**: Verificar validación de cantidad máxima

**Setup**:
1. Vender 8 cajas teniendo 3 → Genera préstamo de 5 cajas

**Pasos**:
1. Ir a tab "Préstamos"
2. Seleccionar producto con préstamo de 5 cajas
3. Intentar devolver: 7 cajas
4. Click "Registrar Devolución"

**Resultado Esperado**:
- ✅ Toast rojo de error: "Solo debes 5 cajas de [Producto]"
- ✅ Devolución NO se registra
- ✅ Préstamos sin cambios

**Resultado Obtenido**: _________

---

### TEST 7: Múltiples Préstamos del Mismo Producto

**Objetivo**: Verificar que préstamos se acumulan correctamente

**Pasos**:
1. Vender 4 cajas teniendo 2 → Préstamo de 2
2. Vender 3 cajas teniendo 0 → Préstamo de 3
3. Verificar Dashboard

**Resultado Esperado**:
- ✅ Préstamos Activos = 5 cajas totales
- ✅ Al abrir modal, puede haber 2 registros separados o 1 consolidado
- ✅ Al devolver 3 cajas, se descuentan de los préstamos más antiguos (FIFO)

**Resultado Obtenido**: _________

---

### TEST 8: Inventario Nunca Negativo

**Objetivo**: Confirmar que `recalculateInventory` respeta Math.max(0, ...)

**Pasos**:
1. Abrir DevTools (F12) → Console
2. Hacer múltiples ventas que excedan inventario
3. Monitorear `inventoryMap` en React DevTools o console

**Resultado Esperado**:
- ✅ Ningún producto tiene inventario negativo
- ✅ El mínimo valor es siempre 0
- ✅ Los faltantes están reflejados en tabla `loans`, no en inventario

**Resultado Obtenido**: _________

---

### TEST 9: Cálculo de Ganancias con Préstamos

**Objetivo**: Las ventas con préstamo deben contar ganancia completa

**Pasos**:
1. Anotar Ganancia Neta actual
2. Vender 10 cajas teniendo 3 (préstamo de 7)
   - Precio lista: $10,000/caja
   - Total venta: $100,000
   - PPP del producto: $8,000/caja
   - COGS: 10 × $8,000 = $80,000
   - Ganancia esperada: $20,000
3. Verificar dashboard

**Resultado Esperado**:
- ✅ Ganancia Neta aumenta exactamente en $20,000
- ✅ Préstamos NO reducen la ganancia
- ✅ El COGS se calcula con PPP, independiente del préstamo

**Resultado Obtenido**: _________

---

### TEST 10: Historial de Transacciones

**Objetivo**: Verificar que loan_repayment aparece en historial

**Pasos**:
1. Realizar 2 devoluciones
2. Ir a tab "Préstamos"
3. Revisar tabla "Historial de Devoluciones"

**Resultado Esperado**:
- ✅ Cada devolución tiene 1 registro
- ✅ Campos visibles:
  - Fecha
  - Producto
  - Cantidad
  - Total: $0
  - Notas
- ✅ Botón de eliminar funcional (opcional)

**Resultado Obtenido**: _________

---

## 🚨 ERRORES COMUNES Y SOLUCIONES

### Error: "relation loans does not exist"
**Causa**: Tabla no creada en Supabase
**Solución**: Ejecutar SQL de `supabase-setup.sql` líneas 196-225

### Error: "El producto no existe"
**Causa**: Producto no está en tabla `products`
**Solución**: Primero agregar una compra del producto

### Error: "Usuario no autenticado"
**Causa**: Sesión expiró
**Solución**: Hacer logout y login nuevamente

### Préstamos no aparecen en Dashboard
**Causa**: Estado `loans` no se carga
**Solución**: Verificar console de navegador, revisar `App.jsx` línea 105-111

### Devolución no reduce préstamo
**Causa**: Error en lógica FIFO de `repayLoan()`
**Solución**: Revisar `loanService.js` línea 196-314

---

## 📊 REPORTE DE TESTING

Fecha: _______________
Tester: _______________

| Test | Descripción | Estado | Notas |
|------|-------------|--------|-------|
| 1 | Venta normal | ⬜ Pass / ⬜ Fail | |
| 2 | Venta excedente | ⬜ Pass / ⬜ Fail | |
| 3 | Detalles préstamos | ⬜ Pass / ⬜ Fail | |
| 4 | Devolución parcial | ⬜ Pass / ⬜ Fail | |
| 5 | Devolución total | ⬜ Pass / ⬜ Fail | |
| 6 | Validación máximo | ⬜ Pass / ⬜ Fail | |
| 7 | Múltiples préstamos | ⬜ Pass / ⬜ Fail | |
| 8 | Inventario no negativo | ⬜ Pass / ⬜ Fail | |
| 9 | Cálculo ganancias | ⬜ Pass / ⬜ Fail | |
| 10 | Historial | ⬜ Pass / ⬜ Fail | |

**RESULTADO FINAL**: ___ / 10 tests pasados

---

## 🎯 CHECKLIST POST-TESTING

- [ ] Todos los tests pasaron
- [ ] No hay errores en console
- [ ] UI se ve correcta en móvil
- [ ] Préstamos persisten después de refresh
- [ ] Métricas del dashboard son consistentes
- [ ] Sistema listo para producción

---

## 📝 NOTAS ADICIONALES

(Agregar observaciones, bugs encontrados, sugerencias de mejora, etc.)
