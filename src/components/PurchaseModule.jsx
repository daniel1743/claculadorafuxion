
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, AlertCircle, PackagePlus, Tag, Hash, DollarSign, FileText, Truck, Gift, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ProductAutocomplete from '@/components/ui/ProductAutocomplete';
import { addTransactionV2 } from '@/lib/transactionServiceV2';
import HelpTooltip from '@/components/HelpTooltip';
import HelpPanel, { HelpButton } from '@/components/HelpPanel';
import { purchasesHelp, purchasesFieldHelp } from '@/lib/helpContent';
import { formatCLP } from '@/lib/utils';

const PurchaseModule = ({ onAdd, prices = {}, products = [] }) => {
  const { toast } = useToast();
  const [helpOpen, setHelpOpen] = useState(false);

  // Estado principal del formulario (SIN descuentos - FuXion devuelve después)
  const [formData, setFormData] = useState({
    productName: '',
    quantity: '',
    description: ''
  });
  const [cart, setCart] = useState([]);

  // Estado para regalos
  const [includeGifts, setIncludeGifts] = useState(false);
  const [gifts, setGifts] = useState([{ productName: '', quantity: '1' }]);

  // Estado para delivery
  const [includeDelivery, setIncludeDelivery] = useState(false);

  // Obtener precio del producto
  const getProductPrice = (productName) => {
    if (!productName || !prices) return 0;
    // Búsqueda exacta
    if (prices[productName] !== undefined) return prices[productName];
    // Búsqueda case-insensitive
    const lowerName = productName.toLowerCase();
    const matchKey = Object.keys(prices).find(k => k.toLowerCase() === lowerName);
    return matchKey ? prices[matchKey] : 0;
  };

  // Obtener precio del delivery desde prices
  const deliveryPrice = useMemo(() => {
    // Buscar "delivery", "Delivery", "DELIVERY", "envio", "Envio", etc.
    const deliveryKeys = ['delivery', 'Delivery', 'DELIVERY', 'envio', 'Envio', 'ENVIO', 'despacho', 'Despacho'];
    for (const key of deliveryKeys) {
      if (prices[key] !== undefined) return prices[key];
    }
    return 0;
  }, [prices]);

  // Cálculos reactivos (SIN descuentos - pago total real)
  const calculations = useMemo(() => {
    // Si hay items en carrito, calcular con base en ellos
    const baseItems = cart.length > 0 ? cart : [{
      productName: formData.productName,
      quantity: parseInt(formData.quantity) || 0,
      unitPrice: getProductPrice(formData.productName)
    }];

    let totalProductos = 0;
    let totalUnidades = 0;

    baseItems.forEach(item => {
      totalProductos += item.unitPrice * item.quantity;
      totalUnidades += item.quantity;
    });

    const deliveryCost = includeDelivery ? deliveryPrice : 0;
    const inversionTotal = totalProductos + deliveryCost;

    // Calcular valor de regalos
    let valorRegalos = 0;
    let totalUnidadesRegalos = 0;
    if (includeGifts) {
      gifts.forEach(gift => {
        if (gift.productName && gift.quantity) {
          const giftQty = parseInt(gift.quantity) || 0;
          const giftPrice = getProductPrice(gift.productName);
          valorRegalos += giftQty * giftPrice;
          totalUnidadesRegalos += giftQty;
        }
      });
    }

    return {
      unitPrice: getProductPrice(formData.productName),
      totalProductos,
      deliveryCost,
      inversionTotal,
      valorRegalos,
      totalUnidadesRegalos
    };
  }, [formData, includeDelivery, includeGifts, gifts, prices, deliveryPrice, cart]);

  // Items base para mostrar y validar (carrito o item actual)
  const baseItems = cart.length > 0 ? cart : [{
    productName: formData.productName,
    quantity: parseInt(formData.quantity) || 0,
    unitPrice: getProductPrice(formData.productName)
  }];

  // Agregar nuevo regalo
  const addGift = () => {
    setGifts([...gifts, { productName: '', quantity: '1' }]);
  };

  // Eliminar regalo
  const removeGift = (index) => {
    if (gifts.length > 1) {
      setGifts(gifts.filter((_, i) => i !== index));
    } else {
      // Si es el último, solo limpiar
      setGifts([{ productName: '', quantity: '1' }]);
    }
  };

  // Actualizar regalo
  const updateGift = (index, field, value) => {
    const newGifts = [...gifts];
    newGifts[index] = { ...newGifts[index], [field]: value };
    setGifts(newGifts);
  };

  // Agregar producto al carrito
  const handleAddToCart = () => {
    if (!formData.productName || !formData.quantity) {
      toast({
        title: "Completa el producto",
        description: "Selecciona un producto e ingresa la cantidad.",
        variant: "destructive"
      });
      return;
    }

    const qty = parseInt(formData.quantity) || 0;
    if (qty <= 0) {
      toast({
        title: "Cantidad inválida",
        description: "La cantidad debe ser mayor a 0.",
        variant: "destructive"
      });
      return;
    }

    const unitPrice = getProductPrice(formData.productName);

    // Combinar si ya existe el producto en el carrito
    const existingIndex = cart.findIndex(item => item.productName === formData.productName);
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex] = {
        ...newCart[existingIndex],
        quantity: newCart[existingIndex].quantity + qty
      };
      setCart(newCart);
    } else {
      setCart([...cart, { productName: formData.productName, quantity: qty, unitPrice }]);
    }

    // Reset campos de producto/cantidad para seguir agregando
    setFormData(prev => ({ ...prev, productName: '', quantity: '' }));

    toast({
      title: "Producto agregado",
      description: `${qty} x ${formData.productName} añadido al carrito.`,
      className: "bg-blue-900 border-blue-600 text-white"
    });
  };

  const handleRemoveCartItem = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Si no hay carrito, creamos uno con el formulario actual
    const workingCart = cart.length > 0 ? cart : [{
      productName: formData.productName,
      quantity: parseInt(formData.quantity) || 0,
      unitPrice: getProductPrice(formData.productName)
    }];

    const invalidItem = workingCart.find(item => !item.productName || !item.quantity || item.quantity <= 0);
    if (invalidItem) {
      toast({
        title: "Campos incompletos",
        description: "Selecciona un producto y una cantidad válida.",
        variant: "destructive"
      });
      return;
    }

    try {
      let transactionsToAdd = [];

      // Registrar cada item del carrito (uno por producto)
      for (let i = 0; i < workingCart.length; i++) {
        const item = workingCart[i];
        const totalItem = item.unitPrice * item.quantity;
        // Delivery se cobra completo y solo una vez (primer item)
        const totalWithDelivery = totalItem + (includeDelivery && i === 0 ? deliveryPrice : 0);

        const result = await addTransactionV2({
          type: 'purchase',
          productName: item.productName,
          quantityBoxes: item.quantity,
          quantitySachets: 0,
          totalAmount: totalWithDelivery,
          notes: `${includeDelivery && i === 0 ? 'Incluye delivery | ' : ''}${formData.description || ''}`.trim(),
          listPrice: item.unitPrice
        });

        if (result.error) throw result.error;
        if (result.data) transactionsToAdd.push(result.data);
      }

      // Regalos (si hay)
      if (includeGifts) {
        for (const gift of gifts) {
          if (gift.productName && gift.quantity) {
            const giftQty = parseInt(gift.quantity) || 0;
            if (giftQty > 0) {
              const giftPrice = getProductPrice(gift.productName);

              const giftResult = await addTransactionV2({
                type: 'purchase',
                productName: gift.productName,
                quantityBoxes: giftQty,
                quantitySachets: 0,
                totalAmount: 0,
                notes: `REGALO - Valor de mercado: ${formatCLP(giftQty * giftPrice)}`,
                listPrice: giftPrice,
                isGift: true
              });

              if (giftResult.error) {
                console.warn('Error registrando regalo:', giftResult.error);
              } else if (giftResult.data) {
                transactionsToAdd.push(giftResult.data);
              }
            }
          }
        }
      }

      onAdd(transactionsToAdd);

      const totalQty = workingCart.reduce((sum, item) => sum + item.quantity, 0);
      let description = `${totalQty} unidades registradas. Inversión: ${formatCLP(calculations.inversionTotal)}`;
      if (calculations.totalUnidadesRegalos > 0) {
        description += ` | +${calculations.totalUnidadesRegalos} regalos (valor: ${formatCLP(calculations.valorRegalos)})`;
      }

      toast({
        title: "Compra Registrada",
        description,
        className: "bg-green-900 border-green-600 text-white"
      });

      setFormData({ productName: '', quantity: '', description: '' });
      setGifts([{ productName: '', quantity: '1' }]);
      setIncludeGifts(false);
      setIncludeDelivery(false);
      setCart([]);

    } catch (error) {
      console.error('Error en handleSubmit:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la compra.",
        variant: "destructive"
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 h-full"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-1 h-6 bg-red-500 rounded-full"></span>
          Nueva Compra
        </h3>
        <HelpButton onClick={() => setHelpOpen(true)} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Producto */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 flex items-center">
            Producto *
            <HelpTooltip content="Selecciona el producto que compraste" />
          </label>
          <ProductAutocomplete
            value={formData.productName}
            onChange={(value) => setFormData({...formData, productName: value})}
            onSelect={(name, price) => setFormData({...formData, productName: name})}
            products={products}
            prices={prices}
            placeholder="Buscar producto..."
            icon={Tag}
            hideIconWhenFilled
            className="w-full bg-gray-900/60 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500/20 focus:border-red-500/40"
          />
        </div>

        {/* Cantidad */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 flex items-center">
            Cantidad *
            <HelpTooltip content="Número de cajas/unidades compradas" />
          </label>
          <div className="relative group">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 outline-none transition-all placeholder-gray-700"
              placeholder="0"
            />
          </div>
          <p className="text-xs text-gray-500 pl-1">
            El descuento de FuXion se registra en "Pagos FuXion" cuando llegue el cheque
          </p>
        </div>

        {/* Botón agregar al carrito */}
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleAddToCart}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agregar al carrito
          </Button>
        </div>

        {/* Lista carrito */}
        {cart.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
            {cart.map((item, idx) => (
              <div key={`${item.productName}-${idx}`} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-white font-semibold">{item.productName}</p>
                  <p className="text-xs text-gray-400">Cantidad: {item.quantity}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white font-mono">{formatCLP(item.unitPrice * item.quantity)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCartItem(idx)}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Resumen de Cálculos */}
        {calculations.totalProductos > 0 && (
          <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/10 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Total Productos</span>
              <span className="text-white font-bold font-mono">{formatCLP(calculations.totalProductos)}</span>
            </div>
            {includeDelivery && calculations.deliveryCost > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Delivery</span>
                <span className="text-orange-400 font-mono">+{formatCLP(calculations.deliveryCost)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm border-t border-red-500/10 pt-2">
              <span className="text-red-400 font-semibold">INVERSIÓN TOTAL</span>
              <span className="text-red-400 font-bold font-mono text-lg">{formatCLP(calculations.inversionTotal)}</span>
            </div>
            <p className="text-xs text-gray-500 pt-2">
              FuXion te devolverá el % según tu rango. Regístralo en "Pagos FuXion".
            </p>
          </div>
        )}

        {/* Checkbox Regalos */}
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={includeGifts}
              onChange={(e) => setIncludeGifts(e.target.checked)}
              className="w-5 h-5 rounded border-gray-600 bg-black/20 text-purple-500 focus:ring-purple-500/20"
            />
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors flex items-center gap-2">
              <Gift className="w-4 h-4 text-purple-400" />
              ¿Incluye regalos/bonificaciones?
            </span>
          </label>

          {/* Lista de Regalos */}
          <AnimatePresence>
            {includeGifts && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pl-4 border-l-2 border-purple-500/30"
              >
                {gifts.map((gift, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                  >
                    <div className="flex-1">
                      <ProductAutocomplete
                        value={gift.productName}
                        onChange={(value) => updateGift(index, 'productName', value)}
                        onSelect={(name) => updateGift(index, 'productName', name)}
                        products={products}
                        prices={prices}
                        placeholder="Producto regalo..."
                        icon={Gift}
                        hideIconWhenFilled
                        className="w-full text-sm bg-gray-900/60 border border-white/10 rounded-xl pl-11 pr-3 py-2 text-white placeholder-gray-500"
                      />
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={gift.quantity}
                      onChange={(e) => updateGift(index, 'quantity', e.target.value)}
                      className="w-24 bg-gray-900/60 border border-white/10 rounded-xl px-3 py-2 text-white text-center text-sm"
                      placeholder="Cant."
                    />
                    <button
                      type="button"
                      onClick={() => removeGift(index)}
                      className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}

                <Button
                  type="button"
                  onClick={addGift}
                  variant="ghost"
                  size="sm"
                  className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar otro regalo
                </Button>

                {calculations.valorRegalos > 0 && (
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-purple-300">Valor total regalos ({calculations.totalUnidadesRegalos} unidades)</span>
                      <span className="text-purple-400 font-bold font-mono">{formatCLP(calculations.valorRegalos)}</span>
                    </div>
                    <p className="text-xs text-purple-400/60 mt-1">
                      Los regalos suman a inventario pero no a inversión
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Checkbox Delivery */}
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={includeDelivery}
              onChange={(e) => setIncludeDelivery(e.target.checked)}
              className="w-5 h-5 rounded border-gray-600 bg-black/20 text-orange-500 focus:ring-orange-500/20"
            />
            <span className="text-sm text-gray-300 group-hover:text-white transition-colors flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-400" />
              ¿Incluye delivery?
              {deliveryPrice > 0 && (
                <span className="text-xs text-orange-400/70">({formatCLP(deliveryPrice)})</span>
              )}
            </span>
          </label>
          {includeDelivery && deliveryPrice === 0 && (
            <p className="text-xs text-orange-400/70 pl-8">
              Configura el precio del delivery en "Precios" (nombre: "delivery")
            </p>
          )}
        </div>

        {/* Notas */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
            Notas (opcional)
          </label>
          <div className="relative group">
            <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 outline-none transition-all placeholder-gray-700 resize-none h-16"
              placeholder="Notas adicionales..."
            />
          </div>
        </div>

        {/* Botón Submit */}
        <Button
          type="submit"
          className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-lg shadow-red-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <PackagePlus className="w-5 h-5 mr-2" />
          Registrar Compra
        </Button>
      </form>

      <HelpPanel
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        helpContent={purchasesHelp}
      />
    </motion.div>
  );
};

export default PurchaseModule;
