# 🚀 Instrucciones Rápidas - Sistema de Préstamos

## ⚡ Quick Start

### 1️⃣ Verificar Tabla en Supabase (2 minutos)

```sql
-- Ejecutar en Supabase SQL Editor
SELECT * FROM public.loans LIMIT 1;
```

**Si da error**: Copiar y ejecutar `supabase-setup.sql` líneas 196-225

---

### 2️⃣ Iniciar Servidor (30 segundos)

```bash
npm run dev
```

---

### 3️⃣ Probar Flujo Básico (3 minutos)

1. **Login** en la app
2. **Tab "Salidas"** → Vender 5 cajas (teniendo solo 2)
3. **Verificar**:
   - ✅ Toast amarillo: "Stock Insuficiente... préstamo"
   - ✅ Dashboard: "Préstamos Activos: 3"
4. **Tab "Préstamos"** → Devolver 2 cajas
5. **Verificar**:
   - ✅ Toast verde: "Restante: 1 cajas"
   - ✅ Dashboard: "Préstamos Activos: 1"

---

## 📚 Documentación Completa

- **Testing detallado**: Ver `GUIA-TESTING-PRESTAMOS.md`
- **Verificación técnica**: Ver `VERIFICACION-SISTEMA-PRESTAMOS.md`
- **Plan original**: Ver tu documento inicial

---

## 🎯 Archivos Clave

| Archivo | Qué hace |
|---------|----------|
| `src/lib/loanService.js` | Lógica de préstamos |
| `src/components/LoanRepaymentModule.jsx` | Formulario devolución |
| `src/components/SalesModuleWithCart.jsx` | Crea préstamos auto |
| `src/components/KPIGrid.jsx` | Tarjeta dashboard |
| `src/App.jsx` línea 254 | `recalculateInventory` |

---

## ✅ Checklist Mínimo

- [ ] Tabla `loans` existe en Supabase
- [ ] App corre sin errores (F12 console)
- [ ] Puedes vender más del inventario
- [ ] Se crea préstamo automático
- [ ] Dashboard muestra préstamos
- [ ] Puedes devolver préstamos
- [ ] Inventario nunca es negativo

---

## 🐛 Troubleshooting Express

| Problema | Solución |
|----------|----------|
| "relation loans does not exist" | Ejecutar SQL de tabla loans |
| Préstamos no aparecen | F12 → Ver console, verificar carga |
| "El producto no existe" | Primero comprar el producto |
| Inventario negativo | Verificar `Math.max(0, ...)` en App.jsx:279 |

---

## 📞 Estado del Sistema

**✅ IMPLEMENTACIÓN COMPLETA**

- Base de datos: ✅
- Servicios: ✅
- Componentes: ✅
- Integración: ✅
- Testing: 📝 Pendiente (seguir guía)

---

**Siguiente paso**: Abrir `GUIA-TESTING-PRESTAMOS.md` y ejecutar tests
