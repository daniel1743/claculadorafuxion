import { supabase } from './supabase';

/**
 * Servicio para gestionar notificaciones con soporte Realtime
 */

// =====================================================
// CONSTANTES
// =====================================================

export const NOTIFICATION_TYPES = {
  bienvenida: {
    icon: 'PartyPopper',
    color: 'yellow',
    bgColor: 'bg-yellow-500/20',
    textColor: 'text-yellow-400'
  },
  sugerencia_recibida: {
    icon: 'CheckCircle',
    color: 'green',
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-400'
  },
  ticket_actualizado: {
    icon: 'RefreshCw',
    color: 'blue',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400'
  },
  ticket_resuelto: {
    icon: 'CheckCircle2',
    color: 'green',
    bgColor: 'bg-green-500/20',
    textColor: 'text-green-400'
  },
  mensaje_admin: {
    icon: 'MessageSquare',
    color: 'purple',
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-400'
  },
  sistema: {
    icon: 'AlertCircle',
    color: 'orange',
    bgColor: 'bg-orange-500/20',
    textColor: 'text-orange-400'
  },
  actualizacion: {
    icon: 'Sparkles',
    color: 'blue',
    bgColor: 'bg-blue-500/20',
    textColor: 'text-blue-400'
  },
  chat_nuevo: {
    icon: 'MessageCircle',
    color: 'purple',
    bgColor: 'bg-purple-500/20',
    textColor: 'text-purple-400'
  }
};

// =====================================================
// FUNCIONES DE LECTURA
// =====================================================

/**
 * Obtener notificaciones del usuario
 * @param {string} userId - ID del usuario
 * @param {number} limit - Límite de notificaciones
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export const getUserNotifications = async (userId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[notificationService] Error getting notifications:', error);
    return { data: null, error };
  }
};

/**
 * Contar notificaciones no leídas
 * @param {string} userId - ID del usuario
 * @returns {Promise<{count: number, error: Error|null}>}
 */
export const getUnreadCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    return { count: count || 0, error: null };
  } catch (error) {
    console.error('[notificationService] Error counting unread:', error);
    return { count: 0, error };
  }
};

// =====================================================
// FUNCIONES DE ACTUALIZACIÓN
// =====================================================

/**
 * Marcar una notificación como leída
 * @param {string} notificationId - ID de la notificación
 * @returns {Promise<{error: Error|null}>}
 */
export const markAsRead = async (notificationId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('[notificationService] Error marking as read:', error);
    return { error };
  }
};

/**
 * Marcar todas las notificaciones como leídas
 * @param {string} userId - ID del usuario
 * @returns {Promise<{error: Error|null}>}
 */
export const markAllAsRead = async (userId) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('[notificationService] Error marking all as read:', error);
    return { error };
  }
};

// =====================================================
// FUNCIONES DE CREACIÓN
// =====================================================

/**
 * Crear una notificación para un usuario
 * @param {Object} data - Datos de la notificación
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const createNotification = async (data) => {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        suggestion_id: data.suggestionId || null,
        action_url: data.actionUrl || null,
        created_by: data.createdBy || null
      }])
      .select()
      .single();

    if (error) throw error;

    return { data: notification, error: null };
  } catch (error) {
    console.error('[notificationService] Error creating notification:', error);
    return { data: null, error };
  }
};

/**
 * Crear notificación de bienvenida
 * @param {string} userId - ID del usuario
 * @param {string} userName - Nombre del usuario
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const createWelcomeNotification = async (userId, userName) => {
  const name = userName || 'Emprendedor';
  return createNotification({
    userId,
    type: 'bienvenida',
    title: `¡Bienvenido/a ${name}!`,
    message: 'Gracias por unirte a FuXion Control. Estamos aquí para ayudarte a gestionar tu negocio de manera eficiente. Si tienes alguna sugerencia o problema, no dudes en contactarnos.'
  });
};

/**
 * Crear notificación de sugerencia recibida
 * @param {string} userId - ID del usuario
 * @param {string} suggestionId - ID de la sugerencia
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const createSuggestionReceivedNotification = async (userId, suggestionId) => {
  return createNotification({
    userId,
    type: 'sugerencia_recibida',
    title: 'Sugerencia recibida',
    message: 'Hemos recibido tu sugerencia correctamente. Nuestro equipo la revisará pronto. Te notificaremos cuando haya novedades.',
    suggestionId
  });
};

/**
 * Crear notificación de ticket actualizado
 * @param {string} userId - ID del usuario
 * @param {string} suggestionId - ID de la sugerencia
 * @param {string} newStatus - Nuevo estado
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const createTicketUpdatedNotification = async (userId, suggestionId, newStatus) => {
  const statusLabels = {
    pendiente: 'Pendiente',
    en_revision: 'En revisión',
    en_progreso: 'En progreso',
    resuelto: 'Resuelto',
    rechazado: 'Rechazado',
    cerrado: 'Cerrado'
  };

  return createNotification({
    userId,
    type: newStatus === 'resuelto' ? 'ticket_resuelto' : 'ticket_actualizado',
    title: newStatus === 'resuelto' ? 'Ticket resuelto' : 'Ticket actualizado',
    message: `Tu ticket ha cambiado de estado a: ${statusLabels[newStatus] || newStatus}`,
    suggestionId
  });
};

/**
 * Crear notificación de nuevo mensaje de chat
 * @param {string} userId - ID del usuario
 * @param {string} suggestionId - ID de la sugerencia
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const createChatNotification = async (userId, suggestionId) => {
  return createNotification({
    userId,
    type: 'chat_nuevo',
    title: 'Nuevo mensaje',
    message: 'Un administrador te ha enviado un mensaje en tu ticket. Revisa la conversación para responder.',
    suggestionId
  });
};

/**
 * [ADMIN] Crear notificación masiva (broadcast) para todos los usuarios
 * @param {Object} data - Datos de la notificación
 * @returns {Promise<{count: number, error: Error|null}>}
 */
export const createBroadcastNotification = async (data) => {
  try {
    // Obtener todos los usuarios activos
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id');

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      return { count: 0, error: null };
    }

    // Crear notificación para cada usuario
    const notifications = users.map(user => ({
      user_id: user.id,
      type: data.type || 'sistema',
      title: data.title,
      message: data.message,
      created_by: data.createdBy || null,
      action_url: data.actionUrl || null
    }));

    const { error } = await supabase
      .from('notifications')
      .insert(notifications);

    if (error) throw error;

    return { count: users.length, error: null };
  } catch (error) {
    console.error('[notificationService] Error creating broadcast:', error);
    return { count: 0, error };
  }
};

// =====================================================
// REALTIME SUBSCRIPTIONS
// =====================================================

/**
 * Suscribirse a nuevas notificaciones (realtime)
 * @param {string} userId - ID del usuario
 * @param {Function} callback - Callback cuando llega una notificación
 * @returns {Object} - Suscripción (llamar .unsubscribe() para cancelar)
 */
export const subscribeToNotifications = (userId, callback) => {
  const subscription = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return subscription;
};

// =====================================================
// HELPERS
// =====================================================

/**
 * Formatear tiempo relativo
 * @param {string} dateStr - Fecha ISO
 * @returns {string} - Tiempo relativo (ej: "hace 5 min")
 */
export const formatRelativeTime = (dateStr) => {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'ahora';
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays < 7) return `hace ${diffDays}d`;

  return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
};

/**
 * Eliminar notificaciones antiguas (más de 30 días)
 * @param {string} userId - ID del usuario
 * @returns {Promise<{error: Error|null}>}
 */
export const cleanOldNotifications = async (userId) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true)
      .lt('created_at', thirtyDaysAgo.toISOString());

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('[notificationService] Error cleaning old notifications:', error);
    return { error };
  }
};
