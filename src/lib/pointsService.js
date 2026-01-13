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
 * @returns {Promise<{data: {base_points: number, purchase_points: number, total_points: number, rank: string, progress: number}|null, error: Error|null}>}
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

    // Calcular rango y progreso
    const { rank, progress, nextRank, pointsToNext } = calculateRankAndProgress(totalPoints);

    return {
      data: {
        base_points: basePoints,
        purchase_points: purchasePoints,
        total_points: totalPoints,
        rank,
        progress,
        nextRank,
        pointsToNext
      },
      error: null
    };
  } catch (error) {
    console.error('[pointsService] Error getting total points:', error);
    return { data: null, error };
  }
};

/**
 * Sistema de rangos
 */
const RANKS = [
  { name: 'Principiante', min: 0, max: 999, color: '#9ca3af' },
  { name: 'Líder', min: 1000, max: 4999, color: '#3b82f6' },
  { name: 'Líder X', min: 5000, max: 9999, color: '#8b5cf6' },
  { name: 'Élite', min: 10000, max: Infinity, color: '#eab308' }
];

/**
 * Calcula el rango y progreso hacia el siguiente
 * @param {number} totalPoints - Total de puntos
 * @returns {{rank: string, progress: number, nextRank: string|null, pointsToNext: number|null}}
 */
export const calculateRankAndProgress = (totalPoints) => {
  // Encontrar el rango actual
  const currentRank = RANKS.find(r => totalPoints >= r.min && totalPoints <= r.max) || RANKS[0];

  // Encontrar el siguiente rango
  const currentIndex = RANKS.indexOf(currentRank);
  const nextRank = RANKS[currentIndex + 1] || null;

  // Calcular progreso
  let progress = 0;
  let pointsToNext = null;

  if (nextRank) {
    const pointsInCurrentRank = totalPoints - currentRank.min;
    const pointsNeededForNextRank = nextRank.min - currentRank.min;
    progress = Math.min((pointsInCurrentRank / pointsNeededForNextRank) * 100, 100);
    pointsToNext = nextRank.min - totalPoints;
  } else {
    // Ya está en el rango máximo
    progress = 100;
  }

  return {
    rank: currentRank.name,
    rankColor: currentRank.color,
    progress: Math.round(progress),
    nextRank: nextRank?.name || null,
    pointsToNext: pointsToNext > 0 ? pointsToNext : null
  };
};

/**
 * Obtiene todos los rangos disponibles
 * @returns {Array} Lista de rangos
 */
export const getAllRanks = () => {
  return RANKS;
};
