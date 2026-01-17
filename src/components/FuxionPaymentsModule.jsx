import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, DollarSign, Calendar, FileText, Trash2, Edit2, X, Check, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatCLP } from '@/lib/utils';
import {
  getFuxionPayments,
  createFuxionPayment,
  updateFuxionPayment,
  deleteFuxionPayment
} from '@/lib/fuxionPaymentsService';

const FuxionPaymentsModule = ({ userId, onPaymentChange }) => {
  const { toast } = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Cargar pagos
  useEffect(() => {
    loadPayments();
  }, [userId]);

  const loadPayments = async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await getFuxionPayments(userId);
    if (!error) {
      setPayments(data);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.amount) {
      toast({
        title: "Campos requeridos",
        description: "Ingresa título y monto del pago.",
        variant: "destructive"
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Monto inválido",
        description: "El monto debe ser mayor a 0.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingId) {
        // Actualizar
        const { error } = await updateFuxionPayment(editingId, {
          ...formData,
          amount
        });
        if (error) throw error;
        toast({
          title: "Pago actualizado",
          description: `${formData.title} - ${formatCLP(amount)}`,
          className: "bg-green-900 border-green-600 text-white"
        });
      } else {
        // Crear
        const { error } = await createFuxionPayment(userId, {
          ...formData,
          amount
        });
        if (error) throw error;
        toast({
          title: "Pago registrado",
          description: `${formData.title} - ${formatCLP(amount)}`,
          className: "bg-green-900 border-green-600 text-white"
        });
      }

      resetForm();
      loadPayments();
      if (onPaymentChange) onPaymentChange();

    } catch (error) {
      console.error('Error saving payment:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el pago.",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (payment) => {
    setFormData({
      title: payment.title,
      amount: payment.amount.toString(),
      payment_date: payment.payment_date,
      notes: payment.notes || ''
    });
    setEditingId(payment.id);
    setShowForm(true);
  };

  const handleDelete = async (paymentId) => {
    if (!confirm('¿Eliminar este pago?')) return;

    try {
      const { error } = await deleteFuxionPayment(paymentId);
      if (error) throw error;

      toast({
        title: "Pago eliminado",
        className: "bg-red-900 border-red-600 text-white"
      });

      loadPayments();
      if (onPaymentChange) onPaymentChange();

    } catch (error) {
      console.error('Error deleting payment:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el pago.",
        variant: "destructive"
      });
    }
  };

  const totalPayments = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Banknote className="w-7 h-7 text-emerald-400" />
            Pagos FuXion
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Cheques, bonos, comisiones y devoluciones recibidas de FuXion
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Pago
        </Button>
      </div>

      {/* Resumen */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-emerald-400 text-sm font-medium">Total Recibido</p>
            <p className="text-3xl font-bold text-white mt-1">{formatCLP(totalPayments)}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 text-sm">{payments.length} pagos registrados</p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-900/40 border border-white/5 rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {editingId ? 'Editar Pago' : 'Registrar Pago'}
              </h3>
              <button
                onClick={resetForm}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Título */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">
                    Título / Descripción *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ej: Cheque Semana 12, Bono Familia..."
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none"
                  />
                </div>

                {/* Monto */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">
                    Monto *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0"
                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none"
                    />
                  </div>
                </div>

                {/* Fecha */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">
                    Fecha del Pago
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="date"
                      value={formData.payment_date}
                      onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none"
                    />
                  </div>
                </div>

                {/* Notas */}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">
                    Notas (opcional)
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notas adicionales..."
                      className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetForm}
                  className="text-gray-400 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {editingId ? 'Actualizar' : 'Registrar'}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lista de Pagos */}
      <div className="bg-gray-900/40 border border-white/5 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-lg font-semibold text-white">Historial de Pagos</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Banknote className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay pagos registrados</p>
            <p className="text-sm mt-1">Registra los cheques y bonos que recibas de FuXion</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {payments.map((payment) => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Banknote className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{payment.title}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(payment.payment_date).toLocaleDateString('es-CL')}
                      {payment.notes && ` · ${payment.notes}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-emerald-400 font-bold font-mono text-lg">
                    +{formatCLP(payment.amount)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(payment)}
                      className="p-2 text-gray-500 hover:text-blue-400 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(payment.id)}
                      className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default FuxionPaymentsModule;
