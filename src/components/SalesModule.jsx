
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Tag, Hash, DollarSign, Link2, FileText, Layers, Users, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ProductAutocomplete from '@/components/ui/ProductAutocomplete';
import { addTransactionV2 } from '@/lib/transactionServiceV2';
import { getUserProductsWithInventory } from '@/lib/productService';
import { validateStock } from '@/lib/inventoryUtils';
import { supabase } from '@/lib/supabase';
import { createLoan } from '@/lib/loanService';
import { getAllCustomers } from '@/lib/customerService';
import { createAutomaticReminders } from '@/lib/reminderService';

const SalesModule = ({ onAdd, inventoryMap, campaigns, prices, products = [] }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    productName: '',
    description: '',
    tags: '',
    quantity: '',
    totalReceived: '',
    campaignName: '', // Puede ser: '', 'Venta Recurrente', 'Venta por Referencia', o campaña personalizada
    customerId: '', // Para Venta Recurrente
    referredBy: '' // Para Venta por Referencia (nombre del referente)
  });
  const [availableProducts, setAvailableProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Cargar productos con inventario
  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return;

        if (isMounted) {
          const { data, error } = await getUserProductsWithInventory(user.id);
          if (!error && data && isMounted) {
            setAvailableProducts(data);
          }
        }
      } catch (error) {
        console.error('[SalesModule] Error:', error);
      }
    };
    loadProducts();
    return () => { isMounted = false; };
  }, []);

  // Cargar clientes
  useEffect(() => {
    let isMounted = true;
    const loadCustomers = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return;

        if (isMounted) {
          const { data, error } = await getAllCustomers(user.id);
          if (!error && data && isMounted) {
            setCustomers(data);
          }
        }
      } catch (error) {
        console.error('[SalesModule] Error clientes:', error);
      }
    };
    loadCustomers();
    return () => { isMounted = false; };
  }, []);

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

  const handleSubmit = async (e) => {
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

    // Validar que si es "Venta Recurrente" debe seleccionar un cliente
    if (formData.campaignName === 'Venta Recurrente' && !formData.customerId) {
      toast({
        title: "Cliente Requerido",
        description: "Debes seleccionar un cliente para Venta Recurrente.",
        variant: "destructive"
      });
      return;
    }

    // Validar que si es "Venta por Referencia" debe ingresar el nombre del referente
    if (formData.campaignName === 'Venta por Referencia' && !formData.referredBy.trim()) {
      toast({
        title: "Referente Requerido",
        description: "Debes ingresar el nombre de quien refiere para Venta por Referencia.",
        variant: "destructive"
      });
      return;
    }

    const tagsList = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    let transactionsToAdd = [];

    try {
      let totalLoansCreated = 0;
      const { data: { user } } = await supabase.auth.getUser();

      // Determinar sale_type basado en campaignName
      let saleType = 'organic';
      if (formData.campaignName === 'Venta Recurrente') {
        saleType = 'recurring';
      } else if (formData.campaignName === 'Venta por Referencia') {
        saleType = 'referral';
      }

      // Buscar si el referente existe en la base de datos (para Venta por Referencia)
      let referrerId = null;
      if (formData.campaignName === 'Venta por Referencia' && formData.referredBy.trim()) {
        const referrer = customers.find(c =>
          c.full_name.toLowerCase() === formData.referredBy.trim().toLowerCase()
        );
        if (referrer) {
          referrerId = referrer.id;
        }
      }

      if (tagsList.length > 0) {
        // Calcular distribución de cantidades
        const baseQty = Math.floor(totalQty / tagsList.length);
        const remainder = totalQty % tagsList.length;
        const revPerUnit = totalMoney / totalQty;

        for (const tag of tagsList) {
          let qty = baseQty;
          if (tagsList.indexOf(tag) < remainder) qty += 1;

          if (qty > 0) {
            // Verificar stock disponible
            const available = inventoryMap[tag] || 0;
            const shortage = Math.max(0, qty - available);

            // Crear transacción de venta (siempre, por la cantidad total)
            const result = await addTransactionV2({
              type: 'sale',
              productName: tag,
              quantityBoxes: qty,
              quantitySachets: 0,
              totalAmount: qty * revPerUnit,
              notes: `${formData.productName} ${formData.description}`.trim() +
                     (formData.campaignName && !['Venta Recurrente', 'Venta por Referencia'].includes(formData.campaignName)
                       ? ` - Campaña: ${formData.campaignName}`
                       : '') +
                     (formData.campaignName === 'Venta por Referencia'
                       ? ` - Referido por: ${formData.referredBy}`
                       : ''),
              listPrice: prices[tag] || 0,
              customerId: formData.customerId || null,
              saleType: saleType,
              referrerId: referrerId
            });

            if (result.error) throw result.error;
            if (result.data) transactionsToAdd.push(result.data);

            // Si hay faltante, crear préstamo
            if (shortage > 0) {
              const loanResult = await createLoan({
                productName: tag,
                quantityBoxes: shortage,
                quantitySachets: 0,
                notes: `Préstamo generado en venta desglosada de ${formData.productName} - ${formData.description}`
              });

              if (loanResult.error) {
                console.error(`Error creando préstamo para ${tag}:`, loanResult.error);
              } else {
                totalLoansCreated += shortage;
              }
            }
          }
        }

        toast({
          title: "Venta Desglosada",
          description: `Venta registrada dividida en ${tagsList.length} items.`,
          className: "bg-green-900 border-green-600 text-white"
        });

      } else {
        // Single Product sale
        const available = inventoryMap[formData.productName] || 0;
        const shortage = Math.max(0, totalQty - available);

        // Crear transacción de venta (siempre, por la cantidad total)
        const result = await addTransactionV2({
          type: 'sale',
          productName: formData.productName,
          quantityBoxes: totalQty,
          quantitySachets: 0,
          totalAmount: totalMoney,
          notes: formData.description +
                 (formData.campaignName && !['Venta Recurrente', 'Venta por Referencia'].includes(formData.campaignName)
                   ? ` - Campaña: ${formData.campaignName}`
                   : '') +
                 (formData.campaignName === 'Venta por Referencia'
                   ? ` - Referido por: ${formData.referredBy}`
                   : ''),
          listPrice: prices[formData.productName] || 0,
          customerId: formData.customerId || null,
          saleType: saleType,
          referrerId: referrerId
        });

        if (result.error) throw result.error;
        if (result.data) transactionsToAdd.push(result.data);

        // Si hay faltante, crear préstamo
        if (shortage > 0) {
          const loanResult = await createLoan({
            productName: formData.productName,
            quantityBoxes: shortage,
            quantitySachets: 0,
            notes: `Préstamo generado en venta - ${formData.description || 'Sin descripción'}`
          });

          if (loanResult.error) {
            console.error('Error creando préstamo:', loanResult.error);
          } else {
            totalLoansCreated += shortage;
          }
        }

        let description = "Ganancia calculada e inventario descontado.";
        if (totalLoansCreated > 0) {
          description += ` ${totalLoansCreated} unidades registradas como préstamo.`;
        }

        toast({
          title: "Venta Exitosa",
          description,
          className: "bg-green-900 border-green-600 text-white"
        });
      }

      // Crear recordatorios automáticos si es Venta Recurrente
      if (formData.campaignName === 'Venta Recurrente' && formData.customerId && transactionsToAdd.length > 0) {
        const mainTransaction = transactionsToAdd[0];
        const customer = customers.find(c => c.id === formData.customerId);

        if (customer && mainTransaction && user) {
          const reminderResult = await createAutomaticReminders(
            user.id,
            formData.customerId,
            mainTransaction.id,
            formData.productName,
            customer.full_name
          );

          if (reminderResult.error) {
            console.error('[SalesModule] Error recordatorios:', reminderResult.error);
          }
        }
      }

      // Mensaje de éxito personalizado
      if (formData.campaignName === 'Venta por Referencia' && referrerId) {
        const referrer = customers.find(c => c.id === referrerId);
        toast({
          title: "Venta por Referencia Registrada",
          description: `Venta registrada. ${referrer?.full_name || formData.referredBy} sumó una referencia a su historial.`,
          className: "bg-green-900 border-green-600 text-white"
        });
      }

      onAdd(transactionsToAdd);
      setFormData({
        productName: '',
        description: '',
        tags: '',
        quantity: '',
        totalReceived: '',
        campaignName: '',
        customerId: '',
        referredBy: ''
      });
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la venta. Intenta de nuevo.",
        variant: "destructive"
      });
    }
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
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Campaña / Tipo de Venta *</label>
          <div className="relative group">
             <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-green-400 transition-colors" />
             <select
              value={formData.campaignName}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  campaignName: e.target.value,
                  customerId: e.target.value === 'Venta Recurrente' ? formData.customerId : '',
                  referredBy: e.target.value === 'Venta por Referencia' ? formData.referredBy : ''
                });
              }}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500/50 outline-none transition-all appearance-none text-sm"
            >
              <option value="">Venta Orgánica</option>
              <option value="Venta Recurrente">Venta Recurrente</option>
              <option value="Venta por Referencia">Venta por Referencia</option>
              {campaigns.length > 0 && <option disabled>────────────</option>}
              {campaigns.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Campo Cliente Recurrente - aparece cuando se selecciona "Venta Recurrente" */}
        {formData.campaignName === 'Venta Recurrente' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2"
          >
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Cliente Recurrente *</label>
            <div className="relative group">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-purple-400 transition-colors" />
              <select
                value={formData.customerId}
                onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 outline-none transition-all appearance-none text-sm"
              >
                <option value="">-- Selecciona un cliente --</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name} {customer.rut ? `(${customer.rut})` : ''}
                  </option>
                ))}
              </select>
            </div>
            {customers.length === 0 && (
              <p className="text-xs text-gray-500 pl-1">
                No hay clientes registrados. Ve a "Gestión de Operaciones" → "Clientes" para crear uno.
              </p>
            )}
          </motion.div>
        )}

        {/* Campo Referente - aparece cuando se selecciona "Venta por Referencia" */}
        {formData.campaignName === 'Venta por Referencia' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2"
          >
            <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">Nombre del Referente *</label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="text"
                value={formData.referredBy}
                onChange={(e) => setFormData({...formData, referredBy: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 outline-none transition-all placeholder-gray-700"
                placeholder="Nombre de quien recomienda"
              />
            </div>
            <p className="text-xs text-gray-400 pl-1">
              Si el referente está en tu base de datos, se sumará automáticamente a su historial de referencias.
            </p>
          </motion.div>
        )}

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
