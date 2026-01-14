import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { History, TrendingUp, TrendingDown, Minus, ArrowRight, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUserCycles } from '@/lib/cycleService';

/**
 * Card de historial que muestra los últimos ciclos cerrados
 * Aparece en el dashboard principal
 */
const HistoryCard = ({ userId, onViewAll, refreshTrigger = 0 }) => {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadRecentCycles();
    }
  }, [userId, refreshTrigger]);

  const loadRecentCycles = async () => {
    setLoading(true);
    try {
      const { data } = await getUserCycles(userId, 3);
      if (data) {
        setCycles(data);
      }
    } catch (error) {
      console.error('[HistoryCard] Error loading cycles:', error);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getTrendIcon = (vs) => {
    if (vs === null || vs === undefined) return <Minus className="w-4 h-4 text-gray-500" />;
    if (vs > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (vs < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getTrendColor = (vs) => {
    if (vs === null || vs === undefined) return 'text-gray-500';
    if (vs > 0) return 'text-green-500';
    if (vs < 0) return 'text-red-500';
    return 'text-gray-500';
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <History className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Historial de Ciclos</h3>
            <p className="text-sm text-gray-400">Cargando...</p>
          </div>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-white/5 rounded-xl"></div>
          <div className="h-16 bg-white/5 rounded-xl"></div>
          <div className="h-16 bg-white/5 rounded-xl"></div>
        </div>
      </motion.div>
    );
  }

  if (cycles.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-900/20 to-gray-900/40 border border-purple-500/20 rounded-3xl p-6 backdrop-blur-sm"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <History className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Historial de Ciclos</h3>
            <p className="text-sm text-gray-400">Cierra tu primer ciclo para ver el historial</p>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
          <Lock className="w-12 h-12 text-purple-500/50 mx-auto mb-3" />
          <p className="text-gray-400 text-sm leading-relaxed">
            Aún no tienes ciclos cerrados.
            <br />
            Ve a tu perfil y selecciona <span className="text-yellow-400 font-semibold">"Cerrar Ciclo"</span> cuando termines un periodo.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-purple-900/20 to-gray-900/40 border border-purple-500/20 rounded-3xl p-6 backdrop-blur-sm shadow-xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <History className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Historial de Ciclos</h3>
            <p className="text-sm text-gray-400">Últimos periodos cerrados</p>
          </div>
        </div>
        <Button
          onClick={onViewAll}
          variant="ghost"
          className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
        >
          Ver Todo
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Ciclos Recientes */}
      <div className="space-y-3">
        {cycles.map((cycle, index) => (
          <motion.div
            key={cycle.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={onViewAll}
            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between">
              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-white font-semibold">{cycle.cycle_name}</h4>
                  <span className="text-xs text-gray-500">#{cycle.cycle_number}</span>
                </div>
                <p className="text-xs text-gray-400">
                  {formatDate(cycle.start_date)} → {formatDate(cycle.end_date)}
                </p>
              </div>

              {/* Métricas */}
              <div className="flex items-center gap-6">
                {/* Ganancia */}
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-0.5">Ganancia</p>
                  <p className={`text-sm font-bold ${
                    (cycle.net_profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {formatCurrency(cycle.net_profit)}
                  </p>
                </div>

                {/* Tendencia */}
                {cycle.profit_vs_previous !== null && (
                  <div className="flex items-center gap-1">
                    {getTrendIcon(cycle.profit_vs_previous)}
                    <span className={`text-xs font-semibold ${getTrendColor(cycle.profit_vs_previous)}`}>
                      {cycle.profit_vs_previous > 0 ? '+' : ''}
                      {cycle.profit_vs_previous?.toFixed(1)}%
                    </span>
                  </div>
                )}

                {/* Arrow */}
                <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 transition-colors" />
              </div>
            </div>

            {/* Métricas adicionales (opcional, colapsado) */}
            <div className="mt-3 pt-3 border-t border-white/5 flex gap-4 text-xs">
              <div>
                <span className="text-gray-500">Ventas:</span>
                <span className="text-gray-300 ml-1 font-semibold">{formatCurrency(cycle.total_sales)}</span>
              </div>
              <div>
                <span className="text-gray-500">Margen:</span>
                <span className="text-gray-300 ml-1 font-semibold">{cycle.profit_margin?.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-gray-500">ROI:</span>
                <span className="text-gray-300 ml-1 font-semibold">{cycle.roi_percentage?.toFixed(1)}%</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <Button
          onClick={onViewAll}
          variant="outline"
          className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:border-purple-500/50"
        >
          Ver Análisis Completo
        </Button>
      </div>
    </motion.div>
  );
};

export default HistoryCard;
