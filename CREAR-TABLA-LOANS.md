# 🔧 Crear Tabla `loans` en Supabase

## ❌ Problema Detectado

```
Error: Could not find the table 'public.loans' in the schema cache
```

La tabla de préstamos no existe en tu base de datos.

---

## ✅ Solución: Ejecutar Script SQL

### PASO 1: Ir a SQL Editor

1. Abre tu Dashboard de Supabase: https://supabase.com/dashboard/project/oxoirfrlnpnefuzspldd
2. En el menú lateral izquierdo, haz clic en **"SQL Editor"** (icono `</>`)
3. Haz clic en el botón **"New query"**

---

### PASO 2: Copiar y Pegar el Script

**Copia TODO este código SQL:**

```sql
-- ============================================
-- CREAR TABLA DE PRÉSTAMOS (loans)
-- ============================================

-- Crear tabla de préstamos
CREATE TABLE IF NOT EXISTS loans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  quantity_boxes DECIMAL(10,2) DEFAULT 0,
  quantity_sachets INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_product_id ON loans(product_id);

-- Habilitar Row Level Security (RLS)
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo ven sus propios préstamos
CREATE POLICY "Users can view own loans"
  ON loans FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Los usuarios solo pueden crear sus propios préstamos
CREATE POLICY "Users can insert own loans"
  ON loans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios solo pueden actualizar sus propios préstamos
CREATE POLICY "Users can update own loans"
  ON loans FOR UPDATE
  USING (auth.uid() = user_id);

-- Política: Los usuarios solo pueden eliminar sus propios préstamos
CREATE POLICY "Users can delete own loans"
  ON loans FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para actualizar timestamp automáticamente
CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Verificar que se creó correctamente
SELECT 'Tabla loans creada exitosamente' as resultado;
```

---

### PASO 3: Ejecutar el Script

1. **Pega** el código en el editor SQL
2. Haz clic en el botón **"Run"** (o presiona `Ctrl + Enter` / `Cmd + Enter`)
3. Deberías ver un mensaje de éxito: ✅ `Success. No rows returned`

---

### PASO 4: Verificar que se Creó

1. En el menú lateral izquierdo, haz clic en **"Table Editor"**
2. Busca la tabla **"loans"** en la lista
3. Deberías ver:
   ```
   ✅ loans (0 rows)
   ```

---

### PASO 5: Recargar la Aplicación

1. Vuelve a tu aplicación en el navegador: http://localhost:3000
2. **Recarga la página** (presiona `Ctrl + R` o `F5`)
3. El error de "loans not found" **desaparecerá**

---

## ✅ Resultado Esperado

Después de ejecutar el script:

- ✅ Tabla `loans` creada
- ✅ 4 políticas RLS configuradas
- ✅ Índices para rendimiento óptimo
- ✅ Trigger para `updated_at` automático
- ✅ La app carga sin errores
- ✅ El tab "Préstamos" funciona correctamente

---

## 🎯 Estructura de la Tabla `loans`

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | ID único del préstamo |
| `user_id` | UUID | ID del usuario (FK → auth.users) |
| `product_id` | UUID | ID del producto (FK → products) |
| `quantity_boxes` | DECIMAL(10,2) | Cantidad de cajas prestadas |
| `quantity_sachets` | INTEGER | Cantidad de sobres prestados |
| `notes` | TEXT | Notas adicionales (ej: "Prestado a Juan") |
| `created_at` | TIMESTAMPTZ | Fecha de creación |
| `updated_at` | TIMESTAMPTZ | Fecha de última actualización |

---

## 🚨 Si hay Errores

### Error: "function update_updated_at_column() does not exist"

**Solución:** Ejecuta primero este script:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Luego ejecuta el script principal de nuevo.

---

### Error: "relation 'products' does not exist"

**Solución:** Significa que tampoco tienes la tabla `products`. Ejecuta esto primero:

```sql
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  list_price DECIMAL(10,2) DEFAULT 0,
  points INTEGER DEFAULT 0,
  weighted_average_cost DECIMAL(10,2) DEFAULT 0,
  sachets_per_box INTEGER DEFAULT 30,
  total_boxes_purchased DECIMAL(10,2) DEFAULT 0,
  total_boxes_sold DECIMAL(10,2) DEFAULT 0,
  total_boxes_consumed DECIMAL(10,2) DEFAULT 0,
  inventory_boxes DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own products"
  ON products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  USING (auth.uid() = user_id);
```

Luego ejecuta el script de `loans`.

---

## 📞 Soporte

Si después de ejecutar el script sigues viendo errores:

1. Abre la consola del navegador (F12)
2. Copia el error completo
3. Compártelo para ayudarte

---

## ✨ ¡Listo!

Una vez ejecutado el script, tu sistema de préstamos estará **100% funcional**.

Podrás:
- ✅ Registrar préstamos desde el tab "Préstamos"
- ✅ Ver préstamos activos en la tarjeta KPI
- ✅ Descontar inventario automáticamente
- ✅ Calcular valor estimado de préstamos
- ✅ Ver historial completo de préstamos

**Ejecuta el script y recarga la app.**
