import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Package, DollarSign, Target, ArrowRight } from 'lucide-react';
import { formatCLP } from '@/lib/utils';

/**
 * DashboardSummary - Componente "WOW" de resumen ejecutivo
 * Muestra el estado del negocio de forma visual e intuitiva
 */
const DashboardSummary = ({
  inversionTotal,
  inventarioLista,
  inventarioCosto,
  capitalRecuperado,
  faltaPorRecuperar,
  porcentajeRecuperado,
  fase,
  margenPotencial
}) => {
  // Determinar color y emoji según fase
  const getFaseConfig = () => {
    if (porcentajeRecuperado >= 100) {
      return { color: 'emerald', emoji: '🎉', label: 'Ganancia', bgClass: 'from-emerald-500/20 to-emerald-600/10' };
    } else if (porcentajeRecuperado >= 50) {
      return { color: 'yellow', emoji: '📈', label: 'Avanzando', bgClass: 'from-yellow-500/20 to-yellow-600/10' };
    } else if (porcentajeRecuperado >= 25) {
      return { color: 'orange', emoji: '🔄', label: 'Recuperando', bgClass: 'from-orange-500/20 to-orange-600/10' };
    } else {
      return { color: 'blue', emoji: '🚀', label: 'Iniciando', bgClass: 'from-blue-500/20 to-blue-600/10' };
    }
  };

  const faseConfig = getFaseConfig();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${faseConfig.bgClass} p-6 mb-6`}
    >
      {/* Fondo decorativo */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative z-10">
        {/* Título de fase */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{faseConfig.emoji}</span>
          <span className={`text-sm font-bold uppercase tracking-wider text-${faseConfig.color}-400`}>
            Fase: {faseConfig.label}
          </span>
        </div>

        {/* Flujo principal: INVERTISTE → TIENES → ESTADO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Invertiste */}
          <div className="bg-black/20 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider mb-2">
              <DollarSign className="w-4 h-4" />
              Invertiste
            </div>
            <p className="text-2xl font-bold text-white">{formatCLP(inversionTotal)}</p>
            <p className="text-xs text-gray-500 mt-1">en productos</p>
          </div>

          {/* Flecha */}
          <div className="hidden md:flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-gray-600" />
          </div>

          {/* Tienes */}
          <div className="bg-black/20 rounded-xl p-4 border border-white/5 md:col-start-2">
            <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider mb-2">
              <Package className="w-4 h-4" />
              Tienes
            </div>
            <p className="text-2xl font-bold text-emerald-400">{formatCLP(inventarioLista)}</p>
            <p className="text-xs text-gray-500 mt-1">en inventario (precio venta)</p>
          </div>

          {/* Flecha */}
          <div className="hidden md:flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-gray-600" />
          </div>

          {/* Estado */}
          <div className="bg-black/20 rounded-xl p-4 border border-white/5 md:col-start-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider mb-2">
              <Target className="w-4 h-4" />
              Estado
            </div>
            <p className={`text-2xl font-bold ${faltaPorRecuperar > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
              {faltaPorRecuperar > 0 ? `-${porcentajeRecuperado.toFixed(0)}%` : `+${porcentajeRecuperado.toFixed(0)}%`}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {faltaPorRecuperar > 0 ? 'por recuperar' : 'en ganancia'}
            </p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-gray-400">Capital recuperado</span>
            <span className="text-white font-mono font-bold">
              {formatCLP(capitalRecuperado)} de {formatCLP(inversionTotal)}
            </span>
          </div>
          <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(porcentajeRecuperado, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full bg-gradient-to-r ${
                porcentajeRecuperado >= 100
                  ? 'from-emerald-500 to-emerald-400'
                  : porcentajeRecuperado >= 50
                    ? 'from-yellow-500 to-yellow-400'
                    : porcentajeRecuperado >= 25
                      ? 'from-orange-500 to-orange-400'
                      : 'from-blue-500 to-blue-400'
              }`}
            />
          </div>
          <div className="flex justify-between text-xs mt-2">
            <span className="text-gray-500">0%</span>
            <span className={`font-bold ${porcentajeRecuperado >= 100 ? 'text-emerald-400' : 'text-gray-400'}`}>
              {porcentajeRecuperado.toFixed(1)}%
            </span>
            <span className="text-gray-500">100%</span>
          </div>
        </div>

        {/* Mensaje motivacional */}
        <div className={`text-center py-3 rounded-xl bg-${faseConfig.color}-500/10 border border-${faseConfig.color}-500/20`}>
          {faltaPorRecuperar > 0 ? (
            <p className="text-sm text-gray-300">
              <span className="font-bold text-white">Falta recuperar: {formatCLP(faltaPorRecuperar)}</span>
              {margenPotencial > 0 && (
                <span className="text-gray-400 ml-2">
                  · Si vendes todo, ganarías ~{formatCLP(margenPotencial)}
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-emerald-400 font-bold">
              ¡Ya recuperaste tu inversión! Todo lo que vendas es ganancia pura.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardSummary;
