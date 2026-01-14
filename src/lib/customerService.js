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
      .select('*')
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
        notes: customerData.notes || null
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
