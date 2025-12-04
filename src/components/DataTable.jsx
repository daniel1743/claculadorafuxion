
import React from 'react';
import { motion } from 'framer-motion';
import { Trash2, ArrowUpRight, ArrowDownRight, Megaphone, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatCLP } from '@/lib/utils';

const DataTable = ({ transactions, onDelete, typeFilter, title, icon: Icon, color }) => {
  const { toast } = useToast();

  const handleDelete = (id) => {
    onDelete(id);
    toast({
      title: "Registro Eliminado",
      description: "La transacción ha sido removida correctamente.",
      className: "bg-red-900 border-red-600 text-white"
    });
  };

  const filteredTransactions = transactions
    .filter(t => t.type === typeFilter)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const colorClasses = {
    red: "text-red-400",
    green: "text-green-400",
    blue: "text-blue-400"
  };
  const accentColor = colorClasses[color] || "text-gray-400";

  if (filteredTransactions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gray-950/30 rounded-2xl border border-dashed border-gray-800 p-12">
        <div className="p-4 bg-gray-900 rounded-full mb-4">
            <Inbox className="w-8 h-8 opacity-30" />
        </div>
        <p className="text-lg font-medium">No hay registros de {title.toLowerCase()}</p>
        <p className="text-sm mt-1 opacity-60">Comienza agregando datos desde el formulario.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-gray-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-lg"
    >
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gray-900/40">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Icon className={`w-5 h-5 ${accentColor}`} />
          {title}
        </h3>
        <span className="text-xs font-medium px-2.5 py-1 bg-white/5 rounded-md text-gray-400 border border-white/5">
            {filteredTransactions.length} Registros
        </span>
      </div>

      <div className="overflow-auto flex-grow scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-black/20 text-gray-400 font-semibold sticky top-0 backdrop-blur-md z-10">
            <tr>
              <th className="px-6 py-4 font-medium tracking-wider">Fecha</th>
              <th className="px-6 py-4 font-medium tracking-wider">Item / Campaña</th>
              <th className="px-6 py-4 font-medium tracking-wider text-right">Cant.</th>
              <th className="px-6 py-4 font-medium tracking-wider text-right">Total</th>
              <th className="px-6 py-4 font-medium tracking-wider text-center">Detalles</th>
              <th className="px-6 py-4 font-medium tracking-wider text-center">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredTransactions.map((t) => (
              <tr key={t.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4 text-gray-400 whitespace-nowrap font-mono text-xs">
                  {new Date(t.date).toLocaleDateString()}
                  <span className="block text-gray-600 mt-0.5">{new Date(t.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </td>
                <td className="px-6 py-4 font-medium text-white">
                  {t.type === 'publicidad' ? t.campaignName : t.productName}
                  <div className="text-[10px] text-gray-500 mt-1 max-w-[200px] truncate">
                    {t.description}
                  </div>
                  {t.type === 'venta' && t.campaignName && (
                      <span className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-900/30 text-blue-300 border border-blue-800/30">
                        {t.campaignName}
                      </span>
                  )}
                </td>
                <td className="px-6 py-4 text-right text-gray-300 font-mono">
                  {t.quantity || '-'}
                </td>
                <td className={`px-6 py-4 text-right font-bold font-mono ${accentColor}`}>
                  {formatCLP(t.total)}
                </td>
                <td className="px-6 py-4 text-center text-xs">
                  {t.freeUnits ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          +{t.freeUnits} Gratis
                      </span>
                  ) : <span className="text-gray-600">-</span>}
                </td>
                <td className="px-6 py-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(t.id)}
                    className="text-gray-500 hover:text-red-400 hover:bg-red-900/20 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default DataTable;
