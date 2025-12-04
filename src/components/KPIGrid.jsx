
import React, { useMemo, useState } from 'react';
import { DollarSign, ShoppingBag, TrendingUp, Target, Gift, Package, BarChart3, Megaphone, Percent, Wallet } from 'lucide-react';
import MetricCard from '@/components/MetricCard';
import KPIModal from '@/components/KPIModal';
import { formatCLP } from '@/lib/utils';

const KPIGrid = ({ transactions, inventory, inventoryMap, prices }) => {
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
      // Campaign aggregation
      if (t.type === 'publicidad') {
        totalAds += t.total;
        const cName = t.campaignName || 'Orgánico';
        if (!campaigns[cName]) campaigns[cName] = { name: cName, cost: 0, revenue: 0 };
        campaigns[cName].cost += t.total;
      } 
      else if (t.type === 'compra') {
        totalPurchases += t.total;
        freeProducts += t.freeUnits || 0;
        const units = t.quantity + (t.freeUnits || 0);
        weightedCostSum += t.total;
        totalUnitsAcquired += units;
        
        // Product aggregation for preview
        if (!products[t.productName]) products[t.productName] = { name: t.productName, stock: 0 };
        products[t.productName].stock += units;
      } 
      else if (t.type === 'venta') {
        totalSales += t.total;
        if (t.campaignName && t.campaignName !== 'Orgánico') {
           if (!campaigns[t.campaignName]) campaigns[t.campaignName] = { name: t.campaignName, cost: 0, revenue: 0 };
           campaigns[t.campaignName].revenue += t.total;
        }
        // Product stock reduction
        if (products[t.productName]) {
            products[t.productName].stock -= t.quantity;
        } else {
            if (!products[t.productName]) products[t.productName] = { name: t.productName, stock: 0 };
            products[t.productName].stock -= t.quantity;
        }
      }
    });

    const netProfit = totalSales - (totalPurchases + totalAds);
    const avgRealCost = totalUnitsAcquired > 0 ? weightedCostSum / totalUnitsAcquired : 0;
    
    // Calculate Free Product Profit using STORED PRICES
    // First, let's count free products available per product type to be accurate, 
    // but we only have a global 'freeProducts' counter from history.
    // We can approximate or try to use current inventory distribution if we had granular free stock data.
    // Since we don't track "which specific unit is free" in the map, we'll use the average price 
    // OR if the user provided prices, we use the Weighted Average Price of current inventory?
    // Let's stick to: Total Free Units * Average Stored Price (or Avg Sales Price if no stored price)
    
    // Calculate total value of current inventory based on stored prices
    let totalInventoryValue = 0;
    Object.entries(inventoryMap).forEach(([name, qty]) => {
       if (qty > 0) {
          const price = prices[name] || 0;
          totalInventoryValue += (qty * price);
       }
    });

    const totalUnitsSold = transactions.filter(t => t.type === 'venta').reduce((acc, curr) => acc + curr.quantity, 0);
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
    transactions.filter(t => t.type === 'compra' && t.freeUnits > 0).forEach(t => {
        const price = prices[t.productName] || (t.total / t.quantity); // Fallback to cost if no price? No, fallback to sales price?
        // Fallback to avgSalePrice is safer if no specific price set.
        const unitPrice = prices[t.productName] || avgSalePrice;
        freeValueCalc += (t.freeUnits * unitPrice);
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

    const productList = Object.values(products)
        .sort((a,b) => b.stock - a.stock)
        .slice(0, 3)
        .map(p => ({ label: p.name, value: p.stock + ' un.' }));

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

    return {
      totalAds,
      totalPurchases,
      totalSales,
      netProfit,
      transactionCount,
      freeProducts,
      freeProductProfit: freeValueCalc,
      totalInventoryValue,
      avgRealCost,
      bestCampaign,
      campaignList,
      productList,
      profitPreview
    };
  }, [transactions, inventoryMap, prices]);

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
          hoverData={metrics.profitPreview}
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
      </div>

      <KPIModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        type={selectedKPI.type} 
        title={selectedKPI.title}
        color={selectedKPI.color}
        transactions={transactions}
      />
    </>
  );
};

export default KPIGrid;
