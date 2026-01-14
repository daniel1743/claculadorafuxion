/**
 * Utilidades para cálculos contables estrictos
 * Incluye COGS (Costo de Mercancía Vendida) y ganancia real
 */

/**
 * Calcula el COGS (Costo de Mercancía Vendida) de una venta
 * @param {Object} saleTransaction - Transacción de venta
 * @param {number} saleTransaction.quantity_boxes - Cajas vendidas
 * @param {number} saleTransaction.quantity_sachets - Sobres vendidos
 * @param {Object} product - Producto con PPP
 * @param {number} product.weighted_average_cost - Costo promedio ponderado
 * @param {number} product.sachets_per_box - Sobres por caja (default 28)
 * @returns {number} COGS total
 */
export const calculateCOGS = (saleTransaction, product) => {
  const {
    quantity_boxes = 0,
    quantity_sachets = 0
  } = saleTransaction;

  const {
    weighted_average_cost = 0,
    sachets_per_box = 28
  } = product;

  // COGS de cajas
  const cogsBoxes = (quantity_boxes || 0) * parseFloat(weighted_average_cost);

  // COGS de sobres (convertir a equivalente de cajas)
  const sachetsEquivalent = (quantity_sachets || 0) / (sachets_per_box || 28);
  const cogsSachets = sachetsEquivalent * parseFloat(weighted_average_cost);

  return cogsBoxes + cogsSachets;
};

/**
 * Calcula la ganancia real de una venta
 * @param {Object} saleTransaction - Transacción de venta
 * @param {number} saleTransaction.total_amount - Total recibido
 * @param {Object} product - Producto con PPP
 * @returns {Object} { revenue: number, cogs: number, profit: number, margin: number }
 */
export const calculateRealProfit = (saleTransaction, product) => {
  const revenue = parseFloat(saleTransaction.total_amount) || 0;
  const cogs = calculateCOGS(saleTransaction, product);
  const profit = revenue - cogs;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    revenue,
    cogs,
    profit,
    margin: parseFloat(margin.toFixed(2))
  };
};

/**
 * Calcula la ganancia total del período usando COGS real
 * @param {Array} transactions - Array de transacciones
 * @param {Array} products - Array de productos con PPP
 * @param {Date} [startDate] - Fecha de inicio (opcional)
 * @param {Date} [endDate] - Fecha de fin (opcional)
 * @returns {Object} { totalRevenue: number, totalCOGS: number, totalProfit: number, totalMargin: number }
 */
export const calculateTotalProfit = (transactions, products, startDate = null, endDate = null) => {
  // Crear mapa de productos por ID para acceso rápido
  const productsMap = {};
  products.forEach(p => {
    productsMap[p.id] = p;
  });

  let totalRevenue = 0;
  let totalCOGS = 0;

  // Filtrar transacciones de venta
  const sales = transactions.filter(t => {
    if (t.type !== 'sale') return false;
    
    if (startDate || endDate) {
      const tDate = new Date(t.created_at || t.date);
      if (startDate && tDate < startDate) return false;
      if (endDate && tDate > endDate) return false;
    }
    
    return true;
  });

  // Calcular COGS y revenue por cada venta
  sales.forEach(sale => {
    if (sale.product_id && productsMap[sale.product_id]) {
      const product = productsMap[sale.product_id];
      const revenue = parseFloat(sale.total_amount) || 0;
      const cogs = calculateCOGS(sale, product);

      totalRevenue += revenue;
      totalCOGS += cogs;
    }
  });

  const totalProfit = totalRevenue - totalCOGS;
  const totalMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    totalCOGS: parseFloat(totalCOGS.toFixed(2)),
    totalProfit: parseFloat(totalProfit.toFixed(2)),
    totalMargin: parseFloat(totalMargin.toFixed(2))
  };
};

/**
 * Calcula el COGS total de todas las ventas
 * @param {Array} transactions - Array de transacciones
 * @param {Array} products - Array de productos con PPP
 * @returns {number} COGS total
 */
export const calculateTotalCOGS = (transactions, products) => {
  const { totalCOGS } = calculateTotalProfit(transactions, products);
  return totalCOGS;
};

/**
 * Calcula métricas por producto
 * @param {Array} transactions - Array de transacciones
 * @param {Object} product - Producto
 * @returns {Object} { sales: number, revenue: number, cogs: number, profit: number, margin: number }
 */
export const calculateProductMetrics = (transactions, product) => {
  const productSales = transactions.filter(t => 
    t.type === 'sale' && t.product_id === product.id
  );

  let revenue = 0;
  let cogs = 0;
  let salesCount = 0;

  productSales.forEach(sale => {
    revenue += parseFloat(sale.total_amount) || 0;
    cogs += calculateCOGS(sale, product);
    salesCount++;
  });

  const profit = revenue - cogs;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    sales: salesCount,
    revenue: parseFloat(revenue.toFixed(2)),
    cogs: parseFloat(cogs.toFixed(2)),
    profit: parseFloat(profit.toFixed(2)),
    margin: parseFloat(margin.toFixed(2))
  };
};

/**
 * Calcula el valor del inventario usando PPP
 * @param {Array} products - Array de productos con inventario y PPP
 * @returns {number} Valor total del inventario
 */
export const calculateInventoryValue = (products) => {
  let totalValue = 0;

  products.forEach(product => {
    const {
      current_stock_boxes = 0,
      current_marketing_stock = 0,
      weighted_average_cost = 0,
      sachets_per_box = 28
    } = product;

    // Valor de cajas
    const boxesValue = (parseInt(current_stock_boxes) || 0) * parseFloat(weighted_average_cost);

    // Valor de sobres (convertir a equivalente de cajas)
    const sachetsEquivalent = (parseInt(current_marketing_stock) || 0) / (parseInt(sachets_per_box) || 28);
    const sachetsValue = sachetsEquivalent * parseFloat(weighted_average_cost);

    totalValue += boxesValue + sachetsValue;
  });

  return parseFloat(totalValue.toFixed(2));
};

