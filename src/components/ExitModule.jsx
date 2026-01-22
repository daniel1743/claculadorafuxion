import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Tag, Hash, FileText, Package, Gift, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ProductAutocomplete from '@/components/ui/ProductAutocomplete';
import { addTransactionV2 } from '@/lib/transactionServiceV2';
import { getUserProductsWithInventory } from '@/lib/productService';
import { validateStock, formatInventory } from '@/lib/inventoryUtils';
import { supabase } from '@/lib/supabase';

const ExitModule = ({ onAdd, campaigns = [], prices = {}, products = [] }) => {
  const { toast } = useToast();
  const [exitType, setExitType] = useState('personal_consumption'); // 'personal_consumption', 'marketing_sample', 'box_opening'
  const [formData, setFormData] = useState({
    productName: '',
    quantityBoxes: '',
    quantitySachets: '',
    notes: '',
    campaignName: ''
  });
  const [productInventory, setProductInventory] = useState(null);
  const [availableProducts, setAvailableProducts] = useState([]);

  // Cargar productos con inventario
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await getUserProductsWithInventory(user.id);
          if (data) {
            setAvailableProducts(data);
          }
        }
      } catch (error) {
        console.error('Error cargando productos:', error);
      }
    };
    loadProducts();
  }, []);

  // Actualizar inventario cuando cambia el producto
  useEffect(() => {
    if (formData.productName) {
      const product = availableProducts.find(p => p.name === formData.productName);
      setProductInventory(product || null);
    } else {
      setProductInventory(null);
    }
  }, [formData.productName, availableProducts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const quantityBoxes = parseInt(formData.quantityBoxes) || 0;
    const quantitySachets = parseInt(formData.quantitySachets) || 0;

    // Validaciones según tipo
    if (!formData.productName) {
      toast({
        title: "Campo Requerido",
        description: "Debes seleccionar un producto.",
        variant: "destructive"
      });
      return;
    }

    if (exitType === 'marketing_sample') {
      if (quantitySachets <= 0) {
        toast({
          title: "Cantidad Inválida",
          description: "Debes especificar cuántos sobres de muestra dar.",
          variant: "destructive"
        });
        return;
      }
    } else {
      if (quantityBoxes <= 0 && quantitySachets <= 0) {
        toast({
          title: "Cantidad Inválida",
          description: "Debes especificar cantidad en cajas o sobres.",
          variant: "destructive"
        });
        return;
      }
    }

    // Validar stock
    if (productInventory) {
      const validation = validateStock(
        productInventory,
        quantityBoxes,
        quantitySachets
      );

      if (!validation.valid) {
        toast({
          title: "Stock Insuficiente",
          description: validation.message,
          variant: "destructive"
        });
        return;
      }
    }

    try {
      const result = await addTransactionV2({
        type: exitType,
        productName: formData.productName,
        quantityBoxes: quantityBoxes,
        quantitySachets: quantitySachets,
        totalAmount: 0,
        notes: formData.notes || '',
        listPrice: prices[formData.productName] || 0
      });

      if (result.error) throw result.error;

      const typeNames = {
        personal_consumption: 'Consumo Personal',
        marketing_sample: 'Muestra/Regalo'
      };

      toast({
        title: `${typeNames[exitType]} Registrada`,
        description: "Inventario actualizado correctamente.",
        className: "bg-blue-900 border-blue-600 text-white"
      });

      onAdd([result.data]);
      setFormData({
        productName: '',
        quantityBoxes: '',
        quantitySachets: '',
        notes: '',
        campaignName: ''
      });
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la salida. Intenta de nuevo.",
        variant: "destructive"
      });
    }
  };

  const getCurrentStock = () => {
    if (!productInventory) return 'Selecciona un producto';
    return formatInventory(productInventory);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 h-full"
    >
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
        Registrar Salida
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Selector de Tipo */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
            Tipo de Transacción *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setExitType('personal_consumption')}
              className={`p-3 rounded-xl border transition-all text-center whitespace-normal leading-tight ${
                exitType === 'personal_consumption'
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-black/20 border-white/10 text-gray-400 hover:border-purple-500/50'
              }`}
            >
              <User className="w-4 h-4 mx-auto mb-1" />
              <span className="text-[11px] font-semibold block">Consumo Personal</span>
            </button>
            <button
              type="button"
              onClick={() => setExitType('marketing_sample')}
              className={`p-3 rounded-xl border transition-all text-center whitespace-normal leading-tight ${
                exitType === 'marketing_sample'
                  ? 'bg-yellow-600 border-yellow-500 text-white'
                  : 'bg-black/20 border-white/10 text-gray-400 hover:border-yellow-500/50'
              }`}
            >
              <Gift className="w-4 h-4 mx-auto mb-1" />
              <span className="text-[11px] font-semibold block">Muestra / Regalo</span>
            </button>
          </div>
        </div>

        {/* Producto */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
            Producto *
          </label>
          <ProductAutocomplete
            value={formData.productName}
            onChange={(value) => setFormData({...formData, productName: value})}
            onSelect={(productName) => {
              setFormData({...formData, productName: productName});
            }}
            products={products}
            prices={prices}
            placeholder="Ej: prunex 1 (escribe para buscar)"
            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all placeholder-gray-700"
            icon={Tag}
          />
        </div>

        {/* Cantidades - Depende del tipo */}
        {exitType === 'marketing_sample' ? (
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
              Sobres de Muestra *
            </label>
            <div className="relative group">
              <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-yellow-400 transition-colors" />
              <input
                type="number"
                min="1"
                value={formData.quantitySachets}
                onChange={(e) => setFormData({...formData, quantitySachets: e.target.value, quantityBoxes: ''})}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-yellow-500/20 focus:border-yellow-500/50 outline-none transition-all placeholder-gray-700"
                placeholder="0"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
                Cajas
              </label>
              <div className="relative group">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="number"
                  min="0"
                  value={formData.quantityBoxes}
                  onChange={(e) => setFormData({...formData, quantityBoxes: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all placeholder-gray-700"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
                Sobres
              </label>
              <div className="relative group">
                <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="number"
                  min="0"
                  value={formData.quantitySachets}
                  onChange={(e) => setFormData({...formData, quantitySachets: e.target.value})}
                  className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all placeholder-gray-700"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notas */}
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
            Notas
          </label>
          <div className="relative group">
            <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all placeholder-gray-700 resize-none h-16"
              placeholder="Notas adicionales..."
            />
          </div>
        </div>

        {/* Stock Disponible */}
        <div className={`rounded-xl p-4 border flex justify-between items-center ${
          exitType === 'personal_consumption' ? 'bg-purple-500/5 border-purple-500/10' :
          'bg-yellow-500/5 border-yellow-500/10'
        }`}>
          <span className="text-xs text-gray-400">Stock Disponible</span>
          <span className="text-sm font-bold text-blue-400">{getCurrentStock()}</span>
        </div>

        <Button
          type="submit"
          className={`w-full h-12 rounded-xl font-semibold shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${
            exitType === 'personal_consumption' ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-900/20' :
            'bg-yellow-600 hover:bg-yellow-700 text-black shadow-yellow-900/20'
          }`}
        >
          <Plus className="w-5 h-5 mr-2" />
          {exitType === 'personal_consumption' ? 'Registrar Consumo' : 'Registrar Muestra'}
        </Button>
      </form>
    </motion.div>
  );
};

export default ExitModule;

