# 📊 SISTEMA DE CICLOS DE NEGOCIO Y ANALYTICS

## 🎯 Descripción General

Sistema completo de historial y analytics para gestión de ciclos de negocio Fuxion con cierre manual de periodos, snapshots inmutables y análisis estratégico profundo.

---

## ✨ Características Principales

### 1. **Cierre Manual de Ciclos**
- El usuario decide cuándo termina un ciclo de negocio (alineado con ciclos Fuxion, NO meses calendario)
- Al cerrar un ciclo, se crea un **snapshot inmutable** de todas las métricas
- Las transacciones actuales se marcan con el `cycle_id` correspondiente
- El dashboard principal se resetea para el nuevo ciclo

### 2. **Historial de Ciclos**
- Card en dashboard principal mostrando últimos 3 ciclos
- Vista completa con todos los ciclos cerrados
- Cada ciclo muestra: ventas, compras, publicidad, ganancia, margen, ROI
- Datos inmutables (no se recalculan, son snapshot)

### 3. **Analytics Estratégico**
- Dashboard completo de análisis comparativo
- Mejor y peor ciclo histórico
- Tendencias de crecimiento/declive
- Comparación mes a mes
- Filtros: últimos 3, 6, 12 ciclos
- Insights y recomendaciones automáticas

---

## 🗂️ Archivos Creados

### SQL
```
sql/create_business_cycles.sql
```
- Tabla `business_cycles` (almacena snapshots de ciclos cerrados)
- Función `close_business_cycle()` (cierra ciclo y calcula métricas)
- Función `get_next_cycle_number()` (auto-incrementa número de ciclo)
- Vista `cycles_summary` (resumen agregado para analytics)
- Políticas RLS (seguridad)

### Servicios
```
src/lib/cycleService.js
```
- `closeBusinessCycle()` - Cierra ciclo actual y crea snapshot
- `getUserCycles()` - Obtiene ciclos del usuario
- `getCycleById()` - Obtiene un ciclo específico
- `getCycleTransactions()` - Transacciones de un ciclo
- `getCyclesComparison()` - Analytics comparativos
- `getCurrentCycleStartDate()` - Fecha inicio del ciclo actual

### Componentes

**`src/components/CloseCycleModal.jsx`**
- Modal para cerrar ciclo actual
- Inputs: nombre del ciclo, fechas, notas
- Validaciones y advertencias
- Muestra qué métricas se guardarán

**`src/components/HistoryCard.jsx`**
- Card para dashboard principal
- Muestra últimos 3 ciclos cerrados
- Link a vista completa
- Indicadores de tendencia (↑↓)

**`src/components/CyclesHistoryView.jsx`**
- Vista completa de todos los ciclos
- Grid con métricas detalladas
- Detalles expandibles (productos, campañas)
- Botón para ir a analytics

**`src/components/AnalyticsDashboard.jsx`**
- Dashboard completo de analytics
- Resumen: ventas totales, ganancias, margen, tendencia
- Mejor y peor ciclo
- Tabla comparativa de todos los ciclos
- Insights y recomendaciones
- Filtros temporales (3, 6, 12 ciclos)

**`src/components/UserProfile.jsx` (Modificado)**
- Agregado: opción "Cerrar Ciclo" en menú desplegable
- Color amarillo distintivo
- Abre `CloseCycleModal`

---

## 🚀 Instalación y Configuración

### Paso 1: Ejecutar SQL en Supabase

```sql
-- En Supabase SQL Editor, ejecuta:
sql/create_business_cycles.sql
```

Esto crea:
- Tabla `business_cycles`
- Columna `cycle_id` en tabla `transactions`
- Funciones helper
- Políticas de seguridad

### Paso 2: Integrar en App.jsx

Agregar imports:

```javascript
import HistoryCard from '@/components/HistoryCard';
import CyclesHistoryView from '@/components/CyclesHistoryView';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
```

Agregar estados:

```javascript
const [showCyclesHistory, setShowCyclesHistory] = useState(false);
const [showAnalytics, setShowAnalytics] = useState(false);
const [cycleRefreshTrigger, setCycleRefreshTrigger] = useState(0);
```

Agregar callback para cuando se cierra un ciclo:

```javascript
const handleCycleClosed = (cycle) => {
  console.log('[App] Ciclo cerrado:', cycle);

  // Recargar datos del nuevo ciclo
  if (user) {
    loadUserData(user.id);
  }

  // Trigger refresh del HistoryCard
  setCycleRefreshTrigger(prev => prev + 1);

  toast({
    title: "🎉 Ciclo Cerrado",
    description: `"${cycle.cycle_name}" guardado exitosamente. Comienza un nuevo ciclo.`,
    className: "bg-green-900 border-green-600 text-white"
  });
};
```

Pasar callback a UserProfile:

```jsx
<UserProfile
  user={user}
  onLogout={handleLogout}
  onUpdateUser={setUser}
  isAdmin={isAdmin}
  onOpenAdminPanel={() => setShowAdminPanel(true)}
  onCycleClosed={handleCycleClosed}  // ← Nuevo
/>
```

Agregar HistoryCard en dashboard (después de KPIGrid):

```jsx
{/* Historial de Ciclos */}
<section>
  <HistoryCard
    userId={user.id}
    onViewAll={() => setShowCyclesHistory(true)}
    refreshTrigger={cycleRefreshTrigger}
  />
</section>
```

Agregar modales al final (antes del cierre de `<div>` principal):

```jsx
{/* Vista de Historial Completo */}
{showCyclesHistory && (
  <CyclesHistoryView
    userId={user.id}
    isOpen={showCyclesHistory}
    onClose={() => setShowCyclesHistory(false)}
    onViewAnalytics={() => {
      setShowCyclesHistory(false);
      setShowAnalytics(true);
    }}
  />
)}

{/* Dashboard de Analytics */}
{showAnalytics && (
  <AnalyticsDashboard
    userId={user.id}
    isOpen={showAnalytics}
    onClose={() => setShowAnalytics(false)}
  />
)}
```

---

## 📖 Flujo de Uso

### Cerrar un Ciclo

1. Usuario hace clic en su foto de perfil
2. Selecciona **"Cerrar Ciclo"** (opción amarilla)
3. Se abre modal:
   - Nombre del ciclo (sugerido automáticamente: "Octubre 2025")
   - Fecha inicio (auto-calculada desde último cierre)
   - Fecha fin (hoy por defecto)
   - Notas opcionales
4. Usuario confirma "Cerrar Ciclo Definitivamente"
5. Sistema:
   - Calcula todas las métricas del periodo
   - Crea snapshot inmutable en `business_cycles`
   - Marca transacciones con `cycle_id`
   - Muestra notificación de éxito

### Ver Historial

1. En dashboard principal, card "Historial de Ciclos" muestra últimos 3
2. Click en "Ver Todo" o "Ver Análisis Completo"
3. Se abre vista completa con todos los ciclos
4. Cada ciclo muestra:
   - Nombre, fechas, número
   - Ventas, compras, publicidad, ganancias
   - Margen, ROI
   - Comparación vs ciclo anterior
   - Productos top y campañas (expandible)

### Analytics Estratégico

1. Desde vista de historial, click "Ver Analytics"
2. Dashboard completo muestra:
   - **Resumen**: Ventas totales, ganancias, margen promedio, tendencia
   - **Mejor Ciclo**: Mayor ganancia histórica
   - **Peor Ciclo**: Menor ganancia (para identificar qué falló)
   - **Tabla Comparativa**: Todos los ciclos lado a lado
   - **Insights**: Observaciones y recomendaciones automáticas
3. Filtros: 3, 6, 12 últimos ciclos
4. Tendencias: Crecimiento, Declive, Estable

---

## 🔒 Seguridad y Validaciones

### Row Level Security (RLS)

```sql
-- Solo el usuario ve sus propios ciclos
CREATE POLICY "Users can view own cycles"
ON business_cycles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Solo el usuario puede crear ciclos
CREATE POLICY "Users can create own cycles"
ON business_cycles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Los ciclos bloqueados NO se pueden modificar
CREATE POLICY "Users can update unlocked cycles"
ON business_cycles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND is_locked = FALSE);
```

### Validaciones en Frontend

- Nombre del ciclo requerido
- Fechas válidas (inicio < fin)
- Confirmar acción (irreversible)
- Loading states
- Manejo de errores

---

## 📊 Métricas Guardadas en Cada Ciclo

Al cerrar un ciclo, se guarda:

### Financieras
- Total ventas
- Total compras
- Total publicidad
- Total gastos (salidas)
- Ganancia bruta
- Ganancia neta
- Margen de ganancia (%)
- ROI (%)

### Préstamos
- Préstamos dados
- Préstamos recibidos
- Pagos recibidos
- Préstamos activos al cierre

### Productos
- Lista de productos vendidos (cantidad, ingresos, ganancia)
- Producto más vendido
- Ingresos del top producto

### Clientes
- Total clientes
- Nuevos clientes (en este ciclo)
- Clientes recurrentes

### Campañas
- Lista de campañas (inversión, ventas, ROI)
- Mejor campaña (mayor ROI)

### Inventario
- Snapshot de inventario al cierre
- Total cajas
- Valor del inventario

### Comparación
- Cambio % ventas vs ciclo anterior
- Cambio % ganancia vs ciclo anterior
- Tasa de crecimiento

---

## 🎨 UI/UX

### Colores y Temática

- **Historial**: Púrpura (#A855F7)
- **Cerrar Ciclo**: Amarillo/Naranja (advertencia, acción importante)
- **Analytics**: Gradiente púrpura-rosa
- **Ganancias**: Verde
- **Pérdidas**: Rojo
- **Tendencias**: Verde (↑), Rojo (↓), Gris (→)

### Animaciones

- Framer Motion para transiciones suaves
- Fade in/out de modales
- Stagger effect en listas
- Hover effects

---

## 💡 Casos de Uso

### Caso 1: Negocio Nuevo

1. Usuario opera durante 4 semanas (ciclo Fuxion)
2. Al finalizar, cierra ciclo "Ciclo 1 - Enero 2025"
3. Sistema guarda: $500k ventas, $300k compras, $50k publicidad, ganancia $150k
4. Dashboard se resetea, comienza Ciclo 2
5. Al finalizar Ciclo 2, analytics compara ambos periodos

### Caso 2: Análisis de Tendencias

1. Usuario tiene 12 ciclos cerrados
2. Va a Analytics
3. Ve que últimos 3 ciclos tienen ganancia decreciente
4. Identifica que ciclo 7 fue el mejor (mayor margen)
5. Revisa qué productos/campañas funcionaron en ciclo 7
6. Replica estrategia en nuevos ciclos

### Caso 3: Presentación a Inversionistas

1. Usuario cierra ciclo trimestral
2. Va a Analytics
3. Exporta/captura tabla comparativa de 12 ciclos
4. Muestra tendencia de crecimiento sostenido
5. Destaca mejor ROI de publicidad

---

## ⚠️ Consideraciones Importantes

### Datos Inmutables

Una vez cerrado un ciclo:
- **NO se puede modificar** (is_locked = TRUE)
- **NO se recalcula** con cambios futuros
- Representa la **realidad del negocio en ese momento**

### Alineación con Ciclos Fuxion

- El sistema NO usa meses calendario
- El usuario define cuándo empieza y termina un periodo
- Perfecto para ciclos semanales Fuxion

### Performance

- Snapshots evitan recalcular miles de transacciones
- Consultas rápidas a tabla `business_cycles`
- Índices en `user_id`, `end_date`, `cycle_number`

---

## 🐛 Troubleshooting

### "Error al cerrar ciclo"

**Causa**: Problema de permisos RLS
**Solución**: Verificar que políticas RLS estén creadas correctamente

### "No aparecen ciclos en historial"

**Causa**: No se han cerrado ciclos aún
**Solución**: Cerrar primer ciclo desde perfil → "Cerrar Ciclo"

### "Analytics muestra datos incorrectos"

**Causa**: Filtro temporal no incluye suficientes ciclos
**Solución**: Cambiar filtro a 12 ciclos o "Todos"

---

## 🚦 Próximas Mejoras (Opcional)

- [ ] Exportar analytics a PDF/Excel
- [ ] Gráficos de línea para tendencias
- [ ] Predicciones basadas en histórico
- [ ] Alertas cuando ciclo actual va peor que promedio
- [ ] Comparar con industria/benchmarks
- [ ] Editar notas de ciclos cerrados
- [ ] Soft delete de ciclos (en vez de no poder eliminar)

---

## ✅ Checklist de Implementación

- [x] Crear SQL schema (`business_cycles`)
- [x] Crear `cycleService.js`
- [x] Crear `CloseCycleModal.jsx`
- [x] Crear `HistoryCard.jsx`
- [x] Crear `CyclesHistoryView.jsx`
- [x] Crear `AnalyticsDashboard.jsx`
- [x] Modificar `UserProfile.jsx` (agregar "Cerrar Ciclo")
- [ ] Integrar en `App.jsx`
- [ ] Ejecutar SQL en Supabase
- [ ] Probar cierre de primer ciclo
- [ ] Verificar historial funciona
- [ ] Verificar analytics muestra datos correctos

---

**Sistema desarrollado para gestión profesional de ciclos Fuxion**
**Última actualización:** Enero 2025
