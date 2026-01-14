import { supabase } from './supabase';

/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * CYCLE SERVICE - Sistema de Ciclos de Negocio
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * Maneja el cierre manual de ciclos Fuxion y analytics históricos
 */

// ================================================
// CERRAR CICLO (CREAR SNAPSHOT)
// ================================================

/**
 * Cierra el ciclo actual y crea un snapshot inmutable
 * @param {string} userId
 * @param {object} cycleData
 * @returns {object} { data, error }
 */
export const closeBusinessCycle = async (userId, cycleData) => {
  try {
    const {
      cycleName,
      startDate,
      endDate = new Date().toISOString(),
      notes = null
    } = cycleData;

    // 1. Obtener métricas actuales del ciclo
    const metrics = await calculateCycleMetrics(userId, startDate, endDate);

    // 2. Obtener el siguiente número de ciclo
    const { data: existingCycles } = await supabase
      .from('business_cycles')
      .select('cycle_number')
      .eq('user_id', userId)
      .order('cycle_number', { ascending: false })
      .limit(1);

    const cycleNumber = existingCycles && existingCycles.length > 0
      ? existingCycles[0].cycle_number + 1
      : 1;

    // 3. Comparar con ciclo anterior
    let salesVsPrevious = null;
    let profitVsPrevious = null;
    let growthRate = null;

    if (existingCycles && existingCycles.length > 0) {
      const { data: previousCycle } = await supabase
        .from('business_cycles')
        .select('*')
        .eq('user_id', userId)
        .eq('cycle_number', cycleNumber - 1)
        .single();

      if (previousCycle && previousCycle.total_sales > 0) {
        salesVsPrevious = ((metrics.totalSales - previousCycle.total_sales) / previousCycle.total_sales) * 100;
        profitVsPrevious = previousCycle.net_profit !== 0
          ? ((metrics.netProfit - previousCycle.net_profit) / Math.abs(previousCycle.net_profit)) * 100
          : null;
        growthRate = salesVsPrevious;
      }
    }

    // 4. Crear el ciclo cerrado
    const { data: newCycle, error: insertError } = await supabase
      .from('business_cycles')
      .insert({
        user_id: userId,
        cycle_name: cycleName,
        cycle_number: cycleNumber,
        start_date: startDate,
        end_date: endDate,
        closed_at: new Date().toISOString(),

        // Métricas financieras
        total_sales: metrics.totalSales,
        total_sales_count: metrics.salesCount,
        total_purchases: metrics.totalPurchases,
        total_purchases_count: metrics.purchasesCount,
        total_advertising: metrics.totalAdvertising,
        total_advertising_count: metrics.adsCount,
        total_expenses: metrics.totalExpenses,
        total_expenses_count: metrics.expensesCount,

        // Préstamos
        total_loans_given: metrics.loansGiven,
        total_loans_received: metrics.loansReceived,
        total_loan_repayments: metrics.loanRepayments,
        active_loans_count: metrics.activeLoansCount,

        // Ganancias
        gross_profit: metrics.grossProfit,
        net_profit: metrics.netProfit,
        profit_margin: metrics.profitMargin,
        roi_percentage: metrics.roiPercentage,

        // Productos
        products_sold: metrics.productsSold,
        top_product: metrics.topProduct?.name,
        top_product_revenue: metrics.topProduct?.revenue,

        // Clientes
        total_customers: metrics.totalCustomers,
        new_customers: metrics.newCustomers,
        recurring_customers: metrics.recurringCustomers,

        // Campañas
        campaigns: metrics.campaigns,
        top_campaign: metrics.topCampaign?.name,
        top_campaign_roi: metrics.topCampaign?.roi,

        // Inventario
        inventory_snapshot: metrics.inventorySnapshot,
        total_inventory_boxes: metrics.totalInventoryBoxes,
        inventory_value: metrics.inventoryValue,

        // Comparación
        sales_vs_previous: salesVsPrevious,
        profit_vs_previous: profitVsPrevious,
        growth_rate: growthRate,

        notes: notes,
        is_locked: true
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 5. Marcar transacciones con cycle_id
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ cycle_id: newCycle.id })
      .eq('user_id', userId)
      .is('cycle_id', null)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (updateError) throw updateError;

    return { data: newCycle, error: null };
  } catch (error) {
    console.error('[cycleService] Error closing cycle:', error);
    return { data: null, error };
  }
};

// ================================================
// CALCULAR MÉTRICAS DEL CICLO
// ================================================

/**
 * Calcula todas las métricas para el ciclo actual
 */
const calculateCycleMetrics = async (userId, startDate, endDate) => {
  // Obtener todas las transacciones del ciclo
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .is('cycle_id', null) // Solo las que no están asignadas a un ciclo
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (!transactions) {
    return getEmptyMetrics();
  }

  // Ventas
  const sales = transactions.filter(t => t.type === 'sale');
  const totalSales = sales.reduce((sum, t) => sum + (t.amount || 0), 0);
  const salesCount = sales.length;

  // Compras
  const purchases = transactions.filter(t => t.type === 'purchase');
  const totalPurchases = purchases.reduce((sum, t) => sum + (t.amount || 0), 0);
  const purchasesCount = purchases.length;

  // Publicidad
  const ads = transactions.filter(t => t.type === 'ad');
  const totalAdvertising = ads.reduce((sum, t) => sum + (t.amount || 0), 0);
  const adsCount = ads.length;

  // Gastos
  const expenses = transactions.filter(t => t.type === 'expense');
  const totalExpenses = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);
  const expensesCount = expenses.length;

  // Préstamos
  const { data: loans } = await supabase
    .from('loans')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const loansGiven = loans?.filter(l => l.type === 'given').reduce((sum, l) => sum + l.amount, 0) || 0;
  const loansReceived = loans?.filter(l => l.type === 'received').reduce((sum, l) => sum + l.amount, 0) || 0;
  const loanRepayments = loans?.reduce((sum, l) => sum + (l.amount_paid || 0), 0) || 0;
  const activeLoansCount = loans?.filter(l => l.status === 'active').length || 0;

  // Ganancias
  const grossProfit = totalSales - totalPurchases;
  const netProfit = grossProfit - totalAdvertising - totalExpenses;
  const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

  // ROI
  const totalInvestment = totalPurchases + totalAdvertising;
  const roiPercentage = totalInvestment > 0 ? ((netProfit / totalInvestment) * 100) : 0;

  // Productos vendidos
  const productsSoldMap = {};
  sales.forEach(sale => {
    const productName = sale.product_name || 'Sin nombre';
    if (!productsSoldMap[productName]) {
      productsSoldMap[productName] = {
        name: productName,
        quantity: 0,
        revenue: 0,
        profit: 0
      };
    }
    productsSoldMap[productName].quantity += sale.quantity || 1;
    productsSoldMap[productName].revenue += sale.amount || 0;
    productsSoldMap[productName].profit += (sale.amount || 0) - (sale.cost || 0);
  });

  const productsSold = Object.values(productsSoldMap);
  const topProduct = productsSold.sort((a, b) => b.revenue - a.revenue)[0] || null;

  // Clientes
  const { data: customers } = await supabase
    .from('customers')
    .select('id, created_at')
    .eq('user_id', userId);

  const totalCustomers = customers?.length || 0;
  const newCustomers = customers?.filter(c =>
    new Date(c.created_at) >= new Date(startDate) &&
    new Date(c.created_at) <= new Date(endDate)
  ).length || 0;
  const recurringCustomers = totalCustomers - newCustomers;

  // Campañas
  const campaignsMap = {};
  ads.forEach(ad => {
    const campaignName = ad.campaign_name || 'Sin campaña';
    if (!campaignsMap[campaignName]) {
      campaignsMap[campaignName] = {
        name: campaignName,
        investment: 0,
        sales: 0,
        roi: 0
      };
    }
    campaignsMap[campaignName].investment += ad.amount || 0;
  });

  // Calcular ventas por campaña
  sales.forEach(sale => {
    if (sale.campaign_name && campaignsMap[sale.campaign_name]) {
      campaignsMap[sale.campaign_name].sales += sale.amount || 0;
    }
  });

  // Calcular ROI por campaña
  Object.values(campaignsMap).forEach(campaign => {
    if (campaign.investment > 0) {
      campaign.roi = ((campaign.sales - campaign.investment) / campaign.investment) * 100;
    }
  });

  const campaigns = Object.values(campaignsMap);
  const topCampaign = campaigns.sort((a, b) => b.roi - a.roi)[0] || null;

  // Inventario
  const { data: products } = await supabase
    .from('products')
    .select('name, current_stock_boxes, weighted_average_cost')
    .eq('user_id', userId);

  const inventorySnapshot = {};
  let totalInventoryBoxes = 0;
  let inventoryValue = 0;

  products?.forEach(p => {
    inventorySnapshot[p.name] = p.current_stock_boxes || 0;
    totalInventoryBoxes += p.current_stock_boxes || 0;
    inventoryValue += (p.current_stock_boxes || 0) * (p.weighted_average_cost || 0);
  });

  return {
    totalSales,
    salesCount,
    totalPurchases,
    purchasesCount,
    totalAdvertising,
    adsCount,
    totalExpenses,
    expensesCount,
    loansGiven,
    loansReceived,
    loanRepayments,
    activeLoansCount,
    grossProfit,
    netProfit,
    profitMargin,
    roiPercentage,
    productsSold,
    topProduct,
    totalCustomers,
    newCustomers,
    recurringCustomers,
    campaigns,
    topCampaign,
    inventorySnapshot,
    totalInventoryBoxes,
    inventoryValue
  };
};

const getEmptyMetrics = () => ({
  totalSales: 0,
  salesCount: 0,
  totalPurchases: 0,
  purchasesCount: 0,
  totalAdvertising: 0,
  adsCount: 0,
  totalExpenses: 0,
  expensesCount: 0,
  loansGiven: 0,
  loansReceived: 0,
  loanRepayments: 0,
  activeLoansCount: 0,
  grossProfit: 0,
  netProfit: 0,
  profitMargin: 0,
  roiPercentage: 0,
  productsSold: [],
  topProduct: null,
  totalCustomers: 0,
  newCustomers: 0,
  recurringCustomers: 0,
  campaigns: [],
  topCampaign: null,
  inventorySnapshot: {},
  totalInventoryBoxes: 0,
  inventoryValue: 0
});

// ================================================
// OBTENER CICLOS DEL USUARIO
// ================================================

/**
 * Obtener todos los ciclos cerrados del usuario
 */
export const getUserCycles = async (userId, limit = null) => {
  try {
    let query = supabase
      .from('business_cycles')
      .select('*')
      .eq('user_id', userId)
      .order('end_date', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[cycleService] Error getting cycles:', error);
    return { data: null, error };
  }
};

/**
 * Obtener un ciclo específico
 */
export const getCycleById = async (cycleId) => {
  try {
    const { data, error } = await supabase
      .from('business_cycles')
      .select('*')
      .eq('id', cycleId)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[cycleService] Error getting cycle:', error);
    return { data: null, error };
  }
};

/**
 * Obtener transacciones de un ciclo específico
 */
export const getCycleTransactions = async (cycleId) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('cycle_id', cycleId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('[cycleService] Error getting cycle transactions:', error);
    return { data: null, error };
  }
};

// ================================================
// ANALYTICS
// ================================================

/**
 * Obtener resumen comparativo de ciclos
 */
export const getCyclesComparison = async (userId, lastNCycles = 12) => {
  try {
    const { data: cycles, error } = await supabase
      .from('business_cycles')
      .select('*')
      .eq('user_id', userId)
      .order('end_date', { ascending: false })
      .limit(lastNCycles);

    if (error) throw error;

    if (!cycles || cycles.length === 0) {
      return { data: null, error: null };
    }

    // Calcular analytics
    const totalSales = cycles.reduce((sum, c) => sum + (c.total_sales || 0), 0);
    const totalProfit = cycles.reduce((sum, c) => sum + (c.net_profit || 0), 0);
    const avgMargin = cycles.reduce((sum, c) => sum + (c.profit_margin || 0), 0) / cycles.length;

    const bestCycle = cycles.reduce((best, cycle) =>
      (cycle.net_profit || 0) > (best.net_profit || 0) ? cycle : best
    );

    const worstCycle = cycles.reduce((worst, cycle) =>
      (cycle.net_profit || 0) < (worst.net_profit || 0) ? cycle : worst
    );

    // Tendencia (últimos 3 vs anteriores 3)
    let trend = 'stable';
    if (cycles.length >= 6) {
      const recent3 = cycles.slice(0, 3);
      const previous3 = cycles.slice(3, 6);
      const recentAvg = recent3.reduce((sum, c) => sum + (c.net_profit || 0), 0) / 3;
      const previousAvg = previous3.reduce((sum, c) => sum + (c.net_profit || 0), 0) / 3;

      if (recentAvg > previousAvg * 1.1) trend = 'growing';
      else if (recentAvg < previousAvg * 0.9) trend = 'declining';
    }

    return {
      data: {
        cycles,
        summary: {
          totalCycles: cycles.length,
          totalSales,
          totalProfit,
          avgMargin,
          bestCycle,
          worstCycle,
          trend
        }
      },
      error: null
    };
  } catch (error) {
    console.error('[cycleService] Error getting cycles comparison:', error);
    return { data: null, error };
  }
};

/**
 * Obtener fecha de inicio del ciclo actual (última fecha de cierre)
 */
export const getCurrentCycleStartDate = async (userId) => {
  try {
    const { data: lastCycle } = await supabase
      .from('business_cycles')
      .select('end_date')
      .eq('user_id', userId)
      .order('end_date', { ascending: false })
      .limit(1)
      .single();

    // Si hay un ciclo anterior, el nuevo empieza justo después
    // Si no, usar fecha hace 30 días como default
    const startDate = lastCycle
      ? new Date(lastCycle.end_date)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return { data: startDate.toISOString(), error: null };
  } catch (error) {
    // Si no hay ciclos previos, retornar fecha hace 30 días
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return { data: startDate.toISOString(), error: null };
  }
};
