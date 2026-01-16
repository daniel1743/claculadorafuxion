import { supabase } from './supabase';
import { getProductByName, upsertProduct } from './productService';

/**
 * Servicio de transacciones V2
 * Trabaja con la nueva estructura: product_id, quantity_boxes, quantity_sachets, etc.
 */

/**
 * Obtiene todas las transacciones del usuario con información del producto
 * @param {string} userId - ID del usuario
 * @param {number} [limit] - Límite de transacciones a cargar (default: 500)
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export const getTransactionsV2 = async (userId, limit = 500) => {
  try {
    // 1. Query simple sin JOIN (mucho más rápido) - CON LÍMITE
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // 2. Cargar productos por separado solo los que necesitamos
    let productsMap = {};
    if (data && data.length > 0) {
      const productIds = [...new Set(data.map(t => t.product_id).filter(Boolean))];
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name, weighted_average_cost, list_price, sachets_per_box')
          .in('id', productIds);

        if (products) {
          productsMap = Object.fromEntries(products.map(p => [p.id, p]));
        }
      }
    }

    // 3. Mapear datos con productos (join en memoria)
    const mappedData = (data || []).map(t => {
      const product = productsMap[t.product_id];
      return {
        id: t.id,
        type: t.type,
        productId: t.product_id,
        productName: product?.name || null,
        quantityBoxes: parseInt(t.quantity_boxes) || 0,
        quantitySachets: parseInt(t.quantity_sachets) || 0,
        totalAmount: parseFloat(t.total_amount) || 0,
        unitCostSnapshot: parseFloat(t.unit_cost_snapshot) || 0,
        notes: t.notes || '',
        date: t.created_at,
        // Compatibilidad con formato antiguo
        quantity: parseInt(t.quantity_boxes) || 0,
        total: parseFloat(t.total_amount) || 0,
        realUnitCost: parseFloat(t.unit_cost_snapshot) || 0,
        // Información adicional del producto
        weightedAverageCost: product?.weighted_average_cost || 0,
        listPrice: product?.list_price || 0,
        sachetsPerBox: product?.sachets_per_box || 28
      };
    });

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Error en getTransactionsV2:', error);
    return { data: [], error };
  }
};

/**
 * Agrega una transacción V2 (nueva estructura)
 * Si el producto no existe, lo crea automáticamente
 * @param {Object} transaction - Datos de la transacción
 * @param {string} transaction.type - Tipo: 'purchase', 'sale', 'personal_consumption', 'marketing_sample', 'box_opening'
 * @param {string} transaction.productName - Nombre del producto
 * @param {number} [transaction.quantityBoxes=0] - Cantidad en cajas
 * @param {number} [transaction.quantitySachets=0] - Cantidad en sobres
 * @param {number} transaction.totalAmount - Monto total
 * @param {string} [transaction.notes] - Notas adicionales
 * @param {number} [transaction.listPrice] - Precio de lista (para crear producto si no existe)
 * @param {number} [transaction.points] - Puntos Fuxion (para crear producto si no existe)
 * @param {string} [transaction.customerId] - ID del cliente (para ventas CRM)
 * @param {string} [transaction.saleType] - Tipo de venta: 'organic', 'recurring', 'referral'
 * @param {string} [transaction.referrerId] - ID del cliente que refirió (para ventas por referencia)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const addTransactionV2 = async (transaction) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const {
      type,
      productName,
      quantityBoxes = 0,
      quantitySachets = 0,
      totalAmount,
      notes = '',
      listPrice,
      points = 0,
      customerId = null,
      saleType = null,
      referrerId = null
    } = transaction;

    // Validar tipo de transacción
    const validTypes = ['purchase', 'sale', 'personal_consumption', 'marketing_sample', 'box_opening', 'loan_repayment', 'loan'];
    if (!validTypes.includes(type)) {
      throw new Error(`Tipo de transacción inválido: ${type}. Debe ser uno de: ${validTypes.join(', ')}`);
    }

    // Obtener o crear el producto
    let productId;
    const { data: existingProduct, error: productError } = await getProductByName(user.id, productName);
    
    if (productError && productError.code !== 'PGRST116') {
      throw productError;
    }

    if (existingProduct) {
      productId = existingProduct.id;
    } else {
      // Crear producto si no existe
      if (!listPrice) {
        throw new Error(`El producto "${productName}" no existe. Debes proporcionar listPrice para crearlo.`);
      }

      const { data: newProduct, error: createError } = await upsertProduct({
        name: productName,
        list_price: listPrice,
        points: points
      });

      if (createError) throw createError;
      productId = newProduct.id;
    }

    // Crear la transacción base
    const dbTransaction = {
      user_id: user.id,
      product_id: productId,
      type: type,
      quantity_boxes: parseInt(quantityBoxes) || 0,
      quantity_sachets: parseInt(quantitySachets) || 0,
      total_amount: parseFloat(totalAmount),
      unit_cost_snapshot: 0, // Se actualizará automáticamente por el trigger
      notes: notes.trim()
    };

    // Agregar campos CRM solo si tienen valor (para evitar errores si no existen las columnas)
    if (customerId) dbTransaction.customer_id = customerId;
    if (saleType) dbTransaction.sale_type = saleType;
    if (referrerId) dbTransaction.referrer_id = referrerId;

    // Intentar insertar con campos CRM, si falla intentar sin ellos
    let data, error;

    const insertResult = await supabase
      .from('transactions')
      .insert([dbTransaction])
      .select(`
        *,
        products (
          id,
          name,
          weighted_average_cost
        )
      `)
      .single();

    data = insertResult.data;
    error = insertResult.error;

    // Si hay error relacionado con columnas CRM, intentar sin ellas
    if (error && (error.message?.includes('customer_id') || error.message?.includes('sale_type') || error.message?.includes('referrer_id') || error.code === '42703')) {
      console.warn('[transactionServiceV2] Campos CRM no disponibles, insertando sin ellos:', error.message);

      // Crear transacción sin campos CRM
      const basicTransaction = {
        user_id: user.id,
        product_id: productId,
        type: type,
        quantity_boxes: parseInt(quantityBoxes) || 0,
        quantity_sachets: parseInt(quantitySachets) || 0,
        total_amount: parseFloat(totalAmount),
        unit_cost_snapshot: 0,
        notes: notes.trim()
      };

      const retryResult = await supabase
        .from('transactions')
        .insert([basicTransaction])
        .select(`
          *,
          products (
            id,
            name,
            weighted_average_cost
          )
        `)
        .single();

      data = retryResult.data;
      error = retryResult.error;
    }

    if (error) throw error;

    // Mapear respuesta
    const mappedData = {
      id: data.id,
      type: data.type,
      productId: data.product_id,
      productName: data.products?.name || productName,
      quantityBoxes: parseInt(data.quantity_boxes) || 0,
      quantitySachets: parseInt(data.quantity_sachets) || 0,
      totalAmount: parseFloat(data.total_amount) || 0,
      unitCostSnapshot: parseFloat(data.unit_cost_snapshot) || 0,
      notes: data.notes || '',
      date: data.created_at
    };
    
    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Error en addTransactionV2 - COMPLETO:', error);
    console.error('Error en addTransactionV2 - JSON:', JSON.stringify(error, null, 2));
    console.error('Error en addTransactionV2 - Props:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      name: error?.name,
      keys: error ? Object.keys(error) : 'N/A'
    });

    // Normalizar el error para que siempre tenga .message
    const normalizedError = {
      message: error?.message || error?.details || String(error) || 'Error desconocido',
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      original: error
    };

    return { data: null, error: normalizedError };
  }
};

/**
 * Agrega múltiples transacciones V2
 * @param {Array} transactions - Array de transacciones
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export const addMultipleTransactionsV2 = async (transactions) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const results = [];
    const errors = [];

    // Procesar cada transacción
    for (const transaction of transactions) {
      const result = await addTransactionV2(transaction);
      if (result.error) {
        errors.push({ transaction, error: result.error });
      } else {
        results.push(result.data);
      }
    }

    if (errors.length > 0) {
      console.error('Algunas transacciones fallaron:', errors);
      return { data: results, error: errors };
    }

    return { data: results, error: null };
  } catch (error) {
    console.error('Error en addMultipleTransactionsV2:', error);
    return { data: [], error };
  }
};

/**
 * Elimina una transacción V2
 * @param {string} transactionId - ID de la transacción
 * @returns {Promise<{error: Error|null}>}
 */
export const deleteTransactionV2 = async (transactionId) => {
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
    console.error('Error en deleteTransactionV2:', error);
    return { error };
  }
};

/**
 * Actualiza una transacción V2
 * @param {string} transactionId - ID de la transacción
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const updateTransactionV2 = async (transactionId, updates) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('transactions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .eq('user_id', user.id)
      .select(`
        *,
        products (
          id,
          name
        )
      `)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error en updateTransactionV2:', error);
    return { data: null, error };
  }
};

