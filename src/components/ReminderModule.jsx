import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Plus, Calendar, Clock, User, Tag, FileText,
  Check, X, Trash2, AlertCircle, Phone, ShoppingCart,
  UserCheck, MoreHorizontal, ChevronDown, ChevronUp,
  BellRing, Filter, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import {
  REMINDER_TYPES,
  PRIORITIES,
  getAdvancedReminders,
  createAdvancedReminder,
  completeAdvancedReminder,
  dismissAdvancedReminder,
  deleteAdvancedReminder,
  snoozeAdvancedReminder,
  getUnreadReminderCount
} from '@/lib/reminderService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const ReminderModule = ({ products = [], prices = {}, onUnreadCountChange }) => {
  const { toast } = useToast();
  const [reminders, setReminders] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('pending'); // 'all', 'pending', 'completed'
  const [expandedReminder, setExpandedReminder] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    type: 'seguimiento',
    contactName: '',
    description: '',
    productName: '',
    reminderDate: '',
    reminderTime: '',
    priority: 'normal'
  });

  // Cargar recordatorios
  const loadReminders = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const options = filter === 'all' ? {} : { status: filter };
      const { data, error } = await getAdvancedReminders(user.id, options);

      if (error) throw error;
      setReminders(data);

      // Actualizar contador de no leídos
      const { count } = await getUnreadReminderCount(user.id);
      setUnreadCount(count);
      if (onUnreadCountChange) onUnreadCountChange(count);

    } catch (error) {
      console.error('Error cargando recordatorios:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, onUnreadCountChange]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  // Crear recordatorio
  const handleCreateReminder = async (e) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      toast({
        title: "Campo Requerido",
        description: "La descripción es obligatoria.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.reminderDate || !formData.reminderTime) {
      toast({
        title: "Fecha Requerida",
        description: "Debes seleccionar fecha y hora para el recordatorio.",
        variant: "destructive"
      });
      return;
    }

    try {
      const reminderDateTime = new Date(`${formData.reminderDate}T${formData.reminderTime}`);

      const productData = products.find(p => p.name === formData.productName);

      const { data, error } = await createAdvancedReminder({
        type: formData.type,
        contactName: formData.contactName,
        description: formData.description,
        productId: productData?.id || null,
        productName: formData.productName || null,
        reminderDate: reminderDateTime.toISOString(),
        priority: formData.priority
      });

      if (error) throw error;

      toast({
        title: "Recordatorio Creado",
        description: `Se te notificará el ${reminderDateTime.toLocaleDateString()} a las ${reminderDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        className: "bg-green-900 border-green-600 text-white"
      });

      setShowForm(false);
      setFormData({
        type: 'seguimiento',
        contactName: '',
        description: '',
        productName: '',
        reminderDate: '',
        reminderTime: '',
        priority: 'normal'
      });
      loadReminders();

    } catch (error) {
      console.error('Error creando recordatorio:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el recordatorio.",
        variant: "destructive"
      });
    }
  };

  // Completar recordatorio
  const handleComplete = async (reminderId) => {
    try {
      const { error } = await completeAdvancedReminder(reminderId);
      if (error) throw error;

      toast({
        title: "Completado",
        description: "Recordatorio marcado como completado.",
        className: "bg-green-900 border-green-600 text-white"
      });
      loadReminders();
    } catch (error) {
      console.error('Error completando recordatorio:', error);
    }
  };

  // Posponer recordatorio
  const handleSnooze = async (reminderId, minutes) => {
    try {
      const { error } = await snoozeAdvancedReminder(reminderId, minutes);
      if (error) throw error;

      toast({
        title: "Pospuesto",
        description: `Se te recordará en ${minutes} minutos.`,
        className: "bg-blue-900 border-blue-600 text-white"
      });
      loadReminders();
    } catch (error) {
      console.error('Error posponiendo recordatorio:', error);
    }
  };

  // Eliminar recordatorio
  const handleDelete = async (reminderId) => {
    try {
      const { error } = await deleteAdvancedReminder(reminderId);
      if (error) throw error;

      toast({
        title: "Eliminado",
        description: "Recordatorio eliminado.",
        className: "bg-red-900 border-red-600 text-white"
      });
      loadReminders();
    } catch (error) {
      console.error('Error eliminando recordatorio:', error);
    }
  };

  // Obtener icono según tipo
  const getTypeIcon = (type) => {
    const icons = {
      seguimiento: UserCheck,
      recordar: Bell,
      avisar: AlertCircle,
      contactar: Phone,
      venta: ShoppingCart,
      otro: MoreHorizontal
    };
    return icons[type] || Bell;
  };

  // Obtener color según tipo
  const getTypeColor = (type) => {
    const colors = {
      seguimiento: 'blue',
      recordar: 'yellow',
      avisar: 'orange',
      contactar: 'green',
      venta: 'emerald',
      otro: 'gray'
    };
    return colors[type] || 'gray';
  };

  // Obtener color de prioridad
  const getPriorityColor = (priority) => {
    const colors = {
      low: 'gray',
      normal: 'blue',
      high: 'orange',
      urgent: 'red'
    };
    return colors[priority] || 'blue';
  };

  // Formatear fecha
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date - now;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMs < 0) {
      // Vencido
      const absHours = Math.abs(diffHours);
      if (absHours < 1) return `Hace ${Math.abs(diffMins)} min`;
      if (absHours < 24) return `Hace ${absHours} horas`;
      return `Hace ${Math.abs(diffDays)} días`;
    }

    if (diffMins < 60) return `En ${diffMins} min`;
    if (diffHours < 24) return `En ${diffHours} horas`;
    if (diffDays < 7) return `En ${diffDays} días`;

    return date.toLocaleDateString();
  };

  // Verificar si está vencido
  const isOverdue = (dateStr) => {
    return new Date(dateStr) < new Date();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="bg-gray-900/40 border border-white/5 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Bell className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Recordatorios</h2>
              <p className="text-sm text-gray-400">
                {unreadCount > 0 ? `${unreadCount} pendientes` : 'Sin pendientes'}
              </p>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            {/* Filtros */}
            <div className="flex bg-black/20 rounded-xl p-1 border border-white/5">
              {[
                { value: 'pending', label: 'Pendientes' },
                { value: 'completed', label: 'Completados' },
                { value: 'all', label: 'Todos' }
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    filter === f.value
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <Button
              onClick={() => setShowForm(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo
            </Button>
          </div>
        </div>

        {/* Lista de Recordatorios */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No hay recordatorios {filter === 'pending' ? 'pendientes' : ''}</p>
            <Button
              onClick={() => setShowForm(true)}
              variant="ghost"
              className="mt-4 text-purple-400 hover:text-purple-300"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear tu primer recordatorio
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {reminders.map((reminder) => {
                const TypeIcon = getTypeIcon(reminder.type);
                const typeColor = getTypeColor(reminder.type);
                const priorityColor = getPriorityColor(reminder.priority);
                const overdue = isOverdue(reminder.reminder_date) && reminder.status === 'pending';
                const isExpanded = expandedReminder === reminder.id;

                return (
                  <motion.div
                    key={reminder.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className={`bg-black/20 border rounded-xl overflow-hidden transition-all ${
                      overdue
                        ? 'border-red-500/50 bg-red-500/5'
                        : reminder.status === 'completed'
                        ? 'border-green-500/20 bg-green-500/5'
                        : 'border-white/5 hover:border-purple-500/30'
                    }`}
                  >
                    {/* Main Row */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedReminder(isExpanded ? null : reminder.id)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className={`p-2 rounded-lg bg-${typeColor}-500/20 shrink-0`}>
                          <TypeIcon className={`w-5 h-5 text-${typeColor}-400`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full bg-${typeColor}-500/20 text-${typeColor}-400 font-medium`}>
                              {REMINDER_TYPES.find(t => t.value === reminder.type)?.label || reminder.type}
                            </span>
                            {reminder.priority !== 'normal' && (
                              <span className={`text-xs px-2 py-0.5 rounded-full bg-${priorityColor}-500/20 text-${priorityColor}-400 font-medium`}>
                                {PRIORITIES.find(p => p.value === reminder.priority)?.label}
                              </span>
                            )}
                            {reminder.status === 'completed' && (
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                            )}
                          </div>

                          <p className={`text-sm font-medium truncate ${reminder.status === 'completed' ? 'text-gray-500 line-through' : 'text-white'}`}>
                            {reminder.contact_name && <span className="text-purple-400">{reminder.contact_name}: </span>}
                            {reminder.description}
                          </p>

                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span className={`flex items-center gap-1 ${overdue ? 'text-red-400 font-medium' : ''}`}>
                              <Clock className="w-3 h-3" />
                              {formatDate(reminder.reminder_date)}
                            </span>
                            {reminder.product_name && (
                              <span className="flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                {reminder.product_name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Expand Icon */}
                        <div className="shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Actions */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-white/5 bg-black/20 px-4 py-3"
                        >
                          <div className="flex flex-wrap gap-2">
                            {reminder.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleComplete(reminder.id); }}
                                  className="bg-green-600 hover:bg-green-500 text-white"
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Completar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); handleSnooze(reminder.id, 30); }}
                                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                >
                                  <Clock className="w-4 h-4 mr-1" />
                                  +30 min
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); handleSnooze(reminder.id, 60); }}
                                  className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                >
                                  <Clock className="w-4 h-4 mr-1" />
                                  +1 hora
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); handleSnooze(reminder.id, 1440); }}
                                  className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
                                >
                                  <Calendar className="w-4 h-4 mr-1" />
                                  Mañana
                                </Button>
                              </>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => { e.stopPropagation(); handleDelete(reminder.id); }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-auto"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Eliminar
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal Nuevo Recordatorio */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-gray-950 border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-xl text-white flex items-center gap-2">
              <BellRing className="w-5 h-5 text-purple-400" />
              Nuevo Recordatorio
            </DialogTitle>
            <DialogDescription>
              Crea un recordatorio para seguimiento de clientes o tareas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateReminder} className="space-y-4 py-2">
            {/* Tipo de Recordatorio */}
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500">Tipo *</label>
              <div className="grid grid-cols-3 gap-2">
                {REMINDER_TYPES.map((type) => {
                  const Icon = getTypeIcon(type.value);
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.value })}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        formData.type === type.value
                          ? `bg-${type.color}-600 border-${type.color}-500 text-white`
                          : 'bg-black/20 border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      <Icon className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-[10px] font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nombre del Contacto */}
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500">Nombre del Contacto</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                  placeholder="Ej: Juan Pérez"
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500">Descripción *</label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-purple-500/50 outline-none resize-none h-20"
                  placeholder="Ej: Llamar, quedó interesado en el producto..."
                  required
                />
              </div>
            </div>

            {/* Producto */}
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500">Producto Relacionado</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <select
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-purple-500/50 outline-none appearance-none"
                >
                  <option value="">-- Seleccionar producto --</option>
                  {products.map((product) => (
                    <option key={product.id || product.name} value={product.name}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Fecha y Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500">Fecha *</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="date"
                    value={formData.reminderDate}
                    onChange={(e) => setFormData({ ...formData, reminderDate: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase font-bold text-gray-500">Hora *</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="time"
                    value={formData.reminderTime}
                    onChange={(e) => setFormData({ ...formData, reminderTime: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-purple-500/50 outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Prioridad */}
            <div className="space-y-2">
              <label className="text-xs uppercase font-bold text-gray-500">Prioridad</label>
              <div className="flex gap-2">
                {PRIORITIES.map((priority) => (
                  <button
                    key={priority.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: priority.value })}
                    className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                      formData.priority === priority.value
                        ? `bg-${priority.color}-600 border-${priority.color}-500 text-white`
                        : 'bg-black/20 border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    {priority.label}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="text-gray-400 hover:text-white">
                Cancelar
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white">
                <Bell className="w-4 h-4 mr-2" />
                Crear Recordatorio
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default ReminderModule;
