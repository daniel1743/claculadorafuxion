import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, FileDown, TrendingUp, TrendingDown, Package, DollarSign, Target, Gift, Banknote, AlertCircle, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCLP } from '@/lib/utils';
import { exportEstadoNegocioPDF, exportEstadoNegocioDOCX } from '@/lib/exportEstadoNegocio';
import { buildBusinessSummary } from '@/lib/businessSummary';
import { useToast } from '@/components/ui/use-toast';

const EstadoDelNegocioModal = ({
  isOpen,
  onClose,
  user,
  transactions = [],
  products = [],
  prices = {},
  inventoryMap = {},
  loans = [],
  fuxionPayments = 0
}) => {
  const { toast } = useToast();

  // Calcular todas las métricas
  const metrics = useMemo(() => {
    let totalVentas = 0;
    let totalCompras = 0;
    let totalPublicidad = 0;
    let totalSalidas = 0;
    let totalRegalosValor = 0;
    let totalRegalosQty = 0;
    let totalPersonalUse = 0;
    let totalMarketingSamples = 0;

    transactions.forEach(t => {
      const amount = t.total || t.totalAmount || 0;
      const isPurchase = t.type === 'compra' || t.type === 'purchase';
      const isSale = t.type === 'venta' || t.type === 'sale';
      const isAd = t.type === 'publicidad' || t.type === 'advertising';
      const isOutflow = t.type === 'personal_consumption' || t.type === 'marketing_sample' || t.type === 'outflow';
      if (t.type === 'personal_consumption') totalPersonalUse += amount;
      if (t.type === 'marketing_sample') totalMarketingSamples += amount;
      const isGift = (amount === 0 && (t.notes || '').includes('REGALO')) || t.isGift === true;

      if (isPurchase) {
        if (isGift) {
          const qty = t.quantityBoxes || t.quantity || 0;
          const price = prices[t.productName] || 0;
          totalRegalosValor += qty * price;
          totalRegalosQty += qty;
        } else {
          totalCompras += amount;
        }
      } else if (isSale) {
        totalVentas += amount;
      } else if (isAd) {
        totalPublicidad += amount;
      } else if (isOutflow) {
        totalSalidas += amount;
      }
    });

    // Calcular inventario y valor
    let inventarioTotal = 0;
    let valorInventario = 0;
    Object.entries(inventoryMap || {}).forEach(([name, qty]) => {
      const stock = qty || 0;
      if (stock > 0) {
        inventarioTotal += stock;
        valorInventario += stock * (prices[name] || 0);
      }
    });

    // Préstamos activos
    const prestamosActivos = loans.filter(l => l.status === 'active' || !l.status);
    const totalPrestado = prestamosActivos.reduce((sum, l) => sum + (l.quantityBoxes || 0), 0);
    const valorPrestamos = prestamosActivos.reduce((sum, l) => sum + ((l.quantityBoxes || 0) * (l.listPrice || 0)), 0);

    // Ingresos y gastos reales
    const ingresosReales = totalVentas + fuxionPayments;
    const gastosReales = totalCompras + totalPublicidad + totalSalidas;
    const gananciaNeta = ingresosReales - gastosReales;
    const perdidaAbsoluta = gananciaNeta < 0 ? Math.abs(gananciaNeta) : 0;
    const inversionNoRecuperada = Math.max(0, totalCompras - totalVentas);

    // Proyección si vendo todo
    const recuperacionPotencial = valorInventario;
    const gananciaPotencial = valorInventario - totalCompras - totalPublicidad - totalSalidas + fuxionPayments;

    // COGS aproximado (si hay productos con PPP)
    let totalCOGS = 0;
    if (products && products.length > 0) {
      transactions.filter(t => t.type === 'venta' || t.type === 'sale').forEach(t => {
        const prod = products.find(p => p.name === t.productName);
        if (prod && prod.ppp) {
          const qty = t.quantityBoxes || t.quantity || 0;
          totalCOGS += qty * prod.ppp;
        }
      });
    }
    const gananciaPorVentas = totalVentas - totalCOGS;

    return {
      // Estado actual
      ingresosReales,
      gastosReales,
      gananciaNeta,
      totalVentas,
      totalCompras,
      totalPublicidad,
      totalSalidas,
      totalPersonalUse,
      totalMarketingSamples,
      inversionNoRecuperada,
      perdidaAbsoluta,
      fuxionPayments,

      // Inventario
      inventarioTotal,
      valorInventario,
      totalRegalosQty,
      totalRegalosValor,

      // Préstamos
      prestamosCount: prestamosActivos.length,
      totalPrestado,
      valorPrestamos,

      // Proyección
      recuperacionPotencial,
      gananciaPotencial,

      // Segmentación
      gananciaPorVentas,
      totalCOGS
    };
  }, [transactions, products, prices, inventoryMap, loans, fuxionPayments]);

  // Resumen humanizado (modo humano)
  const humanSummary = useMemo(() => {
    return buildBusinessSummary({
      transactions,
      inventoryMap,
      prices,
      fuxionPayments
    });
  }, [transactions, inventoryMap, prices, fuxionPayments]);

  const handleExportPDF = async () => {
    try {
      await exportEstadoNegocioPDF(metrics, user, humanSummary);
      toast({
        title: "PDF Generado",
        description: "El reporte se ha descargado correctamente.",
        className: "bg-green-900 border-green-600 text-white"
      });
    } catch (error) {
      console.error('Error exportando PDF:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF.",
        variant: "destructive"
      });
    }
  };

  const handleExportDOCX = async () => {
    try {
      await exportEstadoNegocioDOCX(metrics, user, humanSummary);
      toast({
        title: "Word Generado",
        description: "El documento se ha descargado correctamente.",
        className: "bg-green-900 border-green-600 text-white"
      });
    } catch (error) {
      console.error('Error exportando DOCX:', error);
      toast({
        title: "Error",
        description: "No se pudo generar el documento Word.",
        variant: "destructive"
      });
    }
  };

  if (!isOpen) return null;

  const fechaActual = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 border border-white/10 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-yellow-600/20 via-purple-600/10 to-blue-600/20 border-b border-white/10 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <FileText className="w-7 h-7 text-yellow-400" />
                  ESTADO DEL NEGOCIO
                </h2>
                <p className="text-gray-400 text-sm mt-1">Resumen Ejecutivo</p>
                <div className="mt-3 space-y-1">
                  <p className="text-sm text-gray-300">
                    <span className="text-gray-500">Propietario:</span> {user?.name || user?.email || 'Usuario'}
                  </p>
                  <p className="text-xs text-gray-500">Generado: {fechaActual}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Botones de exportación */}
            <div className="flex gap-3 mt-4">
              <Button
                onClick={handleExportPDF}
                className="bg-red-600 hover:bg-red-700 text-white"
                size="sm"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
              <Button
                onClick={handleExportDOCX}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="sm"
              >
                <FileText className="w-4 h-4 mr-2" />
                Descargar Word
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
            {/* Sección 1: Estado Actual */}
            <section className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-green-400" />
                1. Estado Actual (HOY)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <MetricRow label="Ingresos reales" value={metrics.ingresosReales} color="green" />
                <MetricRow label="Gastos reales" value={metrics.gastosReales} color="red" negative />
                <div className="col-span-2 pt-3 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300 font-semibold">Ganancia Neta Actual</span>
                    <span className={`text-2xl font-bold ${metrics.gananciaNeta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {metrics.gananciaNeta >= 0 ? '+' : ''}{formatCLP(metrics.gananciaNeta)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Desglose */}
              <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Ventas</span>
                  <span className="text-green-400">{formatCLP(metrics.totalVentas)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Pagos FuXion</span>
                  <span className="text-emerald-400">{formatCLP(metrics.fuxionPayments)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Compras</span>
                  <span className="text-red-400">-{formatCLP(metrics.totalCompras)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Publicidad</span>
                  <span className="text-red-400">-{formatCLP(metrics.totalPublicidad)}</span>
                </div>
                {metrics.totalSalidas > 0 && (
                  <div className="flex justify-between text-gray-400">
                    <span>Salidas</span>
                    <span className="text-red-400">-{formatCLP(metrics.totalSalidas)}</span>
                  </div>
                )}
              </div>

              {/* Préstamos */}
              {metrics.prestamosCount > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5 bg-orange-500/5 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-orange-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{metrics.prestamosCount} préstamos activos ({metrics.totalPrestado} unidades)</span>
                    <span className="ml-auto font-mono">{formatCLP(metrics.valorPrestamos)}</span>
                  </div>
                </div>
              )}
            </section>

            {/* Sección 2: Inventario */}
            <section className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-blue-400" />
                2. Inventario y Valor
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/20">
                  <p className="text-blue-400 text-xs font-medium uppercase">Stock Disponible</p>
                  <p className="text-3xl font-bold text-white mt-1">{metrics.inventarioTotal} <span className="text-sm text-gray-400">unidades</span></p>
                </div>
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                  <p className="text-green-400 text-xs font-medium uppercase">Valor Inventario</p>
                  <p className="text-2xl font-bold text-white mt-1">{formatCLP(metrics.valorInventario)}</p>
                  <p className="text-xs text-gray-500">a precio lista</p>
                </div>
              </div>

              {metrics.totalRegalosQty > 0 && (
                <div className="mt-4 bg-purple-500/10 rounded-xl p-4 border border-purple-500/20">
                  <div className="flex items-center gap-2">
                    <Gift className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="text-purple-400 text-sm font-medium">Productos Gratis (Regalos)</p>
                      <p className="text-white">{metrics.totalRegalosQty} unidades · Valor: {formatCLP(metrics.totalRegalosValor)}</p>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Sección 3: Proyección */}
            <section className="bg-gradient-to-r from-yellow-500/10 via-orange-500/5 to-red-500/10 rounded-2xl p-5 border border-yellow-500/20">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-yellow-400" />
                3. Proyección (si vendo TODO el inventario)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Recuperación Potencial</p>
                  <p className="text-2xl font-bold text-yellow-400">{formatCLP(metrics.recuperacionPotencial)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Ganancia Potencial Estimada</p>
                  <p className={`text-2xl font-bold ${metrics.gananciaPotencial >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {metrics.gananciaPotencial >= 0 ? '+' : ''}{formatCLP(metrics.gananciaPotencial)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                * Estimación basada en precios actuales. No incluye deudas externas no registradas.
              </p>
            </section>

            {/* Sección 4: Segmentación */}
            <section className="bg-white/5 rounded-2xl p-5 border border-white/10">
              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                4. Segmentación de Ingresos
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg">
                  <span className="text-gray-300">Ganancia por Ventas</span>
                  <span className="text-green-400 font-bold">{formatCLP(metrics.gananciaPorVentas)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded-lg">
                  <span className="text-gray-300">Pagos FuXion (Cheques/Bonos)</span>
                  <span className="text-emerald-400 font-bold">{formatCLP(metrics.fuxionPayments)}</span>
                </div>
                {metrics.totalRegalosValor > 0 && (
                  <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-lg">
                    <div>
                      <span className="text-gray-300">Potencial en Regalos</span>
                      <p className="text-xs text-gray-500">Si vendes los regalos, COGS = 0</p>
                    </div>
                    <span className="text-purple-400 font-bold">{formatCLP(metrics.totalRegalosValor)}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Sección: Explicación de pérdida */}
            {metrics.gananciaNeta < 0 && (
              <section className="bg-red-500/10 rounded-2xl p-6 border border-red-500/30 shadow-inner space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">📉 ¿Por qué tengo una pérdida?</h3>
                    <p className="text-sm text-gray-300">No es un error: se debe a gastos reales o inversión aún no recuperada.</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-300">
                  <p className="text-white font-semibold">Pérdida actual: <span className="text-red-400 font-bold">{formatCLP(metrics.perdidaAbsoluta)}</span></p>
                  <p className="text-gray-400">Se explica por:</p>
                  <ul className="space-y-1">
                    {metrics.totalPublicidad > 0 && (
                      <li className="flex justify-between">
                        <span>Publicidad</span>
                        <span className="text-gray-200 font-mono">{formatCLP(metrics.totalPublicidad)}</span>
                      </li>
                    )}
                    {metrics.totalPersonalUse > 0 && (
                      <li className="flex justify-between">
                        <span>Consumo personal</span>
                        <span className="text-gray-200 font-mono">{formatCLP(metrics.totalPersonalUse)}</span>
                      </li>
                    )}
                    {metrics.totalMarketingSamples > 0 && (
                      <li className="flex justify-between">
                        <span>Muestras/Regalos entregados</span>
                        <span className="text-gray-200 font-mono">{formatCLP(metrics.totalMarketingSamples)}</span>
                      </li>
                    )}
                    {metrics.inversionNoRecuperada > 0 && (
                      <li className="flex justify-between">
                        <span>Inversión no recuperada (stock pendiente de vender)</span>
                        <span className="text-gray-200 font-mono">{formatCLP(metrics.inversionNoRecuperada)}</span>
                      </li>
                    )}
                  </ul>
                  <p className="text-gray-300 mt-3">
                    Esta pérdida es temporal: tienes inventario y gastos que se recuperan al vender. Si faltan pagos de FuXion, agrégalos para que el balance refleje todo.
                  </p>
                </div>
              </section>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* SECCIÓN 5: RESUMEN FINAL (MODO HUMANO) */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <section className="bg-gradient-to-br from-gray-800/80 via-gray-900 to-gray-950 rounded-2xl p-6 border-2 border-yellow-500/30 shadow-xl">
              <h3 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 text-yellow-400" />
                </div>
                5. Resumen Final
                <span className="text-sm font-normal text-yellow-400/80 ml-2">(en simple)</span>
              </h3>

              {/* Bloque 1: Estado al día de hoy */}
              <div className="bg-black/30 rounded-xl p-5 mb-4 border border-white/5">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Estado al día de hoy</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Has recuperado (ventas realizadas)</span>
                    <span className="text-green-400 font-bold text-lg">{humanSummary.formatted.recoveredToday}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Has invertido (compras + gastos)</span>
                    <span className="text-red-400 font-bold text-lg">{humanSummary.formatted.totalInvestment}</span>
                  </div>
                  <div className="pt-3 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-white font-semibold">Balance actual</span>
                      <span className={`font-bold text-xl ${humanSummary.metrics.balanceToday >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {humanSummary.formatted.balanceTodayWithSign}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-2 italic">
                      {humanSummary.humanText.balanceTodayText}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bloque 2: Stock disponible */}
              <div className="bg-black/30 rounded-xl p-5 mb-4 border border-white/5">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Stock disponible</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Te quedan en inventario</span>
                    <span className="text-blue-400 font-bold text-lg">{humanSummary.formatted.stockUnits}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Valor si los vendes a precio lista</span>
                    <span className="text-yellow-400 font-bold text-lg">{humanSummary.formatted.inventoryValueSalePrice}</span>
                  </div>
                </div>
              </div>

              {/* Bloque 3: Resultado final estimado */}
              <div className="bg-black/30 rounded-xl p-5 mb-4 border border-white/5">
                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Resultado final estimado</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Si vendes TODO tu inventario, tendrías</span>
                    <span className="text-yellow-400 font-bold text-lg">{humanSummary.formatted.finalProjectionIfSellAll}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Comparado contra tu inversión</span>
                    <span className={`font-bold text-xl ${humanSummary.metrics.projectedProfitOrLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {humanSummary.formatted.projectedProfitOrLoss}
                    </span>
                  </div>
                </div>
              </div>

              {/* Veredicto Final */}
              <div className={`rounded-xl p-5 border-2 ${
                humanSummary.humanText.verdictType === 'positive'
                  ? 'bg-green-500/10 border-green-500/30'
                  : humanSummary.humanText.verdictType === 'negative'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-yellow-500/10 border-yellow-500/30'
              }`}>
                <div className="flex items-start gap-4">
                  {humanSummary.humanText.verdictType === 'positive' ? (
                    <CheckCircle2 className="w-8 h-8 text-green-400 flex-shrink-0 mt-1" />
                  ) : humanSummary.humanText.verdictType === 'negative' ? (
                    <XCircle className="w-8 h-8 text-red-400 flex-shrink-0 mt-1" />
                  ) : (
                    <HelpCircle className="w-8 h-8 text-yellow-400 flex-shrink-0 mt-1" />
                  )}
                  <div>
                    <p className={`text-lg font-semibold ${
                      humanSummary.humanText.verdictType === 'positive'
                        ? 'text-green-400'
                        : humanSummary.humanText.verdictType === 'negative'
                          ? 'text-red-400'
                          : 'text-yellow-400'
                    }`}>
                      {humanSummary.humanText.verdictText}
                    </p>
                  </div>
                </div>
              </div>

              {/* Nota sobre pagos FuXion */}
              <div className="mt-4 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <Banknote className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-400">
                    <span className="text-emerald-400 font-medium">Nota sobre Pagos FuXion: </span>
                    {humanSummary.humanText.fuxionNoteText}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 p-4 bg-gray-900/50">
            <p className="text-xs text-gray-500 text-center">
              Gestión de Operaciones · Reporte informativo basado en registros del sistema
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Componente auxiliar para filas de métricas
const MetricRow = ({ label, value, color = 'white', negative = false }) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-400">{label}</span>
    <span className={`font-bold font-mono text-${color}-400`}>
      {negative ? '-' : ''}{formatCLP(Math.abs(value))}
    </span>
  </div>
);

export default EstadoDelNegocioModal;
