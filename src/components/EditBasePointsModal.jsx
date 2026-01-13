import React, { useState, useEffect } from 'react';
import { AlertCircle, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { updateUserBasePoints } from '@/lib/pointsService';

const EditBasePointsModal = ({ isOpen, onClose, currentBasePoints, userId, onSuccess }) => {
  const { toast } = useToast();
  const [newBasePoints, setNewBasePoints] = useState(currentBasePoints);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setNewBasePoints(currentBasePoints);
  }, [currentBasePoints, isOpen]);

  const handleSave = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "No se pudo identificar al usuario.",
        variant: "destructive"
      });
      return;
    }

    const points = parseInt(newBasePoints) || 0;

    if (points < 0) {
      toast({
        title: "Valor Inválido",
        description: "Los puntos no pueden ser negativos.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await updateUserBasePoints(userId, points);

      if (error) throw error;

      onSuccess();
      onClose();
    } catch (error) {
      console.error('[EditBasePointsModal] Error updating points:', error);
      toast({
        title: "Error al Actualizar",
        description: "No se pudieron actualizar los puntos base. Intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-gray-950 border-yellow-500/20">
        <DialogHeader>
          <DialogTitle className="text-xl text-white flex items-center gap-2">
            <Save className="w-5 h-5 text-yellow-500" />
            Editar Puntos Base
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Ajusta los puntos base del usuario. Esto NO afecta los puntos de compras.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Advertencia */}
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-gray-300">
              <p className="font-semibold text-yellow-400 mb-1">Importante:</p>
              <p>Los puntos base son independientes de las compras. Úsalos para ajustes manuales o resets de puntos.</p>
            </div>
          </div>

          {/* Input de Puntos */}
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold">
              Nuevos Puntos Base
            </label>
            <input
              type="number"
              min="0"
              value={newBasePoints}
              onChange={(e) => setNewBasePoints(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-2xl font-bold text-center focus:ring-2 focus:ring-yellow-500/50 outline-none transition-all"
              placeholder="0"
            />
          </div>

          {/* Información Actual */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Actual</p>
              <p className="text-white font-bold">{currentBasePoints.toLocaleString()} pts</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-gray-500 text-xs mb-1">Nuevo</p>
              <p className="text-yellow-400 font-bold">{(parseInt(newBasePoints) || 0).toLocaleString()} pts</p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="flex-1 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-black font-bold"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditBasePointsModal;
