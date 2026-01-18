/**
 * buildBusinessSummary - Genera un resumen "modo humano" del estado del negocio
 *
 * Esta función centraliza TODOS los cálculos y textos para que el modal,
 * PDF y Word muestren exactamente la misma información.
 */

import { formatCLP } from './utils';

/**
 * Calcula y genera el resumen del negocio en lenguaje humano
 * @param {Object} params - Parámetros del negocio
 * @param {Array} params.transactions - Transacciones del usuario
 * @param {Object} params.inventoryMap - Mapa de inventario {producto: cantidad}
 * @param {Object} params.prices - Precios de lista {producto: precio}
 * @param {number} params.fuxionPayments - Total de pagos FuXion registrados
 * @returns {Object} Resumen con métricas y textos listos para mostrar
 */
export const buildBusinessSummary = ({
  transactions = [],
  inventoryMap = {},
  prices = {},
  fuxionPayments = 0
}) => {
  // ═══════════════════════════════════════════════════════════════
  // 1. CALCULAR MÉTRICAS BASE
  // ═══════════════════════════════════════════════════════════════

  let recoveredToday = 0;      // Dinero recuperado por ventas
  let totalInvestment = 0;     // Inversión total (compras + publicidad + otros)
  let totalCompras = 0;
  let totalPublicidad = 0;
  let totalOtrosGastos = 0;
  let breakdownExpenses = {
    compras: 0,
    publicidad: 0,
    otros: 0
  };

  transactions.forEach(t => {
    const amount = t.total || t.totalAmount || 0;
    const isPurchase = t.type === 'compra' || t.type === 'purchase';
    const isSale = t.type === 'venta' || t.type === 'sale';
    const isAd = t.type === 'publicidad' || t.type === 'advertising';
    const isOutflow = t.type === 'personal_consumption' || t.type === 'marketing_sample' || t.type === 'outflow';

    // Detectar regalos (no suman inversión)
    const isGift = (amount === 0 && (t.notes || '').includes('REGALO')) || t.isGift === true;

    if (isSale) {
      // Ventas = dinero recuperado
      recoveredToday += amount;
    } else if (isPurchase && !isGift) {
      // Compras (excluyendo regalos) = inversión
      totalCompras += amount;
      breakdownExpenses.compras += amount;
    } else if (isAd) {
      // Publicidad = inversión
      totalPublicidad += amount;
      breakdownExpenses.publicidad += amount;
    } else if (isOutflow) {
      // Otros gastos/salidas = inversión
      totalOtrosGastos += amount;
      breakdownExpenses.otros += amount;
    }
  });

  totalInvestment = totalCompras + totalPublicidad + totalOtrosGastos;

  // ═══════════════════════════════════════════════════════════════
  // 2. CALCULAR INVENTARIO
  // ═══════════════════════════════════════════════════════════════

  let stockUnits = 0;
  let inventoryValueSalePrice = 0;

  Object.entries(inventoryMap || {}).forEach(([productName, qty]) => {
    const stock = qty || 0;
    if (stock > 0) {
      stockUnits += stock;
      inventoryValueSalePrice += stock * (prices[productName] || 0);
    }
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. CALCULAR BALANCE Y PROYECCIONES
  // ═══════════════════════════════════════════════════════════════

  // Balance actual (sin contar inventario)
  const balanceToday = recoveredToday - totalInvestment;
  const recoveredWithFuxion = recoveredToday + fuxionPayments;
  const balanceTodayWithFuxion = recoveredWithFuxion - totalInvestment;

  // Proyección si vende TODO el inventario
  const finalProjectionIfSellAll = recoveredToday + inventoryValueSalePrice;
  const finalProjectionIfSellAllWithFuxion = recoveredToday + fuxionPayments + inventoryValueSalePrice;

  // Ganancia/pérdida proyectada
  const projectedProfitOrLoss = finalProjectionIfSellAll - totalInvestment;
  const projectedProfitOrLossWithFuxion = finalProjectionIfSellAllWithFuxion - totalInvestment;

  // ═══════════════════════════════════════════════════════════════
  // 4. GENERAR TEXTOS HUMANOS
  // ═══════════════════════════════════════════════════════════════

  // Estado actual en texto
  let balanceTodayText = '';
  if (balanceToday >= 0) {
    balanceTodayText = `Ya recuperaste tu inversión y tienes ${formatCLP(balanceToday)} de ganancia`;
  } else {
    balanceTodayText = `Te faltan ${formatCLP(Math.abs(balanceToday))} para recuperar tu inversión`;
  }

  // Veredicto final
  let verdictText = '';
  let verdictType = 'neutral'; // 'positive', 'negative', 'neutral'

  if (projectedProfitOrLoss > 0) {
    verdictType = 'positive';
    verdictText = `Si vendes todo tu inventario, terminarías con una ganancia aproximada de ${formatCLP(projectedProfitOrLoss)}.`;
  } else if (projectedProfitOrLoss < 0) {
    verdictType = 'negative';
    verdictText = `Si vendes todo tu inventario, todavía te faltaría recuperar ${formatCLP(Math.abs(projectedProfitOrLoss))} para quedar en positivo.`;
  } else {
    verdictType = 'neutral';
    verdictText = `Si vendes todo tu inventario, recuperarías exactamente tu inversión (quedarías en $0).`;
  }

  // One-liner con fuxion y potencial
  const oneLiner = (() => {
    if (balanceTodayWithFuxion >= 0) {
      return `Hoy estás ${formatCLP(balanceTodayWithFuxion)} arriba porque tus ventas y pagos FuXion superan lo invertido.`;
    }
    if (projectedProfitOrLossWithFuxion > 0) {
      return `Hoy estás en -${formatCLP(Math.abs(balanceTodayWithFuxion))}, principalmente por tu inversión (compras/publicidad), pero si vendes tu stock quedas +${formatCLP(projectedProfitOrLossWithFuxion)}.`;
    }
    return `Hoy estás en -${formatCLP(Math.abs(balanceTodayWithFuxion))} porque has invertido más de lo recuperado. Sigue vendiendo y registrando pagos FuXion para cerrar la brecha.`;
  })();

  // Nota sobre pagos FuXion
  const fuxionNoteText = fuxionPayments > 0
    ? `Ya tienes ${formatCLP(fuxionPayments)} registrados en Pagos FuXion. Esto ya mejora tu balance actual y la proyección final.`
    : `Este cálculo no incluye cheques/ingresos de FuXion. Cuando los registres, tu balance mejorará automáticamente.`;

  // ═══════════════════════════════════════════════════════════════
  // 5. RETORNAR OBJETO COMPLETO
  // ═══════════════════════════════════════════════════════════════

  return {
    // Métricas numéricas
    metrics: {
      recoveredToday,
      recoveredWithFuxion,
      totalInvestment,
      totalCompras,
      totalPublicidad,
      totalOtrosGastos,
      balanceToday,
      balanceTodayWithFuxion,
      stockUnits,
      inventoryValueSalePrice,
      finalProjectionIfSellAll,
      finalProjectionIfSellAllWithFuxion,
      projectedProfitOrLoss,
      projectedProfitOrLossWithFuxion,
      fuxionPayments,
      breakdownExpenses
    },

    // Textos formateados (listos para mostrar)
    formatted: {
      recoveredToday: formatCLP(recoveredToday),
      recoveredWithFuxion: formatCLP(recoveredWithFuxion),
      totalInvestment: formatCLP(totalInvestment),
      totalCompras: formatCLP(totalCompras),
      totalPublicidad: formatCLP(totalPublicidad),
      balanceToday: formatCLP(balanceToday),
      balanceTodayWithSign: balanceToday >= 0 ? `+${formatCLP(balanceToday)}` : `-${formatCLP(Math.abs(balanceToday))}`,
      balanceTodayWithFuxion: balanceTodayWithFuxion >= 0 ? `+${formatCLP(balanceTodayWithFuxion)}` : `-${formatCLP(Math.abs(balanceTodayWithFuxion))}`,
      stockUnits: `${stockUnits} unidades`,
      inventoryValueSalePrice: formatCLP(inventoryValueSalePrice),
      finalProjectionIfSellAll: formatCLP(finalProjectionIfSellAll),
      finalProjectionIfSellAllWithFuxion: formatCLP(finalProjectionIfSellAllWithFuxion),
      projectedProfitOrLoss: projectedProfitOrLoss >= 0 ? `+${formatCLP(projectedProfitOrLoss)}` : `-${formatCLP(Math.abs(projectedProfitOrLoss))}`,
      projectedProfitOrLossWithFuxion: projectedProfitOrLossWithFuxion >= 0 ? `+${formatCLP(projectedProfitOrLossWithFuxion)}` : `-${formatCLP(Math.abs(projectedProfitOrLossWithFuxion))}`,
      fuxionPayments: formatCLP(fuxionPayments)
    },

    // Textos humanos (para UI y exportación)
    humanText: {
      balanceTodayText,
      verdictText,
      verdictType,
      fuxionNoteText,
      oneLiner,

      // Párrafo completo para exportación
      fullSummaryParagraph: `Hasta hoy has recuperado ${formatCLP(recoveredToday)} en ventas y ${formatCLP(fuxionPayments)} en pagos FuXion, pero has invertido ${formatCLP(totalInvestment)} (compras + publicidad + gastos). ${balanceTodayText}. Con pagos FuXion considerados, tu balance es ${balanceTodayWithSign}.\n\nTe quedan ${stockUnits} productos en inventario, con un valor aproximado de ${formatCLP(inventoryValueSalePrice)} si los vendes a precio lista.\n\nSi vendes TODO tu inventario, tu total recuperado sería ${formatCLP(finalProjectionIfSellAllWithFuxion)} incluyendo pagos FuXion.\n\n${verdictText}\n\n${fuxionNoteText}\n\nResumen en 1 frase: ${oneLiner}`
    }
  };
};

export default buildBusinessSummary;
