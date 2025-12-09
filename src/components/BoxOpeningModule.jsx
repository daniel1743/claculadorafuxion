import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Box, Package, Tag, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ProductAutocomplete from '@/components/ui/ProductAutocomplete';
import { addTransactionV2 } from '@/lib/transactionServiceV2';
import { getUserProductsWithInventory } from '@/lib/productService';
import { formatInventory } from '@/lib/inventoryUtils';
import { supabase } from '@/lib/supabase';

const BoxOpeningModule = ({ onAdd, products = [] }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    productName: '',
    quantityBoxes: ''
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

    if (!formData.productName) {
      toast({
        title: "Campo Requerido",
        description: "Debes seleccionar un producto.",
        variant: "destructive"
      });
      return;
    }

    if (quantityBoxes <= 0) {
      toast({
        title: "Cantidad Inválida",
        description: "Debes especificar cuántas cajas abrir (mínimo 1).",
        variant: "destructive"
      });
      return;
    }

    // Validar stock
    if (productInventory) {
      if (quantityBoxes > productInventory.currentStockBoxes) {
        toast({
          title: "Stock Insuficiente",
          description: `Solo tienes ${productInventory.currentStockBoxes} cajas disponibles.`,
          variant: "destructive"
        });
        return;
      }
    }

    try {
      const sachetsPerBox = productInventory?.sachetsPerBox || 28;
      const totalSachets = quantityBoxes * sachetsPerBox;

      const result = await addTransactionV2({
        type: 'box_opening',
        productName: formData.productName,
        quantityBoxes: quantityBoxes,
        quantitySachets: 0,
        totalAmount: 0,
        notes: `Apertura de ${quantityBoxes} caja${quantityBoxes > 1 ? 's' : ''} → ${totalSachets} sobres`
      });

      if (result.error) throw result.error;

      toast({
        title: "Cajas Abiertas",
        description: `${quantityBoxes} caja${quantityBoxes > 1 ? 's' : ''} convertida${quantityBoxes > 1 ? 's' : ''} en ${totalSachets} sobres.`,
        className: "bg-orange-900 border-orange-600 text-white"
      });

      onAdd([result.data]);
      setFormData({
        productName: '',
        quantityBoxes: ''
      });
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron abrir las cajas. Intenta de nuevo.",
        variant: "destructive"
      });
    }
  };

  const getPreview = () => {
    if (!formData.quantityBoxes || !productInventory) return null;
    const quantity = parseInt(formData.quantityBoxes);
    const sachetsPerBox = productInventory.sachetsPerBox || 28;
    const totalSachets = quantity * sachetsPerBox;
    
    return `${quantity} caja${quantity > 1 ? 's' : ''} → ${totalSachets} sobres`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/40 border border-white/5 rounded-2xl p-6"
    >
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <Box className="w-5 h-5 text-orange-500" />
        Abrir Cajas
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            prices={{}}
            placeholder="Ej: prunex 1 (escribe para buscar)"
            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all placeholder-gray-700"
            icon={Tag}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
            Cajas a Abrir *
          </label>
          <div className="relative group">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-orange-400 transition-colors" />
            <input
              type="number"
              min="1"
              value={formData.quantityBoxes}
              onChange={(e) => setFormData({...formData, quantityBoxes: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all placeholder-gray-700"
              placeholder="0"
            />
          </div>
        </div>

        {/* Preview */}
        {getPreview() && (
          <div className="bg-orange-500/5 rounded-xl p-4 border border-orange-500/10">
            <div className="flex items-center gap-2 text-orange-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-semibold">{getPreview()}</span>
            </div>
          </div>
        )}

        {/* Stock Disponible */}
        {productInventory && (
          <div className="bg-gray-500/5 rounded-xl p-4 border border-gray-500/10 flex justify-between items-center">
            <span className="text-xs text-gray-400">Cajas Disponibles</span>
            <span className="text-sm font-bold text-gray-300">
              {productInventory.currentStockBoxes} cajas
            </span>
          </div>
        )}

        <Button 
          type="submit"
          className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold shadow-lg shadow-orange-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Box className="w-5 h-5 mr-2" />
          Abrir Cajas
        </Button>
      </form>
    </motion.div>
  );
};

export default BoxOpeningModule;

