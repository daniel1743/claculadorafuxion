
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, AlertCircle, PackagePlus, Tag, Hash, DollarSign, FileText, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ProductAutocomplete from '@/components/ui/ProductAutocomplete';
import { addTransactionV2 } from '@/lib/transactionServiceV2';
import { getProductByName, upsertProduct } from '@/lib/productService';
import HelpTooltip from '@/components/HelpTooltip';
import HelpPanel, { HelpButton } from '@/components/HelpPanel';
import { purchasesHelp, purchasesFieldHelp } from '@/lib/helpContent';

const PurchaseModule = ({ onAdd, prices = {}, products = [] }) => {
  const { toast } = useToast();
  const [helpOpen, setHelpOpen] = useState(false);
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

  const handleSubmit = async (e) => {
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

    try {
      let transactionsToAdd = [];

      if (tagsList.length > 0) {
        // Split logic
        const baseQty = Math.floor(totalQty / tagsList.length);
        const remainder = totalQty % tagsList.length;
        const costPerUnit = totalSpent / totalQty;

        for (const tag of tagsList) {
          let qty = baseQty;
          if (tagsList.indexOf(tag) < remainder) qty += 1;

          if (qty > 0) {
            const cost = qty * costPerUnit;
            const listPrice = prices[tag] || prices[formData.productName] || 0;

            const result = await addTransactionV2({
              type: 'purchase',
              productName: tag,
              quantityBoxes: qty,
              quantitySachets: 0,
              totalAmount: cost,
              notes: `${formData.productName} ${formData.description}`.trim(),
              listPrice: listPrice
            });

            if (result.error) throw result.error;
            if (result.data) transactionsToAdd.push(result.data);
          }
        }

        toast({
          title: "Compra Desglosada",
          description: `Se crearon ${transactionsToAdd.length} registros basados en las etiquetas.`,
          className: "bg-red-900 border-red-600 text-white"
        });

      } else {
        // Single entry
        const listPrice = prices[formData.productName] || 0;

        const result = await addTransactionV2({
          type: 'purchase',
          productName: formData.productName,
          quantityBoxes: totalQty,
          quantitySachets: 0,
          totalAmount: totalSpent,
          notes: formData.description,
          listPrice: listPrice
        });

        if (result.error) throw result.error;
        if (result.data) transactionsToAdd.push(result.data);

        toast({
          title: "Compra Exitosa",
          description: "Inventario y PPP actualizados automáticamente.",
          className: "bg-red-900 border-red-600 text-white"
        });
      }

      // Notificar al componente padre
      onAdd(transactionsToAdd);
      setFormData({ productName: '', description: '', tags: '', quantity: '', totalSpent: '' });
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la compra. Intenta de nuevo.",
        variant: "destructive"
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 h-full"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <span className="w-1 h-6 bg-red-500 rounded-full"></span>
          Nueva Compra
        </h3>
        <HelpButton onClick={() => setHelpOpen(true)} className="text-xs" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 flex items-center">
            Producto Principal *
            <HelpTooltip content={purchasesFieldHelp.product} />
          </label>
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
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 flex items-center">
            Etiquetas (Split Items)
            <HelpTooltip content="Si agregas etiquetas separadas por comas (Ej: rojo, azul, verde), el sistema dividirá la cantidad total entre ellas. Útil cuando compras un mismo producto en diferentes variantes." />
          </label>
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
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 whitespace-nowrap flex items-center">
              Cantidad Total *
              <HelpTooltip content={purchasesFieldHelp.quantity} />
            </label>
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
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 whitespace-nowrap flex items-center">
              Costo Total *
              <HelpTooltip content={purchasesFieldHelp.unitCost.replace('Precio por CAJA', 'Dinero total que pagas')} />
            </label>
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
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1 flex items-center">
            Descripción Adicional
            <HelpTooltip content={purchasesFieldHelp.notes} />
          </label>
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

      <HelpPanel
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        helpContent={purchasesHelp}
      />
    </motion.div>
  );
};

export default PurchaseModule;
