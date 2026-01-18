-- =====================================================
-- SISTEMA DE SUGERENCIAS, NOTIFICACIONES Y CHAT
-- =====================================================
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- =====================================================
-- TABLA: suggestions (Sugerencias/Tickets de usuarios)
-- =====================================================
CREATE TABLE IF NOT EXISTS suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,

  -- Categorización
  category TEXT NOT NULL CHECK (category IN (
    'mejora',           -- Mejorar funcionalidad existente
    'nueva_funcion',    -- Sugerir nueva funcionalidad
    'error',            -- Reportar bug/error
    'quitar_funcion',   -- Quitar algo que no sirve
    'dar_de_baja',      -- Solicitar baja del servicio
    'otro'              -- Otro tema
  )),

  -- Contenido
  title TEXT,                    -- Título opcional (max 100 chars)
  description TEXT NOT NULL,     -- Max 500 chars

  -- Estado del ticket
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN (
    'pendiente',        -- Recién creado
    'en_revision',      -- Admin lo está revisando
    'en_progreso',      -- Se está trabajando
    'resuelto',         -- Completado
    'rechazado',        -- No procede
    'cerrado'           -- Cerrado sin acción
  )),

  -- Metadatos admin
  admin_notes TEXT,              -- Notas internas del admin
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para suggestions
CREATE INDEX IF NOT EXISTS idx_suggestions_user_id ON suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_created_at ON suggestions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_suggestions_category ON suggestions(category);
CREATE INDEX IF NOT EXISTS idx_suggestions_user_status ON suggestions(user_id, status);

-- =====================================================
-- TABLA: notifications (Notificaciones)
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tipo de notificación
  type TEXT NOT NULL CHECK (type IN (
    'bienvenida',           -- Mensaje de bienvenida
    'sugerencia_recibida',  -- Tu sugerencia fue recibida
    'ticket_actualizado',   -- Tu ticket cambió de estado
    'ticket_resuelto',      -- Tu ticket fue resuelto
    'mensaje_admin',        -- Mensaje del admin
    'sistema',              -- Notificación del sistema (mantenimiento, etc.)
    'actualizacion',        -- Nueva actualización disponible
    'chat_nuevo'            -- Admin te envió mensaje en chat
  )),

  -- Contenido
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Referencias opcionales
  suggestion_id UUID REFERENCES suggestions(id) ON DELETE SET NULL,
  action_url TEXT,           -- URL/ruta a donde navegar si aplica

  -- Estado
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Metadatos
  created_by UUID REFERENCES auth.users(id),  -- Admin que la creó (si aplica)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- =====================================================
-- TABLA: suggestion_messages (Chat de tickets)
-- =====================================================
CREATE TABLE IF NOT EXISTS suggestion_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,

  -- Quién envía
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('admin', 'user')),

  -- Contenido
  message TEXT NOT NULL,

  -- Estado de lectura
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para messages
CREATE INDEX IF NOT EXISTS idx_suggestion_messages_suggestion_id ON suggestion_messages(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_suggestion_messages_created_at ON suggestion_messages(created_at);

-- =====================================================
-- TRIGGERS: Actualizar updated_at automáticamente
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para suggestions
DROP TRIGGER IF EXISTS update_suggestions_updated_at ON suggestions;
CREATE TRIGGER update_suggestions_updated_at
  BEFORE UPDATE ON suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- HABILITAR RLS (Row Level Security)
-- =====================================================
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_messages ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS: suggestions
-- =====================================================

-- Usuarios pueden ver solo sus propias sugerencias
DROP POLICY IF EXISTS "Users can view own suggestions" ON suggestions;
CREATE POLICY "Users can view own suggestions" ON suggestions
  FOR SELECT USING (auth.uid() = user_id);

-- Admins pueden ver todas las sugerencias
DROP POLICY IF EXISTS "Admins can view all suggestions" ON suggestions;
CREATE POLICY "Admins can view all suggestions" ON suggestions
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM admin_roles)
  );

-- Usuarios pueden crear sus propias sugerencias
DROP POLICY IF EXISTS "Users can create own suggestions" ON suggestions;
CREATE POLICY "Users can create own suggestions" ON suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins pueden actualizar cualquier sugerencia
DROP POLICY IF EXISTS "Admins can update suggestions" ON suggestions;
CREATE POLICY "Admins can update suggestions" ON suggestions
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM admin_roles)
  );

-- =====================================================
-- POLÍTICAS RLS: notifications
-- =====================================================

-- Usuarios solo ven sus propias notificaciones
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Usuarios pueden marcar sus notificaciones como leídas
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Usuarios autenticados pueden crear notificaciones para sí mismos
-- o admins pueden crear para cualquiera
DROP POLICY IF EXISTS "Admins can create notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
DROP POLICY IF EXISTS "Users and admins can create notifications" ON notifications;

CREATE POLICY "Users and admins can create notifications" ON notifications
  FOR INSERT WITH CHECK (
    -- Admins pueden crear para cualquier usuario
    auth.uid() IN (SELECT user_id FROM admin_roles)
    -- Usuarios pueden crear notificaciones para sí mismos (auto-notificaciones)
    OR auth.uid() = user_id
  );

-- =====================================================
-- POLÍTICAS RLS: suggestion_messages
-- =====================================================

-- Participantes del ticket pueden ver mensajes
DROP POLICY IF EXISTS "Participants can view messages" ON suggestion_messages;
CREATE POLICY "Participants can view messages" ON suggestion_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM suggestions s
      WHERE s.id = suggestion_id
      AND (
        s.user_id = auth.uid()
        OR auth.uid() IN (SELECT user_id FROM admin_roles)
      )
    )
  );

-- Participantes pueden enviar mensajes
DROP POLICY IF EXISTS "Participants can send messages" ON suggestion_messages;
CREATE POLICY "Participants can send messages" ON suggestion_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM suggestions s
      WHERE s.id = suggestion_id
      AND (
        s.user_id = auth.uid()
        OR auth.uid() IN (SELECT user_id FROM admin_roles)
      )
    )
  );

-- Participantes pueden marcar mensajes como leídos
DROP POLICY IF EXISTS "Participants can update messages" ON suggestion_messages;
CREATE POLICY "Participants can update messages" ON suggestion_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM suggestions s
      WHERE s.id = suggestion_id
      AND (
        s.user_id = auth.uid()
        OR auth.uid() IN (SELECT user_id FROM admin_roles)
      )
    )
  );

-- =====================================================
-- HABILITAR REALTIME
-- =====================================================

-- Habilitar realtime para notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Habilitar realtime para suggestion_messages
ALTER PUBLICATION supabase_realtime ADD TABLE suggestion_messages;

-- =====================================================
-- FUNCIÓN HELPER: Contar notificaciones no leídas
-- =====================================================
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id AND is_read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permitir que usuarios autenticados ejecuten la función
GRANT EXECUTE ON FUNCTION get_unread_notifications_count TO authenticated;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ejecuta esto para verificar que las tablas se crearon:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('suggestions', 'notifications', 'suggestion_messages');
