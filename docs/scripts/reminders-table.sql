-- ============================================
-- TABLA: Recordatorios / Sistema de Seguimiento
-- ============================================

-- Crear tabla de recordatorios
CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tipo de recordatorio
  type VARCHAR(50) NOT NULL CHECK (type IN ('seguimiento', 'recordar', 'avisar', 'contactar', 'venta', 'otro')),

  -- Información del contacto/cliente
  contact_name VARCHAR(255),

  -- Descripción/notas del recordatorio
  description TEXT NOT NULL,

  -- Producto relacionado (opcional)
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255),

  -- Fecha y hora de la alarma
  reminder_date TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Estado del recordatorio
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed', 'snoozed')),

  -- Control de notificaciones
  notification_count INTEGER DEFAULT 0, -- Cuántas veces se ha notificado
  is_read BOOLEAN DEFAULT FALSE,

  -- Prioridad (opcional)
  priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_is_read ON reminders(is_read);

-- Habilitar RLS (Row Level Security)
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver sus propios recordatorios
CREATE POLICY "Users can view own reminders" ON reminders
  FOR SELECT USING (auth.uid() = user_id);

-- Política: Los usuarios solo pueden insertar sus propios recordatorios
CREATE POLICY "Users can insert own reminders" ON reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política: Los usuarios solo pueden actualizar sus propios recordatorios
CREATE POLICY "Users can update own reminders" ON reminders
  FOR UPDATE USING (auth.uid() = user_id);

-- Política: Los usuarios solo pueden eliminar sus propios recordatorios
CREATE POLICY "Users can delete own reminders" ON reminders
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'reminders'
ORDER BY ordinal_position;
