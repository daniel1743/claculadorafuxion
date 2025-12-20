import { supabase } from './supabase';
import { getProductByName } from './productService';

/**
 * Servicio de Préstamos
 * Gestiona los productos prestados cuando se vende más del stock disponible
 */

/**
 * Obtiene todos los préstamos del usuario con información del producto
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export const getUserLoans = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('loans')
      .select(`
        *,
        products (
          id,
          name,
          list_price,
          sachets_per_box
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Mapear campos al formato del frontend
    const mappedData = (data || []).map(loan => ({
      id: loan.id,
      productId: loan.product_id,
      productName: loan.products?.name || 'Desconocido',
      quantityBoxes: parseInt(loan.quantity_boxes) || 0,
      quantitySachets: parseInt(loan.quantity_sachets) || 0,
      listPrice: parseFloat(loan.products?.list_price) || 0,
      notes: loan.notes || '',
      createdAt: loan.created_at,
      updatedAt: loan.updated_at
    }));

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('[loanService] Error en getUserLoans:', error);
    return { data: [], error };
  }
};

/**
 * Obtiene el balance de préstamos agregado por producto
 * @param {string} userId - ID del usuario
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export const getLoanBalances = async (userId) => {
  try {
    const { data, error } = await getUserLoans(userId);
    if (error) throw error;

    // Agregar por producto
    const balances = {};
    data.forEach(loan => {
      const key = loan.productId;
      if (!balances[key]) {
        balances[key] = {
          productId: loan.productId,
          productName: loan.productName,
          totalBoxes: 0,
          totalSachets: 0,
          listPrice: loan.listPrice
        };
      }
      balances[key].totalBoxes += loan.quantityBoxes;
      balances[key].totalSachets += loan.quantitySachets;
    });

    return { data: balances, error: null };
  } catch (error) {
    console.error('[loanService] Error en getLoanBalances:', error);
    return { data: {}, error };
  }
};

/**
 * Obtiene el balance de préstamos para un producto específico
 * @param {string} userId - ID del usuario
 * @param {string} productId - ID del producto
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const getLoanBalanceByProduct = async (userId, productId) => {
  try {
    const { data, error } = await supabase
      .from('loans')
      .select('quantity_boxes, quantity_sachets')
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) throw error;

    // Sumar todos los préstamos del producto
    let totalBoxes = 0;
    let totalSachets = 0;

    data.forEach(loan => {
      totalBoxes += parseInt(loan.quantity_boxes) || 0;
      totalSachets += parseInt(loan.quantity_sachets) || 0;
    });

    return {
      data: {
        productId,
        totalBoxes,
        totalSachets
      },
      error: null
    };
  } catch (error) {
    console.error('[loanService] Error en getLoanBalanceByProduct:', error);
    return { data: null, error };
  }
};

/**
 * Crea un nuevo préstamo
 * @param {Object} loan - Datos del préstamo
 * @param {string} loan.productName - Nombre del producto
 * @param {number} [loan.quantityBoxes=0] - Cantidad en cajas
 * @param {number} [loan.quantitySachets=0] - Cantidad en sobres
 * @param {string} [loan.notes=''] - Notas adicionales
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const createLoan = async ({ productName, quantityBoxes = 0, quantitySachets = 0, notes = '' }) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener el producto
    const { data: product, error: productError } = await getProductByName(user.id, productName);
    if (productError) throw productError;
    if (!product) throw new Error(`El producto "${productName}" no existe`);

    // Crear el préstamo
    const dbLoan = {
      user_id: user.id,
      product_id: product.id,
      quantity_boxes: parseInt(quantityBoxes) || 0,
      quantity_sachets: parseInt(quantitySachets) || 0,
      notes: notes.trim()
    };

    const { data, error } = await supabase
      .from('loans')
      .insert([dbLoan])
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
      notes: data.notes || '',
      createdAt: data.created_at
    };

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('[loanService] Error en createLoan:', error);
    return { data: null, error };
  }
};

/**
 * Registra la devolución de un préstamo
 * Reduce el balance de préstamos, pero NO incrementa el inventario
 * @param {Object} repayment - Datos de la devolución
 * @param {string} repayment.productName - Nombre del producto
 * @param {number} [repayment.quantityBoxes=0] - Cantidad en cajas a devolver
 * @param {number} [repayment.quantitySachets=0] - Cantidad en sobres a devolver
 * @param {string} [repayment.notes=''] - Notas adicionales
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const repayLoan = async ({ productName, quantityBoxes = 0, quantitySachets = 0, notes = '' }) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    // Obtener el producto
    const { data: product, error: productError } = await getProductByName(user.id, productName);
    if (productError) throw productError;
    if (!product) throw new Error(`El producto "${productName}" no existe`);

    // Obtener balance actual de préstamos
    const { data: balance, error: balanceError } = await getLoanBalanceByProduct(user.id, product.id);
    if (balanceError) throw balanceError;

    const repayBoxes = parseInt(quantityBoxes) || 0;
    const repaySachets = parseInt(quantitySachets) || 0;

    // Validar que no devolvemos más de lo que debemos
    if (repayBoxes > balance.totalBoxes || repaySachets > balance.totalSachets) {
      throw new Error(
        `No puedes devolver más de lo que debes. Debes: ${balance.totalBoxes} cajas y ${balance.totalSachets} sobres`
      );
    }

    // Obtener todos los préstamos del producto (ordenados por más antiguos primero)
    const { data: loans, error: loansError } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_id', product.id)
      .order('created_at', { ascending: true });

    if (loansError) throw loansError;

    let remainingBoxesToRepay = repayBoxes;
    let remainingSachetsToRepay = repaySachets;
    const loansToUpdate = [];
    const loansToDelete = [];

    // Ir descontando de los préstamos más antiguos primero (FIFO)
    for (const loan of loans) {
      if (remainingBoxesToRepay === 0 && remainingSachetsToRepay === 0) break;

      const loanBoxes = parseInt(loan.quantity_boxes) || 0;
      const loanSachets = parseInt(loan.quantity_sachets) || 0;

      let newBoxes = loanBoxes;
      let newSachets = loanSachets;

      // Descontar cajas
      if (remainingBoxesToRepay > 0) {
        const toDeduct = Math.min(loanBoxes, remainingBoxesToRepay);
        newBoxes -= toDeduct;
        remainingBoxesToRepay -= toDeduct;
      }

      // Descontar sobres
      if (remainingSachetsToRepay > 0) {
        const toDeduct = Math.min(loanSachets, remainingSachetsToRepay);
        newSachets -= toDeduct;
        remainingSachetsToRepay -= toDeduct;
      }

      // Si el préstamo queda en 0, marcarlo para eliminar
      if (newBoxes === 0 && newSachets === 0) {
        loansToDelete.push(loan.id);
      } else {
        // Si todavía queda algo, actualizar
        loansToUpdate.push({
          id: loan.id,
          quantity_boxes: newBoxes,
          quantity_sachets: newSachets,
          notes: loan.notes + ` | Devolución: ${notes}`.trim()
        });
      }
    }

    // Ejecutar actualizaciones
    for (const update of loansToUpdate) {
      const { error: updateError } = await supabase
        .from('loans')
        .update({
          quantity_boxes: update.quantity_boxes,
          quantity_sachets: update.quantity_sachets,
          notes: update.notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', update.id);

      if (updateError) throw updateError;
    }

    // Ejecutar eliminaciones
    if (loansToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('loans')
        .delete()
        .in('id', loansToDelete);

      if (deleteError) throw deleteError;
    }

    return {
      data: {
        productName,
        repaidBoxes: repayBoxes,
        repaidSachets: repaySachets,
        remainingBoxes: balance.totalBoxes - repayBoxes,
        remainingSachets: balance.totalSachets - repaySachets,
        loansUpdated: loansToUpdate.length,
        loansDeleted: loansToDelete.length
      },
      error: null
    };
  } catch (error) {
    console.error('[loanService] Error en repayLoan:', error);
    return { data: null, error };
  }
};

/**
 * Elimina todos los préstamos de un producto
 * @param {string} userId - ID del usuario
 * @param {string} productId - ID del producto
 * @returns {Promise<{error: Error|null}>}
 */
export const clearLoansByProduct = async (userId, productId) => {
  try {
    const { error } = await supabase
      .from('loans')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('[loanService] Error en clearLoansByProduct:', error);
    return { error };
  }
};

/**
 * Elimina un préstamo específico por ID
 * @param {string} loanId - ID del préstamo
 * @returns {Promise<{error: Error|null}>}
 */
export const deleteLoan = async (loanId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('loans')
      .delete()
      .eq('id', loanId)
      .eq('user_id', user.id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('[loanService] Error en deleteLoan:', error);
    return { error };
  }
};
