import { supabase } from './supabase';
import { getProductByName } from './productService';

/**
 * Servicio de Préstamos Recibidos (Borrowings)
 * Gestiona los productos que pides prestados a socios
 *
 * Diferencia con loans:
 * - loans: Préstamos DADOS (tú debes producto porque vendiste sin stock)
 * - borrowings: Préstamos RECIBIDOS (producto que pediste prestado a un socio y debes devolver)
 */

/**
 * Obtiene todos los préstamos recibidos del usuario
 * @param {string} userId - ID del usuario
 * @param {Object} [options] - Opciones de filtrado
 * @param {string} [options.status] - Filtrar por estado: 'pending', 'partial', 'returned', 'all'
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export const getUserBorrowings = async (userId, options = {}) => {
  try {
    let query = supabase
      .from('borrowings')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    // Filtrar por estado si se especifica (y no es 'all')
    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Cargar productos por separado
    let productsMap = {};
    if (data && data.length > 0) {
      const productIds = [...new Set(data.map(b => b.product_id).filter(Boolean))];
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name, list_price, sachets_per_box')
          .in('id', productIds);

        if (products) {
          productsMap = Object.fromEntries(products.map(p => [p.id, p]));
        }
      }
    }

    // Mapear datos
    const mappedData = (data || []).map(borrowing => {
      const product = productsMap[borrowing.product_id];
      const pendingBoxes = borrowing.quantity_boxes - borrowing.returned_boxes;
      const pendingSachets = borrowing.quantity_sachets - borrowing.returned_sachets;

      return {
        id: borrowing.id,
        productId: borrowing.product_id,
        productName: product?.name || 'Desconocido',
        quantityBoxes: parseInt(borrowing.quantity_boxes) || 0,
        quantitySachets: parseInt(borrowing.quantity_sachets) || 0,
        returnedBoxes: parseInt(borrowing.returned_boxes) || 0,
        returnedSachets: parseInt(borrowing.returned_sachets) || 0,
        pendingBoxes,
        pendingSachets,
        partnerName: borrowing.partner_name,
        partnerPhone: borrowing.partner_phone,
        status: borrowing.status,
        listPrice: parseFloat(product?.list_price) || 0,
        sachetsPerBox: parseInt(product?.sachets_per_box) || 28,
        notes: borrowing.notes || '',
        dueDate: borrowing.due_date,
        createdAt: borrowing.created_at,
        returnedAt: borrowing.returned_at
      };
    });

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('[borrowingService] Error en getUserBorrowings:', error);
    return { data: [], error };
  }
};

/**
 * Obtiene el balance de préstamos recibidos agregado por producto
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export const getBorrowingBalances = async (userId) => {
  try {
    const { data, error } = await getUserBorrowings(userId, { status: 'pending' });
    if (error) throw error;

    // Incluir también los parcialmente devueltos
    const { data: partialData, error: partialError } = await getUserBorrowings(userId, { status: 'partial' });
    if (partialError) throw partialError;

    const allPending = [...(data || []), ...(partialData || [])];

    // Agregar por producto
    const balances = {};
    allPending.forEach(borrowing => {
      const key = borrowing.productId;
      if (!balances[key]) {
        balances[key] = {
          productId: borrowing.productId,
          productName: borrowing.productName,
          totalBorrowedBoxes: 0,
          totalBorrowedSachets: 0,
          totalReturnedBoxes: 0,
          totalReturnedSachets: 0,
          pendingBoxes: 0,
          pendingSachets: 0,
          partners: new Set(),
          listPrice: borrowing.listPrice
        };
      }
      balances[key].totalBorrowedBoxes += borrowing.quantityBoxes;
      balances[key].totalBorrowedSachets += borrowing.quantitySachets;
      balances[key].totalReturnedBoxes += borrowing.returnedBoxes;
      balances[key].totalReturnedSachets += borrowing.returnedSachets;
      balances[key].pendingBoxes += borrowing.pendingBoxes;
      balances[key].pendingSachets += borrowing.pendingSachets;
      balances[key].partners.add(borrowing.partnerName);
    });

    // Convertir Sets a arrays
    Object.values(balances).forEach(b => {
      b.partners = Array.from(b.partners);
    });

    return { data: balances, error: null };
  } catch (error) {
    console.error('[borrowingService] Error en getBorrowingBalances:', error);
    return { data: {}, error };
  }
};

/**
 * Registra un nuevo préstamo recibido de un socio
 * @param {Object} borrowing - Datos del préstamo
 * @param {string} borrowing.productName - Nombre del producto
 * @param {number} [borrowing.quantityBoxes=0] - Cantidad en cajas
 * @param {number} [borrowing.quantitySachets=0] - Cantidad en sobres
 * @param {string} borrowing.partnerName - Nombre del socio que te presta
 * @param {string} [borrowing.partnerPhone] - Teléfono del socio
 * @param {string} [borrowing.notes=''] - Notas adicionales
 * @param {Date} [borrowing.dueDate] - Fecha prometida de devolución
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const createBorrowing = async ({
  productName,
  quantityBoxes = 0,
  quantitySachets = 0,
  partnerName,
  partnerPhone = null,
  notes = '',
  dueDate = null
}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    if (!partnerName || !partnerName.trim()) {
      throw new Error('Debes especificar el nombre del socio que te presta');
    }

    // Obtener el producto
    const { data: product, error: productError } = await getProductByName(user.id, productName);
    if (productError) throw productError;
    if (!product) throw new Error(`El producto "${productName}" no existe`);

    // Crear el préstamo recibido
    const dbBorrowing = {
      user_id: user.id,
      product_id: product.id,
      quantity_boxes: parseInt(quantityBoxes) || 0,
      quantity_sachets: parseInt(quantitySachets) || 0,
      partner_name: partnerName.trim(),
      partner_phone: partnerPhone?.trim() || null,
      notes: notes.trim(),
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      status: 'pending',
      returned_boxes: 0,
      returned_sachets: 0
    };

    const { data, error } = await supabase
      .from('borrowings')
      .insert([dbBorrowing])
      .select(`
        *,
        products (
          id,
          name,
          list_price
        )
      `)
      .single();

    if (error) throw error;

    // Mapear respuesta
    const mappedData = {
      id: data.id,
      productId: data.product_id,
      productName: data.products?.name || productName,
      quantityBoxes: parseInt(data.quantity_boxes) || 0,
      quantitySachets: parseInt(data.quantity_sachets) || 0,
      partnerName: data.partner_name,
      partnerPhone: data.partner_phone,
      status: data.status,
      notes: data.notes || '',
      dueDate: data.due_date,
      createdAt: data.created_at
    };

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('[borrowingService] Error en createBorrowing:', error);
    return { data: null, error };
  }
};

/**
 * Registra la devolución (parcial o total) de un préstamo recibido
 * @param {string} borrowingId - ID del préstamo
 * @param {Object} returnData - Datos de la devolución
 * @param {number} [returnData.boxes=0] - Cajas a devolver
 * @param {number} [returnData.sachets=0] - Sobres a devolver
 * @param {string} [returnData.notes=''] - Notas de la devolución
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const returnBorrowing = async (borrowingId, { boxes = 0, sachets = 0, notes = '' }) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener el préstamo actual
    const { data: borrowing, error: fetchError } = await supabase
      .from('borrowings')
      .select('*')
      .eq('id', borrowingId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;
    if (!borrowing) throw new Error('Préstamo no encontrado');

    const returnBoxes = parseInt(boxes) || 0;
    const returnSachets = parseInt(sachets) || 0;

    // Calcular pendientes actuales
    const pendingBoxes = borrowing.quantity_boxes - borrowing.returned_boxes;
    const pendingSachets = borrowing.quantity_sachets - borrowing.returned_sachets;

    // Validar que no devolvemos más de lo que debemos
    if (returnBoxes > pendingBoxes || returnSachets > pendingSachets) {
      throw new Error(
        `No puedes devolver más de lo que debes. Pendiente: ${pendingBoxes} cajas y ${pendingSachets} sobres`
      );
    }

    // Calcular nuevos valores
    const newReturnedBoxes = borrowing.returned_boxes + returnBoxes;
    const newReturnedSachets = borrowing.returned_sachets + returnSachets;
    const newPendingBoxes = borrowing.quantity_boxes - newReturnedBoxes;
    const newPendingSachets = borrowing.quantity_sachets - newReturnedSachets;

    // Determinar nuevo estado
    let newStatus;
    if (newPendingBoxes === 0 && newPendingSachets === 0) {
      newStatus = 'returned';
    } else if (newReturnedBoxes > 0 || newReturnedSachets > 0) {
      newStatus = 'partial';
    } else {
      newStatus = 'pending';
    }

    // Actualizar el préstamo
    const updateData = {
      returned_boxes: newReturnedBoxes,
      returned_sachets: newReturnedSachets,
      status: newStatus,
      notes: borrowing.notes + (notes ? ` | Devolución: ${notes}` : '')
    };

    if (newStatus === 'returned') {
      updateData.returned_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('borrowings')
      .update(updateData)
      .eq('id', borrowingId)
      .select()
      .single();

    if (error) throw error;

    return {
      data: {
        ...data,
        returnedNow: { boxes: returnBoxes, sachets: returnSachets },
        pendingAfter: { boxes: newPendingBoxes, sachets: newPendingSachets },
        isFullyReturned: newStatus === 'returned'
      },
      error: null
    };
  } catch (error) {
    console.error('[borrowingService] Error en returnBorrowing:', error);
    return { data: null, error };
  }
};

/**
 * Elimina un préstamo recibido (solo si está pendiente o es un error)
 * @param {string} borrowingId - ID del préstamo
 * @returns {Promise<{error: Error|null}>}
 */
export const deleteBorrowing = async (borrowingId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('borrowings')
      .delete()
      .eq('id', borrowingId)
      .eq('user_id', user.id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('[borrowingService] Error en deleteBorrowing:', error);
    return { error };
  }
};

/**
 * Obtiene los socios de los que has pedido prestado
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export const getBorrowingPartners = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('borrowings')
      .select('partner_name, partner_phone')
      .eq('user_id', userId);

    if (error) throw error;

    // Deduplicar por nombre
    const partnersMap = {};
    (data || []).forEach(b => {
      if (!partnersMap[b.partner_name]) {
        partnersMap[b.partner_name] = {
          name: b.partner_name,
          phone: b.partner_phone
        };
      }
    });

    return { data: Object.values(partnersMap), error: null };
  } catch (error) {
    console.error('[borrowingService] Error en getBorrowingPartners:', error);
    return { data: [], error };
  }
};

/**
 * Obtiene estadísticas de préstamos recibidos
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const getBorrowingStats = async (userId) => {
  try {
    const { data: all, error: allError } = await getUserBorrowings(userId, { status: 'all' });
    if (allError) throw allError;

    const pending = all.filter(b => b.status === 'pending' || b.status === 'partial');
    const returned = all.filter(b => b.status === 'returned');

    // Calcular totales pendientes
    let totalPendingBoxes = 0;
    let totalPendingSachets = 0;
    let totalPendingValue = 0;
    const uniquePartners = new Set();

    pending.forEach(b => {
      totalPendingBoxes += b.pendingBoxes;
      totalPendingSachets += b.pendingSachets;
      totalPendingValue += b.pendingBoxes * b.listPrice;
      uniquePartners.add(b.partnerName);
    });

    return {
      data: {
        totalBorrowings: all.length,
        pendingCount: pending.length,
        returnedCount: returned.length,
        totalPendingBoxes,
        totalPendingSachets,
        totalPendingValue,
        uniquePartners: uniquePartners.size,
        partnersList: Array.from(uniquePartners)
      },
      error: null
    };
  } catch (error) {
    console.error('[borrowingService] Error en getBorrowingStats:', error);
    return { data: null, error };
  }
};
