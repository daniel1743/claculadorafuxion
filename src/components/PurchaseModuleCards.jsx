import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Truck, Gift, RotateCcw, DollarSign, Hash, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ProductCardGrid from '@/components/ProductCardGrid';
import CartSummaryPanel from '@/components/CartSummaryPanel';
import { addTransactionV2 } from '@/lib/transactionServiceV2';

console.log('%c🛒 PurchaseModuleCards CARGADO', 'background: #ef4444; color: #fff; font-size: 14px; padding: 5px;');

const PurchaseModuleCards = ({
  onAdd,
  prices = {},
  products = [],
  onReloadProducts
}) => {
  const { toast } = useToast();

  // Estado de cantidades seleccionadas {productId: quantity}
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Opciones adicionales
  const [includeDelivery, setIncludeDelivery] = useState(false);
  const [includeGifts, setIncludeGifts] = useState(false);
  const [gifts, setGifts] = useState([{ productId: '', quantity: 1 }]);

  // Precio de delivery desde prices
  const deliveryPrice = useMemo(() => {
    const deliveryKeys = ['delivery', 'Delivery', 'DELIVERY', 'envio', 'Envio', 'despacho', 'Despacho'];
    for (const key of deliveryKeys) {
      if (prices[key] !== undefined) return prices[key];
    }
    return 0;
  }, [prices]);

  // Items del carrito (soportar ambos formatos de precio)
  const cartItems = useMemo(() => {
    return Object.entries(selectedQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, quantity]) => {
        const product = products.find(p => p.id === productId);
        if (!product) return null;
        const unitPrice = product.list_price ?? product.listPrice ?? 0;
        return {
          product,
          quantity,
          unitPrice,
          subtotal: quantity * unitPrice
        };
      })
      .filter(Boolean);
  }, [selectedQuantities, products]);

  // Total productos
  const totalProductos = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cartItems]);

  // Total con delivery
  const totalInversion = useMemo(() => {
    const delivery = includeDelivery ? deliveryPrice : 0;
    return totalProductos + delivery;
  }, [totalProductos, includeDelivery, deliveryPrice]);

  // Valor de regalos (soportar ambos formatos de precio)
  const valorRegalos = useMemo(() => {
    if (!includeGifts) return 0;
    return gifts.reduce((sum, gift) => {
      if (!gift.productId || !gift.quantity) return sum;
      const product = products.find(p => p.id === gift.productId);
      if (!product) return sum;
      const price = product.list_price ?? product.listPrice ?? 0;
      return sum + price * gift.quantity;
    }, 0);
  }, [includeGifts, gifts, products]);

  // Handlers
  const handleQuantityChange = useCallback((product, newQty) => {
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
    handleQuantityChange(product, currentQty + 1);
  }, [selectedQuantities, handleQuantityChange]);

  const handleDecrement = useCallback((product) => {
    const currentQty = selectedQuantities[product.id] || 0;
    handleQuantityChange(product, Math.max(0, currentQty - 1));
  }, [selectedQuantities, handleQuantityChange]);

  const handleRemove = useCallback((product) => {
    handleQuantityChange(product, 0);
  }, [handleQuantityChange]);

  const handleClear = useCallback(() => {
    setSelectedQuantities({});
    setIncludeDelivery(false);
    setIncludeGifts(false);
    setGifts([{ productId: '', quantity: 1 }]);
  }, []);

  // Gestión de regalos
  const addGift = () => {
    setGifts([...gifts, { productId: '', quantity: 1 }]);
  };

  const removeGift = (index) => {
    if (gifts.length > 1) {
      setGifts(gifts.filter((_, i) => i !== index));
    } else {
      setGifts([{ productId: '', quantity: 1 }]);
    }
  };

  const updateGift = (index, field, value) => {
    const newGifts = [...gifts];
    newGifts[index] = { ...newGifts[index], [field]: value };
    setGifts(newGifts);
  };

  // Confirmar compra
  const handleConfirmPurchase = async () => {
    if (cartItems.length === 0) {
      toast({ title: "Sin productos", description: "Selecciona al menos un producto", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const transactionsToAdd = [];

      // 1. Transacciones de compra por cada producto
      // Si hay delivery, distribuirlo proporcionalmente entre los productos
      const deliveryCost = (includeDelivery && deliveryPrice > 0) ? deliveryPrice : 0;
      const totalBoxes = cartItems.reduce((sum, item) => sum + item.quantity, 0);

      for (const item of cartItems) {
        // Calcular porción de delivery para este producto (proporcional a cantidad)
        const deliveryPortion = totalBoxes > 0
          ? Math.round((item.quantity / totalBoxes) * deliveryCost)
          : 0;

        const purchaseData = {
          type: 'purchase',
          productName: item.product.name,
          quantityBoxes: item.quantity,
          totalAmount: item.subtotal + deliveryPortion,
          listPrice: item.unitPrice,
          notes: deliveryPortion > 0 ? `Incluye $${deliveryPortion.toLocaleString()} de delivery` : ''
        };

        const { data, error } = await addTransactionV2(purchaseData);
        if (error) throw error;
        transactionsToAdd.push(data);
      }

      // 3. Transacciones de regalos de FuXion (entran al inventario gratis = compra con monto 0)
      if (includeGifts) {
        for (const gift of gifts) {
          if (gift.productId && gift.quantity > 0) {
            const product = products.find(p => p.id === gift.productId);
            if (product) {
              const giftData = {
                type: 'purchase',
                productName: product.name,
                quantityBoxes: gift.quantity,
                totalAmount: 0, // Gratis
                listPrice: product.list_price ?? product.listPrice ?? 0,
                notes: 'Regalo de FuXion (gratis)'
              };

              const { data, error } = await addTransactionV2(giftData);
              if (error) console.error('Error en regalo:', error);
              else transactionsToAdd.push(data);
            }
          }
        }
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
        title: "✅ Compra Registrada",
        description: `${cartItems.length} producto(s) agregado(s) al inventario`,
        className: "bg-green-900 border-green-600 text-white"
      });

      handleClear();

    } catch (error) {
      console.error('[PurchaseModuleCards] Error:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la compra",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Formato de precio
  const formatPrice = (price) => {
    if (!price) return '$0';
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(price);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-1 h-6 bg-red-500 rounded-full"></span>
          <ShoppingCart className="w-5 h-5 text-red-400" />
          Nueva Compra
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

      {/* Grid de productos */}
      <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-4">
        <p className="text-xs text-gray-500 mb-3">Click en los productos que compraste</p>
        <ProductCardGrid
          products={products}
          selectedQuantities={selectedQuantities}
          onQuantityChange={handleQuantityChange}
          colorTheme="red"
          showStock={false}
          validateStock={false}
        />
      </div>

      {/* Panel de opciones y resumen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Opciones adicionales */}
        <div className="space-y-4">
          {/* Toggle Delivery */}
          <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/10">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDelivery}
                onChange={(e) => setIncludeDelivery(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500"
              />
              <span className="text-sm text-gray-300 flex items-center gap-2">
                <Truck className="w-4 h-4 text-red-400" />
                Incluir Delivery
                {deliveryPrice > 0 && (
                  <span className="text-xs text-gray-500">({formatPrice(deliveryPrice)})</span>
                )}
              </span>
            </label>
          </div>

          {/* Toggle Regalos */}
          <div className="bg-yellow-500/5 rounded-xl p-4 border border-yellow-500/10 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeGifts}
                onChange={(e) => setIncludeGifts(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-yellow-500 focus:ring-yellow-500"
              />
              <span className="text-sm text-gray-300 flex items-center gap-2">
                <Gift className="w-4 h-4 text-yellow-400" />
                Regalos de FuXion
              </span>
            </label>

            {includeGifts && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2 pt-2"
              >
                <p className="text-xs text-gray-500">Productos que te regalaron:</p>
                {gifts.map((gift, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <select
                      value={gift.productId}
                      onChange={(e) => updateGift(index, 'productId', e.target.value)}
                      className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="">Seleccionar...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={gift.quantity}
                      onChange={(e) => updateGift(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-16 bg-black/20 border border-white/10 rounded-lg px-2 py-2 text-white text-sm text-center"
                    />
                    <button
                      onClick={() => removeGift(index)}
                      className="p-2 text-gray-500 hover:text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addGift}
                  className="flex items-center gap-1 text-xs text-yellow-400 hover:text-yellow-300"
                >
                  <Plus className="w-3 h-3" />
                  Agregar otro regalo
                </button>
                {valorRegalos > 0 && (
                  <p className="text-xs text-yellow-400 pt-1">
                    Valor regalos: {formatPrice(valorRegalos)}
                  </p>
                )}
              </motion.div>
            )}
          </div>

          {/* Resumen de inversión */}
          <div className="bg-gray-800/50 rounded-xl p-4 border border-white/5 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Productos:</span>
              <span className="text-white font-mono">{formatPrice(totalProductos)}</span>
            </div>
            {includeDelivery && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Delivery:</span>
                <span className="text-white font-mono">{formatPrice(deliveryPrice)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t border-white/5">
              <span className="text-gray-300 font-medium">Total Inversión:</span>
              <span className="text-red-400 font-bold font-mono">{formatPrice(totalInversion)}</span>
            </div>
          </div>
        </div>

        {/* Panel del carrito */}
        <CartSummaryPanel
          items={cartItems}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onRemove={handleRemove}
          onConfirm={handleConfirmPurchase}
          onClear={handleClear}
          colorTheme="red"
          totalLabel="Total Inversión"
          confirmLabel="Registrar Compra"
          isLoading={isLoading}
          showPrices={true}
          customTotal={totalInversion}
        />
      </div>
    </motion.div>
  );
};

export default PurchaseModuleCards;
