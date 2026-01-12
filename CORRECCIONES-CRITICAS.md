# 🔴 CORRECCIONES CRÍTICAS - ACCIÓN INMEDIATA REQUERIDA

**Fecha:** 2025-12-21
**Prioridad:** URGENTE
**Tiempo Total Estimado:** 1 hora

---

## 📋 RESUMEN

Se encontraron **3 errores críticos** que deben corregirse de inmediato:

| # | Error | Ubicación | Impacto | Tiempo |
|---|-------|-----------|---------|--------|
| 1 | Doble clave en productName | App.jsx:445 | Inventario incorrecto | 5 min |
| 3 | Cálculo incorrecto de ganancia | KPIGrid.jsx:112 | Métricas incorrectas | 30 min |
| 4 | División por cero en COGS | accountingUtils.js:31 | App crash | 15 min |

---

## 🔧 CORRECCIÓN #1: Doble Clave en productName

### Ubicación
`src/App.jsx` línea 445

### Código Actual (INCORRECTO)
```javascript
const key = t.productName || t.productName || 'Sin Etiqueta';
```

### Código Corregido
```javascript
const key = t.productName || t.product_name || 'Sin Etiqueta';
```

### Por Qué Es Crítico
- La segunda verificación debería ser `t.product_name` (snake_case de la BD)
- Sin esto, productos con solo `product_name` se asignan como "Sin Etiqueta"
- Causa inventario incorrecto

### Pasos para Corregir
1. Abrir `src/App.jsx`
2. Ir a línea 445
3. Cambiar `t.productName || t.productName` a `t.productName || t.product_name`
4. Guardar

### Verificación
```bash
# Buscar si hay más ocurrencias
grep -n "productName || t.productName" src/App.jsx
```

---

## 🔧 CORRECCIÓN #3: Cálculo Incorrecto de Ganancia Neta

### Ubicación
`src/components/KPIGrid.jsx` líneas 104-114

### Código Actual (INCORRECTO)
```javascript
let netProfit, totalCOGS = 0;
if (products && products.length > 0) {
  const profitData = calculateTotalProfit(transactions, products);
  netProfit = profitData.totalProfit;
  totalCOGS = profitData.totalCOGS;
} else {
  // ❌ ESTO ESTÁ MAL - resta TODAS las compras en lugar de solo lo vendido
  netProfit = totalSales - (totalPurchases + totalAds);
}
```

### Código Corregido
```javascript
let netProfit, totalCOGS = 0;
if (products && products.length > 0) {
  // Usar cálculo real con COGS
  const profitData = calculateTotalProfit(transactions, products);
  netProfit = profitData.totalProfit;
  totalCOGS = profitData.totalCOGS;
} else {
  // Estimar COGS en lugar de restar todas las compras
  const salesTxns = transactions.filter(t => t.type === 'venta' || t.type === 'sale');
  const purchaseTxns = transactions.filter(t => t.type === 'compra' || t.type === 'purchase');

  const unitsSold = salesTxns.reduce((sum, t) => sum + (t.quantityBoxes || t.quantity || 0), 0);
  const totalUnitsPurchased = purchaseTxns.reduce((sum, t) => {
    if (t.type === 'compra') {
      // Incluir productos gratis
      const freeUnits = Math.floor((t.quantity || 0) / 4);
      return sum + (t.quantity || 0) + freeUnits;
    }
    return sum + (t.quantityBoxes || t.quantity || 0);
  }, 0);

  // Estimar COGS basado en costo promedio
  const estimatedCOGS = totalUnitsPurchased > 0
    ? (totalPurchases / totalUnitsPurchased) * unitsSold
    : 0;

  netProfit = totalSales - estimatedCOGS - totalAds;
  totalCOGS = estimatedCOGS;
}
```

### Por Qué Es Crítico
- El método actual resta TODAS las compras históricas
- Ejemplo: Compras $1M, vendes $200K → muestra ganancia de **-$800K** ❌
- Debería ser: COGS de $100K → ganancia de **$100K** ✅
- **Muestra pérdidas artificiales** cuando en realidad hay ganancias

### Pasos para Corregir
1. Abrir `src/components/KPIGrid.jsx`
2. Ir a líneas 104-114
3. Reemplazar el bloque `else` con el código corregido arriba
4. Guardar

### Verificación
Después de corregir:
1. Agregar 10 compras de $10,000 cada una (total $100,000)
2. Agregar 2 ventas de $15,000 cada una (total $30,000)
3. **Ganancia mostrada debería ser ~$10,000** (no -$70,000)

---

## 🔧 CORRECCIÓN #4: División por Cero en COGS

### Ubicación #1
`src/lib/accountingUtils.js` línea 31

### Código Actual (INCORRECTO)
```javascript
const sachetsEquivalent = (quantity_sachets || 0) / (sachets_per_box || 28);
```

### Código Corregido
```javascript
const sachetsEquivalent = (quantity_sachets || 0) / Math.max(sachets_per_box || 28, 1);
```

### Ubicación #2
`src/lib/accountingUtils.js` línea 176

### Código Actual (INCORRECTO)
```javascript
const sachetsEquivalent = (parseInt(current_marketing_stock) || 0) / (parseInt(sachets_per_box) || 28);
```

### Código Corregido
```javascript
const sachetsEquivalent = (parseInt(current_marketing_stock) || 0) / Math.max(parseInt(sachets_per_box) || 28, 1);
```

### Por Qué Es Crítico
- Si un producto tiene `sachets_per_box = 0`, causa división por cero
- Resultado: `Infinity` o `NaN`
- **Puede romper todos los cálculos subsecuentes**
- La app puede crashear o mostrar valores incorrectos

### Pasos para Corregir
1. Abrir `src/lib/accountingUtils.js`
2. Ir a línea 31
3. Cambiar `(sachets_per_box || 28)` a `Math.max(sachets_per_box || 28, 1)`
4. Ir a línea 176
5. Hacer el mismo cambio
6. Guardar

### Verificación
```javascript
// Test case
const product = { sachets_per_box: 0 };
const sale = { quantity_sachets: 10 };
const cogs = calculateCOGS(sale, product);
// Debería ser un número válido, no Infinity
console.assert(!isNaN(cogs) && isFinite(cogs), 'COGS debe ser finito');
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

Usa este checklist para asegurar que todas las correcciones se apliquen correctamente:

### Antes de Empezar
- [ ] Hacer backup del código actual
- [ ] Crear una rama git: `git checkout -b fix/critical-errors`
- [ ] Leer este documento completo

### Corrección #1
- [ ] Abrir `src/App.jsx`
- [ ] Localizar línea 445
- [ ] Cambiar `t.productName || t.productName` a `t.productName || t.product_name`
- [ ] Guardar archivo
- [ ] Buscar otras ocurrencias similares

### Corrección #3
- [ ] Abrir `src/components/KPIGrid.jsx`
- [ ] Localizar líneas 104-114
- [ ] Reemplazar bloque `else` con código corregido
- [ ] Verificar indentación
- [ ] Guardar archivo

### Corrección #4
- [ ] Abrir `src/lib/accountingUtils.js`
- [ ] Localizar línea 31
- [ ] Agregar `Math.max(..., 1)` alrededor del divisor
- [ ] Localizar línea 176
- [ ] Aplicar mismo cambio
- [ ] Guardar archivo

### Después de Corregir
- [ ] Ejecutar `npm run dev` para verificar que no hay errores de sintaxis
- [ ] Probar flujo de compras
- [ ] Probar flujo de ventas
- [ ] Verificar que los KPIs muestran valores correctos
- [ ] Verificar que el inventario se calcula bien
- [ ] Commit: `git commit -m "fix: correcciones críticas de cálculos"`
- [ ] Merge a main (o pedir code review)

---

## 🧪 TESTS DE VERIFICACIÓN

Después de aplicar las correcciones, ejecuta estos tests manuales:

### Test 1: Inventario Correcto
```
1. Crear un producto "Test Product"
2. Agregar compra de 4 unidades a $10,000 = $40,000
3. Verificar inventario = 5 (4 + 1 gratis) ✅
4. Vender 2 unidades a $15,000 = $30,000
5. Verificar inventario = 3 ✅
```

### Test 2: Ganancia Correcta
```
1. Limpiar todas las transacciones
2. Comprar 10 unidades a $10,000 cada una = $100,000
3. Vender 2 unidades a $20,000 cada una = $40,000
4. Ganancia mostrada debería ser ~$20,000 ✅
   (No -$60,000 como antes)
```

### Test 3: COGS sin División por Cero
```
1. Crear producto con sachets_per_box = 0
2. Vender sobres de ese producto
3. Verificar que no hay errores en consola ✅
4. Verificar que COGS es un número válido ✅
```

---

## 🚨 SI ALGO SALE MAL

### Rollback Rápido
Si después de aplicar las correcciones hay problemas:

```bash
# Revertir todos los cambios
git reset --hard HEAD

# O si ya hiciste commit
git revert HEAD
```

### Errores Comunes

**Error: "Cannot read property 'product_name' of undefined"**
- **Causa:** Transacción sin datos
- **Solución:** Agregar verificación `if (!t) return;` al inicio del forEach

**Error: "Math is not defined"**
- **Causa:** Problema de importación
- **Solución:** `Math` es global, no debería pasar. Verifica sintaxis.

**Ganancia sigue siendo negativa**
- **Causa:** Puede que aún falten ajustes
- **Solución:** Verifica que aplicaste el código completo del bloque `else`

---

## 📞 SOPORTE

Si encuentras problemas aplicando estas correcciones:

1. Revisa la consola del navegador para errores
2. Verifica que guardaste todos los archivos
3. Recarga la página con Ctrl+Shift+R (hard reload)
4. Limpia caché de Supabase (logout y login de nuevo)

---

## ✅ RESULTADO ESPERADO

Después de aplicar estas 3 correcciones:

✅ Inventario se calcula correctamente para todos los productos
✅ Ganancia neta muestra valores realistas (no pérdidas artificiales)
✅ No hay errores de división por cero en COGS
✅ Todos los KPIs muestran métricas precisas

**Tiempo total:** ~1 hora
**Impacto:** ALTO - Sistema contablemente correcto

---

**Fin del Documento de Correcciones Críticas**
*Última actualización: 2025-12-21*
