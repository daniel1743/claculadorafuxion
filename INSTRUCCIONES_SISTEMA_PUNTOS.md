# 🎯 SISTEMA DE PUNTOS FUXION - Instrucciones de Configuración

## ✅ **LO QUE SE HA IMPLEMENTADO**

### **1. Base de Datos**
- ✅ Tabla `user_points` para almacenar puntos base editables
- ✅ Políticas RLS configuradas
- ✅ Campo `points` ya existe en tabla `products`

### **2. Lógica de Negocio**
- ✅ **pointsService.js**: Servicio completo de puntos
- ✅ Cálculo automático desde compras
- ✅ Sistema de rangos (Principiante → Líder → Líder X → Élite)
- ✅ Puntos base editables para ajustes manuales

### **3. Interfaz de Usuario**
- ✅ **PointsCard**: Tarjeta visual en el dashboard
- ✅ **EditBasePointsModal**: Modal para editar puntos base
- ✅ Actualizaciones en tiempo real
- ✅ Barra de progreso hacia siguiente rango

---

## 🚀 **PASOS PARA ACTIVAR EL SISTEMA**

### **PASO 1: Crear la tabla en Supabase**

1. Abre tu proyecto en **Supabase Dashboard**
2. Ve a **SQL Editor** (menú lateral izquierdo)
3. Click en **"New Query"**
4. Copia y pega el contenido de este archivo:
   ```
   sql/create_user_points_table.sql
   ```
5. Click en **"Run"** (botón verde)
6. Verifica que diga: **"Success. No rows returned"**

---

### **PASO 2: Agregar puntos a los productos**

Los productos ya tienen el campo `points`, pero necesitas asignar valores.

**Opción A: Desde el código (cuando creas productos)**
```javascript
// En PurchaseModule o donde crees productos, agrega:
points: 12  // Ejemplo: 12 puntos por caja
```

**Opción B: Manualmente en Supabase**
1. Ve a **Table Editor** → **products**
2. Click en cada producto
3. Edita el campo **points** (ejemplo: 12, 22, etc.)
4. Click **Save**

**Ejemplo de puntos por producto:**
| Producto | Points |
|----------|--------|
| Prunes   | 12     |
| Digifiber| 22     |
| Omnilife | 15     |

---

### **PASO 3: Verificar que funciona**

1. **Inicia tu aplicación**:
   ```bash
   npm run dev
   ```

2. **Abre la app**: `http://localhost:3000`

3. **Inicia sesión** con tu cuenta

4. **Deberías ver la Tarjeta de Puntos** en el dashboard (después de KPI Grid)

5. **Haz una compra de prueba**:
   - Ve a la pestaña **Compras**
   - Registra una compra de un producto que tenga puntos
   - Ejemplo: Compra 2 cajas de "Prunes" (12 puntos/caja)
   - **Resultado esperado**: +24 puntos en la tarjeta

6. **Verifica el cálculo**:
   - La tarjeta debe mostrar:
     - **Total**: 24 puntos
     - **Compras**: 24 puntos
     - **Base**: 0 puntos
     - **Rango**: Principiante
     - **Progreso**: 2% (24/1000)

---

## 🎮 **CÓMO USAR EL SISTEMA**

### **Para usuarios/clientes:**

1. **Ver puntos**: Automático en el dashboard
2. **Ganar puntos**: Cada compra suma puntos
3. **Ver progreso**: Barra muestra % hacia siguiente rango

### **Para administradores:**

1. **Editar puntos base**:
   - Click en el ícono **✏️ Edit** en la tarjeta de puntos
   - Ingresa nuevo valor (ejemplo: 500)
   - Click **Guardar**
   - Uso: Para resets, bonos especiales, ajustes

2. **Configurar puntos de productos**:
   - Desde Supabase Table Editor
   - O al crear/editar productos en el código

---

## 📊 **SISTEMA DE RANGOS**

| Rango       | Puntos Mínimos | Color  |
|-------------|----------------|--------|
| Principiante| 0 - 999        | Gris   |
| Líder       | 1,000 - 4,999  | Azul   |
| Líder X     | 5,000 - 9,999  | Morado |
| Élite       | 10,000+        | Dorado |

---

## 🔄 **CÓMO FUNCIONAN LOS PUNTOS**

### **Fórmula:**
```
Total Points = Base Points + Purchase Points
```

### **Ejemplo real:**

**Situación:**
- Usuario tiene **base_points = 100** (editado manualmente)
- Compras registradas:
  - 2 cajas Prunes (12 pts/caja) = 24 pts
  - 1 caja Digifiber (22 pts/caja) = 22 pts
  - 3 cajas Omnilife (15 pts/caja) = 45 pts

**Cálculo:**
```
Base Points:     100
Purchase Points:  91  (24 + 22 + 45)
─────────────────────
TOTAL:           191 puntos
```

**En la tarjeta se mostraría:**
- 🏆 **191 puntos totales**
- 💚 **91 puntos de compras**
- 💙 **100 puntos base**
- 📈 **Rango: Principiante** (falta 809 para Líder)

---

## ⚠️ **IMPORTANTE: Base Points vs Purchase Points**

### **Base Points (Editables)**
- Se editan manualmente desde el botón ✏️
- NO se borran al hacer compras
- Uso: Resets, bonos, ajustes administrativos
- Ejemplo: "Dar 500 puntos de bienvenida"

### **Purchase Points (Automáticos)**
- Se calculan desde la tabla `transactions`
- Cada compra suma automáticamente
- NO se pueden editar manualmente
- Siempre refleja el historial real de compras

---

## 🐛 **TROUBLESHOOTING**

### **❌ No aparece la tarjeta de puntos**

**Solución:**
1. Verifica que ejecutaste el SQL de `create_user_points_table.sql`
2. Abre la consola del navegador (F12)
3. Busca errores relacionados con `user_points`
4. Si dice "relation does not exist", ejecuta el SQL nuevamente

---

### **❌ Los puntos están en 0 aunque tengo compras**

**Causas posibles:**

1. **Los productos no tienen puntos asignados**
   - Solución: Edita los productos en Supabase, campo `points`

2. **Las compras son antiguas (antes de agregar points)**
   - Solución: Los puntos solo cuentan si el producto tiene el campo `points` > 0

3. **Error en políticas RLS**
   - Solución: Verifica que las políticas de `user_points` y `products` estén activas

---

### **❌ Error al editar puntos base**

**Verifica:**
1. Políticas RLS en tabla `user_points` están activas
2. El usuario está autenticado correctamente
3. No hay errores en la consola del navegador

---

## 📝 **PRÓXIMOS PASOS OPCIONALES**

### **Mejoras futuras que puedes implementar:**

1. **Historial de puntos**:
   - Tabla `points_history` para ver cambios en el tiempo
   - Gráfico de evolución de puntos

2. **Notificaciones de rango**:
   - Toast cuando subes de rango
   - Animación especial en la tarjeta

3. **Recompensas por puntos**:
   - Sistema de canje
   - Descuentos por puntos
   - Productos premium

4. **Leaderboard**:
   - Tabla de mejores usuarios por puntos
   - Competencia mensual

---

## ✅ **CHECKLIST DE VERIFICACIÓN**

Antes de considerar el sistema completo, verifica:

- [ ] Tabla `user_points` creada en Supabase
- [ ] RLS policies activas
- [ ] Campo `points` en tabla `products` tiene valores > 0
- [ ] Tarjeta de puntos visible en dashboard
- [ ] Compra de prueba suma puntos correctamente
- [ ] Botón de editar puntos base funciona
- [ ] Cambio de rango se muestra correctamente
- [ ] Barra de progreso se actualiza

---

## 🎉 **¡LISTO!**

El sistema de puntos está completamente implementado y listo para usar.

**Recuerda:**
- Puntos SOLO desde compras (NO ventas)
- Cada producto define sus propios puntos
- Base points para ajustes manuales
- Sistema de 4 rangos con progreso visual

**Cualquier duda, revisa el código de:**
- `src/lib/pointsService.js` → Lógica de puntos
- `src/components/PointsCard.jsx` → UI de la tarjeta
- `src/components/EditBasePointsModal.jsx` → Modal de edición
