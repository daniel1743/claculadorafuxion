import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Package, AlertCircle } from 'lucide-react';

const colorClasses = {
  red: {
    bg: 'bg-gradient-to-br from-red-500/10 to-red-600/5',
    border: 'border-red-500/20',
    activeBorder: 'border-red-500/60',
    accent: 'text-red-400',
    badge: 'bg-red-500',
    badgeText: 'text-white',
    button: 'bg-red-500/20 hover:bg-red-500/30 text-red-400',
    glow: 'shadow-red-500/20'
  },
  green: {
    bg: 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5',
    border: 'border-emerald-500/20',
    activeBorder: 'border-emerald-500/60',
    accent: 'text-emerald-400',
    badge: 'bg-emerald-500',
    badgeText: 'text-white',
    button: 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400',
    glow: 'shadow-emerald-500/20'
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500/10 to-purple-600/5',
    border: 'border-purple-500/20',
    activeBorder: 'border-purple-500/60',
    accent: 'text-purple-400',
    badge: 'bg-purple-500',
    badgeText: 'text-white',
    button: 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400',
    glow: 'shadow-purple-500/20'
  },
  gold: {
    bg: 'bg-gradient-to-br from-yellow-500/10 to-yellow-600/5',
    border: 'border-yellow-500/20',
    activeBorder: 'border-yellow-500/60',
    accent: 'text-yellow-400',
    badge: 'bg-yellow-500',
    badgeText: 'text-black',
    button: 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400',
    glow: 'shadow-yellow-500/20'
  }
};

const ProductCard = ({
  product,        // {id, name, list_price/listPrice, current_stock_boxes/currentStockBoxes, points}
  quantity = 0,   // cantidad seleccionada
  onIncrement,    // callback click
  onDecrement,    // callback para restar
  colorTheme = 'green',
  disabled = false,
  showStock = true,
  delay = 0
}) => {
  const styles = colorClasses[colorTheme] || colorClasses.green;
  const hasQuantity = quantity > 0;

  // Soportar ambos formatos: snake_case (BD) y camelCase (formateado)
  const stock = product.current_stock_boxes ?? product.currentStockBoxes ?? 0;
  const listPrice = product.list_price ?? product.listPrice ?? 0;
  const points = product.points ?? 0;

  const isOutOfStock = showStock && stock <= 0;
  const isDisabled = disabled || isOutOfStock;

  const handleCardClick = (e) => {
    if (isDisabled) return;
    if (e.target.closest('.decrement-btn')) return;
    onIncrement?.(product);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (quantity > 0) {
      onDecrement?.(product);
    }
  };

  const formatPrice = (price) => {
    if (!price) return '';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(price);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={!isDisabled ? { y: -3, transition: { duration: 0.15 } } : {}}
      whileTap={!isDisabled ? { scale: 0.97 } : {}}
      onClick={handleCardClick}
      className={`
        relative p-4 rounded-xl border backdrop-blur-sm
        ${styles.bg}
        ${hasQuantity ? styles.activeBorder : styles.border}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${hasQuantity ? `shadow-lg ${styles.glow}` : ''}
        transition-all duration-200 select-none
        min-h-[120px] flex flex-col justify-between
      `}
    >
      {/* Badge de cantidad */}
      <AnimatePresence>
        {hasQuantity && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`
              absolute -top-2 -right-2 w-7 h-7 rounded-full
              ${styles.badge} ${styles.badgeText}
              flex items-center justify-center
              text-sm font-bold shadow-lg z-10
            `}
          >
            {quantity}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indicador sin stock */}
      {isOutOfStock && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl z-10">
          <div className="flex items-center gap-1 text-gray-400 text-xs font-medium">
            <AlertCircle className="w-3 h-3" />
            Sin stock
          </div>
        </div>
      )}

      {/* Info del producto */}
      <div className="flex-1">
        <h4 className="text-white font-semibold text-sm leading-tight line-clamp-2 mb-1">
          {product.name}
        </h4>
        <div className="flex items-center gap-2 flex-wrap">
          {listPrice > 0 && (
            <p className={`text-xs font-mono ${styles.accent}`}>
              {formatPrice(listPrice)}
            </p>
          )}
          {points > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-medium">
              {points} pts
            </span>
          )}
        </div>
      </div>

      {/* Footer: Stock + Botón decrementar */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
        {showStock && (
          <div className="flex items-center gap-1 text-gray-500 text-xs">
            <Package className="w-3 h-3" />
            <span>{stock} cajas</span>
          </div>
        )}

        <AnimatePresence>
          {hasQuantity && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              onClick={handleDecrement}
              className={`
                decrement-btn
                w-6 h-6 rounded-full
                ${styles.button}
                flex items-center justify-center
                transition-colors
              `}
            >
              <Minus className="w-3 h-3" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default ProductCard;
