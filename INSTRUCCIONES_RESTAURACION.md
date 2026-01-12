# 🔄 INSTRUCCIONES DE RESTAURACIÓN - GESTIÓN DE OPERACIONES

**Fecha:** 2026-01-11
**Propósito:** Guía paso a paso para restaurar el sistema completo

---

## 📋 RESUMEN EJECUTIVO

Este documento te guiará para restaurar completamente el sistema de Gestión de Operaciones desde un punto de control limpio.

### Documentos Disponibles:

1. **INFORME_COMPLETO_GESTION_OPERACIONES.md** - Documentación exhaustiva de todo el sistema
2. **INSTRUCCIONES_RESTAURACION.md** (este archivo) - Guía paso a paso

---

## 🎯 PASOS DE RESTAURACIÓN

### FASE 1: PREPARACIÓN

#### 1.1 Identificar Punto de Control
```bash
# Ver historial de commits
git log --oneline

# Identificar el último commit funcional
# Ejemplo: "feat: funcionalidad X funcionando"
```

#### 1.2 Crear Rama de Respaldo
```bash
# Guarda el trabajo actual por si acaso
git branch respaldo-antes-restauracion

# Verifica que se creó
git branch
```

#### 1.3 Volver al Punto Funcional
```bash
# Opción A: Volver a un commit específico
git reset --hard <commit-hash>

# Opción B: Deshacer últimos N commits
git reset --hard HEAD~3  # Vuelve 3 commits atrás

# IMPORTANTE: Esto borra cambios no guardados
```

---

### FASE 2: VERIFICACIÓN BASE

#### 2.1 Verificar que Funciona
```bash
# Instalar dependencias (si es necesario)
npm install

# Iniciar servidor
npm run dev
```

**Checklist de Funcionalidad Base:**
- [ ] Login funciona
- [ ] Dashboard carga
- [ ] Se muestran datos de BD
- [ ] No hay errores críticos en consola

#### 2.2 Documentar Estado Actual
```bash
# Crear snapshot del estado funcional
git add .
git commit -m "PUNTO DE CONTROL: Estado funcional antes de restaurar módulos"
git tag punto-funcional-base
```

---

### FASE 3: RESTAURAR MÓDULOS PASO A PASO

#### 3.1 Prioridad de Restauración

**ORDEN RECOMENDADO:**

1. ✅ **Servicios Base** (Sin estos, nada funciona)
2. ✅ **Módulos Simples** (Prueba que BD funciona)
3. ✅ **Módulos Complejos** (Con carrito, etc.)
4. ✅ **Optimizaciones** (Timeouts, caché, etc.)

---

#### PASO 1: SERVICIOS BASE

**Archivos a restaurar primero:**

```
/src/lib/
├── supabase.js              ← Cliente Supabase (MUY CRÍTICO)
├── transactionServiceV2.js  ← Transacciones (CRÍTICO)
├── productService.js        ← Productos (CRÍTICO)
├── loanService.js          ← Préstamos
└── inventoryUtils.js        ← Utilidades
```

**Cómo restaurar cada uno:**

```bash
# 1. Copia el contenido desde el informe (INFORME_COMPLETO_GESTION_OPERACIONES.md)
# 2. Busca la sección "CÓDIGO CRÍTICO" o "SERVICIOS"
# 3. Restaura EXACTAMENTE como está documentado
# 4. Prueba INMEDIATAMENTE después de cada archivo
```

**Prueba Paso 1:**
```javascript
// En la consola del navegador:
import { supabase } from './lib/supabase'
const { data, error } = await supabase.auth.getUser()
console.log('Usuario:', data)  // Debe mostrar tu usuario
```

---

#### PASO 2: MÓDULO SIMPLE - PURCHASE MODULE

**Por qué primero:** Es el más simple, solo registra compras.

**Archivo:**
```
/src/components/PurchaseModule.jsx
```

**Restauración:**
1. Busca en el informe la sección "3. PURCHASE MODULE"
2. Copia el código del handler `handleSubmit`
3. Verifica props requeridas
4. Prueba creando una compra

**Prueba Paso 2:**
```
1. Abre el módulo "Nueva Compra"
2. Ingresa: producto, cantidad, costo
3. Verifica que calcula bonificación 4x1
4. Guarda
5. Verifica en BD que se creó correctamente
```

**Checkpoint:**
```bash
git add /src/components/PurchaseModule.jsx /src/lib/*
git commit -m "PASO 2: PurchaseModule restaurado y funcionando"
```

---

#### PASO 3: MÓDULO SIMPLE - SALES MODULE

**Archivo:**
```
/src/components/SalesModule.jsx
```

**Restauración:**
1. Busca "1. SALES MODULE" en el informe
2. Restaura `handleSubmit` completo
3. Restaura validaciones
4. Restaura lógica de préstamos automáticos

**Prueba Paso 3:**
```
1. Abre "Nueva Venta"
2. Vende 5 unidades de un producto con solo 3 en stock
3. Verifica que:
   - Se crea transacción de venta por 5
   - Se crea préstamo automático por 2
   - Inventario queda en -2
   - Tabla loans tiene registro
```

**Checkpoint:**
```bash
git add /src/components/SalesModule.jsx
git commit -m "PASO 3: SalesModule con préstamos automáticos funcionando"
```

---

#### PASO 4: MÓDULO - BOX OPENING

**Archivo:**
```
/src/components/BoxOpeningModule.jsx
```

**CRÍTICO:** Este módulo tenía un bug (sobres no se registraban)

**Restauración CORRECTA:**
```javascript
// ASEGÚRATE de usar:
{
  type: 'box_opening',
  quantityBoxes: -quantityBoxes,  // ← NEGATIVO
  quantitySachets: totalSachets,  // ← POSITIVO
  totalAmount: 0
}
```

**Prueba Paso 4:**
```
1. Abre "Abrir Cajas"
2. Selecciona producto con 5 cajas
3. Abre 2 cajas
4. Verifica:
   - Cajas: 5 → 3 (resta 2)
   - Sobres: X → X+56 (suma 56)
   - Transacción registra quantityBoxes: -2, quantitySachets: 56
```

**Checkpoint:**
```bash
git add /src/components/BoxOpeningModule.jsx
git commit -m "PASO 4: BoxOpeningModule CORREGIDO (registra sobres)"
```

---

#### PASO 5: MÓDULO - LOAN & REPAYMENT

**Archivos:**
```
/src/components/LoanModule.jsx
/src/components/LoanRepaymentModule.jsx
```

**Restauración:**
1. LoanModule: Busca sección "6. LOAN MODULE"
2. LoanRepaymentModule: Busca "7. LOAN REPAYMENT MODULE"
3. **MUY IMPORTANTE:** El algoritmo FIFO en repayLoan() debe estar exacto

**Prueba Paso 5:**
```
Préstamos:
1. Crea préstamo manual de 5 cajas (01-01)
2. Crea otro de 3 cajas (01-05)
3. Total deuda: 8 cajas

Devolución:
4. Devuelve 6 cajas
5. Verifica que:
   - Préstamo 01-01 (5 cajas) se elimina completamente
   - Préstamo 01-05 queda en 2 cajas (3-1)
   - Total restante: 2 cajas ✓
```

**Checkpoint:**
```bash
git add /src/components/LoanModule.jsx /src/components/LoanRepaymentModule.jsx
git commit -m "PASO 5: Módulos de préstamos con FIFO funcionando"
```

---

#### PASO 6: MÓDULOS COMPLEJOS

**Archivos:**
```
/src/components/SalesModuleWithCart.jsx
/src/components/ShoppingCartModule.jsx
/src/components/ExitModule.jsx
/src/components/AdModule.jsx
```

**Restauración:**
- Uno a la vez
- Prueba cada uno antes de continuar
- Usa el informe para verificar lógica

**Checkpoint por cada uno:**
```bash
git add /src/components/SalesModuleWithCart.jsx
git commit -m "PASO 6A: SalesModuleWithCart restaurado"

git add /src/components/ShoppingCartModule.jsx
git commit -m "PASO 6B: ShoppingCartModule con autoenvío restaurado"

# ... etc
```

---

### FASE 4: OPTIMIZACIONES

#### 4.1 Timeouts

**Archivos a modificar:**
```
/src/App.jsx
/src/lib/productService.js
/src/lib/transactionServiceV2.js
/src/lib/loanService.js
/src/components/PriceManagement.jsx
```

**Valores recomendados:**
- App.jsx: 60-90 segundos
- Services: 45 segundos
- PriceManagement: 45 segundos

**Verificación:**
```javascript
// Busca todos los setTimeout en cada archivo
// Asegúrate que sean >= 45000 (45 segundos)
grep -r "setTimeout.*reject.*Timeout" src/
```

---

#### 4.2 Optimización de Consultas

**Archivos:**
```
/src/lib/transactionServiceV2.js → getTransactionsV2()
/src/lib/loanService.js → getUserLoans()
```

**Cambio CRÍTICO:**

**ANTES (LENTO):**
```javascript
.select(`*, products(...)`)  // JOIN lento
```

**DESPUÉS (RÁPIDO):**
```javascript
// 1. Consulta simple
const { data } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', userId)

// 2. Productos por separado
const productIds = [...new Set(data.map(t => t.product_id))]
const { data: products } = await supabase
  .from('products')
  .select('id, name, ...')
  .in('id', productIds)

// 3. Unir en memoria
const productsMap = Object.fromEntries(products.map(p => [p.id, p]))
```

---

#### 4.3 Caché de Usuario

**Archivo:** `/src/lib/productService.js`

**Agregar al inicio:**
```javascript
let userCache = null;
let userCachePromise = null;
let userCacheTime = 0;
const USER_CACHE_TTL = 5000;

const getCachedUser = async () => {
  const now = Date.now();
  if (userCachePromise) return userCachePromise;
  if (userCache && (now - userCacheTime) < USER_CACHE_TTL) return userCache;

  userCachePromise = supabase.auth.getUser()
    .then(result => {
      userCache = result;
      userCacheTime = Date.now();
      userCachePromise = null;
      return result;
    })
    .catch(error => {
      userCachePromise = null;
      throw error;
    });

  return userCachePromise;
};
```

**Reemplazar en upsertProduct:**
```javascript
// ANTES
const { data: { user } } = await supabase.auth.getUser();

// DESPUÉS
const { data: { user } } = await getCachedUser();
```

---

#### 4.4 AnimatePresence

**Archivos:**
```
/src/components/MetricCard.jsx
/src/components/SalesModuleWithCart.jsx
/src/components/ShoppingCartModule.jsx
```

**Cambio:**
```javascript
// ANTES
<AnimatePresence>

// DESPUÉS
<AnimatePresence mode="wait">  // o mode="popLayout"
  <motion.div
    key="unique-key"  // ← IMPORTANTE: key única
    layout
    transition={{ duration: 0.2 }}
  >
```

---

### FASE 5: VERIFICACIÓN FINAL

#### 5.1 Checklist Completo

**Funcionalidades Core:**
- [ ] Login funciona
- [ ] Dashboard carga datos
- [ ] Crear venta simple
- [ ] Crear compra (con bonificación)
- [ ] Abrir cajas (sobres se registran)
- [ ] Crear préstamo manual
- [ ] Devolver préstamo (FIFO correcto)
- [ ] Venta con shortage (préstamo automático)
- [ ] Gestión de precios
- [ ] Módulos de carrito

**Performance:**
- [ ] Carga inicial < 5 segundos
- [ ] No hay timeouts
- [ ] Consultas optimizadas funcionan

**UI/UX:**
- [ ] No hay errores de AnimatePresence
- [ ] Notificaciones funcionan
- [ ] Formularios se limpian después de submit

#### 5.2 Prueba de Estrés

```javascript
// Crear 50 transacciones rápidas
for (let i = 0; i < 50; i++) {
  await addTransactionV2({
    type: 'sale',
    productName: 'test',
    quantityBoxes: 1,
    totalAmount: 1000
  })
}

// Verificar:
// - Sin crashes
// - Sin memory leaks
// - Performance sigue aceptable
```

---

### FASE 6: COMMIT FINAL

```bash
# Verificar que TODO funciona
npm run build  # Sin errores
npm run dev    # Probar manualmente

# Commit final
git add .
git commit -m "✅ RESTAURACIÓN COMPLETA: Sistema de Gestión de Operaciones funcionando"

# Tag de versión
git tag v2.0-restaurado-completo

# Push (si aplica)
git push origin main
git push origin --tags
```

---

## 🚨 PROBLEMAS COMUNES Y SOLUCIONES

### Problema 1: "Timeout obteniendo usuario"

**Solución:**
```javascript
// Verifica timeouts en productService.js
const getUserTimeout = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('...')), 45000)  // ← Debe ser 45000+
);
```

### Problema 2: "Box opening no registra sobres"

**Solución:**
```javascript
// BoxOpeningModule.jsx línea ~91-92
quantityBoxes: -quantityBoxes,  // ← NEGATIVO
quantitySachets: totalSachets,  // ← POSITIVO
```

### Problema 3: "Consultas muy lentas"

**Solución:**
```javascript
// Reemplazar .select(`*, products(...)`) por:
// 1. SELECT * simple
// 2. Cargar productos por separado
// 3. Unir en memoria
```

### Problema 4: "Error de AnimatePresence removeChild"

**Solución:**
```javascript
<AnimatePresence mode="wait">
  <motion.div
    key={`unique-${item.id}`}  // ← Key única
    layout
    transition={{ duration: 0.2 }}
  >
```

### Problema 5: "No se cargan datos de BD"

**Diagnóstico:**
```bash
# 1. Abre diagnostico.html en el navegador
# 2. Verifica:
#    - Usuario logueado
#    - Cantidad de registros en BD
#    - Errores de consulta
```

**Solución:**
- Si BD vacía: Normal, crear datos nuevos
- Si hay datos pero no cargan: Verificar timeouts
- Si error de consulta: Verificar estructura de BD

---

## 📞 NECESITAS AYUDA?

Si encuentras problemas durante la restauración:

1. **Revisa el INFORME_COMPLETO_GESTION_OPERACIONES.md**
   - Busca la sección específica del módulo
   - Verifica que el código coincida exactamente

2. **Verifica los logs:**
   ```javascript
   // Activa logs detallados
   console.log('[DEBUG] Estado actual:', ...)
   ```

3. **Usa git para comparar:**
   ```bash
   git diff HEAD~1 archivo.jsx  # Ver cambios
   ```

4. **Vuelve a un punto anterior:**
   ```bash
   git reset --hard <commit-anterior>
   ```

---

## ✅ CHECKLIST FINAL

Antes de dar por terminada la restauración:

- [ ] Todos los módulos restaurados
- [ ] Todos los servicios funcionando
- [ ] Timeouts aumentados
- [ ] Consultas optimizadas
- [ ] Caché de usuario implementado
- [ ] AnimatePresence corregido
- [ ] Pruebas manuales completadas
- [ ] Build sin errores
- [ ] Commit y tag creados
- [ ] Documentación actualizada

---

**¡Éxito en la restauración! 🎉**

Si sigues estos pasos, tendrás el sistema completamente funcional.
