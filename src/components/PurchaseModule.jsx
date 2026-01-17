
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, AlertCircle, PackagePlus, Tag, Hash, DollarSign, FileText, Percent, Truck, Gift, X, ChevronDown } from 'lucide-react';
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

  // Estado principal del formulario
  const [formData, setFormData] = useState({
    productName: '',
    quantity: '',
    description: '',
    discount: '30' // Descuento por defecto 30%
  });

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

  // Cálculos reactivos
  const calculations = useMemo(() => {
    const qty = parseInt(formData.quantity) || 0;
    const unitPrice = getProductPrice(formData.productName);
    const discountPercent = parseFloat(formData.discount) || 0;

    // Subtotal de productos (sin descuento)
    const subtotalProductos = qty * unitPrice;

    // Monto del descuento
    const montoDescuento = subtotalProductos * (discountPercent / 100);

    // Total productos con descuento
    const totalProductosNeto = subtotalProductos - montoDescuento;

    // Costo del delivery
    const deliveryCost = includeDelivery ? deliveryPrice : 0;

    // Inversión total de la compra
    const inversionTotal = totalProductosNeto + deliveryCost;

    // Costo unitario real (solo productos comprados, sin regalos)
    const costoUnitarioReal = qty > 0 ? totalProductosNeto / qty : 0;

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
      unitPrice,
      subtotalProductos,
      discountPercent,
      montoDescuento,
      totalProductosNeto,
      deliveryCost,
      inversionTotal,
      costoUnitarioReal,
      valorRegalos,
      totalUnidadesRegalos
    };
  }, [formData, includeDelivery, includeGifts, gifts, prices, deliveryPrice]);

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

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.productName || !formData.quantity) {
      toast({
        title: "Campos Incompletos",
        description: "Selecciona un producto e ingresa la cantidad.",
        variant: "destructive"
      });
      return;
    }

    const qty = parseInt(formData.quantity);
    if (qty <= 0) {
      toast({
        title: "Cantidad Inválida",
        description: "La cantidad debe ser mayor a 0.",
        variant: "destructive"
      });
      return;
    }

    try {
      let transactionsToAdd = [];

      // 1. Registrar compra principal
      const mainResult = await addTransactionV2({
        type: 'purchase',
        productName: formData.productName,
        quantityBoxes: qty,
        quantitySachets: 0,
        totalAmount: calculations.inversionTotal, // Inversión total (productos con descuento + delivery)
        notes: `Descuento: ${calculations.discountPercent}%${includeDelivery ? ' | Incluye delivery' : ''}${formData.description ? ` | ${formData.description}` : ''}`.trim(),
        listPrice: calculations.unitPrice
      });

      if (mainResult.error) throw mainResult.error;
      if (mainResult.data) transactionsToAdd.push(mainResult.data);

      // 2. Registrar regalos (si hay)
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
                totalAmount: 0, // Regalos NO suman inversión
                notes: `REGALO - Valor de mercado: ${formatCLP(giftQty * giftPrice)}`,
                listPrice: giftPrice,
                isGift: true // Marcador para identificar regalos
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

      // Notificar al componente padre
      onAdd(transactionsToAdd);

      // Mensaje de éxito
      let description = `${qty} unidades de ${formData.productName}. Inversión: ${formatCLP(calculations.inversionTotal)}`;
      if (calculations.totalUnidadesRegalos > 0) {
        description += ` | +${calculations.totalUnidadesRegalos} regalos (valor: ${formatCLP(calculations.valorRegalos)})`;
      }

      toast({
        title: "Compra Registrada",
        description,
        className: "bg-red-900 border-red-600 text-white"
      });

      // Reset formulario
      setFormData({ productName: '', quantity: '', description: '', discount: formData.discount });
      setGifts([{ productName: '', quantity: '1' }]);
      setIncludeGifts(false);
      setIncludeDelivery(false);

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

        {/* Cantidad y Descuento */}
        <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 flex items-center">
              Tu Descuento
              <HelpTooltip content="Porcentaje de descuento según tu rango en la empresa" />
            </label>
            <div className="relative group">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
              <select
                value={formData.discount}
                onChange={(e) => setFormData({...formData, discount: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="0" className="bg-gray-900">0% - Sin descuento</option>
                <option value="10" className="bg-gray-900">10% - Inicio</option>
                <option value="20" className="bg-gray-900">20% - Bronce</option>
                <option value="30" className="bg-gray-900">30% - Plata</option>
                <option value="40" className="bg-gray-900">40% - Oro</option>
                <option value="50" className="bg-gray-900">50% - Diamante</option>
              </select>
            </div>
          </div>
        </div>

        {/* Resumen de Cálculos */}
        {calculations.subtotalProductos > 0 && (
          <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/10 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Subtotal ({formData.quantity} × {formatCLP(calculations.unitPrice)})</span>
              <span className="text-white font-mono">{formatCLP(calculations.subtotalProductos)}</span>
            </div>
            {calculations.montoDescuento > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Descuento ({calculations.discountPercent}%)</span>
                <span className="text-green-400 font-mono">-{formatCLP(calculations.montoDescuento)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm border-t border-red-500/10 pt-2">
              <span className="text-gray-400">Productos con descuento</span>
              <span className="text-white font-bold font-mono">{formatCLP(calculations.totalProductosNeto)}</span>
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
            <div className="flex justify-between items-center text-xs pt-1">
              <span className="text-gray-500">Costo unitario real</span>
              <span className="text-gray-400 font-mono">{formatCLP(calculations.costoUnitarioReal)}/unidad</span>
            </div>
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
