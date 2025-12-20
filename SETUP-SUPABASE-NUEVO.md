# 🚀 Guía Completa: Configurar Supabase Desde Cero

## 📋 RESUMEN

Si perdiste acceso a tu proyecto Supabase o quieres empezar de cero, esta guía te llevará paso a paso para:
1. Crear cuenta/proyecto Supabase
2. Configurar base de datos
3. Conectar con tu aplicación
4. Verificar funcionamiento

**Tiempo estimado:** 15-20 minutos

---

## 🎯 PASO 1: CREAR CUENTA Y PROYECTO SUPABASE

### 1.1 Crear Cuenta (si no tienes)

1. Ve a: **https://supabase.com**
2. Haz clic en **"Start your project"**
3. Elige método de registro:
   - **GitHub** (recomendado - más rápido)
   - **Email/Password**
4. Completa el registro y verifica tu email

### 1.2 Crear Nuevo Proyecto

1. Una vez dentro, haz clic en **"New Project"**
2. Completa el formulario:

```
Organization: [Crea una nueva o usa existente]
Name: fuxion-dashboard (o el nombre que prefieras)
Database Password: [GUARDA ESTA CONTRASEÑA - LA NECESITARÁS]
Region: South America (sao) [más cercano a Colombia]
Pricing Plan: Free
```

3. Haz clic en **"Create new project"**
4. **Espera 2-3 minutos** mientras Supabase crea tu proyecto (verás barra de progreso)

---

## 🔑 PASO 2: OBTENER CREDENCIALES

### 2.1 Localizar tus Credenciales

1. Una vez creado el proyecto, ve a **Settings** (icono de engranaje en la izquierda)
2. Haz clic en **API**
3. Encontrarás:

```
Project URL: https://[TU-PROYECTO-ID].supabase.co
anon public: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (NO USAR)
```

### 2.2 Actualizar .env Local

1. Abre el archivo `.env` en la raíz del proyecto
2. **REEMPLAZA** las líneas con tus nuevas credenciales:

```env
VITE_SUPABASE_URL=https://[TU-PROYECTO-ID].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **IMPORTANTE:**
- Usa `anon public` (NO `service_role`)
- NO compartas estas credenciales públicamente
- NO las subas a GitHub sin `.gitignore`

---

## 🗄️ PASO 3: CREAR TABLAS EN LA BASE DE DATOS

### 3.1 Acceder al SQL Editor

1. En el panel izquierdo de Supabase, haz clic en **SQL Editor**
2. Haz clic en **"New query"**

### 3.2 Ejecutar Scripts SQL

**Copia y ejecuta cada script en orden:**

#### Script 1: Tabla de Usuarios (profiles)

```sql
-- Crear tabla de perfiles de usuario
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo ven su propio perfil
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Política: Los usuarios solo pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Política: Los usuarios pueden insertar su propio perfil
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
```

Haz clic en **"Run"** (o Ctrl+Enter)

---

#### Script 2: Tabla de Productos

```sql
-- Crear tabla de productos
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

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(user_id, name);

-- RLS
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

Haz clic en **"Run"**

---

#### Script 3: Tabla de Transacciones

```sql
-- Crear tabla de transacciones
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'sale', 'personal_consumption', 'marketing_sample', 'box_opening', 'loan_repayment', 'loan')),
  quantity_boxes DECIMAL(10,2) DEFAULT 0,
  quantity_sachets INTEGER DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  unit_cost_snapshot DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at DESC);

-- RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);
```

Haz clic en **"Run"**

---

#### Script 4: Tabla de Préstamos

```sql
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_loans_user_id ON loans(user_id);
CREATE INDEX IF NOT EXISTS idx_loans_product_id ON loans(product_id);

-- RLS
ALTER TABLE loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own loans"
  ON loans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own loans"
  ON loans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own loans"
  ON loans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own loans"
  ON loans FOR DELETE
  USING (auth.uid() = user_id);
```

Haz clic en **"Run"**

---

#### Script 5: Tabla de Precios (Legacy)

```sql
-- Tabla de precios (compatibilidad con sistema antiguo)
CREATE TABLE IF NOT EXISTS prices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_name)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_prices_user_id ON prices(user_id);

-- RLS
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prices"
  ON prices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prices"
  ON prices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prices"
  ON prices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prices"
  ON prices FOR DELETE
  USING (auth.uid() = user_id);
```

Haz clic en **"Run"**

---

#### Script 6: Triggers Automáticos

```sql
-- Trigger: Actualizar timestamp al modificar
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON loans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prices_updated_at
  BEFORE UPDATE ON prices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

Haz clic en **"Run"**

---

#### Script 7: Trigger para Actualizar Inventario

```sql
-- Función para actualizar inventario automáticamente
CREATE OR REPLACE FUNCTION update_product_inventory()
RETURNS TRIGGER AS $$
DECLARE
  product_record RECORD;
  total_purchased DECIMAL(10,2) := 0;
  total_sold DECIMAL(10,2) := 0;
  total_consumed DECIMAL(10,2) := 0;
  new_inventory DECIMAL(10,2) := 0;
  total_cost DECIMAL(10,2) := 0;
  new_wac DECIMAL(10,2) := 0;
BEGIN
  -- Obtener totales para el producto
  SELECT
    COALESCE(SUM(CASE WHEN type = 'purchase' THEN quantity_boxes ELSE 0 END), 0) as purchased,
    COALESCE(SUM(CASE WHEN type IN ('sale', 'loan') THEN quantity_boxes ELSE 0 END), 0) as sold,
    COALESCE(SUM(CASE WHEN type IN ('personal_consumption', 'marketing_sample') THEN quantity_boxes ELSE 0 END), 0) as consumed,
    COALESCE(SUM(CASE WHEN type = 'purchase' THEN total_amount ELSE 0 END), 0) as cost
  INTO total_purchased, total_sold, total_consumed, total_cost
  FROM transactions
  WHERE product_id = NEW.product_id;

  -- Calcular inventario
  new_inventory := total_purchased - total_sold - total_consumed;

  -- Calcular WAC (Weighted Average Cost)
  IF total_purchased > 0 THEN
    new_wac := total_cost / total_purchased;
  END IF;

  -- Actualizar producto
  UPDATE products
  SET
    total_boxes_purchased = total_purchased,
    total_boxes_sold = total_sold,
    total_boxes_consumed = total_consumed,
    inventory_boxes = new_inventory,
    weighted_average_cost = new_wac,
    updated_at = NOW()
  WHERE id = NEW.product_id;

  -- Actualizar snapshot de costo en la transacción
  NEW.unit_cost_snapshot := new_wac;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS trigger_update_inventory ON transactions;
CREATE TRIGGER trigger_update_inventory
  BEFORE INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_product_inventory();
```

Haz clic en **"Run"**

---

### 3.3 Verificar Tablas Creadas

1. En el panel izquierdo, haz clic en **Table Editor**
2. Deberías ver estas tablas:
   - ✅ profiles
   - ✅ products
   - ✅ transactions
   - ✅ loans
   - ✅ prices

---

## 🔐 PASO 4: CONFIGURAR AUTENTICACIÓN

### 4.1 Habilitar Email Authentication

1. Ve a **Authentication** → **Providers**
2. Asegúrate que **Email** esté habilitado (toggle en verde)
3. Configuración recomendada:
   ```
   Enable email confirmations: ✅ ON
   Enable email change confirmations: ✅ ON
   Secure email change: ✅ ON
   ```

### 4.2 Configurar Email Templates (Opcional)

1. Ve a **Authentication** → **Email Templates**
2. Personaliza los templates de confirmación si quieres

---

## 🧪 PASO 5: PROBAR LA CONEXIÓN

### 5.1 Reiniciar Servidor Local

1. **Detén el servidor** (Ctrl+C en la terminal)
2. **Reinicia:**
   ```bash
   npm run dev
   ```

### 5.2 Verificar en Navegador

1. Abre: **http://localhost:3000**
2. Abre la consola (F12)
3. Deberías ver:
   ```
   [Supabase] Configuración: { hasUrl: true, hasKey: true, urlPrefix: 'https://[tu-id].supabase.co' }
   [App] ✅ Supabase importado
   [App] 🔄 Llamando getSession()...
   [App] ✅ getSession() completado
   [App] 🔓 Sin sesión válida, mostrando login
   ```

### 5.3 Crear Primera Cuenta

1. En el modal de login, haz clic en **"Registrarse"**
2. Ingresa:
   ```
   Email: tu-email@gmail.com
   Password: [mínimo 6 caracteres]
   ```
3. Haz clic en **"Crear cuenta"**
4. **Revisa tu email** para confirmar (si habilitaste confirmaciones)
5. Haz login

---

## ✅ PASO 6: VERIFICAR FUNCIONAMIENTO

### 6.1 Dashboard de Supabase

1. Ve a **Table Editor** → **profiles**
2. Deberías ver tu usuario registrado

### 6.2 Probar Funcionalidad

En tu aplicación:
1. ✅ Crea un producto en "Precios"
2. ✅ Registra una compra
3. ✅ Verifica que aparezca en "Historial"

### 6.3 Verificar en Supabase

1. Ve a **Table Editor** → **products**
   - Deberías ver el producto creado
2. Ve a **Table Editor** → **transactions**
   - Deberías ver la transacción

---

## 🚨 SOLUCIÓN DE PROBLEMAS

### Problema: "Error al conectar con Supabase"

**Solución:**
1. Verifica que `.env` tenga las credenciales correctas
2. Reinicia el servidor (`Ctrl+C` y `npm run dev`)
3. Limpia caché del navegador (Ctrl+Shift+R)

### Problema: "anon key expired" o error 401

**Solución:**
1. Ve a Supabase → **Settings** → **API**
2. Copia nuevamente la `anon public` key
3. Actualiza `.env`
4. Reinicia servidor

### Problema: "RLS policy violation"

**Solución:**
1. Verifica que las políticas RLS estén creadas (Script 1-5)
2. Si persiste, ve a **Table Editor** → [tabla] → **RLS disabled** y actívalo

### Problema: "Tablas no aparecen"

**Solución:**
1. Ve a **SQL Editor**
2. Ejecuta:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```
3. Si no aparecen, vuelve a ejecutar Scripts 1-5

---

## 📚 RECURSOS ADICIONALES

- **Documentación Supabase:** https://supabase.com/docs
- **Dashboard Supabase:** https://supabase.com/dashboard
- **Discord Supabase:** https://discord.supabase.com

---

## 🎯 CHECKLIST FINAL

Antes de continuar, verifica:

- [ ] Proyecto Supabase creado y activo
- [ ] Credenciales en `.env` actualizadas
- [ ] 7 scripts SQL ejecutados sin errores
- [ ] Servidor local reiniciado (`npm run dev`)
- [ ] Modal de login aparece en http://localhost:3000
- [ ] Puedes crear cuenta y hacer login
- [ ] Puedes crear productos y transacciones
- [ ] Datos aparecen en Supabase Table Editor

---

## ✨ ¡LISTO!

Tu proyecto Fuxion ahora está conectado a Supabase desde cero.

**Siguiente paso:** Empieza a usar la aplicación normalmente.

Si tienes problemas, revisa los logs de consola (F12) y comparte el error.
