import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Trash2, Check, X, ChevronDown, ChevronUp, Loader2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

const colorClasses = {
  red: {
    bg: 'bg-red-500/5',
    border: 'border-red-500/20',
    accent: 'text-red-400',
    button: 'bg-red-600 hover:bg-red-700',
    itemBg: 'bg-red-500/10',
    itemBorder: 'border-red-500/20'
  },
  green: {
    bg: 'bg-emerald-500/5',
    border: 'border-emerald-500/20',
    accent: 'text-emerald-400',
    button: 'bg-emerald-600 hover:bg-emerald-700',
    itemBg: 'bg-emerald-500/10',
    itemBorder: 'border-emerald-500/20'
  },
  purple: {
    bg: 'bg-purple-500/5',
    border: 'border-purple-500/20',
    accent: 'text-purple-400',
    button: 'bg-purple-600 hover:bg-purple-700',
    itemBg: 'bg-purple-500/10',
    itemBorder: 'border-purple-500/20'
  },
  gold: {
    bg: 'bg-yellow-500/5',
    border: 'border-yellow-500/20',
    accent: 'text-yellow-400',
    button: 'bg-yellow-600 hover:bg-yellow-700',
    itemBg: 'bg-yellow-500/10',
    itemBorder: 'border-yellow-500/20'
  }
};

const CartSummaryPanel = ({
  items = [],             // [{product, quantity, unitPrice, subtotal}]
  onIncrement,            // (product) => void
  onDecrement,            // (product) => void
  onRemove,               // (product) => void
  onConfirm,              // () => void
  onClear,                // () => void
  colorTheme = 'green',
  totalLabel = 'Total',
  confirmLabel = 'Confirmar',
  isLoading = false,
  showPrices = true,
  customTotal = null,
  extraContent = null
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const styles = colorClasses[colorTheme] || colorClasses.green;

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = customTotal !== null
    ? customTotal
    : items.reduce((sum, item) => sum + (item.subtotal || 0), 0);

  const hasItems = items.length > 0;
  const displayItems = isExpanded ? items : items.slice(0, 3);
  const hasMoreItems = items.length > 3;

  const formatPrice = (price) => {
    if (!price) return '$0';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(price);
  };

  if (!hasItems) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border ${styles.border} ${styles.bg} p-6`}
      >
        <div className="flex flex-col items-center justify-center text-gray-500 py-4">
          <ShoppingCart className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm text-center">Haz click en los productos para agregarlos</p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${styles.border} ${styles.bg} overflow-hidden`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <ShoppingCart className={`w-5 h-5 ${styles.accent}`} />
          <div className={`text-lg font-bold ${styles.accent}`}>
            {totalQuantity}
          </div>
          <span className="text-gray-400 text-sm">
            {totalQuantity === 1 ? 'producto' : 'productos'}
          </span>
        </div>

        <button
          onClick={onClear}
          className="text-gray-500 hover:text-red-400 transition-colors p-1"
          title="Limpiar selección"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Lista de items */}
      <div className="p-3 space-y-2 max-h-[280px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {displayItems.map((item) => (
            <motion.div
              key={item.product.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className={`flex items-center justify-between p-3 rounded-lg ${styles.itemBg} border ${styles.itemBorder}`}
            >
              <div className="flex-1 min-w-0 mr-2">
                <p className="text-white text-sm font-medium truncate">
                  {item.product.name}
                </p>
                {showPrices && item.unitPrice > 0 && (
                  <p className="text-gray-500 text-xs">
                    {formatPrice(item.unitPrice)} c/u
                  </p>
                )}
              </div>

              {/* Controles de cantidad */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onDecrement(item.product)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>

                <span className={`w-8 text-center font-bold ${styles.accent}`}>
                  {item.quantity}
                </span>

                <button
                  onClick={() => onIncrement(item.product)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>

                <button
                  onClick={() => onRemove(item.product)}
                  className="w-7 h-7 rounded-full hover:bg-red-500/20 flex items-center justify-center text-gray-500 hover:text-red-400 transition-colors ml-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Ver más/menos */}
        {hasMoreItems && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center gap-1 text-gray-500 hover:text-gray-300 text-xs py-2 transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Ver menos
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Ver {items.length - 3} más
              </>
            )}
          </button>
        )}
      </div>

      {/* Total y Confirmar */}
      <div className="p-4 border-t border-white/5 space-y-3">
        {showPrices && totalAmount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">{totalLabel}</span>
            <span className={`text-xl font-bold ${styles.accent} font-mono`}>
              {formatPrice(totalAmount)}
            </span>
          </div>
        )}

        {extraContent}

        <Button
          onClick={onConfirm}
          disabled={isLoading || !hasItems}
          className={`w-full h-12 ${styles.button} text-white rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Check className="w-5 h-5 mr-2" />
              {confirmLabel}
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default CartSummaryPanel;
