# 🚀 Guía de Configuración de Supabase

## 📋 Pasos para Configurar la Base de Datos

### 1. Accede a tu Proyecto en Supabase
- Ve a [https://supabase.com](https://supabase.com)
- Inicia sesión y selecciona tu proyecto: `oxoirfrlnpnefuzspldd`

### 2. Crea las Tablas en la Base de Datos

Ve a **SQL Editor** en el panel de Supabase y ejecuta el siguiente script SQL:

```sql
-- ============================================
-- TABLA: transactions (Transacciones)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('compra', 'venta', 'publicidad')),
  product_name TEXT,
  quantity INTEGER,
  price DECIMAL(10, 2),
  total DECIMAL(10, 2),
  campaign_name TEXT,
  date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLA: prices (Precios de Productos)
-- ============================================
CREATE TABLE IF NOT EXISTS prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_name)
);

-- ============================================
-- TABLA: profiles (Perfiles de Usuario)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES para mejorar el rendimiento
-- ============================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_prices_user_id ON prices(user_id);
CREATE INDEX IF NOT EXISTS idx_prices_product_name ON prices(product_name);

-- ============================================
-- POLÍTICAS DE SEGURIDAD (RLS - Row Level Security)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para TRANSACTIONS
CREATE POLICY "Los usuarios pueden ver sus propias transacciones"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden insertar sus propias transacciones"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propias transacciones"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propias transacciones"
  ON transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para PRICES
CREATE POLICY "Los usuarios pueden ver sus propios precios"
  ON prices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden insertar sus propios precios"
  ON prices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propios precios"
  ON prices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden eliminar sus propios precios"
  ON prices FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para PROFILES
CREATE POLICY "Los usuarios pueden ver sus propios perfiles"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden insertar sus propios perfiles"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar sus propios perfiles"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================
-- FUNCIÓN: Crear perfil automáticamente al registrarse
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Crear perfil cuando se registra un usuario
-- ============================================
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Verifica que las Tablas se Crearon Correctamente

1. Ve a **Table Editor** en Supabase
2. Deberías ver 3 tablas:
   - `transactions`
   - `prices`
   - `profiles`

### 4. Configuración del Proyecto

Las credenciales ya están configuradas en el archivo `.env.local`:
- ✅ URL: `https://oxoirfrlnpnefuzspldd.supabase.co`
- ✅ Anon Key: Configurada

### 5. Próximos Pasos

Una vez ejecutado el SQL:
1. ✅ El proyecto ya tiene instalado `@supabase/supabase-js`
2. ✅ Los servicios de Supabase están creados en `src/lib/supabaseService.js`
3. ⏳ Necesitas ejecutar el script SQL en Supabase
4. ⏳ Después, actualizaremos los componentes para usar Supabase

## 🔒 Notas de Seguridad

- Las políticas RLS (Row Level Security) están activadas
- Cada usuario solo puede ver/modificar sus propios datos
- Las credenciales están en `.env.local` (no se suben a Git)

## 📝 Estructura de Datos

### Transacciones (transactions)
- `id`: Identificador único
- `user_id`: ID del usuario (referencia a auth.users)
- `type`: Tipo de transacción ('compra', 'venta', 'publicidad')
- `product_name`: Nombre del producto
- `quantity`: Cantidad
- `price`: Precio unitario
- `total`: Total
- `campaign_name`: Nombre de la campaña (opcional)
- `date`: Fecha de la transacción

### Precios (prices)
- `id`: UUID único
- `user_id`: ID del usuario
- `product_name`: Nombre del producto (único por usuario)
- `price`: Precio del producto

### Perfiles (profiles)
- `id`: UUID del usuario (mismo que auth.users)
- `name`: Nombre del usuario
- `avatar_url`: URL del avatar (opcional)

