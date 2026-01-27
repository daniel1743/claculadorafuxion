
import React, { useMemo, useState } from 'react';
import { DollarSign, ShoppingBag, TrendingUp, Target, Gift, Package, BarChart3, Megaphone, Banknote, Wallet, HandHeart, Star, FileText, ChevronDown, ChevronUp, LayoutGrid, User, Truck, PiggyBank, Receipt, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MetricCard from '@/components/MetricCard';
import KPIModal from '@/components/KPIModal';
import DashboardSummary from '@/components/DashboardSummary';
import { formatCLP } from '@/lib/utils';
import { calculateTotalProfit } from '@/lib/accountingUtils';

const KPIGrid = ({ transactions, inventory, inventoryMap, prices, products = [], loans = [], fuxionPayments = 0, onEstadoNegocioClick, onTransactionUpdate }) => {
  console.log('[KPIGrid] Renderizando con:', {
    transactions: transactions?.length || 0,
    inventory,
    inventoryMapKeys: Object.keys(inventoryMap || {}).length,
    pricesKeys: Object.keys(prices || {}).length,
    products: products?.length || 0,
    fuxionPayments
  });
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState({ type: '', title: '', color: '' });
  const [showAllCards, setShowAllCards] = useState(false);

  const handleCardClick = (type, title, color) => {
    setSelectedKPI({ type, title, color });
    setModalOpen(true);
  };

  const metrics = useMemo(() => {
    let totalAds = 0;
    let totalPurchases = 0;
    let totalSales = 0;
    let freeProducts = 0;
    let transactionCount = transactions.length;
    
    let weightedCostSum = 0;
    let totalUnitsAcquired = 0;

    const campaigns = {};
    const productMap = {}; // Renombrado para evitar shadowing de la prop 'products'

    transactions.forEach(t => {
      // Manejar tipos antiguos y nuevos
      const isPurchase = t.type === 'compra' || t.type === 'purchase';
      const isSale = t.type === 'venta' || t.type === 'sale';
      const isAd = t.type === 'publicidad' || t.type === 'advertising';
      
      // Campaign aggregation
      if (isAd) {
        totalAds += t.total || t.totalAmount || 0;
        const cName = t.campaignName || 'Orgánico';
        if (!campaigns[cName]) campaigns[cName] = { name: cName, cost: 0, revenue: 0 };
        campaigns[cName].cost += t.total || t.totalAmount || 0;
      } 
      else if (isPurchase) {
        const amount = t.total || t.totalAmount || 0;
        const notes = t.notes || '';
        const isGift = (amount === 0 && notes.includes('REGALO')) || t.isGift === true;

        // INVERSIÓN: solo dinero real pagado (excluir regalos)
        if (!isGift) {
          totalPurchases += amount;
        }
        
        // Para transacciones antiguas
        if (t.type === 'compra') {
          freeProducts += t.freeUnits || 0;
          const units = (t.quantity || 0) + (t.freeUnits || 0);
          weightedCostSum += amount;
          totalUnitsAcquired += units;
          
          // Product aggregation for preview
          const productName = t.productName || 'Sin Etiqueta';
          if (!productMap[productName]) productMap[productName] = { name: productName, stock: 0 };
          productMap[productName].stock += units;
        } else {
          // Para transacciones nuevas (V2)
          const units = t.quantityBoxes || t.quantity || 0;
          weightedCostSum += amount;
          totalUnitsAcquired += units;
          
          // Detectar productos gratis (notas contienen "Producto Gratis")
          if (t.notes && t.notes.includes('Producto Gratis')) {
            freeProducts += units;
          }
          
          const productName = t.productName || 'Sin Etiqueta';
          if (!productMap[productName]) productMap[productName] = { name: productName, stock: 0 };
          productMap[productName].stock += units;
        }
      }
      else if (isSale) {
        const amount = t.total || t.totalAmount || 0;
        totalSales += amount;

        if (t.campaignName && t.campaignName !== 'Orgánico') {
           if (!campaigns[t.campaignName]) campaigns[t.campaignName] = { name: t.campaignName, cost: 0, revenue: 0 };
           campaigns[t.campaignName].revenue += amount;
        }

        // Product stock reduction
        const productName = t.productName || 'Sin Etiqueta';
        const quantity = t.quantityBoxes || t.quantity || 0;
        if (productMap[productName]) {
            productMap[productName].stock -= quantity;
        } else {
            if (!productMap[productName]) productMap[productName] = { name: productName, stock: 0 };
            productMap[productName].stock -= quantity;
        }
      }
    });

    // =====================================================
    // MODELO CONTABLE CORRECTO (Implementación Final)
    // =====================================================
    // Principio: El dinero solo se gana/pierde cuando:
    // - Un producto SALE del inventario (venta genera margen)
    // - Hay un gasto operativo (publicidad, delivery, muestras mkt)
    // - Hay un retiro del propietario (consumo personal)
    // - Hay un ingreso extra (pagos FuXion)
    //
    // Las COMPRAS NO afectan ganancia (son conversión de activos)
    // =====================================================

    // 1. Calcular COGS y ganancia bruta de ventas
    let totalCOGS = 0;
    let grossProfit = 0; // Ganancia bruta = Ventas - COGS

    if (products && products.length > 0) {
      const profitData = calculateTotalProfit(transactions, products);
      grossProfit = profitData.totalProfit; // Ya es Ventas - COGS
      totalCOGS = profitData.totalCOGS;
    } else {
      // Fallback si no hay productos: solo ventas (sin COGS)
      grossProfit = totalSales;
    }

    // 2. Calcular gastos operativos (se calculan más adelante, inicializar aquí)
    // totalAds ya está calculado arriba
    // totalDeliveryExpenses se calcula más adelante
    // marketingSamplesValue se calcula más adelante

    // 3. Calcular retiros del propietario (consumo personal a PPP)
    // Se calcula más adelante con personalConsumptionCost

    // 4. La ganancia neta se calculará después de tener todos los valores
    // netProfit = grossProfit - gastosOperativos - retiros + ingresos extra

    // Capital recuperado = COGS (el costo de lo vendido, NO las ventas totales)
    const capitalRecuperado = totalCOGS;
    
    // Calculate Free Product Profit using STORED PRICES
    // First, let's count free products available per product type to be accurate, 
    // but we only have a global 'freeProducts' counter from history.
    // We can approximate or try to use current inventory distribution if we had granular free stock data.
    // Since we don't track "which specific unit is free" in the map, we'll use the average price 
    // OR if the user provided prices, we use the Weighted Average Price of current inventory?
    // Let's stick to: Total Free Units * Average Stored Price (or Avg Sales Price if no stored price)
    
    // Valor inventario a precio lista (no PPP, no descuentos)
    let totalInventoryValue = 0;
    Object.entries(inventoryMap || {}).forEach(([name, qty]) => {
      const stock = qty || 0;
      const listPrice = prices?.[name] || 0;
      if (stock > 0) {
        totalInventoryValue += stock * listPrice;
      }
    });

    const totalUnitsSold = transactions.filter(t => t.type === 'venta' || t.type === 'sale').reduce((acc, curr) => acc + (curr.quantityBoxes || curr.quantity || 0), 0);
    const avgSalePrice = totalUnitsSold > 0 ? totalSales / totalUnitsSold : 0;
    
    // Fallback for free product value: If we have stored prices, use an average of stored prices? 
    // Or better, just use the global avgSalePrice if stored prices are missing for some items.
    // Let's try to be smart: Value of Free Items is usually realized when sold.
    const freeProductProfit = freeProducts * avgSalePrice; // Keep as realized potential based on history?
    
    // "Valor Prod. Gratis" = valor de mercado de los regalos/bonificaciones
    // Detectar regalos:
    // 1. Sistema antiguo: freeUnits > 0
    // 2. Sistema V2 antiguo: notas con "Producto Gratis"
    // 3. Sistema V2 nuevo: totalAmount = 0 y notas con "REGALO"
    let freeValueCalc = 0;
    let totalGiftUnits = 0;

    transactions.filter(t => {
      const isPurchase = t.type === 'compra' || t.type === 'purchase';
      if (!isPurchase) return false;

      // Sistema antiguo
      if (t.type === 'compra' && t.freeUnits > 0) return true;

      // Sistema V2 - detectar regalos por totalAmount = 0 o notas con REGALO
      const amount = t.total || t.totalAmount || 0;
      const notes = t.notes || '';

      if (amount === 0 && notes.includes('REGALO')) return true;
      if (notes.includes('Producto Gratis')) return true;

      return false;
    }).forEach(t => {
      const notes = t.notes || '';

      if (t.type === 'compra' && t.freeUnits > 0) {
        // Transacciones antiguas con freeUnits
        const unitPrice = prices[t.productName] || avgSalePrice;
        freeValueCalc += (t.freeUnits || 0) * unitPrice;
        totalGiftUnits += t.freeUnits || 0;
      } else {
        // Transacciones V2 - extraer valor de mercado de las notas
        // Formato nuevo: "REGALO - Valor de mercado: $X,XXX"
        // Formato antiguo: "Valor Mercado: $X,XXX"
        const valorMatch = notes.match(/[Vv]alor\s*(?:de\s*)?[Mm]ercado:\s*\$?([\d.,]+)/);
        if (valorMatch) {
          const valor = parseFloat(valorMatch[1].replace(/\./g, '').replace(',', '.'));
          freeValueCalc += valor;
        } else {
          // Fallback: usar precio del producto desde prices
          const unitPrice = prices[t.productName] || avgSalePrice;
          const quantity = t.quantityBoxes || t.quantity || 1;
          freeValueCalc += unitPrice * quantity;
        }
        totalGiftUnits += t.quantityBoxes || t.quantity || 0;
      }
    });

    // Actualizar contador de productos gratis
    freeProducts = totalGiftUnits;

    let bestCampaign = 'N/A';
    let bestROI = -Infinity;
    
    // Tooltip Data Preparation
    const campaignList = Object.values(campaigns)
        .filter(c => c.name !== 'Orgánico')
        .map(c => ({
            label: c.name,
            value: c.cost > 0 ? `${(((c.revenue - c.cost)/c.cost)*100).toFixed(0)}% ROI` : formatCLP(c.cost)
        }))
        .slice(0, 3);

    // Preview de inventario: usar siempre inventoryMap para reflejar el total mostrado
    const productList = Object.entries(inventoryMap || {})
      .filter(([, qty]) => (qty || 0) > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, qty]) => ({ label, value: `${qty} un.` }));

    Object.entries(campaigns).forEach(([name, data]) => {
      if (data.cost > 0) {
        const roi = ((data.revenue - data.cost) / data.cost) * 100;
        if (roi > bestROI) {
          bestROI = roi;
          bestCampaign = `${name} (${roi.toFixed(0)}%)`;
        }
      }
    });

    // NUEVO: Calcular puntos acumulados de compras
    let totalPoints = 0;
    const pointsByProduct = [];

    // Crear mapa de puntos por producto
    const productPointsMap = {};
    if (products && products.length > 0) {
      products.forEach(p => {
        if (p.points > 0) {
          productPointsMap[p.name] = p.points;
        }
      });
    }

    // Sumar puntos de cada compra
    transactions.forEach(t => {
      const isPurchase = t.type === 'compra' || t.type === 'purchase';
      if (isPurchase) {
        const productName = t.productName;
        const quantity = t.quantityBoxes || t.quantity || 0;
        const pointsPerUnit = productPointsMap[productName] || 0;
        const pointsEarned = quantity * pointsPerUnit;

        if (pointsEarned > 0) {
          totalPoints += pointsEarned;

          // Agregar al preview por producto
          const existingEntry = pointsByProduct.find(p => p.label === productName);
          if (existingEntry) {
            existingEntry.points += pointsEarned;
            existingEntry.value = `${existingEntry.points} pts`;
          } else {
            pointsByProduct.push({
              label: productName,
              points: pointsEarned,
              value: `${pointsEarned} pts`
            });
          }
        }
      }
    });

    // Ordenar por puntos y tomar top 3
    pointsByProduct.sort((a, b) => b.points - a.points);

    // NUEVO: Calcular consumo personal y muestras
    let totalPersonalConsumptionBoxes = 0;
    let totalPersonalConsumptionSachets = 0;
    let totalMarketingSamples = 0;
    const consumptionByProduct = [];

    transactions.forEach(t => {
      if (t.type === 'personal_consumption') {
        totalPersonalConsumptionBoxes += t.quantityBoxes || 0;
        totalPersonalConsumptionSachets += t.quantitySachets || 0;

        // Agrupar por producto
        const existingProduct = consumptionByProduct.find(p => p.label === t.productName);
        if (existingProduct) {
          existingProduct.boxes += t.quantityBoxes || 0;
          existingProduct.sachets += t.quantitySachets || 0;
        } else {
          consumptionByProduct.push({
            label: t.productName,
            boxes: t.quantityBoxes || 0,
            sachets: t.quantitySachets || 0
          });
        }
      } else if (t.type === 'marketing_sample') {
        totalMarketingSamples += t.quantitySachets || 0;
      }
    });

    // Formatear para preview
    consumptionByProduct.forEach(p => {
      const parts = [];
      if (p.boxes > 0) parts.push(`${p.boxes} cajas`);
      if (p.sachets > 0) parts.push(`${p.sachets} sobres`);
      p.value = parts.join(' + ') || '0';
    });

    // Calcular valor de consumo personal a PRECIO LISTA (para mostrar al usuario)
    let personalConsumptionValue = 0;
    // Calcular COSTO de consumo personal a PPP (para afectar ganancia - es un RETIRO)
    let personalConsumptionCost = 0;

    consumptionByProduct.forEach(p => {
      const product = products?.find(prod => prod.name === p.label);
      const listPrice = prices?.[p.label] || 0;
      const ppp = product?.weightedAverageCost || product?.weighted_average_cost || 0;
      const sachetsPerBox = product?.sachetsPerBox || product?.sachets_per_box || 28;

      // Valor a precio lista (informativo)
      personalConsumptionValue += (p.boxes * listPrice) + (p.sachets * (listPrice / sachetsPerBox));
      // Costo a PPP (afecta ganancia como retiro del propietario)
      personalConsumptionCost += (p.boxes * ppp) + (p.sachets * (ppp / sachetsPerBox));
    });

    // Calcular COSTO de muestras de marketing a PPP (es un GASTO operativo)
    let marketingSamplesCost = 0;
    transactions.forEach(t => {
      if (t.type === 'marketing_sample') {
        const product = products?.find(prod => prod.name === t.productName);
        const ppp = product?.weightedAverageCost || product?.weighted_average_cost || 0;
        const sachetsPerBox = product?.sachetsPerBox || product?.sachets_per_box || 28;
        const boxes = t.quantityBoxes || 0;
        const sachets = t.quantitySachets || 0;
        marketingSamplesCost += (boxes * ppp) + (sachets * (ppp / sachetsPerBox));
      }
    });

    // NUEVO: Calcular préstamos totales
    let totalLoanedBoxes = 0;
    let totalLoanedValue = 0;
    const loansByProduct = [];

    // Sumar préstamos de la prop loans
    if (loans && loans.length > 0) {
      const loanMap = {};

      loans.forEach(loan => {
        const key = loan.productName;
        if (!loanMap[key]) {
          loanMap[key] = {
            productName: loan.productName,
            boxes: 0,
            sachets: 0,
            listPrice: loan.listPrice || 0
          };
        }
        loanMap[key].boxes += loan.quantityBoxes || 0;
        loanMap[key].sachets += loan.quantitySachets || 0;
      });

      Object.values(loanMap).forEach(loan => {
        totalLoanedBoxes += loan.boxes;
        totalLoanedValue += loan.boxes * loan.listPrice;
        if (loan.boxes > 0 || loan.sachets > 0) {
          loansByProduct.push({
            label: loan.productName,
            value: `${loan.boxes} cajas${loan.sachets > 0 ? ` + ${loan.sachets} sobres` : ''}`
          });
        }
      });
    }

    // NUEVO: Calcular gastos de delivery
    let totalDeliveryExpenses = 0;
    const deliveryByMonth = [];
    const deliveryTransactions = [];

    transactions.forEach(t => {
      const isDelivery = t.type === 'delivery' ||
        (t.type === 'outflow' && (t.notes || '').toLowerCase().includes('delivery')) ||
        (t.type === 'outflow' && (t.notes || '').toLowerCase().includes('envío')) ||
        (t.type === 'outflow' && (t.notes || '').toLowerCase().includes('envio')) ||
        (t.type === 'outflow' && (t.notes || '').toLowerCase().includes('despacho'));

      if (isDelivery) {
        const amount = t.total || t.totalAmount || 0;
        totalDeliveryExpenses += amount;
        deliveryTransactions.push(t);
      }
    });

    // Agrupar por mes para preview
    const deliveryByMonthMap = {};
    deliveryTransactions.forEach(t => {
      const date = new Date(t.date || t.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' });

      if (!deliveryByMonthMap[monthKey]) {
        deliveryByMonthMap[monthKey] = { label: monthLabel, total: 0 };
      }
      deliveryByMonthMap[monthKey].total += t.total || t.totalAmount || 0;
    });

    Object.values(deliveryByMonthMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 3)
      .forEach(m => {
        deliveryByMonth.push({ label: m.label, value: formatCLP(m.total) });
      });

    // Debug opcional para diagnstico de KPI
    // =====================================================
    // CÁLCULO FINAL DE GANANCIA NETA (Modelo Contable Correcto)
    // =====================================================
    const gastosOperativos = totalAds + totalDeliveryExpenses + marketingSamplesCost;
    const retirosDelPropietario = personalConsumptionCost;
    const ingresosExtra = fuxionPayments;

    const netProfit = grossProfit - gastosOperativos - retirosDelPropietario + ingresosExtra;

    // Valor del inventario a PPP (costo real)
    let inventoryValueAtCost = 0;
    if (products && products.length > 0) {
      products.forEach(p => {
        const stock = p.currentStockBoxes || p.current_stock_boxes || 0;
        const ppp = p.weightedAverageCost || p.weighted_average_cost || 0;
        inventoryValueAtCost += stock * ppp;
      });
    }

    // Posición Neta del Negocio
    const posicionNeta = capitalRecuperado + inventoryValueAtCost - totalPurchases - gastosOperativos - retirosDelPropietario + ingresosExtra;

    // Margen bruto porcentual
    const margenBruto = totalSales > 0 ? ((grossProfit / totalSales) * 100) : 0;

    // Preview actualizado
    const profitPreview = [
      { label: 'Ventas', value: formatCLP(totalSales) },
      { label: 'COGS', value: formatCLP(totalCOGS) },
      { label: 'Gan. Bruta', value: formatCLP(grossProfit) },
      { label: 'Gastos Op.', value: formatCLP(gastosOperativos) },
      { label: 'Retiros', value: formatCLP(retirosDelPropietario) }
    ];

    // Debug
    console.log('[KPIGrid] === MODELO CONTABLE ===');
    console.log('[KPIGrid] Ganancia Bruta:', grossProfit, '| Gastos:', gastosOperativos, '| Retiros:', retirosDelPropietario);
    console.log('[KPIGrid] GANANCIA NETA:', netProfit, '| Posicion Neta:', posicionNeta);

    return {
      // Resultados operativos
      totalSales,
      totalCOGS,
      grossProfit,
      netProfit,
      margenBruto,
      gastosOperativos,
      retirosDelPropietario,

      // Capital
      totalPurchases,
      capitalRecuperado,
      totalInventoryValue,
      inventoryValueAtCost,
      posicionNeta,

      // Operaciones
      totalAds,
      totalDeliveryExpenses,
      marketingSamplesCost,
      transactionCount,
      freeProducts,
      freeProductProfit: freeValueCalc,
      fuxionPayments,
      bestCampaign,
      campaignList,
      productList,
      profitPreview,
      totalLoanedBoxes,
      totalLoanedValue,
      loansByProduct,
      totalPoints,
      pointsByProduct,
      totalPersonalConsumptionBoxes,
      totalPersonalConsumptionSachets,
      totalMarketingSamples,
      personalConsumptionValue,
      personalConsumptionCost,
      consumptionByProduct,
      deliveryByMonth,
      deliveryCount: deliveryTransactions.length
    };
  }, [transactions, inventoryMap, prices, products, loans, fuxionPayments]);

  // Calcular datos para el resumen
  const porcentajeRecuperado = metrics.totalPurchases > 0
    ? (metrics.capitalRecuperado / metrics.totalPurchases) * 100
    : 0;
  const faltaPorRecuperar = Math.max(0, metrics.totalPurchases - metrics.capitalRecuperado - metrics.inventoryValueAtCost + metrics.gastosOperativos + metrics.retirosDelPropietario);
  const margenPotencial = metrics.totalInventoryValue - metrics.inventoryValueAtCost;

  return (
    <>
      {/* === RESUMEN EJECUTIVO "WOW" === */}
      <DashboardSummary
        inversionTotal={metrics.totalPurchases}
        inventarioLista={metrics.totalInventoryValue}
        inventarioCosto={metrics.inventoryValueAtCost}
        capitalRecuperado={metrics.capitalRecuperado}
        faltaPorRecuperar={Math.abs(metrics.posicionNeta)}
        porcentajeRecuperado={porcentajeRecuperado}
        margenPotencial={margenPotencial}
      />

      {/* === SECCIÓN 1: ¿CÓMO VOY? (Resultados) === */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">¿Cómo me fue?</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Vendí */}
          <MetricCard
            title="Vendí"
            value={formatCLP(metrics.totalSales)}
            icon={DollarSign}
            trend={metrics.grossProfit >= 0
              ? `Ganancia: ${formatCLP(metrics.grossProfit)}`
              : `Pérdida: ${formatCLP(metrics.grossProfit)}`}
            color="green"
            delay={0}
            onClick={() => handleCardClick('sales', 'Historial de Ventas', 'green')}
            hoverData={[
              { label: 'Ganancia Bruta', value: formatCLP(metrics.grossProfit) },
              { label: 'Costo (COGS)', value: formatCLP(metrics.totalCOGS) },
              { label: 'Margen', value: `${metrics.margenBruto?.toFixed(1) || 0}%` }
            ]}
          />

          {/* Gasté */}
          <MetricCard
            title="Gasté"
            value={formatCLP(metrics.gastosOperativos)}
            icon={Receipt}
            trend={metrics.totalAds > 0 ? `Publicidad: ${formatCLP(metrics.totalAds)}` : "Sin gastos operativos"}
            color="red"
            delay={0.05}
            onClick={() => handleCardClick('ads', 'Desglose de Gastos', 'red')}
            hoverData={[
              { label: 'Publicidad', value: formatCLP(metrics.totalAds) },
              { label: 'Delivery', value: formatCLP(metrics.totalDeliveryExpenses) },
              { label: 'Muestras Mkt', value: formatCLP(metrics.marketingSamplesCost || 0) }
            ]}
          />

          {/* Consumí */}
          <MetricCard
            title="Consumí"
            value={metrics.totalPersonalConsumptionBoxes > 0
              ? `${metrics.totalPersonalConsumptionBoxes} cajas`
              : "0 cajas"}
            icon={User}
            trend={metrics.personalConsumptionCost > 0
              ? `Costo: ${formatCLP(metrics.personalConsumptionCost)}`
              : "Sin consumo propio"}
            color="violet"
            delay={0.1}
            onClick={() => handleCardClick('personal_consumption', 'Mi Consumo Personal', 'violet')}
            hoverData={[
              { label: 'Costo (PPP)', value: formatCLP(metrics.personalConsumptionCost) },
              { label: 'Valor Lista', value: formatCLP(metrics.personalConsumptionValue) },
              ...(metrics.totalPersonalConsumptionSachets > 0 ? [{ label: 'Sobres', value: `${metrics.totalPersonalConsumptionSachets}` }] : [])
            ]}
          />

          {/* Resultado */}
          <MetricCard
            title="Resultado"
            value={metrics.netProfit >= 0
              ? `+${formatCLP(metrics.netProfit)}`
              : formatCLP(metrics.netProfit)}
            icon={metrics.netProfit >= 0 ? TrendingUp : TrendingDown}
            trend={metrics.netProfit >= 0
              ? "Ganancia operativa"
              : "Normal al inicio"}
            color={metrics.netProfit >= 0 ? "gold" : "orange"}
            delay={0.15}
            onClick={() => handleCardClick('profit', 'Desglose de Resultado', 'gold')}
            hoverData={[
              ...metrics.profitPreview,
              ...(metrics.fuxionPayments > 0 ? [{ label: 'Pagos FuXion', value: `+${formatCLP(metrics.fuxionPayments)}` }] : [])
            ]}
          />
        </div>
      </div>

      {/* === SECCIÓN 2: ¿DÓNDE ESTÁ MI DINERO? (Capital) === */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <PiggyBank className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">¿Dónde está mi dinero?</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Invertí */}
          <MetricCard
            title="Invertí"
            value={formatCLP(metrics.totalPurchases)}
            icon={ShoppingBag}
            trend="Total en compras"
            color="blue"
            delay={0}
            onClick={() => handleCardClick('purchases', 'Historial de Compras', 'blue')}
            hoverData={[
              { label: 'Total Compras', value: formatCLP(metrics.totalPurchases) },
              { label: '% Recuperado', value: `${porcentajeRecuperado.toFixed(1)}%` }
            ]}
          />

          {/* Recuperé */}
          <MetricCard
            title="Recuperé"
            value={formatCLP(metrics.capitalRecuperado)}
            icon={DollarSign}
            trend={`${porcentajeRecuperado.toFixed(1)}% de la inversión`}
            color="emerald"
            delay={0.05}
            hoverData={[
              { label: 'Costo de lo vendido', value: formatCLP(metrics.totalCOGS) },
              { label: 'Es el COGS acumulado', value: 'Sí' }
            ]}
          />

          {/* Tengo (Inventario) */}
          <MetricCard
            title="Tengo en Stock"
            value={`${inventory} cajas`}
            icon={Package}
            trend={`Valor venta: ${formatCLP(metrics.totalInventoryValue)}`}
            color="cyan"
            delay={0.1}
            onClick={() => handleCardClick('inventory', 'Inventario Detallado', 'cyan')}
            hoverData={[
              { label: 'Precio Venta', value: formatCLP(metrics.totalInventoryValue) },
              { label: 'Costo (PPP)', value: formatCLP(metrics.inventoryValueAtCost) },
              { label: 'Margen Potencial', value: formatCLP(margenPotencial) }
            ]}
          />

          {/* Regalos Recibidos */}
          <MetricCard
            title="Regalos FuXion"
            value={formatCLP(metrics.freeProductProfit)}
            icon={Gift}
            trend="Bonificaciones recibidas"
            color="purple"
            delay={0.15}
            onClick={() => handleCardClick('inventory', 'Bonificaciones', 'purple')}
            hoverData={[
              { label: 'Valor en productos', value: formatCLP(metrics.freeProductProfit) },
              { label: 'No te costaron', value: '$0' }
            ]}
          />
        </div>
      </div>

      {/* === BOTÓN VER MÁS === */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        onClick={() => setShowAllCards(!showAllCards)}
        className={`
          w-full relative overflow-hidden rounded-xl p-4 mb-6
          border transition-all duration-300 cursor-pointer
          ${showAllCards
            ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30'
            : 'bg-gray-900/40 border-white/5 hover:border-white/20'
          }
        `}
      >
        <div className="flex items-center justify-center gap-3">
          <LayoutGrid className={`w-5 h-5 ${showAllCards ? 'text-yellow-400' : 'text-gray-500'}`} />
          <span className={`font-medium ${showAllCards ? 'text-yellow-400' : 'text-gray-400'}`}>
            {showAllCards ? 'Ocultar métricas adicionales' : '¿Hay algo que vigilar? Ver más métricas'}
          </span>
          <motion.div
            animate={{ rotate: showAllCards ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className={`w-5 h-5 ${showAllCards ? 'text-yellow-400' : 'text-gray-500'}`} />
          </motion.div>
        </div>
      </motion.button>

      {/* === SECCIÓN 3: MÉTRICAS ADICIONALES (expandible) === */}
      <AnimatePresence>
        {showAllCards && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-orange-400" />
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Control y Vigilancia</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pb-4">
              {/* Publicidad */}
              <MetricCard
                title="Publicidad"
                value={metrics.totalAds > 0 ? formatCLP(metrics.totalAds) : "$0"}
                icon={Megaphone}
                trend={metrics.totalAds > 0
                  ? (metrics.campaignList.length > 0 ? `${metrics.campaignList.length} campañas` : "Inversión en ads")
                  : "Sin gastos aún"}
                color={metrics.totalAds > 0 ? "red" : "gray"}
                delay={0}
                hoverData={metrics.campaignList.length > 0 ? metrics.campaignList : [{ label: 'Sin campañas', value: '-' }]}
                onClick={() => handleCardClick('ads', 'Análisis de Campañas', 'red')}
              />

              {/* Delivery */}
              <MetricCard
                title="Delivery"
                value={metrics.totalDeliveryExpenses > 0 ? formatCLP(metrics.totalDeliveryExpenses) : "$0"}
                icon={Truck}
                trend={metrics.totalDeliveryExpenses > 0 ? `${metrics.deliveryCount} envíos` : "Sin envíos aún"}
                color={metrics.totalDeliveryExpenses > 0 ? "cyan" : "gray"}
                delay={0.05}
                hoverData={metrics.deliveryByMonth.length > 0 ? metrics.deliveryByMonth : [{ label: 'Sin registros', value: '-' }]}
                onClick={() => handleCardClick('delivery', 'Gastos de Delivery', 'cyan')}
              />

              {/* Préstamos */}
              <MetricCard
                title="Préstamos"
                value={metrics.totalLoanedBoxes > 0 ? `${metrics.totalLoanedBoxes} cajas` : "0 cajas"}
                icon={HandHeart}
                trend={metrics.totalLoanedBoxes > 0 ? "Pendientes de devolver" : "Sin préstamos activos"}
                color={metrics.totalLoanedBoxes > 0 ? "orange" : "gray"}
                delay={0.1}
                hoverData={metrics.loansByProduct.length > 0
                  ? [{ label: 'Valor', value: formatCLP(metrics.totalLoanedValue) }, ...metrics.loansByProduct.slice(0, 3)]
                  : [{ label: 'Sin préstamos', value: '-' }]}
                onClick={() => handleCardClick('loans', 'Préstamos Detallados', 'orange')}
              />

              {/* Pagos FuXion */}
              <MetricCard
                title="Pagos FuXion"
                value={metrics.fuxionPayments > 0 ? formatCLP(metrics.fuxionPayments) : "$0"}
                icon={Banknote}
                trend={metrics.fuxionPayments > 0 ? "Cheques y Bonos" : "Sin pagos aún"}
                color={metrics.fuxionPayments > 0 ? "emerald" : "gray"}
                delay={0.15}
                hoverData={metrics.fuxionPayments > 0
                  ? [{ label: 'Suma al Resultado', value: 'Sí' }]
                  : [{ label: 'Pendiente', value: '-' }]}
                onClick={() => handleCardClick('fuxion_payments', 'Pagos FuXion', 'emerald')}
              />

              {/* Estado del Negocio */}
              <MetricCard
                title="Reporte Completo"
                value="Ver Resumen"
                icon={FileText}
                trend="Estado del Negocio"
                color="yellow"
                isText
                delay={0.2}
                hoverData={[
                  { label: 'Resultado', value: formatCLP(metrics.netProfit) },
                  { label: 'Posición Neta', value: formatCLP(metrics.posicionNeta) }
                ]}
                onClick={onEstadoNegocioClick}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <KPIModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        type={selectedKPI.type}
        title={selectedKPI.title}
        color={selectedKPI.color}
        transactions={transactions}
        products={products}
        loans={loans}
        inventoryMap={inventoryMap}
        onTransactionUpdate={onTransactionUpdate}
      />
    </>
  );
};

export default KPIGrid;
