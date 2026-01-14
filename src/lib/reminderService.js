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
