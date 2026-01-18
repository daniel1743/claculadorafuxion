import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Send, Wrench, Lightbulb, AlertTriangle, Trash2,
  UserMinus, HelpCircle, Mail, CheckCircle, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { createSuggestion, SUGGESTION_CATEGORIES } from '@/lib/suggestionService';
import { createSuggestionReceivedNotification } from '@/lib/notificationService';

/**
 * SuggestionForm - Modal para enviar sugerencias/reportes
 */
const SuggestionForm = ({ isOpen, onClose, user }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: ''
  });

  const categories = [
    { value: 'mejora', label: 'Mejorar funcionalidad existente', icon: Wrench, color: 'text-blue-400' },
    { value: 'nueva_funcion', label: 'Sugerir nueva funcionalidad', icon: Lightbulb, color: 'text-green-400' },
    { value: 'error', label: 'Reportar error o problema', icon: AlertTriangle, color: 'text-red-400' },
    { value: 'quitar_funcion', label: 'Quitar funcionalidad innecesaria', icon: Trash2, color: 'text-orange-400' },
    { value: 'dar_de_baja', label: 'Solicitar baja del servicio', icon: UserMinus, color: 'text-gray-400' },
    { value: 'otro', label: 'Otro', icon: HelpCircle, color: 'text-purple-400' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.category) {
      toast({
        title: 'Selecciona un tipo',
        description: 'Debes seleccionar el tipo de solicitud.',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.description.trim()) {
      toast({
        title: 'Descripción requerida',
        description: 'Debes escribir una descripción de tu solicitud.',
        variant: 'destructive'
      });
      return;
    }

    if (formData.description.length > 500) {
      toast({
        title: 'Descripción muy larga',
        description: 'La descripción no puede superar los 500 caracteres.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await createSuggestion({
        userId: user.id,
        userEmail: user.email,
        userName: user.name || user.email?.split('@')[0],
        category: formData.category,
        title: formData.title.trim() || null,
        description: formData.description.trim()
      });

      if (error) throw error;

      // Crear notificación de confirmación
      await createSuggestionReceivedNotification(user.id, data.id);

      setSuccess(true);

      // Cerrar después de mostrar éxito
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Error creating suggestion:', error);
      toast({
        title: 'Error al enviar',
        description: 'No se pudo enviar tu sugerencia. Intenta de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ category: '', title: '', description: '' });
    setSuccess(false);
    onClose();
  };

  // Validar que el usuario esté autenticado
  if (!isOpen) return null;

  if (!user || !user.id || !user.email) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-gray-900 border border-red-500/20 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Error de autenticación</h3>
          <p className="text-gray-400 text-sm mb-4">
            Debes iniciar sesión para enviar sugerencias.
          </p>
          <Button onClick={onClose} className="bg-gray-700 hover:bg-gray-600">
            Cerrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-white/5">
            <div>
              <h2 className="text-lg font-bold text-white">Enviar Sugerencia</h2>
              <p className="text-xs text-gray-500 mt-0.5">Tu opinión nos ayuda a mejorar</p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {success ? (
            /* Estado de éxito */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">¡Enviado!</h3>
              <p className="text-gray-400">
                Gracias por tu sugerencia. Te notificaremos cuando haya novedades.
              </p>
            </motion.div>
          ) : (
            /* Formulario */
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Info del usuario */}
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Enviando como</p>
                  <p className="text-white font-medium truncate">{user?.email}</p>
                </div>
              </div>

              {/* Tipo de solicitud */}
              <div className="space-y-2">
                <label className="text-xs uppercase text-gray-500 font-bold">
                  Tipo de solicitud *
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = formData.category === cat.value;

                    return (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.value })}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                          isSelected
                            ? 'bg-purple-500/20 border-purple-500/50 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-purple-400' : cat.color}`} />
                        <span className="text-sm">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Título opcional */}
              <div className="space-y-2">
                <label className="text-xs uppercase text-gray-500 font-bold">
                  Título <span className="text-gray-600">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  maxLength={100}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500/20 outline-none"
                  placeholder="Resumen breve de tu solicitud..."
                />
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <label className="text-xs uppercase text-gray-500 font-bold">
                  Descripción *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  maxLength={500}
                  rows={4}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500/20 outline-none resize-none"
                  placeholder="Describe tu sugerencia, problema o solicitud con el mayor detalle posible..."
                />
                <div className="flex justify-end">
                  <span className={`text-xs ${formData.description.length > 450 ? 'text-orange-400' : 'text-gray-500'}`}>
                    {formData.description.length}/500
                  </span>
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Sugerencia
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  onClick={handleClose}
                  variant="outline"
                  className="px-6"
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SuggestionForm;
