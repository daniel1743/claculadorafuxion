import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Clock, X, Crown, Calendar } from 'lucide-react';

const SubscriptionBanner = ({ subscriptionStatus, daysRemaining, expiresAt, onDismiss }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // No mostrar nada si está activo con más de 7 días
  if (subscriptionStatus === 'active' && daysRemaining > 7) return null;

  // No mostrar para plan perpetuo
  if (daysRemaining === Infinity) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  // Configuración según el estado
  let config = {
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    textColor: 'text-yellow-400',
    icon: Clock,
    title: 'Tu suscripción está por vencer',
    message: `Te quedan ${daysRemaining} días de acceso.`,
    showClose: true
  };

  if (subscriptionStatus === 'grace_period') {
    config = {
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      textColor: 'text-orange-400',
      icon: AlertTriangle,
      title: 'Período de gracia activo',
      message: `Tu suscripción expiró. Tienes ${daysRemaining} días de gracia restantes.`,
      showClose: true
    };
  }

  if (subscriptionStatus === 'expired') {
    config = {
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-400',
      icon: AlertTriangle,
      title: 'Suscripción expirada',
      message: 'Tu acceso ha expirado. Contacta al administrador para renovar.',
      showClose: false
    };
  }

  if (subscriptionStatus === 'none') {
    config = {
      bgColor: 'bg-gray-500/10',
      borderColor: 'border-gray-500/30',
      textColor: 'text-gray-400',
      icon: Crown,
      title: 'Sin suscripción activa',
      message: 'No tienes un plan activo. Contacta al administrador.',
      showClose: false
    };
  }

  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`${config.bgColor} ${config.borderColor} border rounded-xl p-4 mb-4 relative`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`w-5 h-5 ${config.textColor}`} />
          </div>

          <div className="flex-1">
            <h4 className={`font-bold ${config.textColor}`}>{config.title}</h4>
            <p className="text-sm text-gray-400 mt-1">{config.message}</p>

            {expiresAt && subscriptionStatus !== 'none' && (
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                <Calendar className="w-3 h-3" />
                <span>Fecha de expiración: {new Date(expiresAt).toLocaleDateString('es-CL')}</span>
              </div>
            )}
          </div>

          {config.showClose && (
            <button
              onClick={handleDismiss}
              className="text-gray-500 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Barra de progreso para días restantes */}
        {subscriptionStatus !== 'expired' && subscriptionStatus !== 'none' && daysRemaining <= 7 && (
          <div className="mt-3 h-1 bg-black/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(0, (daysRemaining / 7) * 100)}%` }}
              className={`h-full ${subscriptionStatus === 'grace_period' ? 'bg-orange-500' : 'bg-yellow-500'}`}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default SubscriptionBanner;
