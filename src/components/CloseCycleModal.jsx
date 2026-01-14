import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, FileText, Lock, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { closeBusinessCycle, getCurrentCycleStartDate } from '@/lib/cycleService';

/**
 * Modal para cerrar el ciclo de negocio actual
 * Crea un snapshot inmutable de todas las métricas
 */
const CloseCycleModal = ({ isOpen, onClose, userId, onCycleClosed }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cycleName, setCycleName] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen && userId) {
      // Cargar fecha de inicio del ciclo actual
      loadCycleStartDate();

      // Generar nombre sugerido basado en fecha
      const now = new Date();
      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const suggestedName = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
      setCycleName(suggestedName);
    }
  }, [isOpen, userId]);

  const loadCycleStartDate = async () => {
    const { data } = await getCurrentCycleStartDate(userId);
    if (data) {
      setStartDate(new Date(data).toISOString().split('T')[0]);
    }
  };

  const handleClose = async () => {
    if (loading) return;

    if (!cycleName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Debes ingresar un nombre para este ciclo.",
        variant: "destructive"
      });
      return;
    }

    if (!startDate || !endDate) {
      toast({
        title: "Fechas requeridas",
        description: "Debes especificar las fechas del ciclo.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await closeBusinessCycle(userId, {
        cycleName: cycleName.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate + 'T23:59:59').toISOString(),
        notes: notes.trim() || null
      });

      if (error) throw error;

      toast({
        title: "✅ Ciclo Cerrado",
        description: `"${cycleName}" ha sido cerrado exitosamente. Se creó un snapshot inmutable de todas las métricas.`,
        className: "bg-green-900 border-green-600 text-white"
      });

      // Notificar al padre
      if (onCycleClosed) {
        onCycleClosed(data);
      }

      // Resetear y cerrar
      setCycleName('');
      setNotes('');
      onClose();
    } catch (error) {
      console.error('[CloseCycleModal] Error:', error);
      toast({
        title: "Error",
        description: "No se pudo cerrar el ciclo. " + (error.message || ''),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={() => !loading && onClose()}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-gradient-to-br from-gray-900 to-gray-950 border border-yellow-500/30 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-b border-yellow-500/20 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                  <Lock className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Cerrar Ciclo de Negocio</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Crea un snapshot inmutable de todas las métricas actuales
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => !loading && onClose()}
                disabled={loading}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Warning */}
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-yellow-200 font-semibold mb-1">Acción Permanente</p>
                  <p className="text-gray-300 leading-relaxed">
                    Al cerrar este ciclo, todas las transacciones actuales se marcarán como parte de este periodo.
                    El ciclo cerrado será <span className="text-yellow-400 font-semibold">inmutable</span> (no se puede modificar).
                    Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>
            </div>

            {/* Nombre del Ciclo */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                <FileText className="w-4 h-4 text-yellow-500" />
                Nombre del Ciclo *
              </label>
              <input
                type="text"
                value={cycleName}
                onChange={(e) => setCycleName(e.target.value)}
                placeholder="Ej: Octubre 2025, Ciclo 1 - Noviembre, etc."
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 outline-none transition-all"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Este nombre te ayudará a identificar el ciclo en el historial
              </p>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 text-yellow-500" />
                  Inicio del Ciclo
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 outline-none transition-all"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                  <Calendar className="w-4 h-4 text-yellow-500" />
                  Fin del Ciclo
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 outline-none transition-all"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                <FileText className="w-4 h-4 text-yellow-500" />
                Notas del Ciclo (Opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe qué pasó en este ciclo, decisiones importantes, aprendizajes, etc."
                rows={4}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 outline-none transition-all resize-none"
                disabled={loading}
              />
            </div>

            {/* Qué se guardará */}
            <div className="bg-gray-800/50 border border-white/5 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Métricas que se guardarán:
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                <div>• Ventas totales</div>
                <div>• Compras totales</div>
                <div>• Publicidad invertida</div>
                <div>• Gastos</div>
                <div>• Ganancias netas</div>
                <div>• Margen de ganancia</div>
                <div>• Préstamos</div>
                <div>• ROI</div>
                <div>• Productos vendidos</div>
                <div>• Clientes</div>
                <div>• Campañas</div>
                <div>• Inventario actual</div>
                <div>• Comparación vs ciclo anterior</div>
                <div>• Tendencias</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-900/95 border-t border-white/5 p-6">
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={loading}
                className="flex-1 text-gray-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleClose}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Cerrando Ciclo...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Cerrar Ciclo Definitivamente
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CloseCycleModal;
