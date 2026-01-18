import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Users, Edit2, Trash2, Search, User, Mail, Phone,
  FileText, X as CloseIcon, UserPlus, ChevronRight, Star,
  LayoutGrid, List
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  getAllCustomers, createCustomer, updateCustomer, deleteCustomer,
  searchCustomers, getClientReferralCounts
} from '@/lib/customerService';
import ProductAutocomplete from '@/components/ui/ProductAutocomplete';
import { addTransactionV2 } from '@/lib/transactionServiceV2';
import { createAutomaticReminders } from '@/lib/reminderService';
import CustomerDetailSheet from '@/components/CustomerDetailSheet';

/**
 * CustomerManagement - Gestión de clientes optimizada para móvil
 *
 * Features:
 * - Lista compacta con filas táctiles (56px)
 * - Bottom sheet para detalles del cliente
 * - Búsqueda en tiempo real
 * - Acciones rápidas accesibles
 */
const CustomerManagement = ({ userId, prices = {}, onTransactionsAdded }) => {
  const { toast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    rut: '',
    phone: '',
    notes: '',
    referred_by_client_id: null
  });

  // Quick sale state
  const [quickSaleOpen, setQuickSaleOpen] = useState(false);
  const [quickSaleCustomer, setQuickSaleCustomer] = useState(null);
  const [cart, setCart] = useState([]);
  const [quickForm, setQuickForm] = useState({ productName: '', quantity: 1 });
  const productOptions = useMemo(() => Object.keys(prices || {}), [prices]);

  // Referral state
  const [referralCounts, setReferralCounts] = useState({});
  const [referringCustomer, setReferringCustomer] = useState(null);

  // Detail sheet state
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  // View mode (compact/cards) - default compact for mobile
  const [viewMode, setViewMode] = useState('compact');

  useEffect(() => {
    if (userId) {
      loadCustomers();
    }
  }, [userId]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const [customersResult, countsResult] = await Promise.all([
        getAllCustomers(userId),
        getClientReferralCounts(userId)
      ]);

      if (customersResult.error) throw customersResult.error;
      setCustomers(customersResult.data || []);
      setReferralCounts(countsResult.data || {});
    } catch (error) {
      console.error('[CustomerManagement] Error loading customers:', error);
      toast({
        title: "Error al cargar clientes",
        description: "No se pudieron cargar los clientes. Intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (term) => {
    setSearchTerm(term);
    if (!term.trim()) {
      loadCustomers();
      return;
    }

    try {
      const { data, error } = await searchCustomers(userId, term);
      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('[CustomerManagement] Error searching:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Debes ingresar el nombre completo del cliente.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingCustomer) {
        const { error } = await updateCustomer(editingCustomer.id, formData);
        if (error) throw error;

        toast({
          title: "Cliente actualizado",
          description: `${formData.full_name} ha sido actualizado correctamente.`,
          className: "bg-green-900 border-green-600 text-white"
        });
      } else {
        const { error } = await createCustomer(userId, formData);
        if (error) throw error;

        if (formData.referred_by_client_id && referringCustomer) {
          toast({
            title: "Referido agregado",
            description: `${formData.full_name} ha sido agregado como referido de ${referringCustomer.full_name}.`,
            className: "bg-purple-900 border-purple-600 text-white"
          });
        } else {
          toast({
            title: "Cliente creado",
            description: `${formData.full_name} ha sido agregado a tu base de clientes.`,
            className: "bg-green-900 border-green-600 text-white"
          });
        }
      }

      resetForm();
      loadCustomers();
    } catch (error) {
      console.error('[CustomerManagement] Error saving customer:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el cliente. Intenta de nuevo.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({ full_name: '', email: '', rut: '', phone: '', notes: '', referred_by_client_id: null });
    setShowForm(false);
    setEditingCustomer(null);
    setReferringCustomer(null);
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      full_name: customer.full_name,
      email: customer.email || '',
      rut: customer.rut || '',
      phone: customer.phone || '',
      notes: customer.notes || '',
      referred_by_client_id: null
    });
    setShowForm(true);
  };

  const handleDelete = async (customerId, customerName) => {
    if (!confirm(`¿Seguro que quieres eliminar a ${customerName}?`)) return;

    try {
      const { error } = await deleteCustomer(customerId);
      if (error) throw error;

      toast({
        title: "Cliente eliminado",
        description: `${customerName} ha sido eliminado.`,
        className: "bg-gray-800 border-gray-600 text-white"
      });

      setDetailSheetOpen(false);
      loadCustomers();
    } catch (error) {
      console.error('[CustomerManagement] Error deleting customer:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente. Intenta de nuevo.",
        variant: "destructive"
      });
    }
  };

  const openReferralForm = (customer) => {
    setEditingCustomer(null);
    setReferringCustomer(customer);
    setFormData({
      full_name: '',
      email: '',
      rut: '',
      phone: '',
      notes: '',
      referred_by_client_id: customer.id
    });
    setShowForm(true);
  };

  // Quick sale helpers
  const findPriceForProduct = (productName) => {
    if (!productName || !prices) return null;
    if (prices[productName] !== undefined) return prices[productName];
    const lowerName = productName.toLowerCase();
    const matchKey = Object.keys(prices).find(k => k.toLowerCase() === lowerName);
    return matchKey ? prices[matchKey] : null;
  };

  const openQuickSale = (customer) => {
    setQuickSaleCustomer(customer);
    setQuickSaleOpen(true);
    setCart([]);
    setQuickForm({ productName: '', quantity: 1 });
  };

  const handleAddToCart = () => {
    const name = (quickForm.productName || '').trim();
    const qty = parseInt(quickForm.quantity, 10) || 0;
    if (!name) {
      toast({ title: "Producto requerido", description: "Selecciona un producto.", variant: "destructive" });
      return;
    }
    if (qty <= 0) {
      toast({ title: "Cantidad inválida", description: "La cantidad debe ser mayor a 0.", variant: "destructive" });
      return;
    }
    const rawPrice = findPriceForProduct(name);
    const price = rawPrice !== null
      ? parseFloat(String(rawPrice).replace(/\./g, '').replace(',', '.'))
      : null;

    if (price === null || isNaN(price) || price <= 0) {
      toast({ title: "Precio faltante", description: "Este producto no tiene precio configurado.", variant: "destructive" });
      return;
    }

    const existingIndex = cart.findIndex(item => item.productName.toLowerCase() === name.toLowerCase());
    if (existingIndex >= 0) {
      const newCart = [...cart];
      const prev = newCart[existingIndex];
      const newQty = prev.quantity + qty;
      newCart[existingIndex] = { ...prev, quantity: newQty, unitPrice: price, subtotal: newQty * price };
      setCart(newCart);
    } else {
      setCart([...cart, { productName: name, quantity: qty, unitPrice: price, subtotal: qty * price }]);
    }
    setQuickForm({ productName: '', quantity: 1 });
  };

  const handleRemoveFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const getCartTotal = () => cart.reduce((sum, item) => sum + item.subtotal, 0);

  const handleConfirmQuickSale = async () => {
    if (!quickSaleCustomer) return;
    if (cart.length === 0) {
      toast({ title: "Carrito vacío", description: "Agrega al menos un producto.", variant: "destructive" });
      return;
    }

    try {
      const created = [];
      for (const item of cart) {
        const transaction = {
          type: 'sale',
          productName: item.productName,
          quantityBoxes: item.quantity,
          totalAmount: item.unitPrice * item.quantity,
          notes: `Venta rápida desde cliente: ${quickSaleCustomer.full_name}`,
          customerId: quickSaleCustomer.id
        };
        const { data, error } = await addTransactionV2(transaction);
        if (error) throw error;
        if (data) created.push(data);
      }

      if (created.length > 0) {
        await createAutomaticReminders(
          userId,
          quickSaleCustomer.id,
          created[0].id,
          created[0].productName || 'Compra',
          quickSaleCustomer.full_name
        );
      }

      if (onTransactionsAdded && created.length > 0) {
        onTransactionsAdded(created);
      }

      toast({
        title: "Venta registrada",
        description: `Se registró la venta para ${quickSaleCustomer.full_name}.`,
        className: "bg-green-900 border-green-600 text-white"
      });

      setQuickSaleOpen(false);
      setQuickSaleCustomer(null);
      setCart([]);
    } catch (error) {
      console.error('[CustomerManagement] Error en venta rápida:', error);
      toast({
        title: "Error al registrar venta",
        description: error?.message || 'No se pudo registrar la venta.',
        variant: "destructive"
      });
    }
  };

  // Open detail sheet
  const openDetailSheet = (customer) => {
    setSelectedCustomer(customer);
    setDetailSheetOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-gray-900/40 border border-white/5 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Clientes</h3>
              <p className="text-xs text-gray-400">{customers.length} registrados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle - hidden on very small screens */}
            <div className="hidden sm:flex items-center gap-1 p-1 bg-white/5 rounded-lg">
              <button
                onClick={() => setViewMode('compact')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'compact' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-white'
                }`}
                title="Vista compacta"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'cards' ? 'bg-purple-500/20 text-purple-400' : 'text-gray-500 hover:text-white'
                }`}
                title="Vista tarjetas"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
            <Button
              onClick={() => setShowForm(!showForm)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              size="sm"
            >
              <Plus className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Nuevo</span>
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500/20 outline-none text-sm"
            placeholder="Buscar cliente..."
          />
        </div>
      </div>

      {/* Form (collapsible) */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="border-b border-white/5 overflow-hidden"
          >
            <div className="p-4 sm:p-6 space-y-4">
              {/* Badge de Referido por */}
              {referringCustomer && !editingCustomer && (
                <div className="flex items-center gap-2 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                  <UserPlus className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-xs text-purple-300 uppercase font-bold">Referido por</p>
                    <p className="text-white font-semibold">{referringCustomer.full_name}</p>
                  </div>
                </div>
              )}

              <h4 className="text-white font-semibold">
                {editingCustomer ? 'Editar Cliente' : referringCustomer ? 'Nuevo Referido' : 'Nuevo Cliente'}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs uppercase text-gray-500 font-bold">Nombre *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500/20 outline-none"
                      placeholder="Juan Pérez"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase text-gray-500 font-bold">RUT</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={formData.rut}
                      onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500/20 outline-none"
                      placeholder="12.345.678-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase text-gray-500 font-bold">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500/20 outline-none"
                      placeholder="cliente@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase text-gray-500 font-bold">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500/20 outline-none"
                      placeholder="+56 9 1234 5678"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase text-gray-500 font-bold">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-purple-500/20 outline-none resize-none h-20"
                  placeholder="Información adicional..."
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
                  {editingCustomer ? 'Actualizar' : 'Crear'}
                </Button>
                <Button type="button" onClick={resetForm} variant="ghost" className="text-gray-400">
                  Cancelar
                </Button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Customer List */}
      <div className="max-h-[60vh] sm:max-h-[500px] overflow-y-auto overscroll-contain">
        {customers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">No hay clientes</p>
            <p className="text-gray-500 text-sm mt-1">Crea tu primer cliente para empezar</p>
            <Button
              onClick={() => setShowForm(true)}
              className="mt-4 bg-purple-600 hover:bg-purple-700"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar cliente
            </Button>
          </div>
        ) : viewMode === 'compact' ? (
          /* COMPACT VIEW - Mobile optimized */
          <div className="divide-y divide-white/5">
            {customers.map((customer) => {
              const refCount = referralCounts[customer.id] || 0;

              return (
                <button
                  key={customer.id}
                  onClick={() => openDetailSheet(customer)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 active:bg-white/10 transition-colors text-left"
                >
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-base font-bold text-purple-400">
                      {customer.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-medium truncate">{customer.full_name}</h4>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {refCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-400 rounded">
                          <Star className="w-2.5 h-2.5" />
                          {refCount}
                        </span>
                      )}
                      {customer.referrer && (
                        <span className="text-[10px] text-blue-400 truncate">
                          Ref: {customer.referrer.full_name?.split(' ')[0]}
                        </span>
                      )}
                      {customer.phone && (
                        <span className="text-[10px] text-gray-500 truncate">{customer.phone}</span>
                      )}
                    </div>
                  </div>

                  {/* Chevron */}
                  <ChevronRight className="w-5 h-5 text-gray-600 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        ) : (
          /* CARDS VIEW - Desktop/expanded */
          <div className="p-4 space-y-3">
            {customers.map((customer) => {
              const refCount = referralCounts[customer.id] || 0;

              return (
                <div
                  key={customer.id}
                  className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                  onClick={() => openDetailSheet(customer)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-purple-400">
                          {customer.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-white font-semibold">{customer.full_name}</h4>
                          {refCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full">
                              <Star className="w-3 h-3" />
                              {refCount} referido{refCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-gray-400">
                          {customer.rut && <span>RUT: {customer.rut}</span>}
                          {customer.email && <span>{customer.email}</span>}
                          {customer.phone && <span>{customer.phone}</span>}
                        </div>
                        {customer.referrer && (
                          <p className="text-xs text-purple-400 mt-2 flex items-center gap-1">
                            <UserPlus className="w-3 h-3" />
                            Referido por: {customer.referrer.full_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600 flex-shrink-0 mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Customer Detail Sheet */}
      <CustomerDetailSheet
        customer={selectedCustomer}
        isOpen={detailSheetOpen}
        onClose={() => {
          setDetailSheetOpen(false);
          setSelectedCustomer(null);
        }}
        userId={userId}
        referralCount={selectedCustomer ? (referralCounts[selectedCustomer.id] || 0) : 0}
        onEdit={(c) => {
          setDetailSheetOpen(false);
          handleEdit(c);
        }}
        onDelete={handleDelete}
        onQuickSale={(c) => {
          setDetailSheetOpen(false);
          openQuickSale(c);
        }}
        onAddReferral={(c) => {
          setDetailSheetOpen(false);
          openReferralForm(c);
        }}
      />

      {/* Quick Sale Modal */}
      {quickSaleOpen && quickSaleCustomer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full sm:max-w-xl bg-gray-900 border-t sm:border border-white/10 sm:rounded-2xl shadow-2xl"
          >
            {/* Handle for mobile */}
            <div className="sm:hidden pt-3 pb-1">
              <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto" />
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase">Venta rápida</p>
                  <h4 className="text-lg font-bold text-white">{quickSaleCustomer.full_name}</h4>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setQuickSaleOpen(false)} className="text-gray-400 hover:text-white -mr-2">
                  <CloseIcon className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">Producto</label>
                    <ProductAutocomplete
                      value={quickForm.productName}
                      products={productOptions}
                      prices={prices}
                      onChange={(value) => setQuickForm(prev => ({ ...prev, productName: value }))}
                      onSelect={(value) => setQuickForm(prev => ({ ...prev, productName: value }))}
                      placeholder="Buscar producto..."
                      hideIconWhenFilled
                      className="w-full bg-gray-900/60 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-green-500/30 focus:border-green-500/50 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase text-gray-500 font-bold mb-1 block">Cantidad</label>
                    <input
                      type="number"
                      min="1"
                      value={quickForm.quantity}
                      onChange={(e) => setQuickForm(prev => ({ ...prev, quantity: e.target.value }))}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleAddToCart} className="bg-green-600 hover:bg-green-700 text-white">
                    Agregar al carrito
                  </Button>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-3 max-h-40 overflow-y-auto">
                  {cart.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">Agrega productos al carrito</p>
                  ) : (
                    cart.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-b-0">
                        <div>
                          <p className="text-white font-medium">{item.productName}</p>
                          <p className="text-xs text-gray-400">Cant: {item.quantity} · ${item.unitPrice.toLocaleString()} c/u</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-white font-bold">${item.subtotal.toLocaleString()}</span>
                          <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-200 p-1" onClick={() => handleRemoveFromCart(idx)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-400">Total</span>
                  <span className="text-2xl font-bold text-white">${getCartTotal().toLocaleString()}</span>
                </div>

                <div className="flex gap-3">
                  <Button onClick={handleConfirmQuickSale} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3">
                    Confirmar Venta
                  </Button>
                  <Button variant="outline" className="flex-1 py-3" onClick={() => setQuickSaleOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>

            {/* Safe area padding */}
            <div className="sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }} />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default CustomerManagement;
