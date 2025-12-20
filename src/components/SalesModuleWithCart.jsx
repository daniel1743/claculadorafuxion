import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Tag, Hash, DollarSign, Link2, FileText, ShoppingCart, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ProductAutocomplete from '@/components/ui/ProductAutocomplete';
import { createLoan } from '@/lib/loanService';
import { addTransactionV2 } from '@/lib/transactionServiceV2';

const SalesModuleWithCart = ({ onAdd, inventoryMap, campaigns, prices, products = [] }) => {
  const { toast } = useToast();
  const [cart, setCart] = useState([]); // Array de {productName, quantity, unitPrice, subtotal}
  const [formData, setFormData] = useState({
    productName: '',
    quantity: '',
    unitPrice: '',
    campaignName: '',
    notes: ''
  });

  // Auto-calcular precio unitario cuando seleccionas un producto
  useEffect(() => {
    if (formData.productName && prices[formData.productName]) {
      setFormData(prev => ({
        ...prev,
        unitPrice: prices[formData.productName].toString()
      }));
    }
  }, [formData.productName, prices]);

  // Calcular subtotal cuando cambia cantidad o precio
  const getSubtotal = () => {
    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.unitPrice) || 0;
    return qty * price;
  };

  // Calcular total del carrito
  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  // Agregar producto al carrito
  const handleAddToCart = () => {
    const qty = parseInt(formData.quantity) || 0;
    const price = parseFloat(formData.unitPrice) || 0;

    // Validaciones
    if (!formData.productName) {
      toast({
        title: "Producto Requerido",
        description: "Debes seleccionar un producto.",
        variant: "destructive"
      });
      return;
    }

    if (qty <= 0) {
      toast({
        title: "Cantidad Inválida",
        description: "La cantidad debe ser mayor a 0.",
        variant: "destructive"
      });
      return;
    }

    if (price <= 0) {
      toast({
        title: "Precio Inválido",
        description: "El precio debe ser mayor a 0.",
        variant: "destructive"
      });
      return;
    }

    // Verificar stock disponible (solo warning, no bloquear)
    const available = inventoryMap[formData.productName] || 0;
    const alreadyInCart = cart.find(item => item.productName === formData.productName)?.quantity || 0;
    const totalNeeded = qty + alreadyInCart;

    if (totalNeeded > available) {
      const shortage = totalNeeded - available;
      toast({
        title: "Stock Insuficiente",
        description: `Necesitas ${shortage} unidades adicionales. Se registrarán como préstamo.`,
        className: "bg-yellow-900 border-yellow-600 text-white"
      });
    }

    // Verificar si el producto ya está en el carrito
    const existingItemIndex = cart.findIndex(item => item.productName === formData.productName);

    if (existingItemIndex >= 0) {
      // Actualizar cantidad del item existente
      const newCart = [...cart];
      newCart[existingItemIndex] = {
        ...newCart[existingItemIndex],
        quantity: newCart[existingItemIndex].quantity + qty,
        subtotal: (newCart[existingItemIndex].quantity + qty) * price
      };
      setCart(newCart);

      toast({
        title: "Cantidad Actualizada",
        description: `Se agregaron ${qty} unidades más de "${formData.productName}" al carrito.`,
        className: "bg-blue-900 border-blue-600 text-white"
      });
    } else {
      // Agregar nuevo item al carrito
      const newItem = {
        productName: formData.productName,
        quantity: qty,
        unitPrice: price,
        subtotal: qty * price
      };
      setCart([...cart, newItem]);

      toast({
        title: "Producto Agregado",
        description: `${formData.productName} agregado al carrito.`,
        className: "bg-green-900 border-green-600 text-white"
      });
    }

    // Limpiar formulario (excepto campaña y notas)
    setFormData(prev => ({
      ...prev,
      productName: '',
      quantity: '',
      unitPrice: ''
    }));
  };

  // Eliminar producto del carrito
  const handleRemoveFromCart = (index) => {
    const removedItem = cart[index];
    setCart(cart.filter((_, i) => i !== index));

    toast({
      title: "Producto Eliminado",
      description: `${removedItem.productName} removido del carrito.`,
      className: "bg-red-900 border-red-600 text-white"
    });
  };

  // Vaciar carrito
  const handleClearCart = () => {
    setCart([]);
    toast({
      title: "Carrito Vaciado",
      description: "Todos los productos han sido removidos.",
      className: "bg-gray-900 border-gray-600 text-white"
    });
  };

  // Finalizar venta
  const handleFinalizeSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Carrito Vacío",
        description: "Agrega al menos un producto para finalizar la venta.",
        variant: "destructive"
      });
      return;
    }

    try {
      const transactionsToAdd = [];
      let totalLoansCreated = 0;

      // Procesar cada producto del carrito
      for (const item of cart) {
        const available = inventoryMap[item.productName] || 0;
        const shortage = Math.max(0, item.quantity - available);

        // Crear transacción de venta (siempre, por la cantidad total)
        const saleResult = await addTransactionV2({
          type: 'sale',
          productName: item.productName,
          quantityBoxes: item.quantity,
          quantitySachets: 0,
          totalAmount: item.subtotal,
          notes: formData.notes + (formData.campaignName ? ` - Campaña: ${formData.campaignName}` : ''),
          listPrice: item.unitPrice
        });

        if (saleResult.error) throw saleResult.error;
        if (saleResult.data) transactionsToAdd.push(saleResult.data);

        // Si hay faltante, crear préstamo
        if (shortage > 0) {
          const loanResult = await createLoan({
            productName: item.productName,
            quantityBoxes: shortage,
            quantitySachets: 0,
            notes: `Préstamo generado en venta - ${formData.notes || 'Sin notas'}`
          });

          if (loanResult.error) {
            console.error('Error creando préstamo:', loanResult.error);
            // No bloqueamos la venta si falla el préstamo, pero lo mostramos
            toast({
              title: "Advertencia",
              description: `La venta se completó pero no se pudo registrar el préstamo de ${shortage} unidades de ${item.productName}`,
              className: "bg-orange-900 border-orange-600 text-white"
            });
          } else {
            totalLoansCreated += shortage;
          }
        }
      }

      // Enviar transacciones al padre para actualizar
      onAdd(transactionsToAdd);

      // Limpiar todo
      const totalSold = cart.length;
      const totalAmount = getCartTotal();

      setCart([]);
      setFormData({
        productName: '',
        quantity: '',
        unitPrice: '',
        campaignName: '',
        notes: ''
      });

      // Toast de éxito
      let description = `${totalSold} productos vendidos. Total: $${totalAmount.toLocaleString('es-CL')}`;
      if (totalLoansCreated > 0) {
        description += ` | ${totalLoansCreated} unidades registradas como préstamo`;
      }

      toast({
        title: "¡Venta Completada!",
        description,
        className: "bg-green-900 border-green-600 text-white"
      });
    } catch (error) {
      console.error('Error finalizando venta:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo completar la venta. Intenta de nuevo.",
        variant: "destructive"
      });
    }
  };

  const getCurrentStock = () => {
    if (!formData.productName) return 0;
    const available = inventoryMap[formData.productName] || 0;
    const inCart = cart.find(item => item.productName === formData.productName)?.quantity || 0;
    return available - inCart;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 h-full flex flex-col"
    >
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-1 h-6 bg-green-500 rounded-full"></span>
        Nueva Venta con Carrito
        {cart.length > 0 && (
          <span className="ml-auto bg-green-600 text-white text-xs px-2 py-1 rounded-full font-bold">
            {cart.length} {cart.length === 1 ? 'producto' : 'productos'}
          </span>
        )}
      </h3>

      <div className="space-y-4 flex-1 overflow-y-auto">
        {/* Formulario de Agregar Producto */}
        <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-white/5">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Producto *</label>
            <ProductAutocomplete
              value={formData.productName}
              onChange={(value) => setFormData({...formData, productName: value})}
              onSelect={(productName) => setFormData({...formData, productName: productName})}
              products={products}
              prices={prices}
              placeholder="Ej: prunex 1 (escribe para buscar)"
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 outline-none transition-all placeholder-gray-700"
              icon={Tag}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Cantidad *</label>
              <div className="relative group">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-green-400 transition-colors" />
                <input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 outline-none transition-all placeholder-gray-700"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Precio Unit. *</label>
              <div className="relative group">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-green-400 transition-colors" />
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({...formData, unitPrice: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 outline-none transition-all placeholder-gray-700"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Mostrar subtotal y stock */}
          <div className="flex items-center justify-between p-3 bg-green-500/5 rounded-lg border border-green-500/10">
            <div>
              <div className="text-xs text-gray-400">Subtotal</div>
              <div className="text-lg font-bold text-green-400">
                ${getSubtotal().toLocaleString('es-CL')}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Stock Disponible</div>
              {(() => {
                const currentStock = getCurrentStock();
                const qty = parseInt(formData.quantity) || 0;
                const alreadyInCart = cart.find(item => item.productName === formData.productName)?.quantity || 0;
                const totalNeeded = qty + alreadyInCart;
                const shortage = Math.max(0, totalNeeded - currentStock - alreadyInCart);

                return (
                  <div className={`text-sm font-bold ${shortage > 0 ? 'text-orange-400' : currentStock <= 0 ? 'text-red-400' : 'text-blue-400'}`}>
                    {currentStock} disponibles
                    {shortage > 0 && (
                      <span className="text-xs block text-orange-300">
                        +{shortage} préstamo
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          <Button
            type="button"
            onClick={handleAddToCart}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-5 h-5 mr-2" />
            Agregar al Carrito
          </Button>
        </div>

        {/* Carrito de Compras */}
        {cart.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Carrito de Venta
              </h4>
              <button
                onClick={handleClearCart}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Vaciar
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              <AnimatePresence>
                {cart.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="bg-black/30 border border-white/5 rounded-lg p-3 hover:border-green-500/20 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm truncate">
                          {item.productName}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {item.quantity} × ${item.unitPrice.toLocaleString('es-CL')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="font-bold text-green-400 text-sm">
                            ${item.subtotal.toLocaleString('es-CL')}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFromCart(index)}
                          className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors group"
                        >
                          <Trash2 className="w-4 h-4 text-gray-500 group-hover:text-red-400 transition-colors" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Total del Carrito */}
            <div className="bg-green-600/10 border border-green-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-semibold">Total de la Venta</span>
                <span className="text-2xl font-black text-green-400">
                  ${getCartTotal().toLocaleString('es-CL')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Campos Adicionales */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Campaña</label>
            <div className="relative group">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-green-400 transition-colors" />
              <select
                value={formData.campaignName}
                onChange={(e) => setFormData({...formData, campaignName: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 outline-none transition-all appearance-none text-sm"
              >
                <option value="">Venta Orgánica</option>
                {campaigns.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Notas</label>
            <div className="relative group">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-focus-within:text-green-400 transition-colors" />
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 outline-none transition-all placeholder-gray-700 resize-none h-16"
                placeholder="Notas de la venta..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Botón Finalizar Venta */}
      <div className="mt-4 pt-4 border-t border-white/5">
        <Button
          type="button"
          onClick={handleFinalizeSale}
          disabled={cart.length === 0}
          className="w-full h-12 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-semibold shadow-lg shadow-green-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <ShoppingCart className="w-5 h-5 mr-2" />
          Finalizar Venta {cart.length > 0 && `(${cart.length} productos)`}
        </Button>
      </div>
    </motion.div>
  );
};

export default SalesModuleWithCart;
