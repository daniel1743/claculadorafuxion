import { supabase } from './supabase';

/**
 * Servicio para gestionar sugerencias/tickets y chat
 */

// =====================================================
// CONSTANTES
// =====================================================

export const SUGGESTION_CATEGORIES = {
  mejora: { label: 'Mejorar funcionalidad existente', icon: 'Wrench', color: 'blue' },
  nueva_funcion: { label: 'Sugerir nueva funcionalidad', icon: 'Lightbulb', color: 'green' },
  error: { label: 'Reportar error o problema', icon: 'AlertTriangle', color: 'red' },
  quitar_funcion: { label: 'Quitar funcionalidad innecesaria', icon: 'Trash2', color: 'orange' },
  dar_de_baja: { label: 'Solicitar baja del servicio', icon: 'UserMinus', color: 'gray' },
  otro: { label: 'Otro', icon: 'HelpCircle', color: 'purple' }
};

export const SUGGESTION_STATUS = {
  pendiente: { label: 'Pendiente', color: 'yellow', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400' },
  en_revision: { label: 'En revisión', color: 'blue', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
  en_progreso: { label: 'En progreso', color: 'purple', bgColor: 'bg-purple-500/20', textColor: 'text-purple-400' },
  resuelto: { label: 'Resuelto', color: 'green', bgColor: 'bg-green-500/20', textColor: 'text-green-400' },
  rechazado: { label: 'Rechazado', color: 'red', bgColor: 'bg-red-500/20', textColor: 'text-red-400' },
  cerrado: { label: 'Cerrado', color: 'gray', bgColor: 'bg-gray-500/20', textColor: 'text-gray-400' }
};

// =====================================================
// FUNCIONES DE SUGERENCIAS
// =====================================================

/**
 * Crear una nueva sugerencia
 * @param {Object} data - Datos de la sugerencia
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const createSuggestion = async (data) => {
  try {
    const { data: suggestion, error } = await supabase
      .from('suggestions')
      .insert([{
        user_id: data.userId,
        user_email: data.userEmail,
        user_name: data.userName || null,
        category: data.category,
        title: data.title || null,
        description: data.description,
        status: 'pendiente'
      }])
      .select()
      .single();

    if (error) throw error;

    return { data: suggestion, error: null };
  } catch (error) {
    console.error('[suggestionService] Error creating suggestion:', error);
    return { data: null, error };
  }
};

/**
 * Obtener sugerencias del usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export const getUserSuggestions = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[suggestionService] Error getting user suggestions:', error);
    return { data: null, error };
  }
};

/**
 * [ADMIN] Obtener todas las sugerencias con filtros
 * @param {Object} filters - Filtros opcionales
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export const getAllSuggestions = async (filters = {}) => {
  try {
    let query = supabase
      .from('suggestions')
      .select('*')
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[suggestionService] Error getting all suggestions:', error);
    return { data: null, error };
  }
};

/**
 * Obtener una sugerencia por ID
 * @param {string} suggestionId - ID de la sugerencia
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const getSuggestionById = async (suggestionId) => {
  try {
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[suggestionService] Error getting suggestion:', error);
    return { data: null, error };
  }
};

/**
 * [ADMIN] Actualizar estado de una sugerencia
 * @param {string} suggestionId - ID de la sugerencia
 * @param {string} status - Nuevo estado
 * @param {string} adminNotes - Notas del admin (opcional)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const updateSuggestionStatus = async (suggestionId, status, adminNotes = null) => {
  try {
    const updateData = { status };

    if (adminNotes !== null) {
      updateData.admin_notes = adminNotes;
    }

    // Si se resuelve, agregar timestamp
    if (status === 'resuelto' || status === 'rechazado' || status === 'cerrado') {
      const { data: { user } } = await supabase.auth.getUser();
      updateData.resolved_by = user?.id;
      updateData.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('suggestions')
      .update(updateData)
      .eq('id', suggestionId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[suggestionService] Error updating suggestion status:', error);
    return { data: null, error };
  }
};

/**
 * [ADMIN] Actualizar notas de admin
 * @param {string} suggestionId - ID de la sugerencia
 * @param {string} adminNotes - Notas del admin
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const updateAdminNotes = async (suggestionId, adminNotes) => {
  try {
    const { data, error } = await supabase
      .from('suggestions')
      .update({ admin_notes: adminNotes })
      .eq('id', suggestionId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[suggestionService] Error updating admin notes:', error);
    return { data: null, error };
  }
};

// =====================================================
// FUNCIONES DE CHAT/MENSAJES
// =====================================================

/**
 * Obtener mensajes de una sugerencia
 * @param {string} suggestionId - ID de la sugerencia
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export const getSuggestionMessages = async (suggestionId) => {
  try {
    const { data, error } = await supabase
      .from('suggestion_messages')
      .select('*')
      .eq('suggestion_id', suggestionId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[suggestionService] Error getting messages:', error);
    return { data: null, error };
  }
};

/**
 * Enviar mensaje en un ticket
 * @param {Object} data - Datos del mensaje
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const sendMessage = async (data) => {
  try {
    const { data: message, error } = await supabase
      .from('suggestion_messages')
      .insert([{
        suggestion_id: data.suggestionId,
        sender_id: data.senderId,
        sender_type: data.senderType, // 'admin' o 'user'
        message: data.message
      }])
      .select()
      .single();

    if (error) throw error;

    return { data: message, error: null };
  } catch (error) {
    console.error('[suggestionService] Error sending message:', error);
    return { data: null, error };
  }
};

/**
 * Marcar mensajes como leídos
 * @param {string} suggestionId - ID de la sugerencia
 * @param {string} readerType - Tipo de lector ('admin' o 'user')
 * @returns {Promise<{error: Error|null}>}
 */
export const markMessagesAsRead = async (suggestionId, readerType) => {
  try {
    // Marcar como leídos los mensajes del otro tipo
    const senderTypeToMark = readerType === 'admin' ? 'user' : 'admin';

    const { error } = await supabase
      .from('suggestion_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('suggestion_id', suggestionId)
      .eq('sender_type', senderTypeToMark)
      .eq('is_read', false);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('[suggestionService] Error marking messages as read:', error);
    return { error };
  }
};

/**
 * Contar mensajes no leídos en un ticket
 * @param {string} suggestionId - ID de la sugerencia
 * @param {string} readerType - Tipo de lector ('admin' o 'user')
 * @returns {Promise<{count: number, error: Error|null}>}
 */
export const getUnreadMessagesCount = async (suggestionId, readerType) => {
  try {
    const senderTypeToCount = readerType === 'admin' ? 'user' : 'admin';

    const { count, error } = await supabase
      .from('suggestion_messages')
      .select('*', { count: 'exact', head: true })
      .eq('suggestion_id', suggestionId)
      .eq('sender_type', senderTypeToCount)
      .eq('is_read', false);

    if (error) throw error;

    return { count: count || 0, error: null };
  } catch (error) {
    console.error('[suggestionService] Error counting unread messages:', error);
    return { count: 0, error };
  }
};

/**
 * Suscribirse a nuevos mensajes en un ticket (realtime)
 * @param {string} suggestionId - ID de la sugerencia
 * @param {Function} callback - Callback cuando llega un mensaje
 * @returns {Object} - Suscripción (llamar .unsubscribe() para cancelar)
 */
export const subscribeToMessages = (suggestionId, callback) => {
  const subscription = supabase
    .channel(`suggestion_messages:${suggestionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'suggestion_messages',
        filter: `suggestion_id=eq.${suggestionId}`
      },
      (payload) => {
        callback(payload.new);
      }
    )
    .subscribe();

  return subscription;
};

// =====================================================
// ESTADÍSTICAS ADMIN
// =====================================================

/**
 * [ADMIN] Obtener estadísticas de sugerencias
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const getSuggestionStats = async () => {
  try {
    const { data, error } = await supabase
      .from('suggestions')
      .select('status, category');

    if (error) throw error;

    // Calcular estadísticas
    const stats = {
      total: data.length,
      byStatus: {},
      byCategory: {},
      pendientes: 0,
      resueltos: 0
    };

    data.forEach(s => {
      // Por estado
      stats.byStatus[s.status] = (stats.byStatus[s.status] || 0) + 1;
      // Por categoría
      stats.byCategory[s.category] = (stats.byCategory[s.category] || 0) + 1;
    });

    stats.pendientes = (stats.byStatus.pendiente || 0) + (stats.byStatus.en_revision || 0) + (stats.byStatus.en_progreso || 0);
    stats.resueltos = stats.byStatus.resuelto || 0;

    return { data: stats, error: null };
  } catch (error) {
    console.error('[suggestionService] Error getting stats:', error);
    return { data: null, error };
  }
};
