import { supabase } from './supabase';

/**
 * Servicio para manejar productos en la nueva estructura V2
 * Trabaja con la tabla 'products' que tiene PPP, inventario dual y puntos
 */

/**
 * Cache de usuario para evitar múltiples llamadas a getUser()
 * TTL: 5 segundos (suficiente para operaciones en batch)
 */
let userCache = null;
let userCachePromise = null;
let userCacheTime = 0;
const USER_CACHE_TTL = 5000; // 5 segundos

const getCachedUser = async () => {
  const now = Date.now();

  // Si hay una llamada en progreso, esperarla
  if (userCachePromise) return userCachePromise;

  // Si tenemos cache válido, usarlo
  if (userCache && (now - userCacheTime) < USER_CACHE_TTL) {
    return userCache;
  }

  // Hacer nueva llamada
  userCachePromise = supabase.auth.getUser()
    .then(result => {
      userCache = result;
      userCacheTime = Date.now();
      userCachePromise = null;
      return result;
    })
    .catch(error => {
      userCachePromise = null;
      throw error;
    });

  return userCachePromise;
};

/**
 * Obtiene un producto por nombre
 * @param {string} userId - ID del usuario
 * @param {string} productName - Nombre del producto
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const getProductByName = async (userId, productName) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .eq('name', productName.trim())
      .maybeSingle();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error en getProductByName:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene un producto por ID
 * @param {string} productId - ID del producto
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const getProductById = async (productId) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error en getProductById:', error);
    return { data: null, error };
  }
};

/**
 * Obtiene todos los productos del usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export const getUserProducts = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error en getUserProducts:', error);
    return { data: [], error };
  }
};

/**
 * Crea o actualiza un producto (upsert)
 * Si el producto existe, lo actualiza; si no, lo crea
 * @param {Object} productData - Datos del producto
 * @param {string} productData.name - Nombre del producto
 * @param {number} productData.list_price - Precio de venta
 * @param {number} [productData.sachets_per_box=28] - Sobres por caja
 * @param {number} [productData.points=0] - Puntos Fuxion
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const upsertProduct = async (productData) => {
  try {
    const { data: { user } } = await getCachedUser();
    if (!user) throw new Error('Usuario no autenticado');

    const {
      name,
      list_price,
      sachets_per_box = 28,
      points = 0,
      weighted_average_cost = 0,
      current_stock_boxes = 0,
      current_marketing_stock = 0
    } = productData;

    // Validar datos requeridos
    if (!name || !name.trim()) {
      throw new Error('El nombre del producto es requerido');
    }

    if (list_price === undefined || list_price === null || list_price < 0) {
      throw new Error('El precio de lista es requerido y debe ser mayor o igual a 0');
    }

    // Verificar si el producto ya existe
    const { data: existing, error: checkError } = await supabase
      .from('products')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim())
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    let result;
    if (existing) {
      // Actualizar producto existente
      result = await supabase
        .from('products')
        .update({
          list_price: parseFloat(list_price),
          sachets_per_box: parseInt(sachets_per_box) || 28,
          points: parseInt(points) || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .eq('user_id', user.id)
        .select()
        .single();
    } else {
      // Crear nuevo producto
      result = await supabase
        .from('products')
        .insert({
          user_id: user.id,
          name: name.trim(),
          list_price: parseFloat(list_price),
          sachets_per_box: parseInt(sachets_per_box) || 28,
          points: parseInt(points) || 0,
          weighted_average_cost: parseFloat(weighted_average_cost) || 0,
          current_stock_boxes: parseInt(current_stock_boxes) || 0,
          current_marketing_stock: parseInt(current_marketing_stock) || 0
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;
    return { data: result.data, error: null };
  } catch (error) {
    console.error('Error en upsertProduct:', error);
    return { data: null, error };
  }
};

/**
 * Actualiza el inventario de un producto manualmente
 * (Normalmente el inventario se actualiza automáticamente con triggers)
 * @param {string} productId - ID del producto
 * @param {Object} inventory - Datos de inventario
 * @param {number} [inventory.current_stock_boxes] - Cajas en stock
 * @param {number} [inventory.current_marketing_stock] - Sobres en stock
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const updateProductInventory = async (productId, inventory) => {
  try {
    const { data: { user } } = await getCachedUser();
    if (!user) throw new Error('Usuario no autenticado');

    const updates = {
      updated_at: new Date().toISOString()
    };

    if (inventory.current_stock_boxes !== undefined) {
      updates.current_stock_boxes = parseInt(inventory.current_stock_boxes);
    }

    if (inventory.current_marketing_stock !== undefined) {
      updates.current_marketing_stock = parseInt(inventory.current_marketing_stock);
    }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error en updateProductInventory:', error);
    return { data: null, error };
  }
};

/**
 * Elimina un producto
 * @param {string} productId - ID del producto
 * @returns {Promise<{error: Error|null}>}
 */
export const deleteProduct = async (productId) => {
  try {
    const { data: { user } } = await getCachedUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('user_id', user.id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error en deleteProduct:', error);
    return { error };
  }
};

/**
 * Obtiene productos con su inventario actual
 * Útil para mostrar en la UI
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export const getUserProductsWithInventory = async (userId) => {
  try {
    const { data, error } = await getUserProducts(userId);
    if (error) throw error;

    // Formatear datos para la UI
    const formatted = (data || []).map(product => ({
      id: product.id,
      name: product.name,
      listPrice: parseFloat(product.list_price) || 0,
      weightedAverageCost: parseFloat(product.weighted_average_cost) || 0,
      currentStockBoxes: parseInt(product.current_stock_boxes) || 0,
      currentMarketingStock: parseInt(product.current_marketing_stock) || 0,
      sachetsPerBox: parseInt(product.sachets_per_box) || 28,
      points: parseInt(product.points) || 0,
      totalStockEquivalent: 
        (parseInt(product.current_stock_boxes) || 0) + 
        ((parseInt(product.current_marketing_stock) || 0) / (parseInt(product.sachets_per_box) || 28))
    }));

    return { data: formatted, error: null };
  } catch (error) {
    console.error('Error en getUserProductsWithInventory:', error);
    return { data: [], error };
  }
};

/**
 * Calcula el PPP manualmente (para validación o cálculos especiales)
 * Esta función replica la lógica del trigger SQL
 * @param {string} productId - ID del producto
 * @param {Object} newPurchase - Datos de la nueva compra
 * @param {number} newPurchase.quantity_boxes - Cantidad de cajas compradas
 * @param {number} newPurchase.total_amount - Total pagado
 * @returns {Promise<{data: number|null, error: Error|null}>}
 */
export const calculateWeightedAverageCost = async (productId, newPurchase) => {
  try {
    // Obtener producto actual
    const { data: product, error: productError } = await getProductById(productId);
    if (productError) throw productError;
    if (!product) throw new Error('Producto no encontrado');

    const currentStock = parseInt(product.current_stock_boxes) || 0;
    const currentPPP = parseFloat(product.weighted_average_cost) || 0;
    const purchaseQuantity = parseInt(newPurchase.quantity_boxes) || 1;
    const purchaseCost = parseFloat(newPurchase.total_amount) / purchaseQuantity;

    // Calcular nuevo PPP
    let newPPP;
    if (currentStock === 0 || currentPPP === 0) {
      newPPP = purchaseCost;
    } else {
      const totalUnits = currentStock + purchaseQuantity;
      newPPP = (
        (currentStock * currentPPP) + 
        (purchaseQuantity * purchaseCost)
      ) / totalUnits;
    }

    return { data: newPPP, error: null };
  } catch (error) {
    console.error('Error en calculateWeightedAverageCost:', error);
    return { data: null, error };
  }
};

