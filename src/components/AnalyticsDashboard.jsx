import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Trophy, AlertTriangle, BarChart3, DollarSign, Percent, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCyclesComparison } from '@/lib/cycleService';

/**
 * Dashboard de Analytics Completo
 * Análisis profundo de ciclos históricos con comparaciones y métricas estratégicas
 */
const AnalyticsDashboard = ({ userId, isOpen, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(12); // 3, 6, 12 ciclos

  useEffect(() => {
    if (isOpen && userId) {
      loadAnalytics();
    }
  }, [isOpen, userId, timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const { data: analyticsData } = await getCyclesComparison(userId, timeRange);
      if (analyticsData) {
        setData(analyticsData);
      }
    } catch (error) {
      console.error('[AnalyticsDashboard] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getTrendText = (trend) => {
    switch (trend) {
      case 'growing':
        return { text: 'En Crecimiento', color: 'text-green-400', icon: TrendingUp };
      case 'declining':
        return { text: 'En Declive', color: 'text-red-400', icon: TrendingDown };
      default:
        return { text: 'Estable', color: 'text-gray-400', icon: BarChart3 };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-950 border border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-900/40 to-pink-900/40 border-b border-purple-500/30 p-6 backdrop-blur-md z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white">Analytics Estratégico</h2>
              <p className="text-sm text-gray-300 mt-1">
                Análisis profundo de rendimiento • Datos históricos acumulados
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Filtro de tiempo */}
              <div className="flex items-center gap-2 bg-black/30 rounded-lg p-1">
                <Button
                  onClick={() => setTimeRange(3)}
                  size="sm"
                  variant={timeRange === 3 ? "default" : "ghost"}
                  className={timeRange === 3 ? "bg-purple-600 text-white" : "text-gray-400"}
                >
                  3 ciclos
                </Button>
                <Button
                  onClick={() => setTimeRange(6)}
                  size="sm"
                  variant={timeRange === 6 ? "default" : "ghost"}
                  className={timeRange === 6 ? "bg-purple-600 text-white" : "text-gray-400"}
                >
                  6 ciclos
                </Button>
                <Button
                  onClick={() => setTimeRange(12)}
                  size="sm"
                  variant={timeRange === 12 ? "default" : "ghost"}
                  className={timeRange === 12 ? "bg-purple-600 text-white" : "text-gray-400"}
                >
                  12 ciclos
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Analizando datos históricos...</p>
            </div>
          ) : !data ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400">No hay suficientes datos para análisis.</p>
              <p className="text-sm text-gray-500 mt-2">Necesitas al menos 1 ciclo cerrado.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Resumen Principal */}
              <div className="grid grid-cols-4 gap-4">
                {/* Total de Ventas */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-green-900/30 to-green-950/30 border border-green-500/30 rounded-xl p-6"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-green-400 text-sm font-semibold">VENTAS TOTALES</span>
                    <DollarSign className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">
                    {formatCurrency(data.summary.totalSales)}
                  </p>
                  <p className="text-xs text-gray-400">En {data.summary.totalCycles} ciclos</p>
                </motion.div>

                {/* Total de Ganancias */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`bg-gradient-to-br ${
                    data.summary.totalProfit >= 0
                      ? 'from-blue-900/30 to-blue-950/30 border-blue-500/30'
                      : 'from-red-900/30 to-red-950/30 border-red-500/30'
                  } border rounded-xl p-6`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`${
                      data.summary.totalProfit >= 0 ? 'text-blue-400' : 'text-red-400'
                    } text-sm font-semibold`}>
                      GANANCIA NETA
                    </span>
                    <TrendingUp className={`w-5 h-5 ${
                      data.summary.totalProfit >= 0 ? 'text-blue-500' : 'text-red-500'
                    }`} />
                  </div>
                  <p className={`text-3xl font-bold mb-1 ${
                    data.summary.totalProfit >= 0 ? 'text-white' : 'text-red-400'
                  }`}>
                    {formatCurrency(data.summary.totalProfit)}
                  </p>
                  <p className="text-xs text-gray-400">Acumulado histórico</p>
                </motion.div>

                {/* Margen Promedio */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-purple-900/30 to-purple-950/30 border border-purple-500/30 rounded-xl p-6"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-purple-400 text-sm font-semibold">MARGEN PROMEDIO</span>
                    <Percent className="w-5 h-5 text-purple-500" />
                  </div>
                  <p className="text-3xl font-bold text-white mb-1">
                    {data.summary.avgMargin?.toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400">Rentabilidad media</p>
                </motion.div>

                {/* Tendencia */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-yellow-900/30 to-yellow-950/30 border border-yellow-500/30 rounded-xl p-6"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-yellow-400 text-sm font-semibold">TENDENCIA</span>
                    <Calendar className="w-5 h-5 text-yellow-500" />
                  </div>
                  <p className={`text-2xl font-bold mb-1 ${getTrendText(data.summary.trend).color}`}>
                    {getTrendText(data.summary.trend).text}
                  </p>
                  <p className="text-xs text-gray-400">Últimos 3 vs anteriores</p>
                </motion.div>
              </div>

              {/* Mejores y Peores Ciclos */}
              <div className="grid grid-cols-2 gap-6">
                {/* Mejor Ciclo */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gradient-to-br from-green-900/20 to-gray-900/40 border border-green-500/30 rounded-xl p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-green-500/20">
                      <Trophy className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Mejor Ciclo</h3>
                      <p className="text-sm text-gray-400">Mayor ganancia histórica</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Ciclo</p>
                      <p className="text-white font-semibold">{data.summary.bestCycle.cycle_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Ganancia</p>
                      <p className="text-2xl font-bold text-green-400">
                        {formatCurrency(data.summary.bestCycle.net_profit)}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Ventas</p>
                        <p className="text-white font-semibold">
                          {formatCurrency(data.summary.bestCycle.total_sales)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Margen</p>
                        <p className="text-white font-semibold">
                          {data.summary.bestCycle.profit_margin?.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">ROI</p>
                        <p className="text-white font-semibold">
                          {data.summary.bestCycle.roi_percentage?.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Peor Ciclo */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gradient-to-br from-red-900/20 to-gray-900/40 border border-red-500/30 rounded-xl p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-lg bg-red-500/20">
                      <AlertTriangle className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Ciclo más Bajo</h3>
                      <p className="text-sm text-gray-400">Menor ganancia histórica</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Ciclo</p>
                      <p className="text-white font-semibold">{data.summary.worstCycle.cycle_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Ganancia</p>
                      <p className={`text-2xl font-bold ${
                        data.summary.worstCycle.net_profit >= 0 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(data.summary.worstCycle.net_profit)}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Ventas</p>
                        <p className="text-white font-semibold">
                          {formatCurrency(data.summary.worstCycle.total_sales)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Margen</p>
                        <p className="text-white font-semibold">
                          {data.summary.worstCycle.profit_margin?.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">ROI</p>
                        <p className="text-white font-semibold">
                          {data.summary.worstCycle.roi_percentage?.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Tabla Comparativa de Todos los Ciclos */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gray-900/40 border border-white/10 rounded-xl overflow-hidden"
              >
                <div className="p-4 bg-gradient-to-r from-purple-900/30 to-gray-900/30 border-b border-white/10">
                  <h3 className="text-lg font-bold text-white">Comparación Detallada</h3>
                  <p className="text-sm text-gray-400">Todos los ciclos en orden cronológico</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="text-left p-3 text-gray-400 font-semibold">Ciclo</th>
                        <th className="text-right p-3 text-gray-400 font-semibold">Ventas</th>
                        <th className="text-right p-3 text-gray-400 font-semibold">Compras</th>
                        <th className="text-right p-3 text-gray-400 font-semibold">Publicidad</th>
                        <th className="text-right p-3 text-gray-400 font-semibold">Ganancia</th>
                        <th className="text-right p-3 text-gray-400 font-semibold">Margen</th>
                        <th className="text-right p-3 text-gray-400 font-semibold">vs Anterior</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.cycles.map((cycle, index) => (
                        <tr
                          key={cycle.id}
                          className="border-t border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="p-3">
                            <p className="text-white font-semibold">{cycle.cycle_name}</p>
                            <p className="text-xs text-gray-500">#{cycle.cycle_number}</p>
                          </td>
                          <td className="p-3 text-right text-green-400 font-semibold">
                            {formatCurrency(cycle.total_sales)}
                          </td>
                          <td className="p-3 text-right text-red-400">
                            {formatCurrency(cycle.total_purchases)}
                          </td>
                          <td className="p-3 text-right text-blue-400">
                            {formatCurrency(cycle.total_advertising)}
                          </td>
                          <td className={`p-3 text-right font-bold ${
                            cycle.net_profit >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatCurrency(cycle.net_profit)}
                          </td>
                          <td className="p-3 text-right text-purple-400 font-semibold">
                            {cycle.profit_margin?.toFixed(1)}%
                          </td>
                          <td className="p-3 text-right">
                            {cycle.profit_vs_previous !== null ? (
                              <span className={`font-semibold ${
                                cycle.profit_vs_previous > 0 ? 'text-green-400' : cycle.profit_vs_previous < 0 ? 'text-red-400' : 'text-gray-400'
                              }`}>
                                {cycle.profit_vs_previous > 0 ? '+' : ''}
                                {cycle.profit_vs_previous?.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* Insights y Recomendaciones */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-6"
              >
                <h3 className="text-lg font-bold text-white mb-4">Insights Estratégicos</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-yellow-400 font-semibold mb-2">📈 Observaciones:</p>
                    <ul className="space-y-1 text-gray-300">
                      <li>• Tu tendencia es: <span className={getTrendText(data.summary.trend).color}>{getTrendText(data.summary.trend).text}</span></li>
                      <li>• Margen promedio: {data.summary.avgMargin?.toFixed(1)}%</li>
                      <li>• Mejor ciclo: {data.summary.bestCycle.cycle_name}</li>
                      <li>• Ganancias totales: {formatCurrency(data.summary.totalProfit)}</li>
                    </ul>
                  </div>
                  <div>
                    <p className="text-yellow-400 font-semibold mb-2">💡 Recomendaciones:</p>
                    <ul className="space-y-1 text-gray-300">
                      {data.summary.trend === 'growing' && (
                        <>
                          <li>• Mantén la estrategia actual</li>
                          <li>• Considera escalar inversión</li>
                        </>
                      )}
                      {data.summary.trend === 'declining' && (
                        <>
                          <li>• Revisa estrategia de ventas</li>
                          <li>• Optimiza costos de publicidad</li>
                        </>
                      )}
                      <li>• Analiza ciclos exitosos</li>
                      <li>• Replica mejores prácticas</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AnalyticsDashboard;
