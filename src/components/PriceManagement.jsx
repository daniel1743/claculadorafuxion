
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Tag, DollarSign, Search, AlertCircle, Plus, Pencil, Trash2, AlertTriangle, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatCLP } from '@/lib/utils';
import ProductAutocomplete from '@/components/ui/ProductAutocomplete';
import { upsertProduct } from '@/lib/productService';
import { formatInventory } from '@/lib/inventoryUtils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const PriceManagement = ({ transactions, prices, productsV2: productsV2Prop = [], onUpdatePrice, onDeleteProduct, onRenameProduct }) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form Data
  const [formData, setFormData] = useState({ name: '', price: '', points: '' });
  const [editingProduct, setEditingProduct] = useState(null); // Original name before edit
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Usar productsV2 del prop (datos reales de App.jsx)
  // Combinar productos de productsV2Prop con productos de transactions/prices que no estén en V2
  const productsV2 = productsV2Prop;

  // Lista de nombres de productos (combinando V2 + transacciones + precios)
  const products = React.useMemo(() => {
    const productNames = new Set();

    // Agregar productos V2
    productsV2.forEach(p => productNames.add(p.name));

    // Agregar productos de transacciones que no estén en V2
    transactions.forEach(t => {
      if (t.productName) productNames.add(t.productName);
    });

    // Agregar productos de precios que no estén
    Object.keys(prices).forEach(p => productNames.add(p));

    return Array.from(productNames).sort();
  }, [productsV2, transactions, prices]);

  // Handlers
  const openAddModal = () => {
    setFormData({ name: '', price: '', points: '' });
    setIsEditMode(false);
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const openEditModal = (product, currentPrice) => {
    const productV2 = productsV2.find(p => p.name === product);
    setFormData({ 
      name: product, 
      price: currentPrice,
      points: productV2?.points || 0
    });
    setIsEditMode(true);
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const openDeleteModal = (product) => {
    setDeletingProduct(product);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const name = formData.name.trim();
    const price = parseFloat(formData.price);
    const points = parseInt(formData.points) || 0;

    if (!name || isNaN(price) || price < 0) {
        toast({
            title: "Datos Inválidos",
            description: "Por favor ingresa un nombre y un precio válido (mayor o igual a 0).",
            variant: "destructive"
        });
        return;
    }

    setIsSaving(true);

    try {
      console.log(`[PriceManagement] Guardando precio: "${name}" = $${price}`);

      // Usar productService para crear/actualizar producto con puntos
      const result = await upsertProduct({
        name: name,
        list_price: price,
        points: points
      });

      if (result.error) throw result.error;

      if (isEditMode) {
          console.log(`[PriceManagement] Modo EDICIÓN - producto original: "${editingProduct}"`);
          // Si cambió el nombre, usar función de renombrar
          if (editingProduct !== name) {
            await onRenameProduct(editingProduct, name, price);
          } else {
            // Solo actualizar precio si no cambió el nombre
            await onUpdatePrice(name, price);
          }
          toast({
              title: "✅ Producto Actualizado",
              description: `Se actualizó "${name}" con precio ${formatCLP(price)}${points > 0 ? ` y ${points} puntos` : ''}.`,
              className: "bg-blue-900 border-blue-600 text-white"
          });
      } else {
          console.log('[PriceManagement] Modo NUEVO - agregando producto');
          await onUpdatePrice(name, price);
          console.log('[PriceManagement] Producto guardado exitosamente');
          toast({
              title: "✅ Producto Agregado",
              description: `Se agregó "${name}" con precio ${formatCLP(price)}${points > 0 ? ` y ${points} puntos` : ''}.`,
              className: "bg-green-900 border-green-600 text-white"
          });
      }
      setIsFormOpen(false);
      setFormData({ name: '', price: '', points: '' });
      // Los datos se recargarán automáticamente desde App.jsx
    } catch (error) {
      console.error('[PriceManagement] Error guardando producto:', error);

      // Mensajes de error más específicos
      let errorMessage = "No se pudo guardar el producto.";

      if (error.message?.includes('auth')) {
        errorMessage = "Error de autenticación. Por favor, inicia sesión nuevamente.";
      } else if (error.message?.includes('unique')) {
        errorMessage = "Ya existe un producto con ese nombre. Usa 'Editar' para modificarlo.";
      } else if (error.message?.includes('network')) {
        errorMessage = "Error de conexión. Verifica tu internet.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "❌ Error al Guardar",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = () => {
    if (deletingProduct) {
        onDeleteProduct(deletingProduct);
        toast({
            title: "Producto Eliminado",
            description: `Se eliminó "${deletingProduct}" y su historial asociado.`,
            className: "bg-red-900 border-red-600 text-white"
        });
        setIsDeleteOpen(false);
        setDeletingProduct(null);
    }
  };

  const filteredProducts = products.filter(p => 
    p.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 shadow-xl"
    >
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <Tag className="w-5 h-5 text-yellow-500" />
          </div>
          Gestión de Precios
        </h3>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
             <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-500/20 outline-none transition-all"
                />
            </div>
            <Button onClick={openAddModal} className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Producto
            </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-black/20">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-white/5 text-gray-400">
            <tr>
              <th className="px-6 py-4 font-medium tracking-wider">Producto</th>
              <th className="px-6 py-4 font-medium tracking-wider text-right">Precio Venta</th>
              <th className="px-6 py-4 font-medium tracking-wider text-right">PPP</th>
              <th className="px-6 py-4 font-medium tracking-wider text-right">Inventario</th>
              <th className="px-6 py-4 font-medium tracking-wider text-right">Puntos</th>
              <th className="px-6 py-4 font-medium tracking-wider text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((productName) => {
                const currentPrice = prices[productName] || 0;
                const productV2 = productsV2.find(p => p.name === productName);
                
                return (
                  <tr key={productName} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 font-medium text-white">
                      {productName}
                    </td>
                    <td className="px-6 py-4 text-right text-green-400 font-mono font-bold">
                      {formatCLP(currentPrice)}
                    </td>
                    <td className="px-6 py-4 text-right text-blue-400 font-mono text-sm">
                      {productV2?.weightedAverageCost > 0 
                        ? formatCLP(productV2.weightedAverageCost)
                        : <span className="text-gray-500">-</span>
                      }
                    </td>
                    <td className="px-6 py-4 text-right text-gray-300 text-xs">
                      {productV2 ? formatInventory(productV2) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-purple-400 font-semibold">
                      {productV2?.points > 0 ? productV2.points : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(productName, currentPrice)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-yellow-500 hover:bg-yellow-500/10"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteModal(productName)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500 hover:bg-red-500/10"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="w-6 h-6 opacity-50" />
                    <p>No se encontraron productos.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="mt-4 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
        <p className="text-xs text-gray-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-500" />
          Los precios definidos aquí se utilizarán automáticamente para calcular valores estimados de inventario y sugerir montos en nuevas ventas.
        </p>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) {
          // Limpiar el formulario al cerrar
          setTimeout(() => {
            setFormData({ name: '', price: '', points: '' });
            setIsEditMode(false);
            setEditingProduct(null);
          }, 150);
        }
      }}>
        <DialogContent className="sm:max-w-sm bg-gray-950 border border-white/10">
            <DialogHeader>
                <DialogTitle className="text-xl text-white">{isEditMode ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
                <DialogDescription>
                    {isEditMode ? 'Modifica el nombre o precio del producto.' : 'Ingresa los detalles del nuevo producto.'}
                </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSave} className="space-y-4 py-4">
                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-gray-500">Nombre del Producto</label>
                    <ProductAutocomplete
                      value={formData.name}
                      onChange={(value) => setFormData({...formData, name: value})}
                      onSelect={(productName, price) => {
                        setFormData({
                          name: productName,
                          price: price || formData.price // Auto-completar precio si existe
                        });
                      }}
                      products={products}
                      prices={prices}
                      placeholder="Ej: prunex 1 (escribe para buscar)"
                      className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-yellow-500/50 outline-none"
                      icon={Tag}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-gray-500">Precio Unitario (CLP)</label>
                    <div className="relative">
                         <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                         <input 
                            type="number"
                            min="0"
                            value={formData.price}
                            onChange={(e) => setFormData({...formData, price: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-yellow-500/50 outline-none"
                            placeholder="0"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-xs uppercase font-bold text-gray-500">Puntos Fuxion (por caja)</label>
                    <div className="relative">
                         <Gift className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                         <input 
                            type="number"
                            min="0"
                            value={formData.points}
                            onChange={(e) => setFormData({...formData, points: e.target.value})}
                            className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-yellow-500/50 outline-none"
                            placeholder="0"
                        />
                    </div>
                </div>
                
                <DialogFooter className="gap-2 sm:gap-0">
                     <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-white">
                        Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSaving}
                      className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? 'Guardando...' : 'Guardar'}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={(open) => {
        setIsDeleteOpen(open);
        if (!open) {
          setTimeout(() => {
            setDeletingProduct(null);
          }, 150);
        }
      }}>
        <DialogContent className="sm:max-w-md bg-gray-950 border border-red-500/20">
            <DialogHeader>
                <DialogTitle className="text-xl text-white flex items-center gap-2 text-red-500">
                    <AlertTriangle className="w-5 h-5" />
                    ¿Eliminar Producto?
                </DialogTitle>
                <DialogDescription className="text-gray-400 pt-2">
                    Estás a punto de eliminar <strong>"{deletingProduct}"</strong>.
                    <br/><br/>
                    <span className="text-red-400 bg-red-900/20 px-2 py-1 rounded text-xs border border-red-900/50">
                        ADVERTENCIA
                    </span>
                    <span className="block mt-2 text-xs">
                        Esta acción eliminará permanentemente el producto de la lista de precios 
                        <strong> Y DE TODO EL HISTORIAL DE TRANSACCIONES</strong> (compras y ventas). 
                        Esta acción no se puede deshacer.
                    </span>
                </DialogDescription>
            </DialogHeader>
            
            <DialogFooter className="gap-2 sm:gap-0 mt-4">
                <Button variant="ghost" onClick={() => setIsDeleteOpen(false)} className="text-gray-400 hover:text-white">
                    Cancelar
                </Button>
                <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white font-bold border border-red-500/50 shadow-lg shadow-red-900/20">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Sí, eliminar todo
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
};

export default PriceManagement;
