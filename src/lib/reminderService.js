import { supabase } from './supabase';

/**
 * Servicio para gestionar recordatorios automáticos de seguimiento
 */

/**
 * Crea recordatorios automáticos cuando se registra una venta con cliente
 * @param {string} userId - ID del usuario
 * @param {string} customerId - ID del cliente
 * @param {string} saleId - ID de la venta
 * @param {string} productName - Nombre del producto vendido
 * @param {string} customerName - Nombre del cliente
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export const createAutomaticReminders = async (userId, customerId, saleId, productName, customerName) => {
  try {
    const now = new Date();

    // Calcular fechas de recordatorios
    const reminder15Days = new Date(now);
    reminder15Days.setDate(reminder15Days.getDate() + 15);

    const reminder30Days = new Date(now);
    reminder30Days.setDate(reminder30Days.getDate() + 30);

    // Crear mensajes personalizados
    const message15Days = `${customerName} compró ${productName} hace 15 días. Contáctalo para ver cómo le fue.`;
    const message30Days = `${customerName} probablemente terminó ${productName}. Ofrécele hacer un nuevo pedido.`;

    const reminders = [
      {
        user_id: userId,
        customer_id: customerId,
        sale_id: saleId,
        reminder_type: '15_days',
        due_date: reminder15Days.toISOString(),
        status: 'pending',
        message: message15Days,
        product_name: productName
      },
      {
        user_id: userId,
        customer_id: customerId,
        sale_id: saleId,
        reminder_type: '30_days',
        due_date: reminder30Days.toISOString(),
        status: 'pending',
        message: message30Days,
        product_name: productName
      }
    ];

    const { data, error } = await supabase
      .from('customer_reminders')
      .insert(reminders)
      .select();

    if (error) throw error;

    console.log('[reminderService] Recordatorios automáticos creados:', data);
    return { data, error: null };
  } catch (error) {
    console.error('[reminderService] Error creating reminders:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene todos los recordatorios pendientes del usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export const getPendingReminders = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('customer_reminders')
      .select(`
        *,
        customers (
          id,
          full_name,
          email,
          phone
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('due_date', { ascending: true });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[reminderService] Error getting reminders:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene recordatorios que vencen hoy o ya vencieron
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export const getTodayReminders = async (userId) => {
  try {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Fin del día

    const { data, error } = await supabase
      .from('customer_reminders')
      .select(`
        *,
        customers (
          id,
          full_name,
          email,
          phone
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lte('due_date', today.toISOString())
      .order('due_date', { ascending: true });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[reminderService] Error getting today reminders:', error);
    return { data: null, error };
  }
};

/**
 * Marca un recordatorio como completado
 * @param {string} reminderId - ID del recordatorio
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const markReminderAsCompleted = async (reminderId) => {
  try {
    const { data, error } = await supabase
      .from('customer_reminders')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', reminderId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[reminderService] Error marking reminder as completed:', error);
    return { data: null, error };
  }
};

/**
 * Marca un recordatorio como descartado
 * @param {string} reminderId - ID del recordatorio
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const dismissReminder = async (reminderId) => {
  try {
    const { data, error } = await supabase
      .from('customer_reminders')
      .update({
        status: 'dismissed',
        completed_at: new Date().toISOString()
      })
      .eq('id', reminderId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[reminderService] Error dismissing reminder:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene estadísticas de recordatorios
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const getReminderStats = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('customer_reminders')
      .select('status')
      .eq('user_id', userId);

    if (error) throw error;

    const stats = {
      total: data.length,
      pending: data.filter(r => r.status === 'pending').length,
      completed: data.filter(r => r.status === 'completed').length,
      dismissed: data.filter(r => r.status === 'dismissed').length
    };

    return { data: stats, error: null };
  } catch (error) {
    console.error('[reminderService] Error getting stats:', error);
    return { data: null, error };
  }
};

/**
 * Calcula días desde la compra
 * @param {string} dueDate - Fecha del recordatorio
 * @param {string} reminderType - Tipo de recordatorio (15_days o 30_days)
 * @returns {number} Días desde la compra
 */
export const calculateDaysSincePurchase = (dueDate, reminderType) => {
  const due = new Date(dueDate);
  const offsetDays = reminderType === '15_days' ? 15 : 30;

  const purchaseDate = new Date(due);
  purchaseDate.setDate(purchaseDate.getDate() - offsetDays);

  const today = new Date();
  const diffTime = Math.abs(today - purchaseDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

// ============================================
// SISTEMA AVANZADO DE RECORDATORIOS
// ============================================

/**
 * Tipos de recordatorio disponibles
 */
export const REMINDER_TYPES = [
  { value: 'seguimiento', label: 'Seguimiento', color: 'blue', icon: 'UserCheck' },
  { value: 'recordar', label: 'Recordar', color: 'yellow', icon: 'Bell' },
  { value: 'avisar', label: 'Avisar', color: 'orange', icon: 'AlertCircle' },
  { value: 'contactar', label: 'Contactar', color: 'green', icon: 'Phone' },
  { value: 'venta', label: 'Venta', color: 'emerald', icon: 'ShoppingCart' },
  { value: 'otro', label: 'Otro', color: 'gray', icon: 'MoreHorizontal' }
];

/**
 * Prioridades disponibles
 */
export const PRIORITIES = [
  { value: 'low', label: 'Baja', color: 'gray' },
  { value: 'normal', label: 'Normal', color: 'blue' },
  { value: 'high', label: 'Alta', color: 'orange' },
  { value: 'urgent', label: 'Urgente', color: 'red' }
];

/**
 * Obtiene todos los recordatorios avanzados del usuario
 * @param {string} userId - ID del usuario
 * @param {Object} options - Opciones de filtrado
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export const getAdvancedReminders = async (userId, options = {}) => {
  try {
    let query = supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .order('reminder_date', { ascending: true });

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (options.fromDate) {
      query = query.gte('reminder_date', options.fromDate);
    }

    if (options.toDate) {
      query = query.lte('reminder_date', options.toDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error en getAdvancedReminders:', error);
    return { data: [], error };
  }
};

/**
 * Obtiene recordatorios pendientes que ya vencieron (para notificaciones)
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export const getDueReminders = async (userId) => {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .lte('reminder_date', now)
      .lt('notification_count', 3)
      .order('reminder_date', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error en getDueReminders:', error);
    return { data: [], error };
  }
};

/**
 * Obtiene la cantidad de recordatorios no leídos
 * @param {string} userId - ID del usuario
 * @returns {Promise<{count: number, error: Error|null}>}
 */
export const getUnreadReminderCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('reminders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'pending')
      .eq('is_read', false);

    if (error) throw error;
    return { count: count || 0, error: null };
  } catch (error) {
    console.error('Error en getUnreadReminderCount:', error);
    return { count: 0, error };
  }
};

/**
 * Crea un nuevo recordatorio avanzado
 * @param {Object} reminder - Datos del recordatorio
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const createAdvancedReminder = async (reminder) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const {
      type,
      contactName,
      description,
      productId = null,
      productName = null,
      reminderDate,
      priority = 'normal'
    } = reminder;

    if (!type) throw new Error('El tipo de recordatorio es requerido');
    if (!description) throw new Error('La descripción es requerida');
    if (!reminderDate) throw new Error('La fecha del recordatorio es requerida');

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        user_id: user.id,
        type,
        contact_name: contactName || null,
        description,
        product_id: productId,
        product_name: productName,
        reminder_date: reminderDate,
        priority,
        status: 'pending',
        is_read: false,
        notification_count: 0
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error en createAdvancedReminder:', error);
    return { data: null, error };
  }
};

/**
 * Actualiza un recordatorio avanzado
 * @param {string} reminderId - ID del recordatorio
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const updateAdvancedReminder = async (reminderId, updates) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('reminders')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', reminderId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error en updateAdvancedReminder:', error);
    return { data: null, error };
  }
};

/**
 * Marca un recordatorio como leído
 * @param {string} reminderId - ID del recordatorio
 * @returns {Promise<{error: Error|null}>}
 */
export const markReminderRead = async (reminderId) => {
  return updateAdvancedReminder(reminderId, { is_read: true });
};

/**
 * Completa un recordatorio avanzado
 * @param {string} reminderId - ID del recordatorio
 * @returns {Promise<{error: Error|null}>}
 */
export const completeAdvancedReminder = async (reminderId) => {
  return updateAdvancedReminder(reminderId, {
    status: 'completed',
    is_read: true,
    completed_at: new Date().toISOString()
  });
};

/**
 * Descarta un recordatorio avanzado
 * @param {string} reminderId - ID del recordatorio
 * @returns {Promise<{error: Error|null}>}
 */
export const dismissAdvancedReminder = async (reminderId) => {
  return updateAdvancedReminder(reminderId, {
    status: 'dismissed',
    is_read: true
  });
};

/**
 * Pospone un recordatorio
 * @param {string} reminderId - ID del recordatorio
 * @param {number} minutes - Minutos a posponer
 * @returns {Promise<{error: Error|null}>}
 */
export const snoozeAdvancedReminder = async (reminderId, minutes = 30) => {
  const newDate = new Date();
  newDate.setMinutes(newDate.getMinutes() + minutes);

  return updateAdvancedReminder(reminderId, {
    reminder_date: newDate.toISOString(),
    notification_count: 0
  });
};

/**
 * Incrementa el contador de notificaciones
 * @param {string} reminderId - ID del recordatorio
 * @returns {Promise<{error: Error|null}>}
 */
export const incrementReminderNotification = async (reminderId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data: current, error: fetchError } = await supabase
      .from('reminders')
      .select('notification_count')
      .eq('id', reminderId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    const newCount = (current?.notification_count || 0) + 1;

    const { error } = await supabase
      .from('reminders')
      .update({
        notification_count: newCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', reminderId)
      .eq('user_id', user.id);

    if (error) throw error;
    return { newCount, error: null };
  } catch (error) {
    console.error('Error en incrementReminderNotification:', error);
    return { newCount: 0, error };
  }
};

/**
 * Elimina un recordatorio avanzado
 * @param {string} reminderId - ID del recordatorio
 * @returns {Promise<{error: Error|null}>}
 */
export const deleteAdvancedReminder = async (reminderId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', reminderId)
      .eq('user_id', user.id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error en deleteAdvancedReminder:', error);
    return { error };
  }
};
