
import React, { useMemo, useState } from 'react';
import { DollarSign, ShoppingBag, TrendingUp, Target, Gift, Package, BarChart3, Megaphone, Percent, Wallet, HandHeart } from 'lucide-react';
import MetricCard from '@/components/MetricCard';
import KPIModal from '@/components/KPIModal';
import { formatCLP } from '@/lib/utils';
import { calculateTotalProfit, calculateInventoryValue } from '@/lib/accountingUtils';

const KPIGrid = ({ transactions, inventory, inventoryMap, prices, products = [], loans = [] }) => {
  console.log('[KPIGrid] Renderizando con:', { 
    transactions: transactions?.length || 0, 
    inventory, 
    inventoryMapKeys: Object.keys(inventoryMap || {}).length,
    pricesKeys: Object.keys(prices || {}).length,
    products: products?.length || 0
  });
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState({ type: '', title: '', color: '' });

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
    const products = {};

    transactions.forEach(t => {
      // Manejar tipos antiguos y nuevos
      const isPurchase = t.type === 'compra' || t.type === 'purchase';
      const isSale = t.type === 'venta' || t.type === 'sale';
      const isAd = t.type === 'publicidad';
      
      // Campaign aggregation
      if (isAd) {
        totalAds += t.total || t.totalAmount || 0;
        const cName = t.campaignName || 'Orgánico';
        if (!campaigns[cName]) campaigns[cName] = { name: cName, cost: 0, revenue: 0 };
        campaigns[cName].cost += t.total || t.totalAmount || 0;
      } 
      else if (isPurchase) {
        const amount = t.total || t.totalAmount || 0;
        totalPurchases += amount;
        
        // Para transacciones antiguas
        if (t.type === 'compra') {
          freeProducts += t.freeUnits || 0;
          const units = (t.quantity || 0) + (t.freeUnits || 0);
          weightedCostSum += amount;
          totalUnitsAcquired += units;
          
          // Product aggregation for preview
          const productName = t.productName || 'Sin Etiqueta';
          if (!products[productName]) products[productName] = { name: productName, stock: 0 };
          products[productName].stock += units;
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
          if (!products[productName]) products[productName] = { name: productName, stock: 0 };
          products[productName].stock += units;
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
        if (products[productName]) {
            products[productName].stock -= quantity;
        } else {
            if (!products[productName]) products[productName] = { name: productName, stock: 0 };
            products[productName].stock -= quantity;
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
    
    const avgRealCost = totalUnitsAcquired > 0 ? weightedCostSum / totalUnitsAcquired : 0;
    
    // Calculate Free Product Profit using STORED PRICES
    // First, let's count free products available per product type to be accurate, 
    // but we only have a global 'freeProducts' counter from history.
    // We can approximate or try to use current inventory distribution if we had granular free stock data.
    // Since we don't track "which specific unit is free" in the map, we'll use the average price 
    // OR if the user provided prices, we use the Weighted Average Price of current inventory?
    // Let's stick to: Total Free Units * Average Stored Price (or Avg Sales Price if no stored price)
    
    // Calculate total value of current inventory
    // Si tenemos productos con PPP, usar PPP; si no, usar precios de venta
    let totalInventoryValue = 0;
    if (products && products.length > 0) {
      totalInventoryValue = calculateInventoryValue(products);
    } else {
      // Fallback: usar precios de venta
      Object.entries(inventoryMap).forEach(([name, qty]) => {
        if (qty > 0) {
          const price = prices[name] || 0;
          totalInventoryValue += (qty * price);
        }
      });
    }

    const totalUnitsSold = transactions.filter(t => t.type === 'venta' || t.type === 'sale').reduce((acc, curr) => acc + (curr.quantityBoxes || curr.quantity || 0), 0);
    const avgSalePrice = totalUnitsSold > 0 ? totalSales / totalUnitsSold : 0;
    
    // Fallback for free product value: If we have stored prices, use an average of stored prices? 
    // Or better, just use the global avgSalePrice if stored prices are missing for some items.
    // Let's try to be smart: Value of Free Items is usually realized when sold.
    const freeProductProfit = freeProducts * avgSalePrice; // Keep as realized potential based on history?
    
    // Actually, "Valor Prod. Gratis" usually means "How much are these free items WORTH if I sell them?"
    // If we have prices, we should use them.
    // Since we don't know WHICH products are the free ones (data structure limitation), we estimate.
    // But wait, we can check the purchase history to see which products generated free units.
    let freeValueCalc = 0;
    transactions.filter(t => {
      const isPurchase = t.type === 'compra' || t.type === 'purchase';
      if (t.type === 'compra') {
        return isPurchase && (t.freeUnits > 0);
      } else {
        // Para transacciones V2, buscar en notas
        return isPurchase && t.notes && t.notes.includes('Producto Gratis');
      }
    }).forEach(t => {
      if (t.type === 'compra') {
        // Transacciones antiguas
        const unitPrice = prices[t.productName] || avgSalePrice;
        freeValueCalc += (t.freeUnits || 0) * unitPrice;
      } else {
        // Transacciones V2 - extraer valor de mercado de las notas
        // Formato: "Valor Mercado: $X,XXX"
        const notes = t.notes || '';
        const valorMatch = notes.match(/Valor Mercado:\s*\$?([\d,]+)/);
        if (valorMatch) {
          const valor = parseFloat(valorMatch[1].replace(/,/g, ''));
          freeValueCalc += valor;
        } else {
          // Fallback: usar precio del producto
          const unitPrice = prices[t.productName] || avgSalePrice;
          const quantity = t.quantityBoxes || 1;
          freeValueCalc += unitPrice * quantity;
        }
      }
    });

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

    const productList = products
        .filter(p => p.currentStockBoxes > 0) // Solo productos con stock
        .sort((a,b) => b.currentStockBoxes - a.currentStockBoxes)
        .slice(0, 3)
        .map(p => ({
          label: p.name,
          value: `${p.currentStockBoxes} cajas${p.currentMarketingStock > 0 ? ` + ${p.currentMarketingStock} sobres` : ''}`
        }));

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
      avgRealCost,
      bestCampaign,
      campaignList,
      productList,
      profitPreview,
      totalLoanedBoxes,
      totalLoanedValue,
      loansByProduct
    };
  }, [transactions, inventoryMap, prices, products, loans]);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
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
          title="Inversión Compras"
          value={formatCLP(metrics.totalPurchases)}
          icon={ShoppingBag}
          trend="Costo Mercancía"
          color="red"
          delay={0.05}
          onClick={() => handleCardClick('purchases', 'Historial de Compras', 'red')}
          hoverData={[{label: 'Transacciones', value: transactions.filter(t=>t.type==='compra').length}]}
        />
        <MetricCard
          title="Ventas Totales"
          value={formatCLP(metrics.totalSales)}
          icon={DollarSign}
          trend="Ingresos Brutos"
          color="green"
          delay={0.1}
          onClick={() => handleCardClick('sales', 'Historial de Ventas', 'green')}
          hoverData={[{label: 'Transacciones', value: transactions.filter(t=>t.type==='venta').length}]}
        />
        <MetricCard
          title="Ganancia Neta"
          value={formatCLP(metrics.netProfit)}
          icon={TrendingUp}
          trend={metrics.netProfit >= 0 ? "Rentabilidad Positiva" : "Rentabilidad Negativa"}
          color={metrics.netProfit >= 0 ? "gold" : "red"}
          delay={0.15}
          hoverData={[
            ...metrics.profitPreview,
            ...(metrics.totalCOGS > 0 ? [{ label: 'COGS', value: formatCLP(metrics.totalCOGS) }] : [])
          ]}
          onClick={() => handleCardClick('profit', 'Desglose de Ganancias', 'gold')}
        />
         <MetricCard
          title="Inventario Disponible"
          value={inventory}
          icon={Package}
          trend="Stock Actual"
          color="blue"
          delay={0.2}
          hoverData={metrics.productList}
          onClick={() => handleCardClick('inventory', 'Inventario Detallado', 'blue')}
        />
        
        <MetricCard
          title="Mejor Campaña (ROI)"
          value={metrics.bestCampaign}
          icon={Target}
          trend="Top Performer"
          color="gold"
          isText
          delay={0.25}
          onClick={() => handleCardClick('ads', 'Rendimiento de Campañas', 'gold')}
        />
        <MetricCard
          title="Prod. Gratis (4x1)"
          value={metrics.freeProducts}
          icon={Gift}
          trend="Unidades Bonificadas"
          color="purple"
          delay={0.3}
          onClick={() => handleCardClick('inventory', 'Bonificaciones', 'purple')}
        />
        <MetricCard
          title="Valor Prod. Gratis"
          value={formatCLP(metrics.freeProductProfit)}
          icon={Gift}
          trend="Ganancia Estimada"
          color="purple"
          delay={0.35}
           onClick={() => handleCardClick('inventory', 'Valorización Stock', 'purple')}
        />
        <MetricCard
          title="Costo Unitario Real"
          value={formatCLP(metrics.avgRealCost)}
          icon={Percent}
          trend="Promedio Ponderado"
          color="blue"
          delay={0.4}
          onClick={() => handleCardClick('inventory', 'Costos Unitarios', 'blue')}
        />
         <MetricCard
          title="Valor Inventario"
          value={formatCLP(metrics.totalInventoryValue)}
          icon={Wallet}
          trend="Precio de Venta"
          color="green"
          delay={0.45}
          onClick={() => handleCardClick('inventory', 'Valorización', 'green')}
        />
        <MetricCard
          title="Préstamos Activos"
          value={metrics.totalLoanedBoxes}
          icon={HandHeart}
          trend="Unidades Prestadas"
          color="orange"
          delay={0.5}
          hoverData={[
            ...(metrics.totalLoanedValue > 0 ? [{ label: 'Valor Estimado', value: formatCLP(metrics.totalLoanedValue) }] : []),
            ...metrics.loansByProduct.slice(0, 3)
          ]}
          onClick={() => handleCardClick('loans', 'Préstamos Detallados', 'orange')}
        />
      </div>

      <KPIModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        type={selectedKPI.type}
        title={selectedKPI.title}
        color={selectedKPI.color}
        transactions={transactions}
        products={products}
        inventoryMap={inventoryMap}
      />
    </>
  );
};

export default KPIGrid;
