# INFORME EXHAUSTIVO: SISTEMA DE GESTIÓN DE OPERACIONES - FUXION

**Fecha de Generación:** 2026-01-11
**Ruta Base:** `C:\Users\Lenovo\Desktop\proyectos desplegados importante\PAGINA REGISTRO GASTOS FUXION COMPLETA\src`
**Propósito:** Documentación completa para reconstrucción del sistema desde cero

---

## TABLA DE CONTENIDOS

1. [Módulos de Operaciones](#módulos-de-operaciones)
2. [Servicios](#servicios)
3. [Estructura de Base de Datos](#estructura-de-base-de-datos)
4. [Flujos de Proceso Completos](#flujos-de-proceso-completos)
5. [Sistema de Inventario](#sistema-de-inventario)
6. [Cálculos Importantes](#cálculos-importantes)
7. [Código Crítico](#código-crítico)

---

## MÓDULOS DE OPERACIONES

### 1. SALES MODULE (Venta Simple)

**Ubicación:** `/components/SalesModule.jsx`

#### A. INFORMACIÓN GENERAL

**Propósito:** Registrar ventas simples a clientes, con soporte para venta desglosada por etiquetas

**Props Recibidas:**
- `onAdd` (function): Callback para notificar al componente padre cuando se registra una venta
- `inventoryMap` (object): Mapa de producto → cantidad disponible {productName: qty}
- `campaigns` (array): Lista de campañas disponibles para asociar a la venta
- `prices` (object): Mapa de precios {productName: price}
- `products` (array): Array de productos disponibles

**State Interno:**
```javascript
const [formData, setFormData] = useState({
  productName: '',           // Nombre del producto principal
  description: '',           // Descripción de la venta
  tags: '',                  // Productos desglosados (separados por comas)
  quantity: '',              // Cantidad total
  totalReceived: '',         // Monto recibido
  campaignName: ''           // Campaña asociada
});

const [availableProducts, setAvailableProducts] = useState([]);  // Productos cargados
```

**Hooks Utilizados:**
- `useState`: Manejo de formulario y productos
- `useEffect`: Cargar productos al montar y auto-calcular total
- `useToast`: Notificaciones al usuario
- `useProductAutocomplete`: Búsqueda autocomplete de productos

#### B. FUNCIONALIDADES

**1. `loadProducts()` - Cargar Productos Disponibles**
- **Parámetros:** Ninguno
- **Qué hace:** Obtiene usuario de Supabase auth, carga productos con inventario
- **Retorna:** void (actualiza state)
- **Validaciones:** Verifica user existencia, maneja errores de red

**2. `handleSubmit(e)` - Procesar Venta**
- **Parámetros:** Event object
- **Qué hace:**
  - Valida campos obligatorios
  - Si hay tags: divide cantidad y costo entre tags
  - Crea transacciones de venta (una por tag o producto)
  - Si hay faltante: crea préstamos automáticamente
- **Retorna:** Promise<void>

**Validaciones:**
```
✓ productName debe estar completo
✓ quantity > 0
✓ totalReceived > 0
✓ Verifica stock disponible
✓ Si stock insuficiente: crea préstamo
```

**Flujo Paso a Paso:**
```
1. Usuario abre SalesModule
2. Selecciona producto principal
3. (Opcional) Agrega etiquetas para desgloses
4. Ingresa cantidad total
5. Ingresa monto recibido (auto-calcula si hay precio)
6. (Opcional) Selecciona campaña
7. Clic en "Registrar Venta"
8. Sistema divide cantidades por tags si existen
9. Para cada división:
   - Crea transacción type: 'sale'
   - Verifica stock
   - Si shortage > 0: crea préstamo automático
10. Actualiza inventario vía trigger de BD
11. Notifica success al padre
12. Limpia formulario
```

#### C. ESTRUCTURA DE DATOS

**FormData:**
```javascript
{
  productName: "prunex 1",      // string
  description: "Venta cliente",  // string
  tags: "rojo, azul",            // string (CSV)
  quantity: "10",                // string (convertir a int)
  totalReceived: "50000",        // string (convertir a float)
  campaignName: "Campaña Verano" // string
}
```

**Datos Enviados a BD (addTransactionV2):**
```javascript
{
  type: 'sale',
  productName: "prunex 1",
  quantityBoxes: 10,
  quantitySachets: 0,
  totalAmount: 50000,
  notes: "Venta cliente - Campaña: Campaña Verano",
  listPrice: 5000
}
```

**Respuesta de BD:**
```javascript
{
  id: "uuid",
  type: "sale",
  productId: "uuid",
  productName: "prunex 1",
  quantityBoxes: 10,
  quantitySachets: 0,
  totalAmount: 50000,
  unitCostSnapshot: 2500,  // Costo promedio al momento
  notes: "...",
  date: "2026-01-11T12:30:00Z"
}
```

#### D. CÁLCULOS IMPORTANTES

**Auto-Cálculo de Total Recibido:**
```javascript
// Cuando cambia productName o quantity
if (prices[productName] && quantity) {
  totalReceived = quantity * prices[productName]
}
```

**Costo Por Unidad (cuando se divide por tags):**
```javascript
const revPerUnit = totalMoney / totalQty
// Cada tag recibe: qty * revPerUnit
```

**Detección de Faltante (Shortage):**
```javascript
const available = inventoryMap[tag] || 0
const shortage = Math.max(0, qty - available)
// Si shortage > 0: crear préstamo
```

#### E. INTEGRACIONES

**Servicios Llamados:**
1. `supabase.auth.getUser()` - Obtener usuario actual
2. `getUserProductsWithInventory(userId)` - Cargar productos
3. `addTransactionV2({...})` - Crear transacción de venta
4. `createLoan({...})` - Crear préstamo si hay shortage

**Validaciones:**
- Stock: comprobado contra `inventoryMap`
- Tipo: validado en transactionServiceV2
- Campos: checked en handleSubmit

---

### 2. SALES MODULE WITH CART (Venta con Carrito)

**Ubicación:** `/components/SalesModuleWithCart.jsx`

#### A. INFORMACIÓN GENERAL

**Propósito:** Venta múltiple con carrito de compras, agregación de productos

**Props:** Idénticas a SalesModule

**State Interno:**
```javascript
const [cart, setCart] = useState([]);  // Array de {productName, quantity, unitPrice, subtotal}
const [formData, setFormData] = useState({
  productName: '',
  quantity: '',
  unitPrice: '',
  campaignName: '',
  notes: ''
});
```

#### B. FUNCIONALIDADES CLAVE

**1. `handleAddToCart()` - Agregar Producto al Carrito**
- Valida cantidad > 0 y precio > 0
- Verifica stock disponible
- Si cantidad > stock: muestra warning (no bloquea)
- Detecta si producto ya está en carrito: suma cantidades
- Agrega nuevo item con ID único: `{ id, productName, quantity, unitPrice, subtotal }`

**2. `handleFinalizeSale()` - Procesar Todo el Carrito**
- Itera cada item del carrito
- Verifica stock final para cada uno
- Crea transacciones V2
- Si shortage: crea préstamos
- Limpia carrito y formulario

**3. `getCurrentStock()` - Calcular Stock Visible**
```javascript
const available = inventoryMap[productName] || 0
const inCart = cart.find(item => item.productName)?.quantity || 0
return available - inCart  // Stock realmente disponible
```

#### C. ESTRUCTURA DE DATOS

**Item del Carrito:**
```javascript
{
  id: "item-1234567890-0.5",  // Identificador único
  productName: "prunex 1",
  quantity: 5,
  unitPrice: 5000,
  subtotal: 25000
}
```

**Totales Calculados:**
```javascript
getCartTotal() = suma de todos los subtotals
```

---

### 3. PURCHASE MODULE (Módulo de Compra)

**Ubicación:** `/components/PurchaseModule.jsx`

#### A. INFORMACIÓN GENERAL

**Propósito:** Registrar compras de inventario con cálculo de bonificación 4x1

**State:**
```javascript
const [formData, setFormData] = useState({
  productName: '',
  description: '',
  tags: '',
  quantity: '',
  totalSpent: ''
});

const [calculations, setCalculations] = useState({
  freeProducts: 0,        // Bonificación 4x1
  realUnitCost: 0         // Costo real promedio
});
```

#### B. CÁLCULOS DE COMPRA

**Bonificación 4x1:**
```javascript
// Por cada 4 unidades compradas, 1 gratis
const freeProducts = Math.floor(quantity / 4)
const totalUnits = quantity + freeProducts
const realUnitCost = totalSpent / totalUnits
```

**Ejemplo:**
- Compro: 12 unidades
- Gasto: 36000
- Bonificación: 12/4 = 3 unidades gratis
- Total recibido: 15 unidades
- Costo real: 36000/15 = 2400 por unidad

#### C. FLUJO DESGLOSADO

```
1. Ingresa cantidad y costo total
2. Sistema calcula automáticamente:
   - Unidades gratis (bonificación)
   - Costo real promedio
3. (Opcional) Etiquetas para dividir compra
4. Envía a addTransactionV2 con type: 'purchase'
5. BD actualiza PPP (Precio Promedio Ponderado) vía trigger
6. Inventario se incrementa
```

---

### 4. EXIT MODULE (Módulo de Salida Flexible)

**Ubicación:** `/components/ExitModule.jsx`

#### A. INFORMACIÓN GENERAL

**Propósito:** Registrar salidas de inventario (4 tipos diferentes)

**Tipos de Salida:**
1. `sale` - Venta a cliente
2. `personal_consumption` - Consumo personal
3. `marketing_sample` - Muestras/Regalos
4. `box_opening` - Apertura de cajas

**State:**
```javascript
const [exitType, setExitType] = useState('sale');
const [formData, setFormData] = useState({
  productName: '',
  quantityBoxes: '',
  quantitySachets: '',
  totalAmount: '',
  notes: '',
  campaignName: ''
});
const [productInventory, setProductInventory] = useState(null);
```

#### B. LÓGICA POR TIPO

**SALE (Venta):**
- Requiere: cajas/sobres + monto total
- Auto-calcula: `totalAmount = (boxes × price) + ((sachets ÷ sachetsPerBox) × price)`

**PERSONAL_CONSUMPTION (Consumo Personal):**
- Requiere: cajas/sobres
- Monto: 0 (es un gasto interno)

**MARKETING_SAMPLE (Muestra):**
- Requiere: solo sobres
- Monto: 0

**BOX_OPENING (Apertura de Caja):**
- Requiere: solo cajas
- Transforma: N cajas → (N × sachetsPerBox) sobres
- Registra con: quantityBoxes = -N, quantitySachets = +(N × sachetsPerBox)

---

### 5. BOX OPENING MODULE (Apertura de Cajas)

**Ubicación:** `/components/BoxOpeningModule.jsx`

**Propósito:** Módulo dedicado a abrir cajas y convertirlas en sobres

**Cálculo:**
```javascript
const sachetsPerBox = productInventory.sachetsPerBox || 28
const totalSachets = quantityBoxes * sachetsPerBox

// Transacción:
{
  type: 'box_opening',
  quantityBoxes: -quantityBoxes,  // Cajas consumidas
  quantitySachets: totalSachets   // Sobres generados
}
```

**Validación:**
```javascript
if (quantityBoxes > productInventory.currentStockBoxes) {
  error: "Stock insuficiente de cajas"
}
```

---

### 6. LOAN MODULE (Módulo de Préstamos)

**Ubicación:** `/components/LoanModule.jsx`

#### A. INFORMACIÓN GENERAL

**Propósito:** Registrar préstamos de productos (cuando se vende más del stock disponible)

**State:**
```javascript
const [formData, setFormData] = useState({
  productName: '',
  quantity: '',
  borrowerName: '',  // A quién se prestó
  notes: ''
});
const [cart, setCart] = useState([]);  // Carrito de productos a prestar
const [selectedPrice, setSelectedPrice] = useState(0);
```

#### B. FLUJO DEL PRÉSTAMO

```
1. Usuario selecciona producto
2. Ingresa cantidad
3. Sistema carga precio unitario automáticamente
4. Calcula valor estimado: quantity × price
5. Clic "Agregar al Carrito"
6. Puede agregar más productos
7. Ingresa nombre del deudor
8. Clic "Registrar Préstamo(s)"
9. Para cada producto:
   - Crea registro en tabla loans
   - Crea transacción type: 'loan'
   - Descuenta del inventario
10. Notifica cantidad de préstamos
```

#### C. DATOS DE PRÉSTAMO

**Estructura en BD:**
```javascript
{
  user_id: "uuid",
  product_id: "uuid",
  quantity_boxes: 5,
  quantity_sachets: 0,
  notes: "Prestado a: Juan Pérez - ...",
  created_at: timestamp,
  updated_at: timestamp
}
```

---

### 7. LOAN REPAYMENT MODULE (Devolución de Préstamos)

**Ubicación:** `/components/LoanRepaymentModule.jsx`

#### A. INFORMACIÓN GENERAL

**Propósito:** Registrar devoluciones de préstamos

**State:**
```javascript
const [formData, setFormData] = useState({
  productName: '',
  quantityBoxes: '',
  notes: ''
});
const [loanBalances, setLoanBalances] = useState({});  // {productId: {productName, totalBoxes, totalSachets}}
```

#### B. FLUJO DE DEVOLUCIÓN

```
1. Carga balances de préstamos activos
2. Usuario selecciona producto
3. Muestra balance actual de préstamo
4. Usuario ingresa cantidad a devolver
5. Validaciones:
   - productName con préstamos activos
   - cantidad > 0
   - cantidad ≤ balance.totalBoxes
6. Sistema ejecuta repayLoan():
   - Obtiene préstamos más antiguos (FIFO)
   - Reduce cada uno hasta cumplir devolución
   - Elimina registros en 0
   - Actualiza registros parciales
7. Crea transacción type: 'loan_repayment'
8. Recarga balances
```

#### C. ALGORITMO FIFO (First In, First Out)

```javascript
// Cuando devuelves un préstamo, descuentas de los más antiguos primero
const loans = await obtener_ordenados_por_fecha_asc()
let remainingToRepay = quantityBoxes

for (const loan of loans) {
  if (remainingToRepay === 0) break

  const toDeduct = Math.min(loan.quantity_boxes, remainingToRepay)
  newQuantity = loan.quantity_boxes - toDeduct
  remainingToRepay -= toDeduct

  if (newQuantity === 0) {
    eliminar_préstamo(loan.id)
  } else {
    actualizar_préstamo(loan.id, newQuantity)
  }
}
```

---

### 8. SHOPPING CART MODULE (Carrito de Compras)

**Ubicación:** `/components/ShoppingCartModule.jsx`

#### A. INFORMACIÓN GENERAL

**Propósito:** Carrito de compras con sistema de puntos y productos gratis (Autoenvío)

**Modos de Compra:**
1. **normal** - Compra simple
2. **autoenvio** - Con puntos y productos gratis

**State:**
```javascript
const [cartName, setCartName] = useState('');
const [purchaseMode, setPurchaseMode] = useState('normal');
const [cartItems, setCartItems] = useState([]);      // Productos pagados
const [freeProducts, setFreeProducts] = useState([]);  // Productos gratis (solo autoenvío)
const [currentProduct, setCurrentProduct] = useState({
  name: '',
  quantity: '',
  price: 0,
  points: 0
});
```

#### B. LÓGICA DE AUTOENVÍO

**Cálculo de Productos Gratis:**
```javascript
// 60 puntos = 1 producto gratis
const totalPoints = cartItems.reduce((sum, item) => sum + (item.points × item.quantity), 0)
const freeProductsCount = Math.floor(totalPoints / 60)

// Genera N formularios para que usuario seleccione productos gratis
```

**Distribución de Costo:**
```javascript
// Cuando finaliza compra con productos gratis:
const totalPaid = cartItems.reduce((sum, item) => sum + item.totalPrice, 0)
const totalItems = sum_cartItems_qty + sum_freeProducts_qty
const costPerUnit = totalPaid / totalItems

// Cada producto gratis se registra con:
totalAmount: costPerUnit × freeQuantity
// Así el PPP se calcula correctamente
```

#### C. ESTRUCTURA DE ITEM

**Item Pagado:**
```javascript
{
  id: "item-123456-0.5",
  name: "prunex 1",
  quantity: 5,
  unitPrice: 5000,
  totalPrice: 25000,
  points: 10  // Puntos Fuxion por unidad
}
```

**Producto Gratis:**
```javascript
{
  id: "free-123456-0",
  name: "prunex 2",
  price: 5000,
  quantity: 1
}
```

---

### 9. AD MODULE (Módulo de Publicidad)

**Ubicación:** `/components/AdModule.jsx`

#### A. INFORMACIÓN GENERAL

**Propósito:** Registrar inversión en publicidad/campañas

**State:**
```javascript
const [formData, setFormData] = useState({
  campaignName: '',
  description: '',
  tags: '',          // Canales (FB, Instagram, etc)
  investment: '',
  date: todayISO
});
```

#### B. FUNCIONALIDAD

**Transacción Generada:**
```javascript
{
  type: 'publicidad',
  campaignName: "Campaña Verano",
  productName: "Instagram",  // Cada tag
  description: "Instagram - Descripción",
  total: investmentDividido,
  quantity: 1,
  date: timestamp
}
```

**División por Tags:**
```
Si tags = "FB, Instagram, TikTok" e investment = 3000:
- FB: 1000
- Instagram: 1000
- TikTok: 1000

Crea 3 transacciones tipo 'publicidad'
```

---

## SERVICIOS

### 1. TRANSACTION SERVICE V2 (`/lib/transactionServiceV2.js`)

**Propósito:** Gestionar todas las transacciones de operaciones

#### A. FUNCIONES EXPORTADAS

**1. `getTransactionsV2(userId)`**
```javascript
/**
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: Array, error: Error|null}>}
 */

// Retorna estructura mapeada:
{
  id: uuid,
  type: 'sale'|'purchase'|'loan'|'loan_repayment'|'personal_consumption'|'marketing_sample'|'box_opening',
  productId: uuid,
  productName: "prunex 1",
  quantityBoxes: 10,
  quantitySachets: 5,
  totalAmount: 50000,
  unitCostSnapshot: 2500,  // PPP al momento de transacción
  notes: "...",
  date: timestamp,
  weightedAverageCost: 2400,  // PPP actual del producto
  listPrice: 5000,
  sachetsPerBox: 28
}
```

**2. `addTransactionV2(transaction)`**
```javascript
/**
 * @param {Object} transaction
 *   @param {string} type - 'purchase'|'sale'|'personal_consumption'|'marketing_sample'|'box_opening'|'loan'|'loan_repayment'
 *   @param {string} productName - Nombre del producto (crea si no existe)
 *   @param {number} quantityBoxes - Cantidad de cajas
 *   @param {number} quantitySachets - Cantidad de sobres
 *   @param {number} totalAmount - Monto total
 *   @param {string} notes - Notas adicionales
 *   @param {number} listPrice - Precio de venta (requerido si crea producto)
 *   @param {number} points - Puntos Fuxion (si es nuevo producto)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */

// Lógica:
// 1. Obtiene usuario actual
// 2. Busca producto por nombre
// 3. Si no existe: crea con listPrice
// 4. Inserta transacción en BD
// 5. Trigger calcula PPP automáticamente
// 6. Retorna transacción mapeada
```

**3. `addMultipleTransactionsV2(transactions)`**
```javascript
// Procesa array de transacciones
// Maneja errores parciales
// Retorna: {data: [success], error: [failures]}
```

**4. `deleteTransactionV2(transactionId)`**
```javascript
// Elimina transacción
// Nota: Trigger ajusta PPP al eliminar
```

**5. `updateTransactionV2(transactionId, updates)`**
```javascript
// Actualiza transacción
// Puede cambiar cantidad, monto, notas, etc.
```

#### B. CONSULTA A SUPABASE

```sql
-- Obtener transacciones (OPTIMIZADO SIN JOIN)
SELECT * FROM transactions
WHERE user_id = $1
ORDER BY created_at DESC

-- Luego cargar productos por separado
SELECT id, name, weighted_average_cost, list_price, sachets_per_box
FROM products
WHERE id IN (...)

-- Insertar transacción
INSERT INTO transactions (
  user_id, product_id, type, quantity_boxes, quantity_sachets,
  total_amount, unit_cost_snapshot, notes
) VALUES (...)
RETURNING *

-- Trigger automático que:
-- 1. Recalcula PPP del producto
-- 2. Actualiza inventario
-- 3. Ajusta totales
```

---

### 2. PRODUCT SERVICE (`/lib/productService.js`)

**Propósito:** Gestionar productos e inventario

#### A. CACHÉ DE USUARIO

```javascript
// Caché para evitar múltiples llamadas simultáneas
let userCache = null;
let userCachePromise = null;
let userCacheTime = 0;
const USER_CACHE_TTL = 5000; // 5 segundos

const getCachedUser = async () => {
  // Si hay llamada en progreso: espera
  // Si caché válido: retorna caché
  // Si no: nueva llamada a supabase.auth.getUser()
}
```

#### B. FUNCIONES EXPORTADAS

**1. `getProductByName(userId, productName)`**
```javascript
/**
 * @returns {Promise<{data: Product|null, error: Error|null}>}
 */

// Retorna:
{
  id: uuid,
  name: "prunex 1",
  list_price: 5000,
  weighted_average_cost: 2400,
  current_stock_boxes: 10,
  current_marketing_stock: 28,
  sachets_per_box: 28,
  points: 10,
  user_id: uuid,
  created_at: timestamp,
  updated_at: timestamp
}
```

**2. `getUserProducts(userId)`**
```javascript
// Retorna array de todos los productos del usuario
// Ordenados por name ASC
```

**3. `upsertProduct(productData)`**
```javascript
/**
 * @param {Object} productData
 *   @param {string} name
 *   @param {number} list_price
 *   @param {number} sachets_per_box (default 28)
 *   @param {number} points (default 0)
 * @returns {Promise<{data: Product, error: Error|null}>}
 */

// Si existe: UPDATE
// Si no existe: INSERT
// Timeout: 45 segundos
```

**4. `getUserProductsWithInventory(userId)`**
```javascript
// Retorna productos formateados para UI:
{
  id: uuid,
  name: "prunex 1",
  listPrice: 5000,
  weightedAverageCost: 2400,
  currentStockBoxes: 10,
  currentMarketingStock: 28,
  sachetsPerBox: 28,
  points: 10,
  totalStockEquivalent: 11  // cajas + (sobres / sachetsPerBox)
}
```

**5. `calculateWeightedAverageCost(productId, newPurchase)`**
```javascript
/**
 * Calcula manualmente el PPP (replica lógica del trigger SQL)
 * @param {Object} newPurchase
 *   @param {number} quantity_boxes
 *   @param {number} total_amount
 * @returns {Promise<{data: number|null, error: Error|null}>}
 */

// Fórmula:
// newPPP = ((stockActual × PPPActual) + (cantidadNew × precioNew)) / (stockActual + cantidadNew)
```

---

### 3. LOAN SERVICE (`/lib/loanService.js`)

**Propósito:** Gestionar préstamos

#### A. FUNCIONES EXPORTADAS

**1. `getUserLoans(userId)`**
```javascript
// Retorna array de todos los préstamos (OPTIMIZADO SIN JOIN)
{
  id: uuid,
  productId: uuid,
  productName: "prunex 1",
  quantityBoxes: 5,
  quantitySachets: 0,
  listPrice: 5000,
  notes: "...",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**2. `getLoanBalances(userId)`**
```javascript
// Retorna préstamos agregados por producto
// {productId: {productId, productName, totalBoxes, totalSachets, listPrice}}
```

**3. `createLoan({productName, quantityBoxes, quantitySachets, notes})`**
```javascript
// 1. Obtiene usuario
// 2. Busca producto por nombre
// 3. Inserta en tabla loans
// 4. NO incrementa inventario (los préstamos son deuda)
```

**4. `repayLoan({productName, quantityBoxes, quantitySachets, notes})`**
```javascript
/**
 * Devolución de préstamo (FIFO - First In First Out)
 * @returns {Promise<{data: Object, error: Error|null}>}
 */

// Retorna:
{
  productName: "prunex 1",
  repaidBoxes: 5,
  repaidSachets: 0,
  remainingBoxes: 2,      // Lo que aún debe
  remainingSachets: 10,
  loansUpdated: 1,
  loansDeleted: 1
}
```

---

### 4. INVENTORY UTILS (`/lib/inventoryUtils.js`)

**Propósito:** Utilidades para manejo de inventario dual (cajas + sobres)

#### A. FUNCIONES EXPORTADAS

**1. `boxesToSachets(boxes, sachetsPerBox = 28)`**
```javascript
// Convierte cajas a sobres
// Ejemplo: 2 cajas → 56 sobres
return Math.floor(boxes * sachetsPerBox)
```

**2. `sachetsToBoxes(sachets, sachetsPerBox = 28)`**
```javascript
// Convierte sobres a cajas (decimal)
// Ejemplo: 56 sobres → 2 cajas
return sachets / sachetsPerBox
```

**3. `sachetsToBoxesCeil(sachets, sachetsPerBox = 28)`**
```javascript
// Redondea hacia arriba
// Ejemplo: 57 sobres → 3 cajas
return Math.ceil(sachets / sachetsPerBox)
```

**4. `validateStock(product, requiredBoxes, requiredSachets)`**
```javascript
/**
 * @returns {Object} {valid: boolean, message: string, canOpenBoxes: number}
 */

// Lógica:
// 1. Verifica cajas: requiredBoxes ≤ currentStockBoxes
// 2. Si necesita más sobres:
//    - Calcula cuántas cajas abrir
//    - Verifica si hay suficientes cajas para abrir
// 3. Retorna validación
```

**5. `formatInventory(product)`**
```javascript
// Formatea para UI
// "5 cajas + 12 sobres"
// "5 cajas"
// "12 sobres"
// "Sin stock"
```

**6. `formatTotalStockEquivalent(product)`**
```javascript
// "5.43 cajas" (total equivalente en cajas)
```

---

### 5. SUPABASE SERVICE (`/lib/supabaseService.js`)

**Propósito:** Servicios de autenticación y datos generales

#### A. AUTENTICACIÓN

**`signUp(email, password, name)`** - Registrar usuario
**`signIn(email, password)`** - Login
**`signOut()`** - Logout
**`getCurrentUser()`** - Obtener usuario actual (sin errores de sesión faltante)
**`onAuthStateChange(callback)`** - Escuchar cambios de sesión

#### B. TRANSACCIONES (LEGACY - Compatibilidad)

**`getTransactions(userId)`** - Obtener transacciones antiguas
**`addTransaction(transaction)`** - Agregar transacción única
**`addMultipleTransactions(transactions)`** - Agregar múltiples
**`deleteTransaction(transactionId)`** - Eliminar
**`updateTransaction(transactionId, updates)`** - Actualizar

#### C. PRECIOS

**`getPrices(userId)`** - Obtener {productName: price}
**`upsertPrice(productName, price)`** - Crear/actualizar
**`deletePrice(productName)`** - Eliminar
**`deleteMultiplePrices(productNames)`** - Eliminar varios

#### D. PERFIL DE USUARIO

**`getUserProfile(userId)`** - Obtener perfil
**`createUserProfile(userId, name, email)`** - Crear
**`updateUserProfile(userId, updates)`** - Actualizar

---

## ESTRUCTURA DE BASE DE DATOS

### Tabla: `transactions`

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  product_id UUID NOT NULL REFERENCES products(id),
  type TEXT NOT NULL CHECK (type IN (
    'purchase', 'sale', 'personal_consumption',
    'marketing_sample', 'box_opening', 'loan', 'loan_repayment'
  )),

  -- Cantidad dual
  quantity_boxes INTEGER DEFAULT 0,
  quantity_sachets INTEGER DEFAULT 0,

  -- Financiero
  total_amount NUMERIC(10, 2) DEFAULT 0,
  unit_cost_snapshot NUMERIC(10, 2) DEFAULT 0,  -- PPP al momento de transacción

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_product_id ON transactions(product_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_type ON transactions(type);

-- Triggers:
-- 1. Después de INSERT/UPDATE: Recalcula PPP del producto
-- 2. Después de INSERT: Actualiza inventario (current_stock_boxes, current_marketing_stock)
-- 3. Después de DELETE: Ajusta PPP e inventario hacia atrás
```

### Tabla: `products`

```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,

  -- Precios
  list_price NUMERIC(10, 2) NOT NULL,
  weighted_average_cost NUMERIC(10, 2) DEFAULT 0,  -- PPP

  -- Inventario
  current_stock_boxes INTEGER DEFAULT 0,
  current_marketing_stock INTEGER DEFAULT 0,  -- Sobres

  -- Configuración
  sachets_per_box INTEGER DEFAULT 28,
  points INTEGER DEFAULT 0,  -- Puntos Fuxion

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, name)
);

-- Índices
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_name ON products(name);
```

### Tabla: `loans`

```sql
CREATE TABLE loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  product_id UUID NOT NULL REFERENCES products(id),

  -- Cantidad
  quantity_boxes INTEGER DEFAULT 0,
  quantity_sachets INTEGER DEFAULT 0,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_loans_user_id ON loans(user_id);
CREATE INDEX idx_loans_product_id ON loans(product_id);
CREATE INDEX idx_loans_created_at ON loans(created_at);
```

### Tabla: `prices` (Legacy)

```sql
CREATE TABLE prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  product_name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(user_id, product_name)
);

-- Nota: Esta tabla es legacy. Ahora los precios están en products(list_price)
```

---

## TIMEOUTS ACTUALIZADOS (2026-01-11)

### App.jsx
- Timeout general loadUserData: **90 segundos**
- Transacciones V2: **60 segundos**
- Productos V2: **60 segundos**
- Precios: **60 segundos**
- Préstamos: **60 segundos**
- Perfil: **20 segundos**

### productService.js
- Obtener usuario (con caché): **45 segundos**
- Verificar producto: **45 segundos**
- Actualizar producto: **45 segundos**
- Crear producto: **45 segundos**

### PriceManagement.jsx
- Timeout general: **45 segundos**
- Renombrar producto: **30 segundos**
- Actualizar precio: **30 segundos**
- Recargar productos: **45 segundos**

---

## OPTIMIZACIONES IMPLEMENTADAS (2026-01-11)

### 1. Consultas SQL Optimizadas

**ANTES (LENTO):**
```javascript
// JOIN de 1000+ registros = muy lento
.select(`*, products(...)`)
```

**DESPUÉS (RÁPIDO):**
```javascript
// 1. Consulta simple SIN JOIN
const { data } = await supabase
  .from('transactions')
  .select('*')
  .eq('user_id', userId)

// 2. Cargar solo productos únicos necesarios
const productIds = [...new Set(data.map(t => t.product_id))]
const { data: products } = await supabase
  .from('products')
  .select('id, name, ...')
  .in('id', productIds)

// 3. Unir en memoria (instantáneo)
const productsMap = Object.fromEntries(products.map(p => [p.id, p]))
const mappedData = data.map(t => ({
  ...t,
  productName: productsMap[t.product_id]?.name
}))
```

**Beneficio:** 10-50x más rápido

### 2. Caché de Usuario

```javascript
// Evita múltiples llamadas simultáneas a getUser()
let userCache = null
let userCachePromise = null
let userCacheTime = 0

// Si llamada en progreso: espera
// Si caché válido (<5s): usa caché
// Si no: nueva llamada
```

### 3. AnimatePresence Mejorado

```javascript
// ANTES
<AnimatePresence>
  {items.map((item, index) => <motion.div key={index}>)}
</AnimatePresence>

// DESPUÉS
<AnimatePresence mode="popLayout">
  {items.map((item, index) => (
    <motion.div
      key={`item-${index}-${item.name}`}
      layout
      transition={{ duration: 0.2 }}
    >
  ))}
</AnimatePresence>
```

---

## CORRECCIONES IMPLEMENTADAS (2026-01-11)

### BoxOpeningModule - Registro de Sobres

**ANTES (INCORRECTO):**
```javascript
{
  type: 'box_opening',
  quantityBoxes: quantityBoxes,  // ❌ Positivo
  quantitySachets: 0,            // ❌ No registra sobres
}
```

**DESPUÉS (CORRECTO):**
```javascript
{
  type: 'box_opening',
  quantityBoxes: -quantityBoxes, // ✅ Negativo (consume cajas)
  quantitySachets: totalSachets, // ✅ Positivo (genera sobres)
}
```

---

**FIN DEL INFORME**

Este documento contiene TODA la información necesaria para reconstruir el sistema completo desde cero.
