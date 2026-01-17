import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Edit2, Trash2, Search, User, Mail, Phone, FileText, X as CloseIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getAllCustomers, createCustomer, updateCustomer, deleteCustomer, searchCustomers } from '@/lib/customerService';
import ProductAutocomplete from '@/components/ui/ProductAutocomplete';
import { addTransactionV2 } from '@/lib/transactionServiceV2';
import { createAutomaticReminders } from '@/lib/reminderService';

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
    notes: ''
  });
  const [quickSaleOpen, setQuickSaleOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cart, setCart] = useState([]);
  const [quickForm, setQuickForm] = useState({ productName: '', quantity: 1 });
  const productOptions = useMemo(() => Object.keys(prices || {}), [prices]);

  useEffect(() => {
    if (userId) {
      loadCustomers();
    }
  }, [userId]);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await getAllCustomers(userId);
      if (error) throw error;
      setCustomers(data || []);
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
        // Actualizar cliente existente
        const { error } = await updateCustomer(editingCustomer.id, formData);
        if (error) throw error;

        toast({
          title: "Cliente actualizado",
          description: `${formData.full_name} ha sido actualizado correctamente.`,
          className: "bg-green-900 border-green-600 text-white"
        });
      } else {
        // Crear nuevo cliente
        const { error } = await createCustomer(userId, formData);
        if (error) throw error;

        toast({
          title: "Cliente creado",
          description: `${formData.full_name} ha sido agregado a tu base de clientes.`,
          className: "bg-green-900 border-green-600 text-white"
        });
      }

      // Resetear formulario y recargar
      setFormData({ full_name: '', email: '', rut: '', phone: '', notes: '' });
      setShowForm(false);
      setEditingCustomer(null);
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

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      full_name: customer.full_name,
      email: customer.email || '',
      rut: customer.rut || '',
      phone: customer.phone || '',
      notes: customer.notes || ''
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

  const handleCancel = () => {
    setFormData({ full_name: '', email: '', rut: '', phone: '', notes: '' });
    setShowForm(false);
    setEditingCustomer(null);
  };

  // Helpers para venta rápida
  const findPriceForProduct = (productName) => {
    if (!productName || !prices) return null;
    if (prices[productName] !== undefined) return prices[productName];
    const lowerName = productName.toLowerCase();
    const matchKey = Object.keys(prices).find(k => k.toLowerCase() === lowerName);
    return matchKey ? prices[matchKey] : null;
  };

  const openQuickSale = (customer) => {
    setSelectedCustomer(customer);
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
    // Normalizar precio (quitar puntos de miles y comas)
    const price = rawPrice !== null
      ? parseFloat(String(rawPrice).replace(/\./g, '').replace(',', '.'))
      : null;

    if (price === null || isNaN(price) || price <= 0) {
      toast({ title: "Precio faltante", description: "Este producto no tiene precio configurado, agrégalo en Precios.", variant: "destructive" });
      return;
    }

    const existingIndex = cart.findIndex(item => item.productName.toLowerCase() === name.toLowerCase());
    if (existingIndex >= 0) {
      const newCart = [...cart];
      const prev = newCart[existingIndex];
      const newQty = prev.quantity + qty;
      newCart[existingIndex] = {
        ...prev,
        quantity: newQty,
        unitPrice: price,
        subtotal: newQty * price
      };
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
    if (!selectedCustomer) return;
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
          notes: `Venta rápida desde cliente: ${selectedCustomer.full_name}`,
          customerId: selectedCustomer.id
        };
        const { data, error } = await addTransactionV2(transaction);
        if (error) throw error;
        if (data) created.push(data);
      }

      if (created.length > 0) {
        await createAutomaticReminders(
          userId,
          selectedCustomer.id,
          created[0].id,
          created[0].productName || 'Compra',
          selectedCustomer.full_name
        );
      }

      if (onTransactionsAdded && created.length > 0) {
        onTransactionsAdded(created);
      }

      toast({
        title: "Venta registrada",
        description: `Se registró la venta para ${selectedCustomer.full_name}.`,
        className: "bg-green-900 border-green-600 text-white"
      });

      setQuickSaleOpen(false);
      setSelectedCustomer(null);
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
      className="bg-gray-900/40 border border-white/5 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <Users className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Ficha de Cliente</h3>
            <p className="text-xs text-gray-400">{customers.length} clientes registrados</p>
          </div>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Formulario */}
      {showForm && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleSubmit}
          className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl space-y-4"
        >
          <h4 className="text-white font-semibold">
            {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h4>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase text-gray-500 font-bold">Nombre Completo *</label>
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
              placeholder="Información adicional del cliente..."
            />
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
              {editingCustomer ? 'Actualizar' : 'Crear'} Cliente
            </Button>
            <Button type="button" onClick={handleCancel} variant="ghost" className="text-gray-400">
              Cancelar
            </Button>
          </div>
        </motion.form>
      )}

      {/* Búsqueda */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500/20 outline-none"
            placeholder="Buscar cliente por nombre..."
          />
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {customers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No hay clientes registrados</p>
            <p className="text-gray-500 text-sm">Crea tu primer cliente para empezar</p>
          </div>
        ) : (
          customers.map((customer) => (
            <div
              key={customer.id}
              className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-white font-semibold">{customer.full_name}</h4>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-400">
                    {customer.rut && <span>RUT: {customer.rut}</span>}
                    {customer.email && <span>📧 {customer.email}</span>}
                    {customer.phone && <span>📞 {customer.phone}</span>}
                  </div>
                  {customer.notes && (
                    <p className="text-xs text-gray-500 mt-2">{customer.notes}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openQuickSale(customer)}
                    className="text-green-400 hover:text-green-300"
                    disabled={!userId}
                    title="Venta rápida"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(customer)}
                    className="text-purple-400 hover:text-purple-300"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(customer.id, customer.full_name)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {quickSaleOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-gray-400 uppercase">Venta rápida</p>
                <h4 className="text-lg font-bold text-white">{selectedCustomer.full_name}</h4>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setQuickSaleOpen(false)} className="text-gray-400 hover:text-white">
                <CloseIcon className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
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
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAddToCart} className="bg-green-600 hover:bg-green-700 text-white">
                  Agregar al carrito
                </Button>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 max-h-48 overflow-y-auto">
                {cart.length === 0 ? (
                  <p className="text-sm text-gray-500">Agrega productos al carrito.</p>
                ) : (
                  cart.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-b-0">
                      <div>
                        <p className="text-white font-semibold">{item.productName}</p>
                        <p className="text-xs text-gray-400">Cant: {item.quantity} · ${item.unitPrice.toLocaleString()} c/u</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-white font-bold">${item.subtotal.toLocaleString()}</span>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-200" onClick={() => handleRemoveFromCart(idx)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="text-gray-400 text-sm">Total</div>
                <div className="text-xl font-bold text-white">${getCartTotal().toLocaleString()}</div>
              </div>

              <div className="flex gap-3">
                <Button onClick={handleConfirmQuickSale} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  Confirmar Venta
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setQuickSaleOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default CustomerManagement;
