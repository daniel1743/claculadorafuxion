import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, CheckCircle, Calendar, User, Package, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getPendingReminders, markReminderAsCompleted, dismissReminder } from '@/lib/reminderService';

const RemindersCard = ({ userId, refreshTrigger = 0 }) => {
  const { toast } = useToast();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadReminders();
    }
  }, [userId, refreshTrigger]);

  const loadReminders = async () => {
    setLoading(true);
    try {
      const { data, error } = await getPendingReminders(userId);
      if (error) throw error;

      // Filtrar solo recordatorios pendientes y ordenar por fecha
      const pendingReminders = (data || [])
        .filter(r => r.status === 'pending')
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

      setReminders(pendingReminders);
    } catch (error) {
      console.error('[RemindersCard] Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (reminderId, customerName) => {
    try {
      const { error } = await markReminderAsCompleted(reminderId);
      if (error) throw error;

      toast({
        title: "Recordatorio Completado",
        description: `Seguimiento de ${customerName} marcado como completado.`,
        className: "bg-green-900 border-green-600 text-white"
      });

      loadReminders();
    } catch (error) {
      console.error('[RemindersCard] Error completing reminder:', error);
      toast({
        title: "Error",
        description: "No se pudo marcar el recordatorio como completado.",
        variant: "destructive"
      });
    }
  };

  const handleDismiss = async (reminderId, customerName) => {
    try {
      const { error } = await dismissReminder(reminderId);
      if (error) throw error;

      toast({
        title: "Recordatorio Descartado",
        description: `Recordatorio de ${customerName} descartado.`,
        className: "bg-gray-800 border-gray-600 text-white"
      });

      loadReminders();
    } catch (error) {
      console.error('[RemindersCard] Error dismissing reminder:', error);
      toast({
        title: "Error",
        description: "No se pudo descartar el recordatorio.",
        variant: "destructive"
      });
    }
  };

  const getDaysUntilDue = (dueDate) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueDateColor = (dueDate) => {
    const days = getDaysUntilDue(dueDate);
    if (days < 0) return 'text-red-400'; // Vencido
    if (days === 0) return 'text-orange-400'; // Hoy
    if (days <= 3) return 'text-yellow-400'; // Próximamente
    return 'text-gray-400'; // Futuro
  };

  const formatDueDate = (dueDate) => {
    const days = getDaysUntilDue(dueDate);
    if (days < 0) return `Vencido hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}`;
    if (days === 0) return 'Vence hoy';
    if (days === 1) return 'Vence mañana';
    return `En ${days} días`;
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/40 border border-white/5 rounded-2xl p-6"
      >
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/40 border border-white/5 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <Bell className="w-6 h-6 text-purple-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Recordatorios de Seguimiento</h3>
            <p className="text-xs text-gray-400">
              {reminders.length} {reminders.length === 1 ? 'cliente pendiente' : 'clientes pendientes'}
            </p>
          </div>
        </div>
      </div>

      {reminders.length === 0 ? (
        <div className="text-center py-8">
          <Bell className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No hay recordatorios pendientes</p>
          <p className="text-gray-500 text-sm">
            Los recordatorios aparecen automáticamente cuando vendes a clientes frecuentes
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {reminders.map((reminder) => (
            <motion.div
              key={reminder.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <h4 className="text-white font-semibold truncate">
                      {reminder.customers?.full_name || 'Cliente'}
                    </h4>
                  </div>

                  <div className="flex items-start gap-2 mb-2">
                    <Package className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-300 flex-1">{reminder.message}</p>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    {reminder.customers?.phone && (
                      <span className="text-gray-400">📞 {reminder.customers.phone}</span>
                    )}
                    {reminder.customers?.email && (
                      <span className="text-gray-400 truncate">📧 {reminder.customers.email}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <Clock className={`w-4 h-4 ${getDueDateColor(reminder.due_date)}`} />
                    <span className={`text-xs font-semibold ${getDueDateColor(reminder.due_date)}`}>
                      {formatDueDate(reminder.due_date)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleComplete(reminder.id, reminder.customers?.full_name)}
                    className="bg-green-600 hover:bg-green-700 text-white h-8 px-3"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Listo
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismiss(reminder.id, reminder.customers?.full_name)}
                    className="text-gray-400 hover:text-gray-300 h-8 px-3"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Descartar
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default RemindersCard;
