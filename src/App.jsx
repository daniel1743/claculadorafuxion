
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { LayoutDashboard, Receipt, Megaphone, ShoppingCart, HandCoins } from 'lucide-react';
import PurchaseModule from '@/components/PurchaseModule';
import ShoppingCartModule from '@/components/ShoppingCartModule';
import AdModule from '@/components/AdModule';
import SalesModule from '@/components/SalesModuleWithCart';
import ExitModule from '@/components/ExitModule';
import BoxOpeningModule from '@/components/BoxOpeningModule';
import LoanModule from '@/components/LoanModule';
import LoanRepaymentModule from '@/components/LoanRepaymentModule';
import PriceManagement from '@/components/PriceManagement';
import KPIGrid from '@/components/KPIGrid';
import ChartsSection from '@/components/ChartsSection';
import DataTable from '@/components/DataTable';
import { Toaster } from '@/components/ui/toaster';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AuthModal from '@/components/AuthModal';
import UserProfile from '@/components/UserProfile';
import { signOut, getTransactions, getPrices, addMultipleTransactions, deleteTransaction, updateTransactionsByProductName, deleteTransactionsByProductName, upsertPrice, deletePrice } from '@/lib/supabaseService';
import { getTransactionsV2 } from '@/lib/transactionServiceV2';
import { getUserProductsWithInventory } from '@/lib/productService';
import { getUserLoans } from '@/lib/loanService';
import { useToast } from '@/components/ui/use-toast';
import ErrorDebugger from '@/components/ErrorDebugger';

function App() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [inventoryMap, setInventoryMap] = useState({});
  const [prices, setPrices] = useState({});
  const [products, setProducts] = useState([]); // Productos V2 con PPP e inventario
  const [campaigns, setCampaigns] = useState([]);
  const [loans, setLoans] = useState([]); // Préstamos activos
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const totalInventory = Object.values(inventoryMap).reduce((sum, qty) => sum + qty, 0);

  // Cargar datos del usuario autenticado
  const loadUserData = async (userId) => {
    // Timeout de seguridad para toda la función - reducido a 20 segundos
    const timeoutId = setTimeout(() => {
      console.error('[App] ⏱️ TIMEOUT GLOBAL: loadUserData tardó más de 20 segundos');
      console.error('[App] Forzando carga para evitar pantalla negra infinita');
      setLoading(false);
      toast({
        title: "⚠️ Carga Incompleta",
        description: "Algunos datos no pudieron cargarse. La app puede tener datos limitados.",
        variant: "destructive"
      });
    }, 20000);

    try {
      console.log('[App] loadUserData iniciado para userId:', userId);
      setLoading(true);

      // Cargar transacciones V2 (con productos) con timeout reducido
      console.log('[App] Cargando transacciones V2...');
      const transactionsPromise = getTransactionsV2(userId);
      const transactionsTimeout = new Promise((_, reject) =>
        setTimeout(() => {
          console.warn('[App] ⏱️ Timeout alcanzado en transacciones (8s)');
          reject(new Error('Timeout transacciones'));
        }, 8000)
      );

      let transactionsDataV2, transactionsErrorV2;
      try {
        const result = await Promise.race([transactionsPromise, transactionsTimeout]);
        console.log('[App] ✅ Transacciones V2 respondieron:', result);
        transactionsDataV2 = result.data;
        transactionsErrorV2 = result.error;
      } catch (timeoutError) {
        console.warn('[App] ⚠️ Timeout/Error en transacciones V2, continuando sin ellas:', timeoutError.message);
        transactionsErrorV2 = timeoutError;
        transactionsDataV2 = [];
      }
      console.log('[App] Transacciones V2:', { data: transactionsDataV2, error: transactionsErrorV2 });
      
      if (transactionsErrorV2) {
        console.warn('[App] Error en V2, usando fallback antiguo:', transactionsErrorV2);
        // Fallback a método antiguo si V2 falla
        const { data: transactionsData, error: transactionsError } = await getTransactions(userId);
        if (transactionsError) throw transactionsError;
        if (transactionsData) {
          console.log('[App] Transacciones antiguas cargadas:', transactionsData.length);
          setTransactions(transactionsData);
          recalculateInventory(transactionsData);
          extractCampaigns(transactionsData);
        }
      } else {
        if (transactionsDataV2) {
          console.log('[App] Transacciones V2 cargadas:', transactionsDataV2.length);
          setTransactions(transactionsDataV2);
          recalculateInventory(transactionsDataV2);
          extractCampaigns(transactionsDataV2);
        } else {
          console.log('[App] No hay transacciones V2');
        }
      }

      // Cargar productos V2 (con PPP e inventario)
      console.log('[App] Cargando productos V2...');
      const { data: productsData, error: productsError } = await getUserProductsWithInventory(userId);
      console.log('[App] Productos V2:', { data: productsData, error: productsError });
      
      if (!productsError && productsData) {
        console.log('[App] Productos V2 cargados:', productsData.length);
        setProducts(productsData);
        // Actualizar precios desde productos
        const pricesFromProducts = {};
        productsData.forEach(p => {
          if (p.listPrice > 0) {
            pricesFromProducts[p.name] = p.listPrice;
          }
        });
        console.log('[App] Precios desde productos:', pricesFromProducts);
        setPrices(prev => ({ ...prev, ...pricesFromProducts }));
      } else {
        console.warn('[App] Error o sin productos:', productsError);
      }

      // Cargar precios (compatibilidad con sistema antiguo)
      console.log('[App] Cargando precios antiguos...');
      const { data: pricesData, error: pricesError } = await getPrices(userId);
      console.log('[App] Precios antiguos:', { data: pricesData, error: pricesError });

      if (!pricesError && pricesData) {
        console.log('[App] Precios antiguos cargados:', Object.keys(pricesData).length);
        setPrices(prev => ({ ...prev, ...pricesData }));
      }

      // Cargar préstamos
      console.log('[App] Cargando préstamos...');
      const { data: loansData, error: loansError } = await getUserLoans(userId);
      console.log('[App] Préstamos:', { data: loansData, error: loansError });

      if (!loansError && loansData) {
        console.log('[App] Préstamos cargados:', loansData.length);
        setLoans(loansData);
      }

      console.log('[App] loadUserData completado exitosamente');
    } catch (error) {
      console.error('[App] ERROR en loadUserData:', error);
      console.error('[App] Stack trace:', error.stack);
      toast({
        title: "Error al cargar datos",
        description: "No se pudieron cargar tus datos. Por favor, recarga la página.",
        variant: "destructive"
      });
    } finally {
      clearTimeout(timeoutId); // Limpiar timeout de seguridad
      console.log('[App] loadUserData finalizado, setLoading(false)');
      setLoading(false);
    }
  };

  // Verificar sesión al cargar - SIMPLIFICADO
  useEffect(() => {
    console.log('[App] 🚀 Iniciando app...');

    const init = async () => {
      try {
        const { supabase } = await import('@/lib/supabase');

        // Intentar obtener sesión actual
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          console.log('[App] Sin sesión - mostrando login');
          setAuthModalOpen(true);
          setLoading(false);
          return;
        }

        // Sesión válida - preparar usuario
        console.log('[App] ✅ Sesión encontrada:', session.user.email);

        const userData = {
          id: session.user.id,
          email: session.user.email,
          name: session.user.email.split('@')[0],
          avatar: null
        };

        setUser(userData);

        // Cargar datos del usuario (sin bloquear)
        console.log('[App] 📦 Cargando datos...');
        await loadUserData(session.user.id);

        console.log('[App] ✅ Carga completada');
      } catch (error) {
        console.error('[App] Error en init:', error);
        setAuthModalOpen(true);
        setLoading(false);
      }
    };

    init();

    // Cleanup vacío - no necesitamos listeners
    return () => {
      console.log('[App] Cleanup useEffect');
    };
  }, []);

  // Recargar productos cuando cambian las transacciones
  useEffect(() => {
    if (user) {
      const reloadProducts = async () => {
        const { data } = await getUserProductsWithInventory(user.id);
        if (data) setProducts(data);
      };
      reloadProducts();
    }
  }, [transactions.length, user]);

  const recalculateInventory = (txns) => {
    const map = {};
    txns.forEach(t => {
      const key = t.productName || t.productName || 'Sin Etiqueta';
      if (!map[key]) map[key] = 0;

      // Manejar tipos antiguos y nuevos
      const isPurchase = t.type === 'compra' || t.type === 'purchase';
      const isSale = t.type === 'venta' || t.type === 'sale';
      const isPersonalConsumption = t.type === 'personal_consumption';
      const isMarketingSample = t.type === 'marketing_sample';
      const isBoxOpening = t.type === 'box_opening';
      const isLoan = t.type === 'loan';

      if (isPurchase) {
        // Para compras antiguas, calcular gratis (4x1)
        if (t.type === 'compra') {
          const freeUnits = Math.floor((t.quantity || 0) / 4);
          map[key] += ((t.quantity || 0) + freeUnits);
        } else {
          // Para compras nuevas (V2), usar quantity_boxes
          map[key] += (t.quantityBoxes || t.quantity || 0);
        }
      } else if (isSale) {
        // Descontar, pero nunca permitir inventario negativo
        const quantity = t.quantityBoxes || t.quantity || 0;
        map[key] = Math.max(0, map[key] - quantity);
      } else if (isPersonalConsumption || isMarketingSample) {
        // Descontar de inventario, pero nunca permitir negativo
        const boxes = t.quantityBoxes || 0;
        map[key] = Math.max(0, map[key] - boxes);
      } else if (isLoan) {
        // Descontar préstamos de inventario
        const boxes = t.quantityBoxes || 0;
        map[key] = Math.max(0, map[key] - boxes);
      } else if (isBoxOpening) {
        // Abrir caja no cambia el inventario total (solo convierte)
        // Pero para el mapa simple, no afecta
      }
    });
    setInventoryMap(map);
  };

  const extractCampaigns = (txns) => {
    const uniqueCampaigns = [...new Set(
      txns.filter(t => {
        const isAd = t.type === 'publicidad';
        const isSale = t.type === 'venta' || t.type === 'sale';
        return isAd || (isSale && t.campaignName);
      })
          .map(t => t.campaignName)
          .filter(Boolean)
    )];
    setCampaigns(uniqueCampaigns);
  };

  const handleAddTransaction = async (newTxns) => {
    if (!user) return;

    const list = Array.isArray(newTxns) ? newTxns : [newTxns];
    
    try {
      // Si las transacciones vienen del nuevo sistema (tienen productId), ya están guardadas
      // Recargar TODO desde la BD para asegurar datos actualizados
      if (list.length > 0 && list[0].productId) {
        // Recargar transacciones desde la BD
        const { data: transactionsDataV2, error: transactionsErrorV2 } = await getTransactionsV2(user.id);
        if (!transactionsErrorV2 && transactionsDataV2) {
          setTransactions(transactionsDataV2);
          recalculateInventory(transactionsDataV2);
          extractCampaigns(transactionsDataV2);
        }
        
        // Recargar productos para actualizar inventario y PPP
        const { data: productsData } = await getUserProductsWithInventory(user.id);
        if (productsData) {
          setProducts(productsData);
          // Actualizar precios desde productos
          const pricesFromProducts = {};
          productsData.forEach(p => {
            if (p.listPrice > 0) {
              pricesFromProducts[p.name] = p.listPrice;
            }
          });
          setPrices(prev => ({ ...prev, ...pricesFromProducts }));
        }
      } else {
        // Fallback: usar método antiguo para compatibilidad
        const timestamp = Date.now();
        const processed = list.map((t, i) => ({
          ...t,
          id: t.id || `${timestamp}-${i}-${Math.random().toString(36).substr(2, 9)}`
        }));

        const { data: addedTransactions, error } = await addMultipleTransactions(processed);
        
        if (error) throw error;

        if (addedTransactions) {
          const updatedTransactions = [...transactions, ...addedTransactions];
          setTransactions(updatedTransactions);
          recalculateInventory(updatedTransactions);
          extractCampaigns(updatedTransactions);
        }
      }
    } catch (error) {
      console.error('Error agregando transacción:', error);
      toast({
        title: "Error",
        description: "No se pudo agregar la transacción. Por favor, intenta de nuevo.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!user) return;

    try {
      const { error } = await deleteTransaction(id);
      
      if (error) throw error;

      const newTransactions = transactions.filter(t => t.id !== id);
      setTransactions(newTransactions);
      recalculateInventory(newTransactions);
      extractCampaigns(newTransactions);
    } catch (error) {
      console.error('Error eliminando transacción:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la transacción. Por favor, intenta de nuevo.",
        variant: "destructive"
      });
    }
  };

  const handleUpdatePrice = async (product, price) => {
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    try {
      const { error } = await upsertPrice(product, price);
      
      if (error) {
        console.error('Error de Supabase al guardar precio:', error);
        throw new Error(error.message || 'Error al guardar en la base de datos');
      }

      // Actualizar estado local
      const newPrices = { ...prices, [product]: price };
      setPrices(newPrices);

      // Recargar precios desde BD para asegurar consistencia
      const { data: pricesData, error: reloadError } = await getPrices(user.id);
      if (!reloadError && pricesData) {
        setPrices(pricesData);
      }
    } catch (error) {
      console.error('Error actualizando precio:', error);
      throw error; // Re-lanzar para que el componente pueda manejarlo
    }
  };

  const handleDeleteProduct = async (productName) => {
    if (!user) return;

    try {
      // 1. Eliminar todas las transacciones del producto en la BD
      const { error: deleteTxError } = await deleteTransactionsByProductName(productName);
      if (deleteTxError) throw deleteTxError;

      // 2. Eliminar precio
      const { error: priceError } = await deletePrice(productName);
      if (priceError) throw priceError;

      // 3. Actualizar estado local
      const newTransactions = transactions.filter(t => t.productName !== productName);
      const newPrices = { ...prices };
      delete newPrices[productName];
      
      setTransactions(newTransactions);
      setPrices(newPrices);
      
      // 4. Recalcular
      recalculateInventory(newTransactions);
      extractCampaigns(newTransactions);

      toast({
        title: "Producto Eliminado",
        description: `"${productName}" y todas sus transacciones han sido eliminados permanentemente.`,
        className: "bg-red-900 border-red-600 text-white"
      });
    } catch (error) {
      console.error('Error eliminando producto:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto. Por favor, intenta de nuevo.",
        variant: "destructive"
      });
    }
  };

  const handleRenameProduct = async (oldName, newName, newPrice) => {
    if (!user) return;

    try {
      // 1. Actualizar todas las transacciones en la BD con el nuevo nombre
      if (oldName !== newName) {
        const { data: updatedTransactions, error: updateTxError } = await updateTransactionsByProductName(oldName, newName);
        if (updateTxError) throw updateTxError;

        // 2. Eliminar precio viejo
        const { error: deleteError } = await deletePrice(oldName);
        if (deleteError) throw deleteError;
      }

      // 3. Crear/actualizar nuevo precio
      const { error: upsertError } = await upsertPrice(newName, newPrice);
      if (upsertError) throw upsertError;

      // 4. Actualizar estado local con datos actualizados
      const newTransactions = transactions.map(t => {
        if (t.productName === oldName) {
          return { ...t, productName: newName };
        }
        return t;
      });

      const newPrices = { ...prices };
      if (oldName !== newName) {
        delete newPrices[oldName];
      }
      newPrices[newName] = newPrice;
      
      setTransactions(newTransactions);
      setPrices(newPrices);

      // 5. Recalcular
      recalculateInventory(newTransactions);
      extractCampaigns(newTransactions);

      toast({
        title: "Producto Actualizado",
        description: `"${oldName}" ha sido renombrado a "${newName}" en todas las transacciones.`,
        className: "bg-green-900 border-green-600 text-white"
      });
    } catch (error) {
      console.error('Error renombrando producto:', error);
      toast({
        title: "Error",
        description: "No se pudo renombrar el producto. Por favor, intenta de nuevo.",
        variant: "destructive"
      });
    }
  };

  const handleLogin = async (userData) => {
    setUser(userData);
    setAuthModalOpen(false);
    await loadUserData(userData.id);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setUser(null);
      setTransactions([]);
      setPrices({});
      setInventoryMap({});
      setCampaigns([]);
      setLoans([]);
      setAuthModalOpen(true);
    } catch (error) {
      console.error('Error cerrando sesión:', error);
      toast({
        title: "Error",
        description: "No se pudo cerrar sesión correctamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Dashboard Financiero Premium</title>
        <meta name="description" content="Control total de Compras, Ventas, Publicidad y Ganancias." />
      </Helmet>
      
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white font-sans selection:bg-yellow-500/30">
        <Toaster />
        <AuthModal isOpen={authModalOpen && !user} onLogin={handleLogin} />

        {console.log('[App] Render - authModalOpen:', authModalOpen, 'user:', user, 'loading:', loading)}

        {loading && !user && (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Cargando...</p>
            </div>
          </div>
        )}

        {!loading && user && (
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
            {console.log('[App] Renderizando dashboard - user:', user?.id, 'transactions:', transactions?.length, 'products:', products?.length, 'prices:', Object.keys(prices || {}).length)}
            {console.log('[App] Renderizando dashboard - user:', user, 'transactions:', transactions.length, 'products:', products.length, 'loading:', loading)}
            
            {/* 1. Header Section */}
            <motion.header 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5"
            >
                <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-700 shadow-lg shadow-yellow-900/20">
                    <LayoutDashboard className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent tracking-tight">
                    Dashboard Financiero Premium
                    </h1>
                </div>
                <p className="text-gray-400 text-lg font-medium ml-1">
                    Control total de Compras, Ventas, Publicidad y Ganancias
                </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-gray-900/80 backdrop-blur border border-white/10 px-6 py-4 rounded-2xl shadow-2xl hidden md:block">
                        <span className="text-gray-500 text-xs font-bold uppercase tracking-widest block mb-1">Inventario Total</span>
                        <div className="text-3xl font-black text-yellow-400 tracking-tight tabular-nums">
                            {totalInventory} <span className="text-lg text-gray-500 font-medium">unid.</span>
                        </div>
                    </div>
                    
                    <UserProfile user={user} onLogout={handleLogout} onUpdateUser={setUser} />
                </div>
            </motion.header>

            {/* 2. KPI Cards Grid */}
            <section>
                <KPIGrid transactions={transactions} inventory={totalInventory} inventoryMap={inventoryMap} prices={prices} products={products} loans={loans} />
            </section>

            {/* 3. Charts Section */}
            <section>
                <ChartsSection transactions={transactions} />
            </section>

            {/* 4. Input Tabs Section */}
            <section className="bg-gray-900/40 border border-white/5 rounded-3xl p-1 backdrop-blur-sm shadow-2xl overflow-hidden">
                <Tabs defaultValue="ventas" className="w-full">
                <div className="px-6 py-4 bg-gray-900/60 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-yellow-500" />
                    Gestión de Operaciones
                    </h2>
                    <TabsList className="bg-black/40 p-1 rounded-xl border border-white/5 flex flex-wrap h-auto">
                    <TabsTrigger value="compras" className="rounded-lg data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-400 px-6 py-2 transition-all">
                        Compras
                    </TabsTrigger>
                    <TabsTrigger value="publicidad" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 px-6 py-2 transition-all">
                        Publicidad
                    </TabsTrigger>
                    <TabsTrigger value="ventas" className="rounded-lg data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-400 px-6 py-2 transition-all">
                        Ventas
                    </TabsTrigger>
                    <TabsTrigger value="salidas" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 px-6 py-2 transition-all">
                        Salidas
                    </TabsTrigger>
                    <TabsTrigger value="prestamos" className="rounded-lg data-[state=active]:bg-orange-600 data-[state=active]:text-white text-gray-400 px-6 py-2 transition-all">
                        Préstamos
                    </TabsTrigger>
                    <TabsTrigger value="precios" className="rounded-lg data-[state=active]:bg-yellow-600 data-[state=active]:text-black data-[state=active]:font-bold text-gray-400 px-6 py-2 transition-all">
                        Precios
                    </TabsTrigger>
                    </TabsList>
                </div>

                <div className="p-6 md:p-8 bg-gradient-to-b from-gray-900/0 to-gray-900/20">
                    <TabsContent value="compras" className="mt-0 focus-visible:outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1">
                            <ShoppingCartModule 
                              onAdd={handleAddTransaction} 
                              prices={prices} 
                              products={Array.from(new Set(transactions.map(t => t.productName || t.productName).filter(Boolean)))}
                            />
                        </div>
                        <div className="lg:col-span-2">
                            <DataTable typeFilter="compra" transactions={transactions} onDelete={handleDeleteTransaction} title="Historial de Compras" icon={ShoppingCart} color="red" />
                        </div>
                    </div>
                    </TabsContent>

                    <TabsContent value="publicidad" className="mt-0 focus-visible:outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1">
                            <AdModule onAdd={handleAddTransaction} />
                        </div>
                        <div className="lg:col-span-2">
                            <DataTable typeFilter="publicidad" transactions={transactions} onDelete={handleDeleteTransaction} title="Historial de Publicidad" icon={Megaphone} color="blue" />
                        </div>
                    </div>
                    </TabsContent>

                    <TabsContent value="ventas" className="mt-0 focus-visible:outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1">
                            <SalesModule 
                              onAdd={handleAddTransaction} 
                              inventoryMap={inventoryMap} 
                              campaigns={campaigns} 
                              prices={prices}
                              products={Array.from(new Set(transactions.map(t => t.productName || t.productName).filter(Boolean)))}
                            />
                        </div>
                        <div className="lg:col-span-2">
                            <DataTable typeFilter="venta" transactions={transactions} onDelete={handleDeleteTransaction} title="Historial de Ventas" icon={Receipt} color="green" />
                        </div>
                    </div>
                    </TabsContent>

                    <TabsContent value="salidas" className="mt-0 focus-visible:outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1">
                            <ExitModule
                              onAdd={handleAddTransaction}
                              campaigns={campaigns}
                              prices={prices}
                              products={Array.from(new Set(transactions.map(t => t.productName || t.productName).filter(Boolean)))}
                            />
                        </div>
                        <div className="lg:col-span-2">
                            <DataTable typeFilter="sale" transactions={transactions} onDelete={handleDeleteTransaction} title="Historial de Salidas" icon={Receipt} color="blue" />
                        </div>
                    </div>
                    </TabsContent>

                    <TabsContent value="prestamos" className="mt-0 focus-visible:outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <div>
                            <LoanModule
                              onAdd={handleAddTransaction}
                              prices={prices}
                              products={Array.from(new Set(transactions.map(t => t.productName || t.productName).filter(Boolean)))}
                              inventoryMap={inventoryMap}
                            />
                        </div>
                        <div>
                            <LoanRepaymentModule
                              onAdd={handleAddTransaction}
                              loans={loans}
                              products={products}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-8">
                        <DataTable
                          typeFilter="loan"
                          transactions={transactions}
                          onDelete={handleDeleteTransaction}
                          title="Historial de Préstamos Registrados"
                          icon={HandCoins}
                          color="purple"
                        />
                    </div>
                    </TabsContent>

                    <TabsContent value="precios" className="mt-0 focus-visible:outline-none">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2">
                                <PriceManagement 
                                    transactions={transactions} 
                                    prices={prices} 
                                    onUpdatePrice={handleUpdatePrice} 
                                    onDeleteProduct={handleDeleteProduct}
                                    onRenameProduct={handleRenameProduct}
                                />
                            </div>
                            <div className="lg:col-span-1">
                                <BoxOpeningModule 
                                    onAdd={handleAddTransaction}
                                    products={Array.from(new Set(transactions.map(t => t.productName || t.productName).filter(Boolean)))}
                                />
                            </div>
                        </div>
                    </TabsContent>
                </div>
                </Tabs>
            </section>

            </div>
        )}

        {/* Error Debugger - Siempre activo para detectar problemas */}
        <ErrorDebugger enabled={true} />
      </div>
    </>
  );
}

export default App;
