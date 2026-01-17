import { supabase } from './supabase';

/**
 * Servicio para gestionar clientes (CRM)
 */

/**
 * Obtiene todos los clientes del usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export const getAllCustomers = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*, referrer:referred_by_client_id ( id, full_name )')
      .eq('user_id', userId)
      .order('full_name', { ascending: true });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[customerService] Error getting customers:', error);
    return { data: null, error };
  }
};

/**
 * Crea un nuevo cliente
 * @param {string} userId - ID del usuario
 * @param {Object} customerData - Datos del cliente
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const createCustomer = async (userId, customerData) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([{
        user_id: userId,
        full_name: customerData.full_name,
        email: customerData.email || null,
        rut: customerData.rut || null,
        phone: customerData.phone || null,
        notes: customerData.notes || null,
        referred_by_client_id: customerData.referred_by_client_id || null
      }])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[customerService] Error creating customer:', error);
    return { data: null, error };
  }
};

/**
 * Actualiza un cliente existente
 * @param {string} customerId - ID del cliente
 * @param {Object} customerData - Datos actualizados
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const updateCustomer = async (customerId, customerData) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .update({
        full_name: customerData.full_name,
        email: customerData.email || null,
        rut: customerData.rut || null,
        phone: customerData.phone || null,
        notes: customerData.notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', customerId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[customerService] Error updating customer:', error);
    return { data: null, error };
  }
};

/**
 * Elimina un cliente
 * @param {string} customerId - ID del cliente
 * @returns {Promise<{error: Error|null}>}
 */
export const deleteCustomer = async (customerId) => {
  try {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('[customerService] Error deleting customer:', error);
    return { error };
  }
};

/**
 * Busca clientes por nombre
 * @param {string} userId - ID del usuario
 * @param {string} searchTerm - Término de búsqueda
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export const searchCustomers = async (userId, searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .ilike('full_name', `%${searchTerm}%`)
      .order('full_name', { ascending: true });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[customerService] Error searching customers:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene un cliente por ID
 * @param {string} customerId - ID del cliente
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const getCustomerById = async (customerId) => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[customerService] Error getting customer:', error);
    return { data: null, error };
  }
};

// =====================================================
// FUNCIONES DE REFERIDOS
// =====================================================

/**
 * Obtiene todas las ventas referidas por un cliente específico
 * @param {string} userId - ID del usuario
 * @param {string} referrerId - ID del cliente que refiere
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export const getCustomerReferrals = async (userId, referrerId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        customers!transactions_customer_id_fkey (
          id,
          full_name,
          email,
          phone
        )
      `)
      .eq('user_id', userId)
      .eq('referrer_id', referrerId)
      .eq('type', 'sale')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Formatear datos
    const referrals = (data || []).map(t => ({
      transactionId: t.id,
      date: t.created_at,
      customer: t.customers,
      productName: t.product_name || 'N/A',
      totalAmount: parseFloat(t.total_amount) || 0,
      quantityBoxes: parseInt(t.quantity_boxes) || 0
    }));

    return { data: referrals, error: null };
  } catch (error) {
    console.error('[customerService] Error getting referrals:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene estadísticas de referidos de un cliente
 * @param {string} userId - ID del usuario
 * @param {string} referrerId - ID del cliente que refiere
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const getCustomerReferralStats = async (userId, referrerId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('id, total_amount, customer_id, created_at')
      .eq('user_id', userId)
      .eq('referrer_id', referrerId)
      .eq('type', 'sale');

    if (error) throw error;

    // Calcular estadísticas
    const uniqueCustomers = new Set((data || []).map(t => t.customer_id).filter(Boolean));
    const totalSales = (data || []).reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0);
    const totalTransactions = (data || []).length;

    // Calcular primera y última referencia
    const dates = (data || []).map(t => new Date(t.created_at)).sort((a, b) => a - b);
    const firstReferral = dates.length > 0 ? dates[0] : null;
    const lastReferral = dates.length > 0 ? dates[dates.length - 1] : null;

    return {
      data: {
        totalReferrals: uniqueCustomers.size,
        totalTransactions,
        totalSales,
        firstReferral,
        lastReferral
      },
      error: null
    };
  } catch (error) {
    console.error('[customerService] Error getting referral stats:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene quién refirió a un cliente específico (su primera compra por referencia)
 * @param {string} userId - ID del usuario
 * @param {string} customerId - ID del cliente
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const getReferredBy = async (userId, customerId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        referrer_id,
        created_at,
        referrer:customers!transactions_referrer_id_fkey (
          id,
          full_name,
          email,
          phone
        )
      `)
      .eq('user_id', userId)
      .eq('customer_id', customerId)
      .eq('sale_type', 'referral')
      .not('referrer_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    return {
      data: data?.referrer || null,
      error: null
    };
  } catch (error) {
    console.error('[customerService] Error getting referrer:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene el historial de compras de un cliente
 * @param {string} userId - ID del usuario
 * @param {string} customerId - ID del cliente
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export const getCustomerPurchaseHistory = async (userId, customerId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        products (
          id,
          name,
          list_price
        ),
        referrer:customers!transactions_referrer_id_fkey (
          id,
          full_name
        )
      `)
      .eq('user_id', userId)
      .eq('customer_id', customerId)
      .eq('type', 'sale')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Formatear datos
    const history = (data || []).map(t => ({
      id: t.id,
      date: t.created_at,
      productName: t.products?.name || 'N/A',
      quantityBoxes: parseInt(t.quantity_boxes) || 0,
      totalAmount: parseFloat(t.total_amount) || 0,
      saleType: t.sale_type,
      referredBy: t.referrer?.full_name || null,
      notes: t.notes
    }));

    return { data: history, error: null };
  } catch (error) {
    console.error('[customerService] Error getting purchase history:', error);
    return { data: null, error };
  }
};
