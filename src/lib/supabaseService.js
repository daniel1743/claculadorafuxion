import { supabase } from './supabase';

// ==================== SERVICIO DE AUTENTICACIÓN ====================

/**
 * Registra un nuevo usuario
 */
export const signUp = async (email, password, name) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
        }
      }
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error en signUp:', error);
    return { data: null, error };
  }
};

/**
 * Inicia sesión de un usuario
 */
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error en signIn:', error);
    return { data: null, error };
  }
};

/**
 * Cierra sesión del usuario actual
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error en signOut:', error);
    return { error };
  }
};

/**
 * Obtiene el usuario actual
 * Maneja silenciosamente la ausencia de sesión (no es un error)
 */
export const getCurrentUser = async () => {
  try {
    // Primero verificar si hay una sesión activa
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // Si no hay sesión, no es un error, simplemente no hay usuario autenticado
    if (sessionError || !session) {
      return { user: null, error: null };
    }

    // Si hay sesión, obtener el usuario
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      // Solo loguear errores reales, no la ausencia de sesión
      if (userError.message !== 'Auth session missing!') {
        console.error('Error en getCurrentUser:', userError);
      }
      return { user: null, error: null };
    }

    return { user, error: null };
  } catch (error) {
    // Ignorar errores de sesión faltante (es esperado cuando no hay usuario logueado)
    if (error.message && error.message.includes('Auth session missing')) {
      return { user: null, error: null };
    }
    console.error('Error en getCurrentUser:', error);
    return { user: null, error: null };
  }
};

/**
 * Escucha cambios en la sesión de autenticación
 */
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
};

// ==================== SERVICIO DE TRANSACCIONES ====================

/**
 * Obtiene todas las transacciones del usuario actual
 */
export const getTransactions = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Mapear campos de la BD al formato del frontend
    const mappedData = (data || []).map(t => ({
      id: t.id,
      type: t.type,
      productName: t.product_name,
      quantity: t.quantity,
      price: t.price,
      total: parseFloat(t.total_amount) || 0,
      campaignName: t.campaign_name,
      date: t.date || t.created_at,
      description: t.description || '',
      freeUnits: t.free_units || 0,
      realUnitCost: t.real_unit_cost || 0
    }));

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Error en getTransactions:', error);
    return { data: [], error };
  }
};

/**
 * Agrega una nueva transacción
 */
export const addTransaction = async (transaction) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Mapear campos del frontend al formato de la BD
    // NO incluir 'id' - dejar que Supabase genere UUID automáticamente
    const dbTransaction = {
      user_id: user.id,
      type: transaction.type,
      product_name: transaction.productName || null,
      quantity: transaction.quantity || 1,
      price: transaction.price || (transaction.total && transaction.quantity ? transaction.total / transaction.quantity : 0),
      total_amount: transaction.total || 0,
      campaign_name: transaction.campaignName || null,
      date: transaction.date || new Date().toISOString(),
      description: transaction.description || '',
      free_units: transaction.freeUnits || 0,
      real_unit_cost: transaction.realUnitCost || 0,
      unit_cost_snapshot: transaction.realUnitCost || 0
    };

    const { data, error } = await supabase
      .from('transactions')
      .insert([dbTransaction])
      .select()
      .single();

    if (error) throw error;
    
    // Mapear respuesta de vuelta al formato del frontend
    const mappedData = {
      id: data.id,
      type: data.type,
      productName: data.product_name,
      quantity: data.quantity,
      price: data.price,
      total: parseFloat(data.total_amount) || 0,
      campaignName: data.campaign_name,
      date: data.date || data.created_at,
      description: data.description || '',
      freeUnits: data.free_units || 0,
      realUnitCost: data.real_unit_cost || 0
    };

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Error en addTransaction:', error);
    return { data: null, error };
  }
};

/**
 * Agrega múltiples transacciones
 */
export const addMultipleTransactions = async (transactions) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Mapear todas las transacciones del frontend al formato de la BD
    // NO incluir 'id' - dejar que Supabase genere UUID automáticamente
    const dbTransactions = transactions.map(tx => ({
      user_id: user.id,
      type: tx.type,
      product_name: tx.productName || null,
      quantity: tx.quantity || 1,
      price: tx.price || (tx.total && tx.quantity ? tx.total / tx.quantity : 0),
      total_amount: tx.total || 0,
      campaign_name: tx.campaignName || null,
      date: tx.date || new Date().toISOString(),
      description: tx.description || '',
      free_units: tx.freeUnits || 0,
      real_unit_cost: tx.realUnitCost || 0,
      unit_cost_snapshot: tx.realUnitCost || 0
    }));

    const { data, error } = await supabase
      .from('transactions')
      .insert(dbTransactions)
      .select();

    if (error) throw error;
    
    // Mapear respuesta de vuelta al formato del frontend
    const mappedData = (data || []).map(d => ({
      id: d.id,
      type: d.type,
      productName: d.product_name,
      quantity: d.quantity,
      price: d.price,
      total: parseFloat(d.total_amount) || 0,
      campaignName: d.campaign_name,
      date: d.date || d.created_at,
      description: d.description || '',
      freeUnits: d.free_units || 0,
      realUnitCost: d.real_unit_cost || 0
    }));

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Error en addMultipleTransactions:', error);
    return { data: null, error };
  }
};

/**
 * Elimina una transacción
 */
export const deleteTransaction = async (transactionId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transactionId)
      .eq('user_id', user.id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error en deleteTransaction:', error);
    return { error };
  }
};

/**
 * Actualiza una transacción
 */
export const updateTransaction = async (transactionId, updates) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error en updateTransaction:', error);
    return { data: null, error };
  }
};

/**
 * Actualiza múltiples transacciones que coincidan con un producto
 * Útil para renombrar productos en todas sus transacciones
 */
export const updateTransactionsByProductName = async (oldProductName, newProductName) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Mapear el nombre del producto del frontend al formato de BD
    const updates = {
      product_name: newProductName,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('product_name', oldProductName)
      .eq('user_id', user.id)
      .select();

    if (error) throw error;
    
    // Mapear respuesta de vuelta al formato del frontend
    const mappedData = (data || []).map(d => ({
      id: d.id,
      type: d.type,
      productName: d.product_name,
      quantity: d.quantity,
      price: d.price,
      total: parseFloat(d.total_amount) || 0,
      campaignName: d.campaign_name,
      date: d.date || d.created_at,
      description: d.description || '',
      freeUnits: d.free_units || 0,
      realUnitCost: d.real_unit_cost || 0
    }));

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Error en updateTransactionsByProductName:', error);
    return { data: null, error };
  }
};

/**
 * Elimina múltiples transacciones de un producto
 * Útil para eliminar un producto completamente
 */
export const deleteTransactionsByProductName = async (productName) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('product_name', productName)
      .eq('user_id', user.id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error en deleteTransactionsByProductName:', error);
    return { error };
  }
};

// ==================== SERVICIO DE PRECIOS ====================

/**
 * Obtiene todos los precios del usuario actual
 */
export const getPrices = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('prices')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    
    // Convertir array a objeto { productName: price }
    const pricesObj = {};
    if (data) {
      data.forEach(item => {
        pricesObj[item.product_name] = item.price;
      });
    }
    
    return { data: pricesObj, error: null };
  } catch (error) {
    console.error('Error en getPrices:', error);
    return { data: {}, error };
  }
};

/**
 * Actualiza o crea un precio
 */
export const upsertPrice = async (productName, price) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Asegurar que el precio sea un número
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    if (isNaN(numericPrice) || numericPrice <= 0) {
      throw new Error('El precio debe ser un número válido mayor a 0');
    }

    console.log('Intentando guardar precio:', { productName, price: numericPrice, userId: user.id });

    // Intentar primero verificar si el precio ya existe
    const { data: existing, error: checkError } = await supabase
      .from('prices')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_name', productName.trim())
      .maybeSingle(); // Usar maybeSingle() en lugar de single() para evitar error si no existe

    let data, error;

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw checkError;
    }

    if (existing) {
      // Actualizar precio existente
      const result = await supabase
        .from('prices')
        .update({
          price: numericPrice,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('product_name', productName.trim())
        .select()
        .single();

      data = result.data;
      error = result.error;
    } else {
      // Insertar nuevo precio
      const result = await supabase
        .from('prices')
        .insert({
          user_id: user.id,
          product_name: productName.trim(),
          price: numericPrice,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error de Supabase en upsertPrice:', error);
      throw error;
    }

    console.log('Precio guardado exitosamente:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Error en upsertPrice:', error);
    return { data: null, error };
  }
};

/**
 * Elimina un precio
 */
export const deletePrice = async (productName) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('prices')
      .delete()
      .eq('product_name', productName)
      .eq('user_id', user.id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error en deletePrice:', error);
    return { error };
  }
};

/**
 * Elimina múltiples precios (por ejemplo, al renombrar un producto)
 */
export const deleteMultiplePrices = async (productNames) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('prices')
      .delete()
      .in('product_name', productNames)
      .eq('user_id', user.id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error en deleteMultiplePrices:', error);
    return { error };
  }
};

// ==================== SERVICIO DE PERFIL DE USUARIO ====================

/**
 * Obtiene el perfil del usuario
 */
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(); // Usar maybeSingle() para evitar error si no existe

    // Si no existe el perfil, no es un error - simplemente no hay datos
    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error en getUserProfile:', error);
    return { data: null, error };
  }
};

/**
 * Crea un perfil de usuario si no existe
 */
export const createUserProfile = async (userId, name, email) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        name: name || email?.split('@')[0] || 'Usuario',
        email: email,
        avatar_url: null,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error en createUserProfile:', error);
    return { data: null, error };
  }
};

/**
 * Actualiza el perfil del usuario
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error en updateUserProfile:', error);
    return { data: null, error };
  }
};

