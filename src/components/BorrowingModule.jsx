import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HandCoins, Plus, Tag, Hash, User, Phone, Calendar, FileText, RotateCcw, Trash2, CheckCircle, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ProductAutocomplete from '@/components/ui/ProductAutocomplete';
import HelpTooltip from '@/components/HelpTooltip';
import HelpPanel, { HelpButton } from '@/components/HelpPanel';
import { borrowingsHelp, borrowingsFieldHelp } from '@/lib/helpContent';
import {
  getUserBorrowings,
  createBorrowing,
  returnBorrowing,
  deleteBorrowing,
  getBorrowingStats
} from '@/lib/borrowingService';
import { supabase } from '@/lib/supabase';

const BorrowingModule = ({ products = [], prices = {}, onUpdate }) => {
  const { toast } = useToast();
  const [helpOpen, setHelpOpen] = useState(false);
  const [borrowings, setBorrowings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedBorrowing, setSelectedBorrowing] = useState(null);

  const [formData, setFormData] = useState({
    productName: '',
    quantityBoxes: '',
    quantitySachets: '',
    partnerName: '',
    partnerPhone: '',
    notes: '',
    dueDate: ''
  });

  const [returnData, setReturnData] = useState({
    boxes: '',
    sachets: '',
    notes: ''
  });

  // Cargar préstamos al montar
  useEffect(() => {
    loadBorrowings();
  }, []);

  const loadBorrowings = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const [borrowingsResult, statsResult] = await Promise.all([
          getUserBorrowings(user.id, { status: 'all' }),
          getBorrowingStats(user.id)
        ]);

        if (!borrowingsResult.error) {
          setBorrowings(borrowingsResult.data);
        }
        if (!statsResult.error) {
          setStats(statsResult.data);
        }
      }
    } catch (error) {
      console.error('Error cargando préstamos recibidos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Registrar nuevo préstamo recibido
  const handleSubmit = async (e) => {
    e.preventDefault();

    const boxes = parseInt(formData.quantityBoxes) || 0;
    const sachets = parseInt(formData.quantitySachets) || 0;

    if (!formData.productName) {
      toast({ title: "Producto Requerido", description: "Selecciona el producto que te prestaron.", variant: "destructive" });
      return;
    }

    if (!formData.partnerName.trim()) {
      toast({ title: "Socio Requerido", description: "Indica quién te prestó el producto.", variant: "destructive" });
      return;
    }

    if (boxes <= 0 && sachets <= 0) {
      toast({ title: "Cantidad Requerida", description: "Ingresa al menos una cantidad (cajas o sobres).", variant: "destructive" });
      return;
    }

    try {
      const result = await createBorrowing({
        productName: formData.productName,
        quantityBoxes: boxes,
        quantitySachets: sachets,
        partnerName: formData.partnerName,
        partnerPhone: formData.partnerPhone,
        notes: formData.notes,
        dueDate: formData.dueDate || null
      });

      if (result.error) throw result.error;

      toast({
        title: "Préstamo Registrado",
        description: `${boxes > 0 ? `${boxes} cajas` : ''}${boxes > 0 && sachets > 0 ? ' y ' : ''}${sachets > 0 ? `${sachets} sobres` : ''} de ${formData.productName} - Prestado por ${formData.partnerName}`,
        className: "bg-blue-900 border-blue-600 text-white"
      });

      // Limpiar formulario
      setFormData({
        productName: '', quantityBoxes: '', quantitySachets: '',
        partnerName: '', partnerPhone: '', notes: '', dueDate: ''
      });

      // Recargar datos
      loadBorrowings();
      if (onUpdate) onUpdate();

    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el préstamo.",
        variant: "destructive"
      });
    }
  };

  // Abrir modal de devolución
  const handleOpenReturn = (borrowing) => {
    setSelectedBorrowing(borrowing);
    setReturnData({ boxes: '', sachets: '', notes: '' });
    setShowReturnModal(true);
  };

  // Registrar devolución
  const handleReturn = async () => {
    if (!selectedBorrowing) return;

    const boxes = parseInt(returnData.boxes) || 0;
    const sachets = parseInt(returnData.sachets) || 0;

    if (boxes <= 0 && sachets <= 0) {
      toast({ title: "Cantidad Requerida", description: "Ingresa la cantidad a devolver.", variant: "destructive" });
      return;
    }

    try {
      const result = await returnBorrowing(selectedBorrowing.id, {
        boxes,
        sachets,
        notes: returnData.notes
      });

      if (result.error) throw result.error;

      const message = result.data.isFullyReturned
        ? `¡Préstamo devuelto completamente a ${selectedBorrowing.partnerName}!`
        : `Devolución parcial registrada. Pendiente: ${result.data.pendingAfter.boxes} cajas, ${result.data.pendingAfter.sachets} sobres`;

      toast({
        title: result.data.isFullyReturned ? "¡Préstamo Cerrado!" : "Devolución Registrada",
        description: message,
        className: result.data.isFullyReturned ? "bg-green-900 border-green-600 text-white" : "bg-blue-900 border-blue-600 text-white"
      });

      setShowReturnModal(false);
      loadBorrowings();
      if (onUpdate) onUpdate();

    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la devolución.",
        variant: "destructive"
      });
    }
  };

  // Eliminar préstamo
  const handleDelete = async (borrowingId) => {
    if (!confirm('¿Eliminar este préstamo? Esta acción no se puede deshacer.')) return;

    try {
      const result = await deleteBorrowing(borrowingId);
      if (result.error) throw result.error;

      toast({
        title: "Préstamo Eliminado",
        description: "El registro ha sido eliminado.",
        className: "bg-red-900 border-red-600 text-white"
      });

      loadBorrowings();
      if (onUpdate) onUpdate();

    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el préstamo.",
        variant: "destructive"
      });
    }
  };

  const pendingBorrowings = borrowings.filter(b => b.status !== 'returned');
  const returnedBorrowings = borrowings.filter(b => b.status === 'returned');

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-gray-900/40 border border-white/5 rounded-2xl p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <PackagePlus className="w-5 h-5 text-cyan-400" />
          Recibir de Socio
          {stats?.pendingCount > 0 && (
            <span className="ml-2 bg-cyan-600 text-white text-xs px-2 py-1 rounded-full font-bold">
              {stats.pendingCount} pendientes
            </span>
          )}
        </h3>
        <HelpButton onClick={() => setHelpOpen(true)} className="text-xs" />
      </div>

      {/* Estadísticas Rápidas */}
      {stats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-cyan-400">{stats.totalPendingBoxes}</div>
            <div className="text-xs text-gray-400">Cajas por devolver</div>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-purple-400">{stats.uniquePartners}</div>
            <div className="text-xs text-gray-400">Socios</div>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
            <div className="text-2xl font-black text-green-400">{stats.returnedCount}</div>
            <div className="text-xs text-gray-400">Devueltos</div>
          </div>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 flex items-center">
            Producto que te prestaron *
            <HelpTooltip content={borrowingsFieldHelp.product} />
          </label>
          <ProductAutocomplete
            value={formData.productName}
            onChange={(value) => setFormData({...formData, productName: value})}
            onSelect={(productName) => setFormData({...formData, productName})}
            products={products}
            prices={prices}
            placeholder="Ej: prunex 1"
            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none transition-all placeholder-gray-700"
            icon={Tag}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Cajas</label>
            <div className="relative group">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="number"
                min="0"
                value={formData.quantityBoxes}
                onChange={(e) => setFormData({...formData, quantityBoxes: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none transition-all"
                placeholder="0"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Sobres</label>
            <div className="relative group">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="number"
                min="0"
                value={formData.quantitySachets}
                onChange={(e) => setFormData({...formData, quantitySachets: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none transition-all"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Socio que te prestó *</label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={formData.partnerName}
                onChange={(e) => setFormData({...formData, partnerName: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none transition-all"
                placeholder="Nombre del socio"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Teléfono (opcional)</label>
            <div className="relative group">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={formData.partnerPhone}
                onChange={(e) => setFormData({...formData, partnerPhone: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none transition-all"
                placeholder="+56 9 XXXX XXXX"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Fecha de devolución (opcional)</label>
            <div className="relative group">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Notas</label>
            <div className="relative group">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 outline-none transition-all"
                placeholder="Notas..."
              />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-11 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-semibold shadow-lg shadow-cyan-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <PackagePlus className="w-5 h-5 mr-2" />
          Recibir Producto de Socio
        </Button>
      </form>

      {/* Lista de Préstamos Pendientes */}
      {pendingBorrowings.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-gray-300 flex items-center gap-2">
            <HandCoins className="w-4 h-4 text-cyan-400" />
            Préstamos por Devolver ({pendingBorrowings.length})
          </h4>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
            <AnimatePresence>
              {pendingBorrowings.map((borrowing) => (
                <motion.div
                  key={borrowing.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="bg-black/30 border border-cyan-500/20 rounded-lg p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white text-sm truncate">
                        {borrowing.productName}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Prestado por: <span className="text-cyan-400">{borrowing.partnerName}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Pedido: {borrowing.quantityBoxes} cajas
                        {borrowing.returnedBoxes > 0 && (
                          <span className="text-green-400"> | Devuelto: {borrowing.returnedBoxes}</span>
                        )}
                        <span className="text-orange-400"> | Pendiente: {borrowing.pendingBoxes}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenReturn(borrowing)}
                        className="p-2 hover:bg-green-500/10 rounded-lg transition-colors group"
                        title="Registrar devolución"
                      >
                        <RotateCcw className="w-4 h-4 text-gray-500 group-hover:text-green-400 transition-colors" />
                      </button>
                      <button
                        onClick={() => handleDelete(borrowing.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors group"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4 text-gray-500 group-hover:text-red-400 transition-colors" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Historial de Devueltos */}
      {returnedBorrowings.length > 0 && (
        <div className="mt-4 space-y-3">
          <h4 className="text-sm font-bold text-gray-400 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-400" />
            Devueltos ({returnedBorrowings.length})
          </h4>
          <div className="space-y-2 max-h-32 overflow-y-auto pr-2 opacity-60">
            {returnedBorrowings.slice(0, 5).map((borrowing) => (
              <div key={borrowing.id} className="bg-black/20 border border-green-500/10 rounded-lg p-2 text-xs">
                <span className="text-gray-400">{borrowing.productName}</span>
                <span className="text-gray-500"> - {borrowing.quantityBoxes} cajas a </span>
                <span className="text-gray-400">{borrowing.partnerName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Devolución */}
      <AnimatePresence>
        {showReturnModal && selectedBorrowing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowReturnModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 border border-white/10 rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-white mb-4">
                Devolver a {selectedBorrowing.partnerName}
              </h3>

              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 mb-4">
                <div className="text-sm text-white font-semibold">{selectedBorrowing.productName}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Pendiente: {selectedBorrowing.pendingBoxes} cajas, {selectedBorrowing.pendingSachets} sobres
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">Cajas a devolver</label>
                    <input
                      type="number"
                      min="0"
                      max={selectedBorrowing.pendingBoxes}
                      value={returnData.boxes}
                      onChange={(e) => setReturnData({...returnData, boxes: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-gray-400">Sobres a devolver</label>
                    <input
                      type="number"
                      min="0"
                      max={selectedBorrowing.pendingSachets}
                      value={returnData.sachets}
                      onChange={(e) => setReturnData({...returnData, sachets: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Notas (opcional)</label>
                  <input
                    type="text"
                    value={returnData.notes}
                    onChange={(e) => setReturnData({...returnData, notes: e.target.value})}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white"
                    placeholder="Ej: Entregado en evento..."
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    onClick={() => setShowReturnModal(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleReturn}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-xl"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Devolver
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <HelpPanel
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        helpContent={borrowingsHelp}
      />
    </motion.div>
  );
};

export default BorrowingModule;
