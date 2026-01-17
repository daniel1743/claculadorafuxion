import { supabase } from './supabase';

/**
 * Servicio para gestionar Pagos FuXion
 * (cheques, bonos, comisiones, devoluciones)
 */

/**
 * Obtener todos los pagos FuXion del usuario
 */
export const getFuxionPayments = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('fuxion_payments')
      .select('*')
      .eq('user_id', userId)
      .order('payment_date', { ascending: false });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    console.error('[fuxionPaymentsService] Error getting payments:', error?.message || error);
    return { data: [], error };
  }
};

/**
 * Obtener el total de pagos FuXion del usuario
 */
export const getTotalFuxionPayments = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('fuxion_payments')
      .select('amount')
      .eq('user_id', userId);

    if (error) throw error;

    const total = (data || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    return { data: total, error: null };
  } catch (error) {
    console.error('[fuxionPaymentsService] Error getting total:', error?.message || error);
    return { data: 0, error };
  }
};

/**
 * Crear un nuevo pago FuXion
 */
export const createFuxionPayment = async (userId, paymentData) => {
  try {
    const { data, error } = await supabase
      .from('fuxion_payments')
      .insert([{
        user_id: userId,
        title: paymentData.title,
        amount: paymentData.amount,
        payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
        notes: paymentData.notes || null
      }])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[fuxionPaymentsService] Error creating payment:', error?.message || error);
    return { data: null, error };
  }
};

/**
 * Actualizar un pago FuXion
 */
export const updateFuxionPayment = async (paymentId, paymentData) => {
  try {
    const { data, error } = await supabase
      .from('fuxion_payments')
      .update({
        title: paymentData.title,
        amount: paymentData.amount,
        payment_date: paymentData.payment_date,
        notes: paymentData.notes || null
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[fuxionPaymentsService] Error updating payment:', error?.message || error);
    return { data: null, error };
  }
};

/**
 * Eliminar un pago FuXion
 */
export const deleteFuxionPayment = async (paymentId) => {
  try {
    const { error } = await supabase
      .from('fuxion_payments')
      .delete()
      .eq('id', paymentId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('[fuxionPaymentsService] Error deleting payment:', error?.message || error);
    return { error };
  }
};

/**
 * Obtener resumen de pagos (para dashboard)
 */
export const getFuxionPaymentsSummary = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('fuxion_payments')
      .select('amount, payment_date, title')
      .eq('user_id', userId)
      .order('payment_date', { ascending: false });

    if (error) throw error;

    const payments = data || [];
    const total = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const count = payments.length;
    const lastPayment = payments.length > 0 ? payments[0] : null;

    // Pagos de los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentPayments = payments.filter(p => new Date(p.payment_date) >= thirtyDaysAgo);
    const recentTotal = recentPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    return {
      data: {
        total,
        count,
        recentTotal,
        lastPayment
      },
      error: null
    };
  } catch (error) {
    console.error('[fuxionPaymentsService] Error getting summary:', error?.message || error);
    return { data: { total: 0, count: 0, recentTotal: 0, lastPayment: null }, error };
  }
};
