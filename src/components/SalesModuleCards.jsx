import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Link2, FileText, Users, User, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ProductCardGrid from '@/components/ProductCardGrid';
import CartSummaryPanel from '@/components/CartSummaryPanel';
import { addTransactionV2 } from '@/lib/transactionServiceV2';
import { createLoan } from '@/lib/loanService';
import { getAllCustomers } from '@/lib/customerService';
import { createAutomaticReminders } from '@/lib/reminderService';
import { supabase } from '@/lib/supabase';

console.log('%c🛒 SalesModuleCards CARGADO', 'background: #22c55e; color: #000; font-size: 14px; padding: 5px;');

const SalesModuleCards = ({
  onAdd,
  inventoryMap = {},
  campaigns = [],
  prices = {},
  products = [],
  onReloadProducts
}) => {
  const { toast } = useToast();

  // Estado de cantidades seleccionadas por producto {productId: quantity}
  const [selectedQuantities, setSelectedQuantities] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [customers, setCustomers] = useState([]);

  // Campos adicionales
  const [campaignName, setCampaignName] = useState('');
  const [notes, setNotes] = useState('');
  const [saleType, setSaleType] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [referrerId, setReferrerId] = useState('');

  // DEBUG
  useEffect(() => {
    console.log('[SalesModuleCards] Productos recibidos:', products?.length);
    console.log('[SalesModuleCards] Muestra:', products?.slice(0, 3));
  }, [products]);

  // Cargar clientes
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await getAllCustomers(user.id);
        if (!error && data) {
          setCustomers(data);
        }
      }
    } catch (error) {
      console.error('[SalesModuleCards] Error cargando clientes:', error);
    }
  };

  // Items del carrito calculados desde selectedQuantities (soportar ambos formatos de precio)
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

  // Total del carrito
  const cartTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cartItems]);

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
    const stock = product.current_stock_boxes ?? product.currentStockBoxes ?? 0;

    // Permitir exceder stock (se manejará como préstamo)
    if (currentQty >= stock && stock > 0) {
      toast({
        title: "Stock Limitado",
        description: `Solo hay ${stock} cajas. Las adicionales se registrarán como préstamo.`,
        className: "bg-yellow-900 border-yellow-600 text-white"
      });
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
    setCampaignName('');
    setNotes('');
    setSaleType('');
    setCustomerId('');
    setReferrerId('');
  }, []);

  // Finalizar venta
  const handleConfirmSale = async () => {
    if (cartItems.length === 0) {
      toast({ title: "Sin productos", description: "Selecciona al menos un producto", variant: "destructive" });
      return;
    }

    // Validaciones según tipo de venta
    if (saleType === 'frecuente' && !customerId) {
      toast({ title: "Cliente Requerido", description: "Selecciona el cliente frecuente.", variant: "destructive" });
      return;
    }

    if (saleType === 'referido') {
      if (!customerId) {
        toast({ title: "Cliente Requerido", description: "Selecciona quién compra.", variant: "destructive" });
        return;
      }
      if (!referrerId) {
        toast({ title: "Referente Requerido", description: "Selecciona quién refiere.", variant: "destructive" });
        return;
      }
      if (customerId === referrerId) {
        toast({ title: "Error", description: "Cliente y referente no pueden ser iguales.", variant: "destructive" });
        return;
      }
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const transactionsToAdd = [];
      let totalLoansCreated = 0;

      const customer = customerId ? customers.find(c => c.id === customerId) : null;
      const referrer = referrerId ? customers.find(c => c.id === referrerId) : null;

      let dbSaleType = 'organic';
      if (saleType === 'frecuente') dbSaleType = 'recurring';
      else if (saleType === 'referido') dbSaleType = 'referral';

      // Procesar cada producto
      for (const item of cartItems) {
        const product = item.product;
        const available = product.current_stock_boxes ?? product.currentStockBoxes ?? 0;
        const shortage = Math.max(0, item.quantity - available);

        let saleNotes = notes || '';
        if (campaignName) saleNotes += ` - Campaña: ${campaignName}`;
        if (saleType === 'referido' && referrer) {
          saleNotes += ` - Referido por: ${referrer.full_name}`;
        }

        // Crear transacción de venta (usar productName, no product_id)
        const saleTransaction = {
          type: 'sale',
          productName: product.name,
          quantityBoxes: item.quantity,
          totalAmount: item.subtotal,
          listPrice: item.unitPrice,
          notes: saleNotes.trim(),
          campaignName: campaignName || 'Orgánico',
          saleType: dbSaleType,
          customerId: customerId || null,
          referrerId: referrerId || null
        };

        const { data: saleData, error: saleError } = await addTransactionV2(saleTransaction);

        if (saleError) {
          console.error('[SalesModuleCards] Error registrando venta:', saleError);
          throw saleError;
        }

        transactionsToAdd.push(saleData);

        // Si hay faltante, crear préstamo
        if (shortage > 0) {
          const loanData = {
            product_id: product.id,
            quantity_boxes: shortage,
            type: 'borrowed',
            status: 'pending',
            notes: `Préstamo automático - Venta excedió stock por ${shortage} unidades`
          };

          const { error: loanError } = await createLoan(user.id, loanData);
          if (!loanError) {
            totalLoansCreated++;
          }
        }
      }

      // Crear recordatorios automáticos si hay cliente
      if (customer) {
        await createAutomaticReminders(user.id, customer.id, cartItems.map(i => i.product.name).join(', '));
      }

      // Callback para actualizar el estado padre
      if (onAdd && transactionsToAdd.length > 0) {
        await onAdd(transactionsToAdd);
      }

      // Recargar productos para actualizar inventario
      if (onReloadProducts) {
        await onReloadProducts();
      }

      // Notificación de éxito
      let successMsg = `${cartItems.length} producto(s) vendido(s)`;
      if (totalLoansCreated > 0) {
        successMsg += ` (${totalLoansCreated} préstamo(s) creado(s))`;
      }

      toast({
        title: "Venta Registrada",
        description: successMsg,
        className: "bg-green-900 border-green-600 text-white"
      });

      handleClear();

    } catch (error) {
      console.error('[SalesModuleCards] Error:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la venta",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
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
          <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          Nueva Venta
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
        <p className="text-xs text-gray-500 mb-3">Haz click en los productos para agregarlos al carrito</p>
        <ProductCardGrid
          products={products}
          selectedQuantities={selectedQuantities}
          onQuantityChange={handleQuantityChange}
          colorTheme="green"
          showStock={true}
          validateStock={false} // Permitir exceder stock (préstamos)
        />
      </div>

      {/* Panel lateral: Opciones + Carrito */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Opciones de venta */}
        <div className="space-y-4">
          {/* Tipo de venta */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
              Tipo de Venta
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSaleType('')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  saleType === ''
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'bg-gray-800/50 text-gray-400 border border-white/5 hover:border-white/20'
                }`}
              >
                Orgánica
              </button>
              <button
                onClick={() => setSaleType('frecuente')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  saleType === 'frecuente'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                    : 'bg-gray-800/50 text-gray-400 border border-white/5 hover:border-white/20'
                }`}
              >
                <User className="w-3 h-3 inline mr-1" />
                Frecuente
              </button>
              <button
                onClick={() => setSaleType('referido')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  saleType === 'referido'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                    : 'bg-gray-800/50 text-gray-400 border border-white/5 hover:border-white/20'
                }`}
              >
                <Users className="w-3 h-3 inline mr-1" />
                Referido
              </button>
            </div>
          </div>

          {/* Selector de cliente (si es frecuente o referido) */}
          {(saleType === 'frecuente' || saleType === 'referido') && (
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
                {saleType === 'referido' ? 'Cliente que Compra' : 'Cliente Frecuente'}
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none"
              >
                <option value="">Seleccionar cliente...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Selector de referente (solo para referido) */}
          {saleType === 'referido' && (
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
                Cliente que Refiere
              </label>
              <select
                value={referrerId}
                onChange={(e) => setReferrerId(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 outline-none"
              >
                <option value="">Seleccionar referente...</option>
                {customers.filter(c => c.id !== customerId).map(c => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Campaña */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
              Campaña
            </label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <select
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none appearance-none"
              >
                <option value="">Venta Orgánica</option>
                {campaigns.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
              Notas
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none resize-none h-20"
                placeholder="Notas adicionales..."
              />
            </div>
          </div>
        </div>

        {/* Panel del carrito */}
        <CartSummaryPanel
          items={cartItems}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onRemove={handleRemove}
          onConfirm={handleConfirmSale}
          onClear={handleClear}
          colorTheme="green"
          totalLabel="Total Venta"
          confirmLabel="Registrar Venta"
          isLoading={isLoading}
          showPrices={true}
        />
      </div>
    </motion.div>
  );
};

export default SalesModuleCards;
