import { supabase } from './supabase';

/**
 * Servicio para gestionar puntos de usuario
 *
 * Sistema de puntos:
 * - base_points: Puntos editables manualmente (para ajustes/resets)
 * - purchase_points: Puntos acumulados desde compras
 * - total_points: base_points + purchase_points
 */

/**
 * Obtiene los puntos base del usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: {base_points: number}|null, error: Error|null}>}
 */
export const getUserBasePoints = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_points')
      .select('base_points')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Si no existe registro, es la primera vez
      if (error.code === 'PGRST116') {
        return { data: { base_points: 0 }, error: null };
      }
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('[pointsService] Error getting base points:', error);
    return { data: null, error };
  }
};

/**
 * Actualiza los puntos base del usuario
 * @param {string} userId - ID del usuario
 * @param {number} basePoints - Nuevos puntos base
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const updateUserBasePoints = async (userId, basePoints) => {
  try {
    const { data, error } = await supabase
      .from('user_points')
      .upsert({
        user_id: userId,
        base_points: parseInt(basePoints) || 0,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[pointsService] Error updating base points:', error);
    return { data: null, error };
  }
};

/**
 * Calcula puntos desde compras
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: {purchase_points: number, purchases: Array}|null, error: Error|null}>}
 */
export const calculatePurchasePoints = async (userId) => {
  try {
    // Obtener todas las compras del usuario
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('product_id, quantity_boxes, quantity_sachets')
      .eq('user_id', userId)
      .eq('type', 'purchase')
      .order('created_at', { ascending: false });

    if (txError) throw txError;

    if (!transactions || transactions.length === 0) {
      return {
        data: {
          purchase_points: 0,
          purchases: []
        },
        error: null
      };
    }

    // Obtener IDs únicos de productos
    const productIds = [...new Set(transactions.map(t => t.product_id).filter(Boolean))];

    if (productIds.length === 0) {
      return {
        data: {
          purchase_points: 0,
          purchases: []
        },
        error: null
      };
    }

    // Obtener información de productos (incluyendo points)
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name, points')
      .in('id', productIds);

    if (prodError) throw prodError;

    // Crear mapa de productos por ID
    const productsMap = {};
    products.forEach(p => {
      productsMap[p.id] = p;
    });

    // Calcular puntos por transacción
    let totalPurchasePoints = 0;
    const purchaseDetails = [];

    transactions.forEach(tx => {
      const product = productsMap[tx.product_id];
      if (!product) return;

      const productPoints = parseInt(product.points) || 0;
      const quantityBoxes = parseInt(tx.quantity_boxes) || 0;
      const points = quantityBoxes * productPoints;

      if (points > 0) {
        totalPurchasePoints += points;
        purchaseDetails.push({
          product_name: product.name,
          quantity: quantityBoxes,
          points_per_unit: productPoints,
          total_points: points
        });
      }
    });

    return {
      data: {
        purchase_points: totalPurchasePoints,
        purchases: purchaseDetails
      },
      error: null
    };
  } catch (error) {
    console.error('[pointsService] Error calculating purchase points:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene el total de puntos del usuario (base + compras)
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: {base_points: number, purchase_points: number, total_points: number}|null, error: Error|null}>}
 */
export const getUserTotalPoints = async (userId) => {
  try {
    // Obtener puntos base
    const { data: baseData, error: baseError } = await getUserBasePoints(userId);
    if (baseError) throw baseError;

    const basePoints = baseData?.base_points || 0;

    // Calcular puntos de compras
    const { data: purchaseData, error: purchaseError } = await calculatePurchasePoints(userId);
    if (purchaseError) throw purchaseError;

    const purchasePoints = purchaseData?.purchase_points || 0;
    const totalPoints = basePoints + purchasePoints;

    return {
      data: {
        base_points: basePoints,
        purchase_points: purchasePoints,
        total_points: totalPoints
      },
      error: null
    };
  } catch (error) {
    console.error('[pointsService] Error getting total points:', error);
    return { data: null, error };
  }
};

// Rangos removidos - Se implementarán manualmente más adelante según necesidades del negocio
