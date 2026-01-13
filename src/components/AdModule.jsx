
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Megaphone, Calendar, DollarSign, FileText, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import HelpTooltip from '@/components/HelpTooltip';
import HelpPanel, { HelpButton } from '@/components/HelpPanel';
import { advertisingHelp, advertisingFieldHelp } from '@/lib/helpContent';

const AdModule = ({ onAdd }) => {
  const { toast } = useToast();
  const [helpOpen, setHelpOpen] = useState(false);
  const [formData, setFormData] = useState({
    campaignName: '',
    description: '',
    tags: '',
    investment: '',
    date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.campaignName || !formData.investment) {
      toast({
        title: "Campos Incompletos",
        description: "Nombre de campaña e inversión son obligatorios.",
        variant: "destructive"
      });
      return;
    }

    const totalInvestment = parseFloat(formData.investment);
    const tagsList = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    let transactionsToAdd = [];

    if (tagsList.length > 0) {
       const baseInv = totalInvestment / tagsList.length; // Float OK for currency
       
       tagsList.forEach(tag => {
          transactionsToAdd.push({
             type: 'publicidad',
             campaignName: formData.campaignName,
             // Tag becomes part of description or productName context for Ads
             productName: tag, // Optional: store tag here for consistency
             description: `${tag} - ${formData.description}`.trim(),
             total: baseInv,
             quantity: 1, // Ads don't really have qty but 1 implies "1 ad unit"
             date: new Date(formData.date).toISOString()
          });
       });
       
       toast({
         title: "Campaña Dividida",
         description: `Inversión dividida entre ${tagsList.length} etiquetas.`,
         className: "bg-blue-900 border-blue-600 text-white"
       });

    } else {
       transactionsToAdd.push({
          type: 'publicidad',
          campaignName: formData.campaignName,
          description: formData.description,
          total: totalInvestment,
          quantity: 1,
          date: new Date(formData.date).toISOString()
       });

       toast({
         title: "Campaña Activada",
         description: "Inversión registrada correctamente.",
         className: "bg-blue-900 border-blue-600 text-white"
       });
    }

    onAdd(transactionsToAdd);

    setFormData({
      campaignName: '',
      description: '',
      tags: '',
      investment: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 h-full"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
          Nueva Campaña
        </h3>
        <HelpButton onClick={() => setHelpOpen(true)} className="text-xs" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 flex items-center">
            Nombre Campaña *
            <HelpTooltip content={advertisingFieldHelp.campaignName} />
          </label>
          <div className="relative group">
             <Megaphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
             <input
              type="text"
              value={formData.campaignName}
              onChange={(e) => setFormData({...formData, campaignName: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all placeholder-gray-700"
              placeholder="Ej. Lanzamiento Verano"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 flex items-center">
            Etiquetas (Split Cost)
            <HelpTooltip content="Si agregas etiquetas separadas por comas (Ej: Facebook, Instagram, Google), la inversión total se dividirá equitativamente entre ellas para analizar ROI por plataforma." />
          </label>
          <div className="relative group">
             <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
             <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all placeholder-gray-700"
              placeholder="Ej: FB, Instagram, TikTok"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 flex items-center">
                Fecha Inicio
                <HelpTooltip content={advertisingFieldHelp.startDate} />
              </label>
              <div className="relative group">
                 <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                 <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 flex items-center">
                Inversión *
                <HelpTooltip content={advertisingFieldHelp.amount} />
              </label>
              <div className="relative group">
                 <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                 <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.investment}
                  onChange={(e) => setFormData({...formData, investment: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all placeholder-gray-700"
                  placeholder="0.00"
                />
              </div>
            </div>
        </div>

        <div className="space-y-2">
           <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 flex items-center">
             Descripción
             <HelpTooltip content={advertisingFieldHelp.notes} />
           </label>
           <div className="relative group">
             <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
             <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all placeholder-gray-700 resize-none h-16"
              placeholder="Detalles..."
            />
          </div>
        </div>

        <div className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/10">
           <p className="text-xs text-gray-400 leading-relaxed">
             Si usas etiquetas, la inversión se dividirá equitativamente entre ellas, manteniendo el nombre de la campaña para el ROI.
           </p>
        </div>

        <Button
          type="submit"
          className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-5 h-5 mr-2" />
          Registrar Inversión
        </Button>
      </form>

      <HelpPanel
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        helpContent={advertisingHelp}
      />
    </motion.div>
  );
};

export default AdModule;
