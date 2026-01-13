import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Edit2, TrendingUp, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { getUserTotalPoints } from '@/lib/pointsService';
import EditBasePointsModal from '@/components/EditBasePointsModal';

const PointsCard = ({ userId, refreshTrigger = 0 }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [pointsData, setPointsData] = useState({
    base_points: 0,
    purchase_points: 0,
    total_points: 0
  });

  const loadPoints = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const { data, error } = await getUserTotalPoints(userId);

      if (error) throw error;

      if (data) {
        setPointsData(data);
      }
    } catch (error) {
      console.error('[PointsCard] Error loading points:', error);
      toast({
        title: "Error al cargar puntos",
        description: "No se pudieron cargar tus puntos. Intenta recargar la página.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPoints();
  }, [userId, refreshTrigger]);

  const handleBasePointsUpdated = () => {
    loadPoints();
    toast({
      title: "Puntos Base Actualizados",
      description: "Los puntos base se han actualizado correctamente.",
      className: "bg-yellow-900 border-yellow-600 text-white"
    });
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-yellow-900/20 via-gray-900/40 to-gray-900/40 border border-yellow-500/20 rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-500"></div>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-yellow-900/20 via-gray-900/40 to-gray-900/40 border border-yellow-500/20 rounded-2xl p-6 relative overflow-hidden group hover:border-yellow-500/40 transition-all"
      >
        {/* Background Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

        {/* Header con botón de edición */}
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <Trophy className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Puntos Fuxion</h3>
              <p className="text-xs text-gray-400">Sistema de recompensas</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditModalOpen(true)}
            className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Total de Puntos */}
        <div className="mb-8 relative z-10">
          <div className="flex items-baseline gap-2 justify-center">
            <span className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
              {pointsData.total_points.toLocaleString()}
            </span>
            <span className="text-gray-400 text-lg font-semibold">PTS</span>
          </div>
          <p className="text-center text-gray-500 text-sm mt-2">Puntos Totales Acumulados</p>
        </div>

        {/* Desglose de Puntos */}
        <div className="grid grid-cols-2 gap-3 relative z-10">
          <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="w-4 h-4 text-green-400" />
              <p className="text-xs text-gray-400">Compras</p>
            </div>
            <p className="text-xl font-bold text-green-400">
              {pointsData.purchase_points.toLocaleString()}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <p className="text-xs text-gray-400">Base</p>
            </div>
            <p className="text-xl font-bold text-blue-400">
              {pointsData.base_points.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Decoración */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-yellow-500/5 rounded-full blur-3xl"></div>
      </motion.div>

      <EditBasePointsModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        currentBasePoints={pointsData.base_points}
        userId={userId}
        onSuccess={handleBasePointsUpdated}
      />
    </>
  );
};

export default PointsCard;
