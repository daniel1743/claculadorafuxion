import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, Tag, Hash, FileText, HandCoins, AlertCircle, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import ProductAutocomplete from '@/components/ui/ProductAutocomplete';
import { repayLoan, getLoanBalances } from '@/lib/loanService';
import { addTransactionV2 } from '@/lib/transactionServiceV2';
import { supabase } from '@/lib/supabase';

const LoanRepaymentModule = ({ onAdd, loans = [], products = [] }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    productName: '',
    quantityBoxes: '',
    notes: ''
  });
  const [loanBalances, setLoanBalances] = useState({});
  const [loading, setLoading] = useState(false);

  // Cargar balances de préstamos
  useEffect(() => {
    const loadLoanBalances = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await getLoanBalances(user.id);
          if (!error && data) {
            setLoanBalances(data);
          }
        }
      } catch (error) {
        console.error('Error cargando balances de préstamos:', error);
      }
    };
    loadLoanBalances();
  }, [loans]);

  // Productos que tienen préstamos activos
  const productsWithLoans = useMemo(() => {
    return Object.values(loanBalances).map(loan => loan.productName);
  }, [loanBalances]);

  // Balance del producto seleccionado
  const currentBalance = useMemo(() => {
    if (!formData.productName) return null;
    const productBalance = Object.values(loanBalances).find(
      loan => loan.productName === formData.productName
    );
    return productBalance || null;
  }, [formData.productName, loanBalances]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const quantityBoxes = parseInt(formData.quantityBoxes) || 0;

    // Validaciones
    if (!formData.productName) {
      toast({
        title: "Campo Requerido",
        description: "Debes seleccionar un producto con préstamos activos.",
        variant: "destructive"
      });
      return;
    }

    if (quantityBoxes <= 0) {
      toast({
        title: "Cantidad Inválida",
        description: "La cantidad debe ser mayor a 0.",
        variant: "destructive"
      });
      return;
    }

    // Verificar que el producto tenga préstamos
    if (!currentBalance || currentBalance.totalBoxes === 0) {
      toast({
        title: "Sin Préstamos",
        description: `No tienes préstamos activos de "${formData.productName}".`,
        variant: "destructive"
      });
      return;
    }

    // Verificar que no devuelvas más de lo que debes
    if (quantityBoxes > currentBalance.totalBoxes) {
      toast({
        title: "Cantidad Excedida",
        description: `Solo debes ${currentBalance.totalBoxes} cajas de "${formData.productName}".`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Registrar devolución de préstamo
      const { data: repaymentData, error: repaymentError } = await repayLoan({
        productName: formData.productName,
        quantityBoxes: quantityBoxes,
        quantitySachets: 0,
        notes: formData.notes
      });

      if (repaymentError) throw repaymentError;

      // 2. Crear transacción histórica tipo 'loan_repayment'
      const { data: transactionData, error: transactionError } = await addTransactionV2({
        type: 'loan_repayment',
        productName: formData.productName,
        quantityBoxes: quantityBoxes,
        quantitySachets: 0,
        totalAmount: 0, // No tiene valor monetario
        notes: `Devolución de préstamo - ${formData.notes}`,
        listPrice: 0
      });

      if (transactionError) {
        console.warn('Préstamo devuelto pero error registrando transacción:', transactionError);
      }

      // Actualizar lista de transacciones en el padre
      if (transactionData) {
        onAdd([transactionData]);
      }

      // Limpiar formulario
      setFormData({
        productName: '',
        quantityBoxes: '',
        notes: ''
      });

      // Recargar balances
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: newBalances } = await getLoanBalances(user.id);
        if (newBalances) {
          setLoanBalances(newBalances);
        }
      }

      // Toast de éxito
      toast({
        title: "Préstamo Devuelto",
        description: `Se registraron ${quantityBoxes} cajas devueltas de "${formData.productName}". Restante: ${repaymentData.remainingBoxes} cajas.`,
        className: "bg-green-900 border-green-600 text-white"
      });

    } catch (error) {
      console.error('Error devolviendo préstamo:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar la devolución. Intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-gray-900/40 border border-white/5 rounded-2xl p-6 h-full"
    >
      <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <PackageCheck className="w-5 h-5 text-orange-400" />
        Recibir Producto
      </h3>

      {Object.keys(loanBalances).length === 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200">
            <p className="font-semibold mb-1">No tienes préstamos activos</p>
            <p className="text-blue-300/80">
              Los préstamos se generan automáticamente cuando vendes más de tu inventario disponible.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
            Producto *
          </label>
          <ProductAutocomplete
            value={formData.productName}
            onChange={(value) => setFormData({...formData, productName: value})}
            onSelect={(productName) => setFormData({...formData, productName: productName})}
            products={productsWithLoans}
            prices={{}}
            placeholder="Selecciona un producto con préstamos"
            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all placeholder-gray-700"
            icon={Tag}
          />
        </div>

        {currentBalance && (
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-orange-300 font-semibold">Préstamo Actual</span>
              <span className="text-xl font-black text-orange-400">
                {currentBalance.totalBoxes} cajas
              </span>
            </div>
            {currentBalance.totalSachets > 0 && (
              <div className="text-xs text-orange-300/70">
                + {currentBalance.totalSachets} sobres
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
            Cantidad a Devolver *
          </label>
          <div className="relative group">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-orange-400 transition-colors" />
            <input
              type="number"
              min="1"
              max={currentBalance?.totalBoxes || 999}
              value={formData.quantityBoxes}
              onChange={(e) => setFormData({...formData, quantityBoxes: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all placeholder-gray-700"
              placeholder="Ej: 1"
              disabled={!currentBalance}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-gray-500 font-bold pl-1">
            Notas
          </label>
          <div className="relative group">
            <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-focus-within:text-orange-400 transition-colors" />
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/50 outline-none transition-all placeholder-gray-700 resize-none h-20"
              placeholder="Ej: Devuelto por compra nueva..."
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading || !currentBalance}
          className="w-full h-12 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-semibold shadow-lg shadow-orange-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <PackageCheck className="w-5 h-5 mr-2" />
          {loading ? 'Procesando...' : 'Recibir Producto'}
        </Button>
      </form>

      {/* Resumen de préstamos */}
      {Object.keys(loanBalances).length > 0 && (
        <div className="mt-6 pt-6 border-t border-white/5">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Resumen de Préstamos</h4>
          <div className="space-y-2">
            {Object.values(loanBalances).map((loan, index) => (
              <div key={index} className="flex justify-between items-center text-sm bg-black/20 rounded-lg p-2">
                <span className="text-gray-300">{loan.productName}</span>
                <span className="text-orange-400 font-semibold">
                  {loan.totalBoxes} cajas
                  {loan.totalSachets > 0 && ` + ${loan.totalSachets} sobres`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default LoanRepaymentModule;
