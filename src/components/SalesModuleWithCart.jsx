import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Tag, Hash, DollarSign, Link2, FileText, ShoppingCart, Trash2, Users, User, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ProductAutocomplete from '@/components/ui/ProductAutocomplete';
import HelpTooltip from '@/components/HelpTooltip';
import HelpPanel, { HelpButton } from '@/components/HelpPanel';
import { salesHelp, salesFieldHelp } from '@/lib/helpContent';
import { createLoan } from '@/lib/loanService';
import { addTransactionV2 } from '@/lib/transactionServiceV2';
import { getAllCustomers } from '@/lib/customerService';
import { createAutomaticReminders } from '@/lib/reminderService';
import { supabase } from '@/lib/supabase';

const SalesModuleWithCart = ({ onAdd, inventoryMap, campaigns, prices, products = [] }) => {
  const { toast } = useToast();
  const [helpOpen, setHelpOpen] = useState(false);
  const [cart, setCart] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // DEBUG: Ver qué se recibe (solo una vez al cargar)
  useEffect(() => {
    console.log('[SalesModule] Props actualizados:', {
      pricesCount: Object.keys(prices || {}).length,
      productsCount: products?.length,
      pricesSample: Object.entries(prices || {}).slice(0, 5),
      productsSample: products?.slice(0, 5),
      inventoryMapSample: Object.entries(inventoryMap || {}).slice(0, 3)
    });
  }, [prices, products, inventoryMap]);

  // Helper: Buscar precio de forma robusta (case-insensitive)
  const findPriceForProduct = (productName) => {
    if (!productName || !prices) return null;

    // Búsqueda exacta
    if (prices[productName] !== undefined) {
      return prices[productName];
    }

    // Búsqueda case-insensitive
    const lowerName = productName.toLowerCase();
    const matchKey = Object.keys(prices).find(k => k.toLowerCase() === lowerName);
    if (matchKey) {
      return prices[matchKey];
    }

    return null;
  };

  const [formData, setFormData] = useState({
    productName: '',
    quantity: '',
    unitPrice: '',
    campaignName: '',
    notes: '',
    // Nuevos campos para el CRM
    saleType: '', // '', 'frecuente', 'referido'
    customerId: '', // Cliente que compra
    referrerId: '' // Cliente que refiere (solo para venta de referidos)
  });

  // Cargar clientes al montar el componente
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await getAllCustomers(user.id);
        if (!error && data) {
          setCustomers(data);
        }
      }
    } catch (error) {
      console.error('[SalesModuleWithCart] Error cargando clientes:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Auto-calcular precio unitario cuando seleccionas un producto
  // Usa búsqueda case-insensitive para mayor robustez
  useEffect(() => {
    if (formData.productName && !formData.unitPrice) {
      const foundPrice = findPriceForProduct(formData.productName);

      if (foundPrice !== null) {
        console.log('[SalesModule] useEffect auto-fill price:', { productName: formData.productName, foundPrice });
        setFormData(prev => ({
          ...prev,
          unitPrice: foundPrice.toString()
        }));
      }
    }
  }, [formData.productName, prices]);

  // Calcular subtotal reactivo
  const subtotal = React.useMemo(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const price = parseFloat(formData.unitPrice) || 0;
    return qty * price;
  }, [formData.quantity, formData.unitPrice]);

  // Calcular total del carrito
  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  // Agregar producto al carrito
  const handleAddToCart = () => {
    const qty = parseInt(formData.quantity) || 0;
    const price = parseFloat(formData.unitPrice) || 0;

    if (!formData.productName) {
      toast({ title: "Producto Requerido", description: "Debes seleccionar un producto.", variant: "destructive" });
      return;
    }

    if (qty <= 0) {
      toast({ title: "Cantidad Inválida", description: "La cantidad debe ser mayor a 0.", variant: "destructive" });
      return;
    }

    if (price <= 0) {
      toast({ title: "Precio Inválido", description: "El precio debe ser mayor a 0.", variant: "destructive" });
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
      const newItem = { productName: formData.productName, quantity: qty, unitPrice: price, subtotal: qty * price };
      setCart([...cart, newItem]);
      toast({
        title: "Producto Agregado",
        description: `${formData.productName} agregado al carrito.`,
        className: "bg-green-900 border-green-600 text-white"
      });
    }

    // Limpiar solo producto, cantidad y precio
    setFormData(prev => ({ ...prev, productName: '', quantity: '', unitPrice: '' }));
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
    toast({ title: "Carrito Vaciado", description: "Todos los productos han sido removidos.", className: "bg-gray-900 border-gray-600 text-white" });
  };

  // Finalizar venta
  const handleFinalizeSale = async () => {
    if (cart.length === 0) {
      toast({ title: "Carrito Vacío", description: "Agrega al menos un producto para finalizar la venta.", variant: "destructive" });
      return;
    }

    // Validaciones según tipo de venta
    if (formData.saleType === 'frecuente' && !formData.customerId) {
      toast({ title: "Cliente Requerido", description: "Selecciona el cliente frecuente para esta venta.", variant: "destructive" });
      return;
    }

    if (formData.saleType === 'referido') {
      if (!formData.customerId) {
        toast({ title: "Cliente Requerido", description: "Selecciona la persona que compra.", variant: "destructive" });
        return;
      }
      if (!formData.referrerId) {
        toast({ title: "Referente Requerido", description: "Selecciona quién refiere esta venta.", variant: "destructive" });
        return;
      }
      if (formData.customerId === formData.referrerId) {
        toast({ title: "Error", description: "El cliente y el referente no pueden ser la misma persona.", variant: "destructive" });
        return;
      }
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const transactionsToAdd = [];
      let totalLoansCreated = 0;
      let remindersCreated = 0;

      // Obtener datos de cliente y referente
      const customer = formData.customerId ? customers.find(c => c.id === formData.customerId) : null;
      const referrer = formData.referrerId ? customers.find(c => c.id === formData.referrerId) : null;

      // Determinar sale_type para la BD
      let dbSaleType = 'organic';
      if (formData.saleType === 'frecuente') dbSaleType = 'recurring';
      else if (formData.saleType === 'referido') dbSaleType = 'referral';

      // Procesar cada producto del carrito
      for (const item of cart) {
        const available = inventoryMap[item.productName] || 0;
        const shortage = Math.max(0, item.quantity - available);

        // Construir notas
        let saleNotes = formData.notes || '';
        if (formData.campaignName) saleNotes += ` - Campaña: ${formData.campaignName}`;
        if (formData.saleType === 'referido' && referrer) {
          saleNotes += ` - Referido por: ${referrer.full_name}`;
        }

        // Crear transacción de venta
        const saleResult = await addTransactionV2({
          type: 'sale',
          productName: item.productName,
          quantityBoxes: item.quantity,
          quantitySachets: 0,
          totalAmount: item.subtotal,
          notes: saleNotes.trim(),
          listPrice: item.unitPrice,
          customerId: formData.customerId || null,
          saleType: dbSaleType,
          referrerId: formData.referrerId || null
        });

        if (saleResult.error) {
          const err = saleResult.error;
          console.error('Error en venta - DETALLE COMPLETO:', JSON.stringify(err, null, 2));
          console.error('Error en venta - Props:', {
            message: err?.message,
            code: err?.code,
            details: err?.details,
            hint: err?.hint,
            tipo: typeof err,
            keys: err ? Object.keys(err) : 'N/A'
          });
          throw new Error(err?.message || err?.details || JSON.stringify(err) || 'Error desconocido en venta');
        }
        if (saleResult.data) transactionsToAdd.push(saleResult.data);

        // Crear recordatorios automáticos si hay cliente
        if (customer && saleResult.data) {
          try {
            const reminderResult = await createAutomaticReminders(
              user.id,
              customer.id,
              saleResult.data.id,
              item.productName,
              customer.full_name
            );
            if (!reminderResult.error) {
              remindersCreated += 2; // 15 y 30 días
            }
          } catch (reminderError) {
            console.warn('Error creando recordatorios:', reminderError);
          }
        }

        // Si hay faltante, crear préstamo
        if (shortage > 0) {
          const loanResult = await createLoan({
            productName: item.productName,
            quantityBoxes: shortage,
            quantitySachets: 0,
            notes: `Préstamo generado en venta${customer ? ` a ${customer.full_name}` : ''} - ${formData.notes || 'Sin notas'}`
          });

          if (loanResult.error) {
            console.error('Error creando préstamo:', loanResult.error);
            toast({
              title: "Advertencia",
              description: `Venta completada pero no se pudo registrar el préstamo de ${shortage} unidades de ${item.productName}`,
              className: "bg-orange-900 border-orange-600 text-white"
            });
          } else {
            totalLoansCreated += shortage;
          }
        }
      }

      // Enviar transacciones al padre
      onAdd(transactionsToAdd);

      // Limpiar todo
      const totalSold = cart.length;
      const totalAmount = getCartTotal();

      setCart([]);
      setFormData({
        productName: '', quantity: '', unitPrice: '', campaignName: '', notes: '',
        saleType: '', customerId: '', referrerId: ''
      });

      // Toast de éxito con información detallada
      let description = `${totalSold} productos vendidos. Total: $${totalAmount.toLocaleString('es-CL')}`;
      if (customer) description += ` | Cliente: ${customer.full_name}`;
      if (referrer) description += ` | Referido por: ${referrer.full_name}`;
      if (totalLoansCreated > 0) description += ` | ${totalLoansCreated} unidades como préstamo`;
      if (remindersCreated > 0) description += ` | ${remindersCreated} recordatorios creados`;

      toast({ title: "¡Venta Completada!", description, className: "bg-green-900 border-green-600 text-white" });

    } catch (error) {
      console.error('Error finalizando venta - COMPLETO:', error);
      console.error('Error finalizando venta - JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

      // Construir mensaje de error descriptivo
      let errorMsg = error?.message || String(error) || "No se pudo completar la venta.";

      // Detectar errores comunes
      if (errorMsg.includes('42703') || errorMsg.includes('column')) {
        errorMsg = "Faltan columnas en la base de datos. Ejecuta los scripts SQL de CRM.";
      } else if (errorMsg.includes('23503') || errorMsg.includes('foreign key')) {
        errorMsg = "El cliente o referente seleccionado no existe.";
      } else if (errorMsg.includes('no existe')) {
        errorMsg = `Producto no encontrado: ${errorMsg}`;
      }

      toast({
        title: "Error en Venta",
        description: errorMsg,
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

  // Obtener clientes para el selector (excluir referente si está seleccionado)
  const getAvailableCustomers = (excludeId = null) => {
    return customers.filter(c => c.id !== excludeId);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-1 h-6 bg-green-500 rounded-full"></span>
          Nueva Venta con Carrito
          {cart.length > 0 && (
            <span className="ml-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full font-bold">
              {cart.length} {cart.length === 1 ? 'producto' : 'productos'}
            </span>
          )}
        </h3>
        <HelpButton onClick={() => setHelpOpen(true)} className="text-xs" />
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto">
        {/* Formulario de Agregar Producto */}
        <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-white/5">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 flex items-center">
              Producto *
              <HelpTooltip content={salesFieldHelp.product} />
            </label>
            <ProductAutocomplete
              value={formData.productName}
              onChange={(value) => setFormData({...formData, productName: value})}
              onSelect={(productName, price) => {
                // Usar precio del autocomplete o buscar en prices
                const finalPrice = price || findPriceForProduct(productName);

                console.log('[SalesModule] onSelect:', { productName, priceFromAutocomplete: price, finalPrice });

                setFormData(prev => ({
                  ...prev,
                  productName: productName,
                  unitPrice: finalPrice ? finalPrice.toString() : ''
                }));
              }}
              products={products}
              prices={prices}
              placeholder="Ej: prunex 1 (escribe para buscar)"
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 outline-none transition-all placeholder-gray-700"
              icon={Tag}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 flex items-center">
                Cantidad *
                <HelpTooltip content={salesFieldHelp.quantityBoxes} />
              </label>
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
              <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 flex items-center">
                Precio Unit. *
                <HelpTooltip content={salesFieldHelp.totalAmount} />
              </label>
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
                ${subtotal.toLocaleString('es-CL')}
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
              <button onClick={handleClearCart} className="text-xs text-red-400 hover:text-red-300 transition-colors">
                Vaciar
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              <AnimatePresence mode="popLayout">
                {cart.map((item, index) => (
                  <motion.div
                    key={`cart-${item.productName}-${index}`}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                    className="bg-black/30 border border-white/5 rounded-lg p-3 hover:border-green-500/20 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white text-sm truncate">{item.productName}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {item.quantity} × ${item.unitPrice.toLocaleString('es-CL')}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="font-bold text-green-400 text-sm">${item.subtotal.toLocaleString('es-CL')}</div>
                        <button onClick={() => handleRemoveFromCart(index)} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors group">
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
                <span className="text-2xl font-black text-green-400">${getCartTotal().toLocaleString('es-CL')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Campos Adicionales - Tipo de Venta */}
        <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-white/5">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Tipo de Venta</label>
            <div className="relative group">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-green-400 transition-colors" />
              <select
                value={formData.saleType}
                onChange={(e) => setFormData({...formData, saleType: e.target.value, customerId: '', referrerId: ''})}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 outline-none transition-all appearance-none text-sm"
              >
                <option value="">Venta Orgánica (sin cliente)</option>
                <option value="frecuente">Venta Frecuente (cliente recurrente)</option>
                <option value="referido">Venta de Referidos</option>
              </select>
            </div>
          </div>

          {/* Selector de Cliente Frecuente */}
          {formData.saleType === 'frecuente' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 flex items-center gap-2">
                <Users className="w-3 h-3" />
                Cliente Frecuente *
              </label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
                <select
                  value={formData.customerId}
                  onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 outline-none transition-all appearance-none text-sm"
                >
                  <option value="">-- Selecciona un cliente --</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.full_name} {customer.phone ? `(${customer.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {customers.length === 0 && !loadingCustomers && (
                <p className="text-xs text-gray-500 pl-1">
                  No hay clientes registrados. Ve a "Gestión de Operaciones" → "Clientes" para crear uno.
                </p>
              )}
              <p className="text-xs text-purple-400 pl-1">
                Se crearán recordatorios automáticos a 15 y 30 días para seguimiento.
              </p>
            </motion.div>
          )}

          {/* Selectores para Venta de Referidos */}
          {formData.saleType === 'referido' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              {/* Cliente que compra */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 flex items-center gap-2">
                  <User className="w-3 h-3" />
                  Persona que Compra *
                </label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                  <select
                    value={formData.customerId}
                    onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all appearance-none text-sm"
                  >
                    <option value="">-- Selecciona quien compra --</option>
                    {getAvailableCustomers(formData.referrerId).map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.full_name} {customer.phone ? `(${customer.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cliente que refiere */}
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 flex items-center gap-2">
                  <UserPlus className="w-3 h-3" />
                  ¿Quién Refiere? *
                </label>
                <div className="relative group">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-orange-400 transition-colors" />
                  <select
                    value={formData.referrerId}
                    onChange={(e) => setFormData({...formData, referrerId: e.target.value})}
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all appearance-none text-sm"
                  >
                    <option value="">-- Selecciona quien refiere --</option>
                    {getAvailableCustomers(formData.customerId).map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.full_name} {customer.phone ? `(${customer.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {customers.length === 0 && !loadingCustomers && (
                <p className="text-xs text-gray-500 pl-1">
                  No hay clientes registrados. Ve a "Gestión de Operaciones" → "Clientes" para crear uno.
                </p>
              )}
              <p className="text-xs text-orange-400 pl-1">
                La venta se asociará al comprador y se registrará el referido en el historial de quien refiere.
              </p>
            </motion.div>
          )}

          {/* Campaña (para campañas adicionales) */}
          {campaigns.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Campaña Adicional</label>
              <select
                value={formData.campaignName}
                onChange={(e) => setFormData({...formData, campaignName: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 outline-none transition-all appearance-none text-sm"
              >
                <option value="">Sin campaña adicional</option>
                {campaigns.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notas */}
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

      <HelpPanel
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        helpContent={salesHelp}
      />
    </motion.div>
  );
};

export default SalesModuleWithCart;
