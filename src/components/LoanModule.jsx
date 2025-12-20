import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Tag, Hash, DollarSign, FileText, User, HandCoins, Trash2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ProductAutocomplete from '@/components/ui/ProductAutocomplete';
import { createLoan } from '@/lib/loanService';
import { addTransactionV2 } from '@/lib/transactionServiceV2';

const LoanModule = ({ onAdd, prices = {}, products = [], inventoryMap = {} }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    productName: '',
    quantity: '',
    borrowerName: '',
    notes: ''
  });
  const [cart, setCart] = useState([]); // Carrito de productos
  const [totalValue, setTotalValue] = useState(0);
  const [selectedPrice, setSelectedPrice] = useState(0);

  // Calcular valor total del producto actual
  useEffect(() => {
    const qty = parseInt(formData.quantity) || 0;
    const price = selectedPrice || 0;
    setTotalValue(qty * price);
  }, [formData.quantity, selectedPrice]);

  // Calcular valor total del carrito
  const cartTotal = cart.reduce((sum, item) => {
    const price = prices[item.productName] || 0;
    return sum + (item.quantity * price);
  }, 0);

  const handleProductSelect = (productName, price) => {
    setFormData({ ...formData, productName });
    setSelectedPrice(price || 0);
  };

  // Agregar producto al carrito
  const handleAddToCart = () => {
    const quantity = parseInt(formData.quantity) || 0;

    // Validaciones
    if (!formData.productName) {
      toast({
        title: "Campo Requerido",
        description: "Debes seleccionar un producto.",
        variant: "destructive"
      });
      return;
    }

    if (quantity <= 0) {
      toast({
        title: "Cantidad Inválida",
        description: "La cantidad debe ser mayor a 0.",
        variant: "destructive"
      });
      return;
    }

    // Validar inventario disponible
    const available = inventoryMap[formData.productName] || 0;
    
    // Calcular cantidad ya en el carrito para este producto
    const cartQuantity = cart
      .filter(item => item.productName === formData.productName)
      .reduce((sum, item) => sum + item.quantity, 0);
    
    if (quantity + cartQuantity > available) {
      toast({
        title: "Inventario Insuficiente",
        description: `Solo tienes ${available} unidades disponibles de "${formData.productName}". Ya tienes ${cartQuantity} en el carrito.`,
        variant: "destructive"
      });
      return;
    }

    // Guardar nombre del producto antes de limpiar
    const productNameToAdd = formData.productName;

    // Agregar al carrito
    setCart([...cart, {
      id: Date.now(), // ID temporal único
      productName: productNameToAdd,
      quantity: quantity,
      price: selectedPrice || prices[productNameToAdd] || 0
    }]);

    // Limpiar solo producto y cantidad, mantener prestado a y notas
    setFormData({
      ...formData,
      productName: '',
      quantity: ''
    });
    setSelectedPrice(0);
    setTotalValue(0);

    toast({
      title: "Producto Agregado",
      description: `${quantity} unidades de "${productNameToAdd}" agregadas al carrito.`,
      className: "bg-purple-900 border-purple-600 text-white"
    });
  };

  // Eliminar producto del carrito
  const handleRemoveFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar que hay productos en el carrito
    if (cart.length === 0) {
      toast({
        title: "Carrito Vacío",
        description: "Debes agregar al menos un producto al carrito antes de registrar.",
        variant: "destructive"
      });
      return;
    }

    // Validar que se haya indicado a quién se prestó
    if (!formData.borrowerName.trim()) {
      toast({
        title: "Campo Requerido",
        description: "Debes indicar a quién se le prestó.",
        variant: "destructive"
      });
      return;
    }

    try {
      const transactionsToAdd = [];
      const loanResults = [];
      let totalValueAll = 0;
      let successCount = 0;

      // Procesar cada producto del carrito
      for (const item of cart) {
        try {
          // Validar inventario disponible antes de procesar
          const available = inventoryMap[item.productName] || 0;
          if (item.quantity > available) {
            toast({
              title: "Inventario Insuficiente",
              description: `Solo tienes ${available} unidades disponibles de "${item.productName}".`,
              variant: "destructive"
            });
            continue;
          }

          // 1. Crear préstamo
          const { data: loanData, error: loanError } = await createLoan({
            productName: item.productName,
            quantityBoxes: item.quantity,
            quantitySachets: 0,
            notes: `Prestado a: ${formData.borrowerName}${formData.notes ? ' - ' + formData.notes : ''}`
          });

          if (loanError) throw loanError;

          // 2. Crear transacción tipo 'loan' para descontar inventario
          const itemValue = item.quantity * item.price;
          totalValueAll += itemValue;

          const { data: transactionData, error: transactionError } = await addTransactionV2({
            type: 'loan',
            productName: item.productName,
            quantityBoxes: item.quantity,
            quantitySachets: 0,
            totalAmount: itemValue,
            notes: `Préstamo a: ${formData.borrowerName}${formData.notes ? ' - ' + formData.notes : ''}`,
            listPrice: item.price,
            metadata: {
              borrowerName: formData.borrowerName,
              estimatedValue: itemValue
            }
          });

          if (transactionError) {
            console.warn(`Préstamo creado pero error registrando transacción para ${item.productName}:`, transactionError);
          } else if (transactionData) {
            transactionsToAdd.push(transactionData);
            loanResults.push({ productName: item.productName, quantity: item.quantity });
            successCount++;
          }
        } catch (error) {
          console.error(`Error procesando ${item.productName}:`, error);
          toast({
            title: "Error en Producto",
            description: `No se pudo registrar "${item.productName}": ${error.message}`,
            variant: "destructive"
          });
        }
      }

      // Notificar al padre con todas las transacciones
      if (transactionsToAdd.length > 0) {
        onAdd(transactionsToAdd);
      }

      // Limpiar formulario y carrito
      setFormData({
        productName: '',
        quantity: '',
        borrowerName: '',
        notes: ''
      });
      setCart([]);
      setSelectedPrice(0);
      setTotalValue(0);

      // Mostrar resumen
      const productsSummary = loanResults.map(r => `${r.quantity} ${r.productName}`).join(', ');
      toast({
        title: "Préstamos Registrados",
        description: `${successCount} producto(s) prestado(s) a ${formData.borrowerName}: ${productsSummary}. Valor total: $${totalValueAll.toLocaleString('es-CO')}`,
        className: "bg-purple-900 border-purple-600 text-white"
      });

    } catch (error) {
      console.error('Error registrando préstamos:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron registrar los préstamos. Intenta de nuevo.",
        variant: "destructive"
      });
    }
  };

  const available = inventoryMap[formData.productName] || 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 h-full"
    >
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
        Registrar Préstamo
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
            Producto *
          </label>
          <ProductAutocomplete
            value={formData.productName}
            onChange={(value) => setFormData({ ...formData, productName: value })}
            onSelect={handleProductSelect}
            products={Object.keys(prices)}
            prices={prices}
            placeholder="Escribe el nombre del producto..."
            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 outline-none transition-all placeholder-gray-700"
            icon={Tag}
          />
        </div>

        {formData.productName && (
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-sm space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-purple-300">Disponible:</span>
              <span className="text-purple-400 font-semibold">{available} cajas</span>
            </div>
            {selectedPrice > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-purple-300">Precio unitario:</span>
                <span className="text-purple-400 font-semibold">${selectedPrice.toLocaleString('es-CO')}</span>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
            Cantidad (Cajas) *
          </label>
          <div className="relative group">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
            <input
              type="number"
              min="1"
              max={available || 999}
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 outline-none transition-all placeholder-gray-700"
              placeholder="Ej: 2"
            />
          </div>
        </div>

        {totalValue > 0 && (
          <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-purple-300 font-semibold">Valor Estimado (Producto Actual)</span>
              <span className="text-xl font-black text-purple-400">
                ${totalValue.toLocaleString('es-CO')}
              </span>
            </div>
          </div>
        )}

        {/* Botón Agregar al Carrito */}
        <Button
          type="button"
          onClick={handleAddToCart}
          className="w-full h-12 bg-purple-500/80 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-5 h-5 mr-2" />
          Agregar al Carrito
        </Button>

        {/* Carrito de Productos */}
        {cart.length > 0 && (
          <div className="bg-black/30 border border-purple-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Carrito ({cart.length} {cart.length === 1 ? 'producto' : 'productos'})
              </h4>
              <button
                type="button"
                onClick={() => setCart([])}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                Limpiar todo
              </button>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {cart.map((item) => {
                const itemValue = item.quantity * item.price;
                return (
                  <div
                    key={item.id}
                    className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 flex items-center justify-between group hover:bg-purple-500/15 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold truncate">{item.productName}</span>
                        <span className="text-purple-300 text-sm">× {item.quantity}</span>
                      </div>
                      <div className="text-xs text-purple-400 mt-1">
                        ${item.price.toLocaleString('es-CO')} × {item.quantity} = ${itemValue.toLocaleString('es-CO')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(item.id)}
                      className="ml-3 p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Eliminar del carrito"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {cartTotal > 0 && (
              <div className="border-t border-purple-500/20 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-purple-300 font-semibold">Total del Carrito</span>
                  <span className="text-xl font-black text-purple-400">
                    ${cartTotal.toLocaleString('es-CO')}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
            ¿A quién se prestó? *
          </label>
          <div className="relative group">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
            <input
              type="text"
              value={formData.borrowerName}
              onChange={(e) => setFormData({ ...formData, borrowerName: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 outline-none transition-all placeholder-gray-700"
              placeholder="Ej: Juan Pérez"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
            Notas (Opcional)
          </label>
          <div className="relative group">
            <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 outline-none transition-all placeholder-gray-700 resize-none h-20"
              placeholder="Ej: Fecha de devolución acordada..."
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={cart.length === 0}
          className="w-full h-12 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-semibold shadow-lg shadow-purple-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <HandCoins className="w-5 h-5 mr-2" />
          {cart.length > 0 
            ? `Registrar ${cart.length} Préstamo${cart.length > 1 ? 's' : ''} ($${cartTotal.toLocaleString('es-CO')})`
            : 'Registrar Préstamo'
          }
        </Button>
      </form>
    </motion.div>
  );
};

export default LoanModule;
