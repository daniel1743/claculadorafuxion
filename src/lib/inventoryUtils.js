/**
 * Utilidades para manejo de inventario dual (cajas y sobres)
 */

/**
 * Convierte cajas a sobres
 * @param {number} boxes - Cantidad de cajas
 * @param {number} sachetsPerBox - Sobres por caja (default 28)
 * @returns {number} Total de sobres
 */
export const boxesToSachets = (boxes, sachetsPerBox = 28) => {
  return Math.floor(boxes * sachetsPerBox);
};

/**
 * Convierte sobres a cajas (decimal)
 * @param {number} sachets - Cantidad de sobres
 * @param {number} sachetsPerBox - Sobres por caja (default 28)
 * @returns {number} Cantidad de cajas (puede ser decimal)
 */
export const sachetsToBoxes = (sachets, sachetsPerBox = 28) => {
  return sachets / sachetsPerBox;
};

/**
 * Convierte sobres a cajas (entero, redondeando hacia arriba)
 * @param {number} sachets - Cantidad de sobres
 * @param {number} sachetsPerBox - Sobres por caja (default 28)
 * @returns {number} Cantidad de cajas necesarias (redondeado hacia arriba)
 */
export const sachetsToBoxesCeil = (sachets, sachetsPerBox = 28) => {
  return Math.ceil(sachets / sachetsPerBox);
};

/**
 * Calcula el stock total equivalente en cajas
 * @param {number} boxes - Cajas cerradas
 * @param {number} sachets - Sobres sueltos
 * @param {number} sachetsPerBox - Sobres por caja (default 28)
 * @returns {number} Total equivalente en cajas (decimal)
 */
export const calculateTotalStockEquivalent = (boxes, sachets, sachetsPerBox = 28) => {
  return boxes + (sachets / sachetsPerBox);
};

/**
 * Valida si hay suficiente stock para una operación
 * @param {Object} product - Producto con inventario
 * @param {number} product.current_stock_boxes - Cajas disponibles
 * @param {number} product.current_marketing_stock - Sobres disponibles
 * @param {number} product.sachets_per_box - Sobres por caja
 * @param {number} requiredBoxes - Cajas requeridas
 * @param {number} requiredSachets - Sobres requeridos
 * @returns {Object} { valid: boolean, message: string, canOpenBoxes: number }
 */
export const validateStock = (product, requiredBoxes = 0, requiredSachets = 0) => {
  const {
    current_stock_boxes = 0,
    current_marketing_stock = 0,
    sachets_per_box = 28
  } = product;

  let availableBoxes = current_stock_boxes;
  let availableSachets = current_marketing_stock;
  let boxesToOpen = 0;

  // Verificar cajas
  if (requiredBoxes > availableBoxes) {
    return {
      valid: false,
      message: `Stock insuficiente: Se requieren ${requiredBoxes} cajas, pero solo hay ${availableBoxes} disponibles`,
      canOpenBoxes: 0
    };
  }

  // Verificar sobres
  if (requiredSachets > availableSachets) {
    const sachetsNeeded = requiredSachets - availableSachets;
    boxesToOpen = sachetsToBoxesCeil(sachetsNeeded, sachets_per_box);

    if (boxesToOpen > availableBoxes) {
      return {
        valid: false,
        message: `Stock insuficiente: Se requieren ${requiredSachets} sobres, pero solo hay ${availableSachets} sobres y ${availableBoxes} cajas disponibles`,
        canOpenBoxes: 0
      };
    }
  }

  return {
    valid: true,
    message: 'Stock suficiente',
    canOpenBoxes: boxesToOpen
  };
};

/**
 * Calcula cuántas cajas se pueden abrir sin afectar el stock mínimo
 * @param {Object} product - Producto con inventario
 * @param {number} minBoxesToKeep - Cajas mínimas a mantener (default 0)
 * @returns {number} Cajas que se pueden abrir
 */
export const calculateOpenableBoxes = (product, minBoxesToKeep = 0) => {
  const currentBoxes = parseInt(product.current_stock_boxes) || 0;
  return Math.max(0, currentBoxes - minBoxesToKeep);
};

/**
 * Formatea el inventario para mostrar en la UI
 * @param {Object} product - Producto con inventario
 * @returns {string} String formateado (ej: "5 cajas + 12 sobres")
 */
export const formatInventory = (product) => {
  const {
    current_stock_boxes = 0,
    current_marketing_stock = 0
  } = product;

  const boxes = parseInt(current_stock_boxes) || 0;
  const sachets = parseInt(current_marketing_stock) || 0;

  if (boxes === 0 && sachets === 0) {
    return 'Sin stock';
  }

  if (boxes > 0 && sachets > 0) {
    return `${boxes} cajas + ${sachets} sobres`;
  }

  if (boxes > 0) {
    return `${boxes} cajas`;
  }

  return `${sachets} sobres`;
};

/**
 * Calcula el stock total equivalente formateado
 * @param {Object} product - Producto con inventario
 * @returns {string} String formateado (ej: "5.43 cajas")
 */
export const formatTotalStockEquivalent = (product) => {
  const {
    current_stock_boxes = 0,
    current_marketing_stock = 0,
    sachets_per_box = 28
  } = product;

  const total = calculateTotalStockEquivalent(
    parseInt(current_stock_boxes) || 0,
    parseInt(current_marketing_stock) || 0,
    parseInt(sachets_per_box) || 28
  );

  return `${total.toFixed(2)} cajas`;
};

