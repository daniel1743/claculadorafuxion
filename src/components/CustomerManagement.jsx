import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, Edit2, Trash2, Search, User, Mail, Phone, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getAllCustomers, createCustomer, updateCustomer, deleteCustomer, searchCustomers } from '@/lib/customerService';

const CustomerManagement = ({ userId }) => {
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
    </motion.div>
  );
};

export default CustomerManagement;
