import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Coffee, Gift, RotateCcw, FileText, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ProductCardGrid from '@/components/ProductCardGrid';
import CartSummaryPanel from '@/components/CartSummaryPanel';
import { addTransactionV2 } from '@/lib/transactionServiceV2';

console.log('%c📦 ExitModuleCards CARGADO', 'background: #8b5cf6; color: #fff; font-size: 14px; padding: 5px;');

const ExitModuleCards = ({
  onAdd,
  products = [],
  onReloadProducts
}) => {
  const { toast } = useToast();

  // Tipo de salida: consumo personal o muestra de marketing
  const [exitType, setExitType] = useState('personal_consumption');

  // Estado de cantidades seleccionadas {productId: quantity}
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState('');

  // Configuración por tipo
  const config = {
    personal_consumption: {
      title: 'Consumo Personal',
      icon: Coffee,
      color: 'purple',
      description: 'Productos que consumiste tú',
      confirmLabel: 'Registrar Consumo',
      successMessage: 'Consumo registrado'
    },
    marketing_sample: {
      title: 'Muestra de Marketing',
      icon: Gift,
      color: 'gold',
      description: 'Muestras o regalos que diste',
      confirmLabel: 'Registrar Muestra',
      successMessage: 'Muestra registrada'
    }
  };

  const currentConfig = config[exitType];

  // Items del carrito
  const cartItems = useMemo(() => {
    return Object.entries(selectedQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => {
        const product = products.find(p => p.id === productId);
        if (!product) return null;
        return {
          product,
          quantity,
          unitPrice: 0, // Salidas no tienen precio
          subtotal: 0
        };
      })
      .filter(Boolean);
  }, [selectedQuantities, products]);

  // Total de unidades
  const totalUnidades = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartItems]);

  // Handlers (soportar ambos formatos de stock)
  const handleQuantityChange = useCallback((product, newQty) => {
    const stock = product.current_stock_boxes ?? product.currentStockBoxes ?? 0;

    // No permitir más del stock disponible
    if (newQty > stock) {
      return;
    }

    setSelectedQuantities(prev => {
      if (newQty <= 0) {
        const { [product.id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [product.id]: newQty };
    });
  }, []);

  const handleIncrement = useCallback((product) => {
    const currentQty = selectedQuantities[product.id] || 0;
    const stock = product.current_stock_boxes ?? product.currentStockBoxes ?? 0;

    if (currentQty >= stock) {
      toast({
        title: "Stock Insuficiente",
        description: `Solo tienes ${stock} caja(s) de ${product.name}`,
        variant: "destructive"
      });
      return;
    }

    handleQuantityChange(product, currentQty + 1);
  }, [selectedQuantities, handleQuantityChange, toast]);

  const handleDecrement = useCallback((product) => {
    const currentQty = selectedQuantities[product.id] || 0;
    handleQuantityChange(product, Math.max(0, currentQty - 1));
  }, [selectedQuantities, handleQuantityChange]);

  const handleRemove = useCallback((product) => {
    handleQuantityChange(product, 0);
  }, [handleQuantityChange]);

  const handleClear = useCallback(() => {
    setSelectedQuantities({});
    setNotes('');
  }, []);

  // Cambiar tipo de salida
  const handleTypeChange = (type) => {
    setExitType(type);
    setSelectedQuantities({});
    setNotes('');
  };

  // Confirmar salida
  const handleConfirmExit = async () => {
    if (cartItems.length === 0) {
      toast({ title: "Sin productos", description: "Selecciona al menos un producto", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const transactionsToAdd = [];

      // Crear transacción por cada producto (usar productName, no product_id)
      for (const item of cartItems) {
        const exitData = {
          type: exitType,
          productName: item.product.name,
          quantityBoxes: item.quantity,
          totalAmount: 0,
          listPrice: item.product.list_price ?? item.product.listPrice ?? 0,
          notes: notes || ''
        };

        const { data, error } = await addTransactionV2(exitData);
        if (error) throw error;
        transactionsToAdd.push(data);
      }

      // Callback
      if (onAdd && transactionsToAdd.length > 0) {
        await onAdd(transactionsToAdd);
      }

      // Recargar productos
      if (onReloadProducts) {
        await onReloadProducts();
      }

      toast({
        title: currentConfig.successMessage,
        description: `${cartItems.length} producto(s) registrado(s)`,
        className: exitType === 'personal_consumption'
          ? "bg-purple-900 border-purple-600 text-white"
          : "bg-yellow-900 border-yellow-600 text-white"
      });

      handleClear();

    } catch (error) {
      console.error('[ExitModuleCards] Error:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la salida",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Solo productos con stock (soportar ambos formatos)
  const productsWithStock = useMemo(() => {
    return products.filter(p => (p.current_stock_boxes ?? p.currentStockBoxes ?? 0) > 0);
  }, [products]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className={`w-1 h-6 rounded-full ${exitType === 'personal_consumption' ? 'bg-purple-500' : 'bg-yellow-500'}`}></span>
          {React.createElement(currentConfig.icon, { className: `w-5 h-5 ${exitType === 'personal_consumption' ? 'text-purple-400' : 'text-yellow-400'}` })}
          {currentConfig.title}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-gray-500 hover:text-white"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          Limpiar
        </Button>
      </div>

      {/* Toggle tipo de salida */}
      <div className="flex gap-2">
        <button
          onClick={() => handleTypeChange('personal_consumption')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            exitType === 'personal_consumption'
              ? 'bg-purple-500/20 text-purple-400 border-2 border-purple-500/50'
              : 'bg-gray-800/50 text-gray-400 border border-white/5 hover:border-white/20'
          }`}
        >
          <Coffee className="w-4 h-4" />
          Consumo Personal
        </button>
        <button
          onClick={() => handleTypeChange('marketing_sample')}
          className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            exitType === 'marketing_sample'
              ? 'bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/50'
              : 'bg-gray-800/50 text-gray-400 border border-white/5 hover:border-white/20'
          }`}
        >
          <Gift className="w-4 h-4" />
          Muestra Marketing
        </button>
      </div>

      {/* Grid de productos */}
      <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-4">
        <p className="text-xs text-gray-500 mb-3">{currentConfig.description}</p>
        {productsWithStock.length > 0 ? (
          <ProductCardGrid
            products={productsWithStock}
            selectedQuantities={selectedQuantities}
            onQuantityChange={handleQuantityChange}
            colorTheme={currentConfig.color}
            showStock={true}
            validateStock={true}
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No hay productos con stock disponible</p>
          </div>
        )}
      </div>

      {/* Panel de opciones y resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Notas */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
              Notas (opcional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-${currentConfig.color === 'gold' ? 'yellow' : currentConfig.color}-500/20 focus:border-${currentConfig.color === 'gold' ? 'yellow' : currentConfig.color}-500/50 outline-none resize-none h-24`}
                placeholder={exitType === 'personal_consumption'
                  ? "Ej: Consumí para probar el sabor nuevo..."
                  : "Ej: Regalo para cliente potencial..."
                }
              />
            </div>
          </div>

          {/* Resumen */}
          <div className={`rounded-xl p-4 border ${exitType === 'personal_consumption' ? 'bg-purple-500/5 border-purple-500/20' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
            <div className="flex items-center gap-2 mb-2">
              {React.createElement(currentConfig.icon, { className: `w-4 h-4 ${exitType === 'personal_consumption' ? 'text-purple-400' : 'text-yellow-400'}` })}
              <span className="text-sm text-gray-300">{currentConfig.title}</span>
            </div>
            <p className="text-xs text-gray-500">
              {exitType === 'personal_consumption'
                ? "Estos productos se descontarán de tu inventario para uso personal."
                : "Estos productos se descontarán como inversión en marketing."
              }
            </p>
          </div>
        </div>

        {/* Panel del carrito */}
        <CartSummaryPanel
          items={cartItems}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onRemove={handleRemove}
          onConfirm={handleConfirmExit}
          onClear={handleClear}
          colorTheme={currentConfig.color}
          totalLabel="Total Unidades"
          confirmLabel={currentConfig.confirmLabel}
          isLoading={isLoading}
          showPrices={false}
        />
      </div>
    </motion.div>
  );
};

export default ExitModuleCards;
