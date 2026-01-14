import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Minus, BarChart3, Calendar, DollarSign, ShoppingCart, Megaphone, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUserCycles } from '@/lib/cycleService';

/**
 * Vista completa del historial de ciclos
 * Muestra todos los ciclos cerrados con opción de ver analytics
 */
const CyclesHistoryView = ({ userId, isOpen, onClose, onViewAnalytics }) => {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState(null);

  useEffect(() => {
    if (isOpen && userId) {
      loadAllCycles();
    }
  }, [isOpen, userId]);

  const loadAllCycles = async () => {
    setLoading(true);
    try {
      const { data } = await getUserCycles(userId);
      if (data) {
        setCycles(data);
      }
    } catch (error) {
      console.error('[CyclesHistoryView] Error:', error);
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
    if (vs === null || vs === undefined) return <Minus className="w-4 h-4" />;
    if (vs > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (vs < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-gradient-to-br from-gray-900 to-gray-950 border border-purple-500/30 rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-900/30 to-gray-900/30 border-b border-purple-500/20 p-6 backdrop-blur-sm z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Historial de Ciclos</h2>
              <p className="text-sm text-gray-400 mt-1">
                {cycles.length} ciclos cerrados • Análisis completo de tu negocio
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={onViewAnalytics}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                Ver Analytics
              </Button>
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
              <p className="text-gray-400">Cargando ciclos...</p>
            </div>
          ) : cycles.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400">No tienes ciclos cerrados aún.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {cycles.map((cycle, index) => (
                <motion.div
                  key={cycle.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 border border-white/10 rounded-xl p-6 hover:border-purple-500/30 transition-all cursor-pointer group"
                  onClick={() => setSelectedCycle(selectedCycle?.id === cycle.id ? null : cycle)}
                >
                  {/* Header del ciclo */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-white">{cycle.cycle_name}</h3>
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded-lg">
                          #{cycle.cycle_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(cycle.start_date)} → {formatDate(cycle.end_date)}
                      </div>
                    </div>

                    {/* Ganancia principal */}
                    <div className="text-right">
                      <p className="text-sm text-gray-500 mb-1">Ganancia Neta</p>
                      <p className={`text-3xl font-bold ${
                        (cycle.net_profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(cycle.net_profit)}
                      </p>
                      {cycle.profit_vs_previous !== null && (
                        <div className="flex items-center justify-end gap-1 mt-1">
                          {getTrendIcon(cycle.profit_vs_previous)}
                          <span className={`text-sm font-semibold ${
                            cycle.profit_vs_previous > 0 ? 'text-green-500' : cycle.profit_vs_previous < 0 ? 'text-red-500' : 'text-gray-500'
                          }`}>
                            {cycle.profit_vs_previous > 0 ? '+' : ''}
                            {cycle.profit_vs_previous?.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Métricas Grid */}
                  <div className="grid grid-cols-4 gap-4">
                    {/* Ventas */}
                    <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-400 mb-2">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-xs font-semibold">VENTAS</span>
                      </div>
                      <p className="text-lg font-bold text-white">{formatCurrency(cycle.total_sales)}</p>
                      <p className="text-xs text-gray-400 mt-1">{cycle.total_sales_count} transacciones</p>
                    </div>

                    {/* Compras */}
                    <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-red-400 mb-2">
                        <ShoppingCart className="w-4 h-4" />
                        <span className="text-xs font-semibold">COMPRAS</span>
                      </div>
                      <p className="text-lg font-bold text-white">{formatCurrency(cycle.total_purchases)}</p>
                      <p className="text-xs text-gray-400 mt-1">{cycle.total_purchases_count} transacciones</p>
                    </div>

                    {/* Publicidad */}
                    <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-blue-400 mb-2">
                        <Megaphone className="w-4 h-4" />
                        <span className="text-xs font-semibold">PUBLICIDAD</span>
                      </div>
                      <p className="text-lg font-bold text-white">{formatCurrency(cycle.total_advertising)}</p>
                      <p className="text-xs text-gray-400 mt-1">{cycle.total_advertising_count} campañas</p>
                    </div>

                    {/* Margen/ROI */}
                    <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-purple-400 mb-2">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs font-semibold">MARGEN</span>
                      </div>
                      <p className="text-lg font-bold text-white">{cycle.profit_margin?.toFixed(1)}%</p>
                      <p className="text-xs text-gray-400 mt-1">ROI: {cycle.roi_percentage?.toFixed(1)}%</p>
                    </div>
                  </div>

                  {/* Detalles expandibles */}
                  {selectedCycle?.id === cycle.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 pt-6 border-t border-white/10"
                    >
                      <div className="grid grid-cols-2 gap-6">
                        {/* Productos */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-400 mb-3">Top Productos</h4>
                          <div className="space-y-2">
                            {cycle.products_sold?.slice(0, 5).map((product, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-gray-300">{product.name}</span>
                                <span className="text-gray-400">{product.quantity} vendidos</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Campañas */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-400 mb-3">Campañas</h4>
                          <div className="space-y-2">
                            {cycle.campaigns?.slice(0, 5).map((campaign, idx) => (
                              <div key={idx} className="flex items-center justify-between text-sm">
                                <span className="text-gray-300">{campaign.name}</span>
                                <span className={`font-semibold ${campaign.roi > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  ROI: {campaign.roi?.toFixed(1)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Notas */}
                      {cycle.notes && (
                        <div className="mt-4 p-4 bg-white/5 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Notas:</p>
                          <p className="text-sm text-gray-300">{cycle.notes}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default CyclesHistoryView;
