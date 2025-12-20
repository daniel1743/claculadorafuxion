import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ShoppingCart, Tag, Hash, DollarSign, Gift, Truck, Package, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ProductAutocomplete from '@/components/ui/ProductAutocomplete';
import { addTransactionV2 } from '@/lib/transactionServiceV2';
import { getUserProductsWithInventory } from '@/lib/productService';
import { formatCLP } from '@/lib/utils';

const ShoppingCartModule = ({ onAdd, prices = {}, products = [] }) => {
  console.log('[ShoppingCartModule] Renderizando con props:', { 
    pricesKeys: Object.keys(prices).length, 
    products: products.length 
  });
  
  const { toast } = useToast();
  const [cartName, setCartName] = useState('');
  const [purchaseMode, setPurchaseMode] = useState('normal'); // 'normal' o 'autoenvio'
  const [cartItems, setCartItems] = useState([]); // Productos pagados
  const [freeProducts, setFreeProducts] = useState([]); // Productos gratis
  const [currentProduct, setCurrentProduct] = useState({ name: '', quantity: '', price: 0, points: 0 });
  const [availableProducts, setAvailableProducts] = useState([]);
  
  console.log('[ShoppingCartModule] Estado:', { 
    cartName, 
    purchaseMode, 
    cartItems: cartItems.length, 
    freeProducts: freeProducts.length,
    availableProducts: availableProducts.length
  });

  // Cargar productos con puntos
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await getUserProductsWithInventory(user.id);
          if (data) {
            setAvailableProducts(data);
          }
        }
      } catch (error) {
        console.error('Error cargando productos:', error);
      }
    };
    loadProducts();
  }, []);

  // Calcular puntos totales y productos gratis
  useEffect(() => {
    if (purchaseMode === 'autoenvio') {
      const totalPoints = cartItems.reduce((sum, item) => sum + (item.points * item.quantity), 0);
      const freeProductsCount = Math.floor(totalPoints / 60);
      
      // Ajustar array de productos gratis
      const currentFreeCount = freeProducts.length;
      if (freeProductsCount > currentFreeCount) {
        // Agregar nuevos productos gratis
        const newFreeProducts = Array.from({ length: freeProductsCount - currentFreeCount }, (_, i) => ({
          id: `free-${Date.now()}-${i}`,
          name: '',
          price: 0,
          quantity: 1
        }));
        setFreeProducts([...freeProducts, ...newFreeProducts]);
      } else if (freeProductsCount < currentFreeCount) {
        // Remover productos gratis excedentes
        setFreeProducts(freeProducts.slice(0, freeProductsCount));
      }
    } else {
      // Si es compra normal, limpiar productos gratis
      setFreeProducts([]);
    }
  }, [cartItems, purchaseMode]);

  // Actualizar precio y puntos cuando cambia el producto
  useEffect(() => {
    if (currentProduct.name) {
      const product = availableProducts.find(p => p.name === currentProduct.name);
      const price = prices[currentProduct.name] || 0;
      const points = product?.points || 0;
      
      setCurrentProduct(prev => ({
        ...prev,
        price: price,
        points: points
      }));
    }
  }, [currentProduct.name, prices, availableProducts]);

  const handleAddToCart = () => {
    if (!currentProduct.name || !currentProduct.quantity || currentProduct.quantity <= 0) {
      toast({
        title: "Campos Incompletos",
        description: "Selecciona un producto y especifica la cantidad.",
        variant: "destructive"
      });
      return;
    }

    const quantity = parseInt(currentProduct.quantity);
    const totalPrice = currentProduct.price * quantity;

    const newItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      name: currentProduct.name,
      quantity: quantity,
      unitPrice: currentProduct.price,
      totalPrice: totalPrice,
      points: currentProduct.points
    };

    setCartItems([...cartItems, newItem]);
    setCurrentProduct({ name: '', quantity: '', price: 0, points: 0 });
    
    toast({
      title: "Producto Agregado",
      description: `${quantity} ${currentProduct.name} agregado(s) al carrito.`,
      className: "bg-green-900 border-green-600 text-white"
    });
  };

  const handleRemoveFromCart = (itemId) => {
    setCartItems(cartItems.filter(item => item.id !== itemId));
  };

  const handleUpdateFreeProduct = (freeId, field, value) => {
    setFreeProducts(freeProducts.map(free => {
      if (free.id === freeId) {
        const updated = { ...free, [field]: value };
        
        // Si cambió el nombre, buscar el precio
        if (field === 'name' && value) {
          const product = availableProducts.find(p => p.name === value);
          const price = prices[value] || 0;
          updated.price = price;
        }
        
        return updated;
      }
      return free;
    }));
  };

  const calculateTotals = () => {
    const paidTotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const freeTotal = freeProducts.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    const totalPoints = cartItems.reduce((sum, item) => sum + (item.points * item.quantity), 0);
    const totalValue = paidTotal + freeTotal; // Valor total recibido (pagado + gratis)
    
    return {
      paidTotal,
      freeTotal,
      totalValue,
      totalPoints,
      freeProductsCount: freeProducts.length
    };
  };

  const handleFinalizePurchase = async () => {
    if (!cartName.trim()) {
      toast({
        title: "Nombre Requerido",
        description: "Debes ingresar un nombre para el carrito.",
        variant: "destructive"
      });
      return;
    }

    if (cartItems.length === 0) {
      toast({
        title: "Carrito Vacío",
        description: "Agrega al menos un producto al carrito.",
        variant: "destructive"
      });
      return;
    }

    // Validar productos gratis si es autoenvío
    if (purchaseMode === 'autoenvio' && freeProducts.length > 0) {
      const incompleteFree = freeProducts.find(free => !free.name || free.price === 0);
      if (incompleteFree) {
        toast({
          title: "Productos Gratis Incompletos",
          description: "Debes completar todos los productos gratis con nombre y precio válido.",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      const transactions = [];
      const totals = calculateTotals();

      // Crear transacciones para productos pagados
      for (const item of cartItems) {
        const result = await addTransactionV2({
          type: 'purchase',
          productName: item.name,
          quantityBoxes: item.quantity,
          quantitySachets: 0,
          totalAmount: item.totalPrice,
          notes: `Carrito: ${cartName} - ${purchaseMode === 'autoenvio' ? 'Autoenvío' : 'Compra Normal'}`
        });

        if (result.error) throw result.error;
        if (result.data) transactions.push(result.data);
      }

      // Crear transacciones para productos gratis (solo si es autoenvío)
      if (purchaseMode === 'autoenvio' && freeProducts.length > 0) {
        // Calcular el costo proporcional para productos gratis
        // El PPP debe distribuir el costo total pagado entre todos los productos (pagados + gratis)
        const totalPaid = totals.paidTotal;
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0) + 
                          freeProducts.reduce((sum, free) => sum + (free.quantity || 1), 0);
        const costPerUnit = totalPaid / totalItems;
        
        for (const free of freeProducts) {
          if (free.name && free.price > 0) {
            const freeQuantity = free.quantity || 1;
            const freeValue = free.price * freeQuantity; // Valor de mercado del producto gratis
            const freeCost = costPerUnit * freeQuantity; // Costo proporcional para PPP
            
            // Registrar con costo proporcional para que el PPP se calcule correctamente
            const result = await addTransactionV2({
              type: 'purchase',
              productName: free.name,
              quantityBoxes: freeQuantity,
              quantitySachets: 0,
              totalAmount: freeCost, // Costo proporcional del total pagado
              notes: `Carrito: ${cartName} - Producto Gratis (Autoenvío - ${totals.totalPoints} puntos) - Valor Mercado: ${formatCLP(freeValue)}, Costo Asignado: ${formatCLP(freeCost)}`
            });

            if (result.error) throw result.error;
            if (result.data) transactions.push(result.data);
          }
        }
      }

      toast({
        title: "✅ Compra Registrada",
        description: `${cartItems.length} producto(s) pagado(s)${freeProducts.length > 0 ? ` + ${freeProducts.length} producto(s) gratis` : ''} registrado(s) exitosamente.`,
        className: "bg-green-900 border-green-600 text-white"
      });

      // Notificar al componente padre
      onAdd(transactions);

      // Limpiar carrito
      setCartName('');
      setCartItems([]);
      setFreeProducts([]);
      setCurrentProduct({ name: '', quantity: '', price: 0, points: 0 });

    } catch (error) {
      console.error('Error finalizando compra:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la compra. Intenta de nuevo.",
        variant: "destructive"
      });
    }
  };

  const totals = calculateTotals();

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 h-full"
    >
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-1 h-6 bg-red-500 rounded-full"></span>
        Carrito de Compras
      </h3>

      <div className="space-y-4">
        {/* Nombre del Carrito */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
            Nombre del Carrito *
          </label>
          <div className="relative group">
            <ShoppingCart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
            <input
              type="text"
              value={cartName}
              onChange={(e) => setCartName(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 outline-none transition-all placeholder-gray-700"
              placeholder="Ej: Compra Enero 2025"
            />
          </div>
        </div>

        {/* Modo de Compra */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
            Modo de Compra *
          </label>
          <div className="relative group">
            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
            <select
              value={purchaseMode}
              onChange={(e) => setPurchaseMode(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 outline-none transition-all appearance-none text-sm"
            >
              <option value="normal">Compra Normal</option>
              <option value="autoenvio">Autoenvío (con puntos y productos gratis)</option>
            </select>
          </div>
        </div>

        {/* Agregar Producto */}
        <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-3">
          <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Agregar Producto
          </h4>
          
          <div className="space-y-3">
            <ProductAutocomplete
              value={currentProduct.name}
              onChange={(value) => setCurrentProduct({ ...currentProduct, name: value })}
              onSelect={(productName, price) => {
                const product = availableProducts.find(p => p.name === productName);
                setCurrentProduct({
                  name: productName,
                  quantity: '',
                  price: price || 0,
                  points: product?.points || 0
                });
              }}
              products={products}
              prices={prices}
              placeholder="Selecciona un producto..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 outline-none transition-all placeholder-gray-700"
              icon={Tag}
            />

            {currentProduct.name && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Cantidad</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="number"
                      min="1"
                      value={currentProduct.quantity}
                      onChange={(e) => setCurrentProduct({ ...currentProduct, quantity: e.target.value })}
                      className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-red-500/20 outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Valor Total</label>
                  <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-green-400 font-mono font-bold">
                    {formatCLP((currentProduct.price || 0) * (parseInt(currentProduct.quantity) || 0))}
                  </div>
                </div>
              </div>
            )}

            <Button
              type="button"
              onClick={handleAddToCart}
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold"
              disabled={!currentProduct.name || !currentProduct.quantity}
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar al Carrito
            </Button>
          </div>
        </div>

        {/* Productos en el Carrito */}
        {cartItems.length > 0 && (
          <div className="bg-black/20 rounded-xl p-4 border border-white/5 space-y-3">
            <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Productos en el Carrito ({cartItems.length})
            </h4>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <AnimatePresence>
                {cartItems.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="bg-black/40 rounded-lg p-3 flex items-center justify-between border border-white/5"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-white">{item.name}</div>
                      <div className="text-xs text-gray-400">
                        {item.quantity} × {formatCLP(item.unitPrice)} = {formatCLP(item.totalPrice)}
                        {purchaseMode === 'autoenvio' && item.points > 0 && (
                          <span className="ml-2 text-purple-400">({item.points * item.quantity} pts)</span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveFromCart(item.id)}
                      className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Productos Gratis (solo Autoenvío) */}
        {purchaseMode === 'autoenvio' && freeProducts.length > 0 && (
          <div className="bg-yellow-500/5 rounded-xl p-4 border border-yellow-500/20 space-y-3">
            <h4 className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Productos Gratis ({freeProducts.length}) - {totals.totalPoints} puntos totales
            </h4>
            
            <div className="space-y-3">
              {freeProducts.map((free, index) => (
                <div key={free.id} className="bg-black/40 rounded-lg p-3 border border-yellow-500/20 space-y-2">
                  <div className="text-xs text-yellow-400 font-semibold">Producto Gratis #{index + 1}</div>
                  
                  <ProductAutocomplete
                    value={free.name}
                    onChange={(value) => handleUpdateFreeProduct(free.id, 'name', value)}
                    onSelect={(productName, price) => {
                      handleUpdateFreeProduct(free.id, 'name', productName);
                      handleUpdateFreeProduct(free.id, 'price', price);
                    }}
                    products={products}
                    prices={prices}
                    placeholder="Selecciona producto gratis..."
                    className="w-full bg-black/60 border border-yellow-500/30 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-yellow-500/20 outline-none text-sm"
                    icon={Gift}
                  />
                  
                  {free.name && (
                    <div className="text-xs text-gray-400">
                      Valor: <span className="text-yellow-400 font-semibold">{formatCLP(free.price || 0)}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Resumen */}
        {cartItems.length > 0 && (
          <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/20 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Pagado:</span>
              <span className="font-bold text-white">{formatCLP(totals.paidTotal)}</span>
            </div>
            {purchaseMode === 'autoenvio' && totals.freeTotal > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Productos Gratis:</span>
                  <span className="font-bold text-yellow-400">{formatCLP(totals.freeTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Puntos Totales:</span>
                  <span className="font-bold text-purple-400">{totals.totalPoints} pts</span>
                </div>
              </>
            )}
            <div className="border-t border-white/10 pt-2 flex justify-between">
              <span className="text-gray-300 font-semibold">Valor Total Recibido:</span>
              <span className="font-bold text-green-400 text-lg">{formatCLP(totals.totalValue)}</span>
            </div>
            {purchaseMode === 'autoenvio' && totals.freeTotal > 0 && (
              <div className="text-xs text-gray-500 pt-1">
                Ganancia Implícita: {formatCLP(totals.freeTotal)} (diferencia entre pagado y valor recibido)
              </div>
            )}
          </div>
        )}

        {/* Botón Finalizar */}
        {cartItems.length > 0 && (
          <Button
            onClick={handleFinalizePurchase}
            className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-lg shadow-red-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Check className="w-5 h-5 mr-2" />
            Finalizar Compra
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default ShoppingCartModule;

