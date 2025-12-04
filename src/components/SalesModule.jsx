
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Tag, Hash, DollarSign, Link2, FileText, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ProductAutocomplete from '@/components/ui/ProductAutocomplete';

const SalesModule = ({ onAdd, inventoryMap, campaigns, prices, products = [] }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    productName: '',
    description: '',
    tags: '',
    quantity: '',
    totalReceived: '',
    campaignName: ''
  });

  // Auto-calculate total received based on stored price when product or quantity changes
  useEffect(() => {
    if (formData.productName && prices[formData.productName] && formData.quantity) {
        const unitPrice = prices[formData.productName];
        const qty = parseFloat(formData.quantity);
        if (!isNaN(qty) && qty > 0) {
             // Only update if totalReceived is empty to avoid overwriting user manual input during edits
             if (!formData.totalReceived) {
                setFormData(prev => ({...prev, totalReceived: (qty * unitPrice).toString()}));
             }
        }
    }
  }, [formData.productName, formData.quantity, prices]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const totalQty = parseInt(formData.quantity) || 0;
    const totalMoney = parseFloat(formData.totalReceived) || 0;

    if (!formData.productName || !totalQty || !totalMoney) {
      toast({
        title: "Campos Incompletos",
        description: "Producto, cantidad y monto son obligatorios.",
        variant: "destructive"
      });
      return;
    }

    const tagsList = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    let transactionsToAdd = [];

    if (tagsList.length > 0) {
       // Validate Inventory for each tag first
       const baseQty = Math.floor(totalQty / tagsList.length);
       const remainder = totalQty % tagsList.length;
       
       let possible = true;
       let insufficientTag = '';

       tagsList.forEach((tag, index) => {
          let qty = baseQty;
          if (index < remainder) qty += 1;
          
          const available = inventoryMap[tag] || 0;
          if (qty > available) {
             possible = false;
             insufficientTag = `${tag} (Req: ${qty}, Disp: ${available})`;
          }
       });

       if (!possible) {
          toast({
            title: "Stock Insuficiente",
            description: `No hay suficiente inventario para la etiqueta: ${insufficientTag}`,
            variant: "destructive"
          });
          return;
       }

       // Validation passed, create transactions
       const revPerUnit = totalMoney / totalQty;

       tagsList.forEach((tag, index) => {
          let qty = baseQty;
          if (index < remainder) qty += 1;

          if (qty > 0) {
             transactionsToAdd.push({
               type: 'venta',
               productName: tag,
               description: `${formData.productName} ${formData.description}`.trim(),
               quantity: qty,
               total: qty * revPerUnit,
               campaignName: formData.campaignName || 'Orgánico',
               date: new Date().toISOString()
             });
          }
       });

       toast({
          title: "Venta Desglosada",
          description: `Venta registrada dividida en ${tagsList.length} items.`,
          className: "bg-green-900 border-green-600 text-white"
       });

    } else {
       // Single Product check
       const available = inventoryMap[formData.productName] || 0;
       if (totalQty > available) {
          toast({
            title: "Stock Insuficiente",
            description: `Solo tienes ${available} unidades de "${formData.productName}".`,
            variant: "destructive"
          });
          return;
       }

       transactionsToAdd.push({
          type: 'venta',
          productName: formData.productName,
          description: formData.description,
          quantity: totalQty,
          total: totalMoney,
          campaignName: formData.campaignName || 'Orgánico',
          date: new Date().toISOString()
       });

       toast({
          title: "Venta Exitosa",
          description: "Ganancia calculada e inventario descontado.",
          className: "bg-green-900 border-green-600 text-white"
       });
    }

    onAdd(transactionsToAdd);
    setFormData({ productName: '', description: '', tags: '', quantity: '', totalReceived: '', campaignName: '' });
  };

  const getCurrentStock = () => {
     if (formData.tags) return "Varios";
     return (inventoryMap[formData.productName] || 0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 h-full"
    >
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-1 h-6 bg-green-500 rounded-full"></span>
        Nueva Venta
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Producto Principal *</label>
          <ProductAutocomplete
            value={formData.productName}
            onChange={(value) => setFormData({...formData, productName: value})}
            onSelect={(productName, price) => {
              setFormData({
                ...formData,
                productName: productName,
                // Si tiene precio y cantidad, calcular total automáticamente
                totalReceived: (price && formData.quantity) 
                  ? (parseFloat(formData.quantity) * price).toString()
                  : formData.totalReceived
              });
            }}
            products={products}
            prices={prices}
            placeholder="Ej: prunex 1 (escribe para buscar)"
            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 outline-none transition-all placeholder-gray-700"
            icon={Tag}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Etiquetas (Split Items)</label>
          <div className="relative group">
             <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-green-400 transition-colors" />
             <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 outline-none transition-all placeholder-gray-700"
              placeholder="Ej: rojo, azul (verifica stock individual)"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 whitespace-nowrap">Cantidad *</label>
            <div className="relative group">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-green-400 transition-colors" />
                <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 outline-none transition-all placeholder-gray-700"
                placeholder="0"
                />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 whitespace-nowrap">Total Recibido *</label>
            <div className="relative group">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-green-400 transition-colors" />
                <input
                type="number"
                min="0"
                step="1"
                value={formData.totalReceived}
                onChange={(e) => setFormData({...formData, totalReceived: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 outline-none transition-all placeholder-gray-700"
                placeholder="0"
                />
            </div>
          </div>
        </div>

        <div className="space-y-2">
           <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Descripción</label>
           <div className="relative group">
             <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-focus-within:text-green-400 transition-colors" />
             <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 outline-none transition-all placeholder-gray-700 resize-none h-16"
              placeholder="Notas..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Campaña</label>
          <div className="relative group">
             <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-green-400 transition-colors" />
             <select
              value={formData.campaignName}
              onChange={(e) => setFormData({...formData, campaignName: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 outline-none transition-all appearance-none text-sm"
            >
              <option value="">Venta Orgánica</option>
              {campaigns.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-green-500/5 rounded-xl p-4 border border-green-500/10 flex justify-between items-center">
           <span className="text-xs text-gray-400">Stock Disponible (Item Principal)</span>
           <span className="text-sm font-bold text-green-400">{getCurrentStock()}</span>
        </div>

        <Button 
          type="submit"
          className="w-full h-12 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-lg shadow-green-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-5 h-5 mr-2" />
          Registrar Venta
        </Button>
      </form>
    </motion.div>
  );
};

export default SalesModule;
