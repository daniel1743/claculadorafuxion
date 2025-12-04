
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, AlertCircle, PackagePlus, Tag, Hash, DollarSign, FileText, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ProductAutocomplete from '@/components/ui/ProductAutocomplete';

const PurchaseModule = ({ onAdd, prices = {}, products = [] }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    productName: '',
    description: '',
    tags: '',
    quantity: '',
    totalSpent: ''
  });
  const [calculations, setCalculations] = useState({
    freeProducts: 0,
    realUnitCost: 0
  });

  useEffect(() => {
    const qty = parseFloat(formData.quantity) || 0;
    const spent = parseFloat(formData.totalSpent) || 0;
    
    const free = Math.floor(qty / 4);
    const totalUnits = qty + free;
    const realCost = totalUnits > 0 ? spent / totalUnits : 0;

    setCalculations({
      freeProducts: free,
      realUnitCost: realCost
    });
  }, [formData.quantity, formData.totalSpent]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.productName || !formData.quantity || !formData.totalSpent) {
      toast({
        title: "Campos Incompletos",
        description: "Por favor completa los campos obligatorios (*)",
        variant: "destructive"
      });
      return;
    }

    const totalQty = parseInt(formData.quantity);
    const totalSpent = parseFloat(formData.totalSpent);
    const tagsList = formData.tags.split(',').map(t => t.trim()).filter(Boolean);

    let transactionsToAdd = [];

    if (tagsList.length > 0) {
      // Split logic
      const baseQty = Math.floor(totalQty / tagsList.length);
      const remainder = totalQty % tagsList.length;
      const costPerUnit = totalSpent / totalQty;

      tagsList.forEach((tag, index) => {
        // Distribute quantity
        let qty = baseQty;
        if (index < remainder) qty += 1;

        if (qty > 0) {
          const cost = qty * costPerUnit;
          const free = Math.floor(qty / 4);
          const realCost = cost / (qty + free);

          transactionsToAdd.push({
            type: 'compra',
            productName: tag, // Tag becomes the main identifier
            description: `${formData.productName} ${formData.description}`.trim(),
            quantity: qty,
            total: cost,
            freeUnits: free,
            realUnitCost: realCost,
            date: new Date().toISOString()
          });
        }
      });

      toast({
        title: "Compra Desglosada",
        description: `Se crearon ${transactionsToAdd.length} registros basados en las etiquetas.`,
        className: "bg-red-900 border-red-600 text-white"
      });

    } else {
      // Single entry
      transactionsToAdd.push({
        type: 'compra',
        productName: formData.productName,
        description: formData.description,
        quantity: totalQty,
        total: totalSpent,
        freeUnits: calculations.freeProducts,
        realUnitCost: calculations.realUnitCost,
        date: new Date().toISOString()
      });

      toast({
        title: "Compra Exitosa",
        description: "Inventario actualizado correctamente.",
        className: "bg-red-900 border-red-600 text-white"
      });
    }

    onAdd(transactionsToAdd);
    setFormData({ productName: '', description: '', tags: '', quantity: '', totalSpent: '' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 h-full"
    >
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-1 h-6 bg-red-500 rounded-full"></span>
        Nueva Compra
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
                // Si tiene precio, sugerir un costo total aproximado basado en cantidad
              });
            }}
            products={products}
            prices={prices}
            placeholder="Ej: prunex 1 (escribe para buscar)"
            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 outline-none transition-all placeholder-gray-700"
            icon={Tag}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Etiquetas (Split Items)</label>
          <div className="relative group">
             <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
             <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 outline-none transition-all placeholder-gray-700"
              placeholder="Ej: rojo, azul, verde (separa con comas)"
            />
          </div>
          <p className="text-[10px] text-gray-500 pl-1">Si agregas etiquetas, la cantidad se dividirá entre ellas.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 whitespace-nowrap">Cantidad Total *</label>
            <div className="relative group">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
                <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 outline-none transition-all placeholder-gray-700"
                placeholder="0"
                />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 whitespace-nowrap">Costo Total *</label>
            <div className="relative group">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
                <input
                type="number"
                min="0"
                step="0.01"
                value={formData.totalSpent}
                onChange={(e) => setFormData({...formData, totalSpent: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 outline-none transition-all placeholder-gray-700"
                placeholder="0.00"
                />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Descripción Adicional</label>
          <div className="relative group">
             <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-focus-within:text-red-400 transition-colors" />
             <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 outline-none transition-all placeholder-gray-700 resize-none h-20"
              placeholder="Detalles extra..."
            />
          </div>
        </div>

        <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/10 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400 flex items-center gap-2">
              <PackagePlus className="w-4 h-4 text-red-400" />
              Bonificación (4x1)
            </span>
            <span className="font-bold text-white bg-red-500/20 px-2 py-0.5 rounded">+{calculations.freeProducts} gratis</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              Costo Real Promedio
            </span>
            <span className="font-bold text-red-400 font-mono">${calculations.realUnitCost.toFixed(2)}</span>
          </div>
        </div>

        <Button 
          type="submit"
          className="w-full h-12 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-lg shadow-red-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-5 h-5 mr-2" />
          Registrar Compra
        </Button>
      </form>
    </motion.div>
  );
};

export default PurchaseModule;
