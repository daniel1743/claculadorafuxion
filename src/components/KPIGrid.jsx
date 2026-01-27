
import React, { useMemo, useState } from 'react';
import { DollarSign, ShoppingBag, TrendingUp, Target, Gift, Package, BarChart3, Megaphone, Banknote, Wallet, HandHeart, Star, FileText, ChevronDown, ChevronUp, LayoutGrid, User, Truck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MetricCard from '@/components/MetricCard';
import KPIModal from '@/components/KPIModal';
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

    // Calcular ganancia real usando COGS (solo si tenemos productos con PPP)
    let netProfit, totalCOGS = 0;
    if (products && products.length > 0) {
      // Usar cálculo real con COGS
      const profitData = calculateTotalProfit(transactions, products);
      netProfit = profitData.totalProfit;
      totalCOGS = profitData.totalCOGS;
    } else {
      // Fallback al cálculo antiguo si no hay productos
      netProfit = totalSales - (totalPurchases + totalAds);
    }
    
    // Ajustes ganancia neta para coherencia con gastos y escenarios sin ventas
    if (products && products.length > 0) {
      netProfit -= totalAds;
    }
    if (totalSales === 0 && (totalPurchases > 0 || totalAds > 0)) {
      netProfit = -1 * (totalPurchases + totalAds);
    }

    // SUMAR PAGOS FUXION a la ganancia neta
    netProfit += fuxionPayments;
    
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

    const profitPreview = [
        { label: 'Ingresos', value: formatCLP(totalSales) },
        { label: 'Gastos', value: formatCLP(totalPurchases + totalAds) },
        { label: 'Margen', value: totalSales > 0 ? `${((netProfit/totalSales)*100).toFixed(1)}%` : '0%' }
    ];

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

    // Calcular valor de consumo personal (a precio lista)
    let personalConsumptionValue = 0;
    consumptionByProduct.forEach(p => {
      const listPrice = prices?.[p.label] || 0;
      const sachetsPerBox = products?.find(prod => prod.name === p.label)?.sachetsPerBox || 28;
      // Valor = (cajas * precio) + (sobres * precio/sachetsPerBox)
      personalConsumptionValue += (p.boxes * listPrice) + (p.sachets * (listPrice / sachetsPerBox));
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
    console.log('[KPIGrid] inversionCompras:', totalPurchases);
    console.log('[KPIGrid] valorInventario:', totalInventoryValue);
    console.log('[KPIGrid] inventoryMap:', inventoryMap);
    console.log('[KPIGrid] prices keys:', Object.keys(prices || {}));

    return {
      totalAds,
      totalPurchases,
      totalSales,
      netProfit,
      totalCOGS,
      transactionCount,
      freeProducts,
      freeProductProfit: freeValueCalc,
      totalInventoryValue,
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
      consumptionByProduct,
      totalDeliveryExpenses,
      deliveryByMonth,
      deliveryCount: deliveryTransactions.length
    };
  }, [transactions, inventoryMap, prices, products, loans, fuxionPayments]);

  return (
    <>
      {/* === TARJETAS PRINCIPALES (siempre visibles) === */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. Ganancia Neta - LA MÁS IMPORTANTE */}
        <MetricCard
          title="Ganancia Neta"
          value={formatCLP(metrics.netProfit)}
          icon={TrendingUp}
          trend={metrics.netProfit >= 0 ? "Rentabilidad Positiva" : "Rentabilidad Negativa"}
          color={metrics.netProfit >= 0 ? "gold" : "red"}
          delay={0}
          hoverData={[
            ...metrics.profitPreview,
            ...(metrics.totalCOGS > 0 ? [{ label: 'COGS', value: formatCLP(metrics.totalCOGS) }] : []),
            ...(metrics.fuxionPayments > 0 ? [{ label: 'Pagos FuXion', value: `+${formatCLP(metrics.fuxionPayments)}` }] : [])
          ]}
          onClick={() => handleCardClick('profit', 'Desglose de Ganancias', 'gold')}
        />

        {/* 2. Inversión Compras */}
        <MetricCard
          title="Inversión Compras"
          value={formatCLP(metrics.totalPurchases)}
          icon={ShoppingBag}
          trend="Costo Mercancía"
          color="red"
          delay={0.05}
          onClick={() => handleCardClick('purchases', 'Historial de Compras', 'red')}
          hoverData={[{label: 'Transacciones', value: transactions.filter(t => t.type === 'compra' || t.type === 'purchase').length}]}
        />

        {/* 3. Ventas Totales */}
        <MetricCard
          title="Ventas Totales"
          value={formatCLP(metrics.totalSales)}
          icon={DollarSign}
          trend="Ingresos Brutos"
          color="green"
          delay={0.1}
          onClick={() => handleCardClick('sales', 'Historial de Ventas', 'green')}
          hoverData={[{label: 'Transacciones', value: transactions.filter(t => t.type === 'venta' || t.type === 'sale').length}]}
        />

        {/* 4. Botón Ver Más Métricas */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          onClick={() => setShowAllCards(!showAllCards)}
          className={`
            relative overflow-hidden rounded-2xl p-5
            border transition-all duration-300 cursor-pointer
            ${showAllCards
              ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border-yellow-500/40 shadow-lg shadow-yellow-500/10'
              : 'bg-gray-900/60 border-white/10 hover:border-yellow-500/30 hover:bg-gray-900/80'
            }
          `}
        >
          <div className="flex flex-col items-center justify-center h-full min-h-[100px] gap-3">
            <div className={`
              p-3 rounded-xl transition-colors duration-300
              ${showAllCards ? 'bg-yellow-500/20' : 'bg-white/5'}
            `}>
              <LayoutGrid className={`w-6 h-6 ${showAllCards ? 'text-yellow-400' : 'text-gray-400'}`} />
            </div>
            <div className="text-center">
              <p className={`font-bold ${showAllCards ? 'text-yellow-400' : 'text-gray-300'}`}>
                {showAllCards ? 'Ocultar Métricas' : 'Ver Todas las Métricas'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {showAllCards ? 'Mostrar solo principales' : '+10 indicadores disponibles'}
              </p>
            </div>
            <motion.div
              animate={{ rotate: showAllCards ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              <ChevronDown className={`w-5 h-5 ${showAllCards ? 'text-yellow-400' : 'text-gray-500'}`} />
            </motion.div>
          </div>
        </motion.button>
      </div>

      {/* === TARJETAS EXPANDIBLES (solo cuando showAllCards es true) === */}
      <AnimatePresence>
        {showAllCards && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mt-5 pt-5 border-t border-white/5">
              <MetricCard
                title="Gasto Publicidad"
                value={formatCLP(metrics.totalAds)}
                icon={Megaphone}
                trend="Inversión Total"
                color="red"
                delay={0}
                hoverData={metrics.campaignList}
                onClick={() => handleCardClick('ads', 'Análisis de Campañas', 'red')}
              />
              <MetricCard
                title="Inventario Disponible"
                value={inventory}
                icon={Package}
                trend="Stock Actual"
                color="blue"
                delay={0.05}
                hoverData={metrics.productList}
                onClick={() => handleCardClick('inventory', 'Inventario Detallado', 'blue')}
              />
              <MetricCard
                title="Valor Inventario"
                value={formatCLP(metrics.totalInventoryValue)}
                icon={Wallet}
                trend="Precio de Venta"
                color="green"
                delay={0.1}
                onClick={() => handleCardClick('inventory', 'Valorización', 'green')}
              />
              <MetricCard
                title="Pagos FuXion"
                value={formatCLP(metrics.fuxionPayments)}
                icon={Banknote}
                trend="Cheques y Bonos"
                color="emerald"
                delay={0.15}
                hoverData={metrics.fuxionPayments > 0 ? [{ label: 'Suma a Ganancia Neta', value: 'Sí' }] : []}
                onClick={() => handleCardClick('fuxion_payments', 'Pagos FuXion', 'emerald')}
              />
              {/* REEMPLAZADO: Tarjeta Mejor Campaña por Gastos de Delivery */}
              <MetricCard
                title="Gastos de Delivery"
                value={formatCLP(metrics.totalDeliveryExpenses)}
                icon={Truck}
                trend={metrics.deliveryCount > 0 ? `${metrics.deliveryCount} envíos` : "Sin envíos"}
                color="cyan"
                delay={0.2}
                hoverData={metrics.deliveryByMonth.length > 0 ? metrics.deliveryByMonth : [{ label: 'Sin datos', value: '-' }]}
                onClick={() => handleCardClick('delivery', 'Gastos de Delivery', 'cyan')}
              />
              {/* COMENTADO: Tarjeta Puntos Acumulados
              <MetricCard
                title="Puntos Acumulados"
                value={metrics.totalPoints.toLocaleString()}
                icon={Star}
                trend="Puntos FuXion"
                color="purple"
                delay={0.25}
                hoverData={metrics.pointsByProduct.slice(0, 3)}
                onClick={() => handleCardClick('inventory', 'Puntos por Producto', 'purple')}
              />
              */}
              <MetricCard
                title="Valor Prod. Gratis"
                value={formatCLP(metrics.freeProductProfit)}
                icon={Gift}
                trend="Ganancia Estimada"
                color="purple"
                delay={0.3}
                onClick={() => handleCardClick('inventory', 'Valorización Stock', 'purple')}
              />
              <MetricCard
                title="Préstamos Activos"
                value={metrics.totalLoanedBoxes}
                icon={HandHeart}
                trend="Unidades Prestadas"
                color="orange"
                delay={0.35}
                hoverData={[
                  ...(metrics.totalLoanedValue > 0 ? [{ label: 'Valor Estimado', value: formatCLP(metrics.totalLoanedValue) }] : []),
                  ...metrics.loansByProduct.slice(0, 3)
                ]}
                onClick={() => handleCardClick('loans', 'Préstamos Detallados', 'orange')}
              />
              <MetricCard
                title="Consumo Personal"
                value={`${metrics.totalPersonalConsumptionBoxes} cajas`}
                icon={User}
                trend={metrics.personalConsumptionValue > 0
                  ? `Valor: ${formatCLP(metrics.personalConsumptionValue)}`
                  : (metrics.totalPersonalConsumptionSachets > 0 ? `+ ${metrics.totalPersonalConsumptionSachets} sobres` : "Tu consumo propio")}
                color="violet"
                delay={0.4}
                hoverData={[
                  ...(metrics.totalPersonalConsumptionSachets > 0 ? [{ label: 'Sobres consumidos', value: `${metrics.totalPersonalConsumptionSachets} sobres` }] : []),
                  ...(metrics.totalMarketingSamples > 0 ? [{ label: 'Muestras/Regalos', value: `${metrics.totalMarketingSamples} sobres` }] : []),
                  ...metrics.consumptionByProduct.slice(0, 3)
                ]}
                onClick={() => handleCardClick('personal_consumption', 'Consumo Personal', 'violet')}
              />
              <MetricCard
                title="Estado del Negocio"
                value="Ver Resumen"
                icon={FileText}
                trend="Reporte Ejecutivo"
                color="yellow"
                isText
                delay={0.4}
                hoverData={[
                  { label: 'Ganancia Neta', value: formatCLP(metrics.netProfit) },
                  { label: 'Valor Inventario', value: formatCLP(metrics.totalInventoryValue) }
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
