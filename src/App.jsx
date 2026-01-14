
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
import AdminPanel from '@/components/AdminPanel';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { getCurrentUser, onAuthStateChange, signOut, getTransactions, getPrices, addMultipleTransactions, deleteTransaction, updateTransactionsByProductName, deleteTransactionsByProductName, upsertPrice, deletePrice, getUserProfile, createUserProfile } from '@/lib/supabaseService';
import { getTransactionsV2 } from '@/lib/transactionServiceV2';
import { getUserProductsWithInventory } from '@/lib/productService';
import { getUserLoans } from '@/lib/loanService';
import { useToast } from '@/components/ui/use-toast';
import ErrorDebugger from '@/components/ErrorDebugger';
import HistoryCard from '@/components/HistoryCard';
import CyclesHistoryView from '@/components/CyclesHistoryView';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import { TooltipProvider as TooltipContextProvider } from '@/contexts/TooltipContext';
import { TooltipProvider as RadixTooltipProvider } from '@/components/ui/tooltip';

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
  const [showCyclesHistory, setShowCyclesHistory] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [cycleRefreshTrigger, setCycleRefreshTrigger] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // Verificar si el usuario es admin (RE-ACTIVADO después de optimizar RLS)
  const { isAdmin, isLoading: isLoadingAdmin } = useIsAdmin(user);

  const totalInventory = Object.values(inventoryMap).reduce((sum, qty) => sum + qty, 0);

  // Cargar datos del usuario autenticado - SIMPLIFICADO
  const loadUserData = async (userId) => {
    try {
      setLoading(true);

      // Cargar en PARALELO sin timeouts complicados
      const [transactionsResult, productsResult, pricesResult, loansResult] = await Promise.allSettled([
        getTransactionsV2(userId),
        getUserProductsWithInventory(userId),
        getPrices(userId),
        getUserLoans(userId)
      ]);

      // Procesar transacciones
      if (transactionsResult.status === 'fulfilled' && transactionsResult.value?.data) {
        console.log('[App] Transacciones cargadas:', transactionsResult.value.data.length);
        setTransactions(transactionsResult.value.data);
        recalculateInventory(transactionsResult.value.data);
        extractCampaigns(transactionsResult.value.data);
      } else {
        console.warn('[App] No se cargaron transacciones');
        setTransactions([]);
      }

      // Procesar productos
      if (productsResult.status === 'fulfilled' && productsResult.value?.data) {
        console.log('[App] Productos cargados:', productsResult.value.data.length);
        setProducts(productsResult.value.data);

        // Actualizar precios desde productos
        const pricesFromProducts = {};
        productsResult.value.data.forEach(p => {
          if (p.listPrice > 0) {
            pricesFromProducts[p.name] = p.listPrice;
          }
        });
        setPrices(prev => ({ ...prev, ...pricesFromProducts }));
      } else {
        console.warn('[App] No se cargaron productos');
        setProducts([]);
      }

      // Procesar precios
      if (pricesResult.status === 'fulfilled' && pricesResult.value?.data) {
        console.log('[App] Precios cargados:', Object.keys(pricesResult.value.data).length);
        setPrices(prev => ({ ...prev, ...pricesResult.value.data }));
      }

      // Procesar préstamos
      if (loansResult.status === 'fulfilled' && loansResult.value?.data) {
        console.log('[App] Préstamos cargados:', loansResult.value.data.length);
        setLoans(loansResult.value.data);
      } else {
        console.warn('[App] No se cargaron préstamos');
        setLoans([]);
      }

      console.log('[App] ✅ loadUserData completado exitosamente');
    } catch (error) {
      console.error('[App] ❌ ERROR en loadUserData:', error);
      console.error('[App] Stack trace:', error.stack);

      // Si es timeout global, mostrar datos parciales en lugar de error total
      if (error.message?.includes('Timeout global')) {
        console.warn('[App] ⚠️ Timeout global alcanzado, mostrando datos parciales');
        toast({
          title: "⚠️ Carga lenta",
          description: "Algunos datos tardaron en cargar. La app funciona con datos parciales.",
          className: "bg-yellow-900 border-yellow-600 text-white"
        });
      } else {
        toast({
          title: "Error al cargar datos",
          description: error.message || "No se pudieron cargar tus datos completamente.",
          variant: "destructive"
        });
      }

      // IMPORTANTE: Continuar con datos vacíos en lugar de quedarse colgado
      console.log('[App] 🔄 Continuando con datos vacíos/parciales');
    } finally {
      console.log('[App] 🏁 loadUserData finalizado, setLoading(false)');
      setLoading(false);
    }
  };

  // Verificar sesión al cargar - CON TIMEOUT DE SEGURIDAD
  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const checkSession = async () => {
      console.log('[App] 🔍 Iniciando checkSession...');

      try {
        // Timeout de seguridad: si tarda más de 10s, mostrar login
        timeoutId = setTimeout(() => {
          console.error('[App] ⏱️ TIMEOUT: checkSession tardó más de 10s');
          if (isMounted) {
            setAuthModalOpen(true);
            setLoading(false);
          }
        }, 10000);

        console.log('[App] 📦 Importando Supabase...');
        const { supabase } = await import('@/lib/supabase');

        if (!supabase) {
          console.error('[App] ❌ Supabase no disponible');
          clearTimeout(timeoutId);
          setAuthModalOpen(true);
          setLoading(false);
          return;
        }

        console.log('[App] 🔑 Obteniendo sesión...');

        // Timeout específico para getSession (3 segundos máximo)
        const getSessionPromise = supabase.auth.getSession();
        const sessionTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('getSession timeout')), 3000)
        );

        let sessionResult;
        try {
          sessionResult = await Promise.race([getSessionPromise, sessionTimeout]);
        } catch (timeoutError) {
          console.error('[App] ❌ TIMEOUT en getSession (>3s)');
          console.log('[App] 🧹 Limpiando localStorage...');

          // Limpiar localStorage corrupto
          Object.keys(localStorage).forEach(key => {
            if (key.includes('supabase')) {
              localStorage.removeItem(key);
            }
          });

          clearTimeout(timeoutId);
          setAuthModalOpen(true);
          setLoading(false);
          return;
        }

        const { data: { session } } = sessionResult;
        console.log('[App] 📊 Sesión obtenida:', !!session);

        if (!isMounted) {
          console.log('[App] ⚠️ Componente desmontado');
          clearTimeout(timeoutId);
          return;
        }

        // Si no hay sesión, mostrar login
        if (!session) {
          console.log('[App] 🔓 Sin sesión, mostrando login');
          clearTimeout(timeoutId);
          setAuthModalOpen(true);
          setLoading(false);
          return;
        }

        // Hay sesión válida, cargar usuario
        const currentUser = session.user;
        console.log('[App] 👤 Usuario en sesión:', currentUser.email);

        // Obtener perfil con timeout
        console.log('[App] 📝 Obteniendo perfil...');
        const profilePromise = getUserProfile(currentUser.id);
        const profileTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout perfil')), 5000)
        );

        let profileData = null;
        try {
          const result = await Promise.race([profilePromise, profileTimeout]);
          profileData = result.data;
          console.log('[App] ✅ Perfil obtenido:', profileData?.name);
        } catch (err) {
          console.warn('[App] ⚠️ Timeout en perfil, continuando sin él');
        }

        const userData = {
          id: currentUser.id,
          email: currentUser.email,
          name: profileData?.name || currentUser.email?.split('@')[0] || 'Usuario',
          avatar: profileData?.avatar_url || null
        };

        if (isMounted) {
          console.log('[App] 💾 Estableciendo usuario...');
          setUser(userData);

          console.log('[App] 📦 Cargando datos...');
          await loadUserData(currentUser.id);

          console.log('[App] ✅ CheckSession completado');
          clearTimeout(timeoutId);
        }
      } catch (error) {
        console.error('[App] ❌ Error en checkSession:', error);
        clearTimeout(timeoutId);
        if (isMounted) {
          setAuthModalOpen(true);
          setLoading(false);
        }
      }
    };

    checkSession();

    // Escuchar cambios en la autenticación (ANTES del return)
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setTransactions([]);
        setPrices({});
        setInventoryMap({});
        setCampaigns([]);
        setLoans([]);
        setAuthModalOpen(true);
      } else if (event === 'SIGNED_IN' && session.user) {
        let { data: profileData } = await getUserProfile(session.user.id);

        // Si no existe el perfil, crearlo
        if (!profileData) {
          const { data: newProfile } = await createUserProfile(
            session.user.id,
            session.user.email?.split('@')[0] || 'Usuario',
            session.user.email
          );
          profileData = newProfile;
        }

        const userData = {
          id: session.user.id,
          email: session.user.email,
          name: profileData?.name || session.user.email?.split('@')[0] || 'Usuario',
          avatar: profileData?.avatar_url || null
        };

        setUser(userData);
        await loadUserData(session.user.id);
      }
    });

    return () => {
      console.log('[App] Cleanup useEffect - desmontando');
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []); // Dependencias vacías para que solo se ejecute una vez

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

  const handleCycleClosed = (cycle) => {
    if (user) {
      loadUserData(user.id);
    }

    setCycleRefreshTrigger(prev => prev + 1);

    toast({
      title: "🎉 Ciclo Cerrado",
      description: `"${cycle.cycle_name}" guardado. Comienza nuevo ciclo.`,
      className: "bg-green-900 border-green-600 text-white"
    });
  };

  return (
    <TooltipContextProvider>
      <RadixTooltipProvider delayDuration={200}>
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
                    
                    <UserProfile
                      user={user}
                      onLogout={handleLogout}
                      onUpdateUser={setUser}
                      isAdmin={isAdmin}
                      onOpenAdminPanel={() => setShowAdminPanel(true)}
                      onCycleClosed={handleCycleClosed}
                    />
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

            {/* 4. Historial de Ciclos */}
            <section>
                <HistoryCard
                    userId={user.id}
                    onViewAll={() => setShowCyclesHistory(true)}
                    refreshTrigger={cycleRefreshTrigger}
                />
            </section>

            {/* 5. Input Tabs Section */}
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

        {/* Modales de Ciclos */}
        {showCyclesHistory && (
          <CyclesHistoryView
            userId={user.id}
            isOpen={showCyclesHistory}
            onClose={() => setShowCyclesHistory(false)}
            onViewAnalytics={() => {
              setShowCyclesHistory(false);
              setShowAnalytics(true);
            }}
          />
        )}

        {showAnalytics && (
          <AnalyticsDashboard
            userId={user.id}
            isOpen={showAnalytics}
            onClose={() => setShowAnalytics(false)}
          />
        )}

        {/* Panel de Administración */}
        {showAdminPanel && isAdmin && (
          <AdminPanel
            currentUser={user}
            onClose={() => setShowAdminPanel(false)}
          />
        )}
          </div>
        </>
      </RadixTooltipProvider>
    </TooltipContextProvider>
  );
}

export default App;
