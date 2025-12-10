
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { LayoutDashboard, Receipt, Megaphone, ShoppingCart } from 'lucide-react';
import PurchaseModule from '@/components/PurchaseModule';
import AdModule from '@/components/AdModule';
import SalesModule from '@/components/SalesModuleWithCart';
import ExitModule from '@/components/ExitModule';
import BoxOpeningModule from '@/components/BoxOpeningModule';
import PriceManagement from '@/components/PriceManagement';
import KPIGrid from '@/components/KPIGrid';
import ChartsSection from '@/components/ChartsSection';
import DataTable from '@/components/DataTable';
import { Toaster } from '@/components/ui/toaster';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AuthModal from '@/components/AuthModal';
import UserProfile from '@/components/UserProfile';
import { getCurrentUser, onAuthStateChange, signOut, getTransactions, getPrices, addMultipleTransactions, deleteTransaction, updateTransactionsByProductName, deleteTransactionsByProductName, upsertPrice, deletePrice, getUserProfile, createUserProfile } from '@/lib/supabaseService';
import { getTransactionsV2 } from '@/lib/transactionServiceV2';
import { getUserProductsWithInventory } from '@/lib/productService';
import { useToast } from '@/components/ui/use-toast';

function App() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [inventoryMap, setInventoryMap] = useState({});
  const [prices, setPrices] = useState({});
  const [products, setProducts] = useState([]); // Productos V2 con PPP e inventario
  const [campaigns, setCampaigns] = useState([]);
  const [user, setUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const totalInventory = Object.values(inventoryMap).reduce((sum, qty) => sum + qty, 0);

  // Cargar datos del usuario autenticado
  const loadUserData = async (userId) => {
    try {
      setLoading(true);
      
      // Cargar transacciones V2 (con productos)
      const { data: transactionsDataV2, error: transactionsErrorV2 } = await getTransactionsV2(userId);
      if (transactionsErrorV2) {
        // Fallback a método antiguo si V2 falla
        const { data: transactionsData, error: transactionsError } = await getTransactions(userId);
        if (transactionsError) throw transactionsError;
        if (transactionsData) {
          setTransactions(transactionsData);
          recalculateInventory(transactionsData);
          extractCampaigns(transactionsData);
        }
      } else {
        if (transactionsDataV2) {
          setTransactions(transactionsDataV2);
          recalculateInventory(transactionsDataV2);
          extractCampaigns(transactionsDataV2);
        }
      }

      // Cargar productos V2 (con PPP e inventario)
      const { data: productsData, error: productsError } = await getUserProductsWithInventory(userId);
      if (!productsError && productsData) {
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

      // Cargar precios (compatibilidad con sistema antiguo)
      const { data: pricesData, error: pricesError } = await getPrices(userId);
      if (!pricesError && pricesData) {
        setPrices(prev => ({ ...prev, ...pricesData }));
      }
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
      toast({
        title: "Error al cargar datos",
        description: "No se pudieron cargar tus datos. Por favor, recarga la página.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Verificar sesión al cargar
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { user: currentUser } = await getCurrentUser();
        
        // Si no hay usuario, simplemente mostrar el modal de autenticación
        if (!currentUser) {
          setAuthModalOpen(true);
          setLoading(false);
          return;
        }

        // Obtener perfil del usuario
        let { data: profileData } = await getUserProfile(currentUser.id);

        // Si no existe el perfil, crearlo
        if (!profileData) {
          const { data: newProfile } = await createUserProfile(
            currentUser.id,
            currentUser.email?.split('@')[0] || 'Usuario',
            currentUser.email
          );
          profileData = newProfile;
        }

        const userData = {
          id: currentUser.id,
          email: currentUser.email,
          name: profileData?.name || currentUser.email?.split('@')[0] || 'Usuario',
          avatar: profileData?.avatar_url || null
        };

        setUser(userData);
        await loadUserData(currentUser.id);
      } catch (error) {
        // Solo mostrar error si es algo inesperado
        console.error('Error inesperado verificando sesión:', error);
        setAuthModalOpen(true);
        setLoading(false);
      }
    };

    checkSession();

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setTransactions([]);
        setPrices({});
        setInventoryMap({});
        setCampaigns([]);
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
      subscription.unsubscribe();
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
      const key = t.productName || 'Sin Etiqueta';
      if (!map[key]) map[key] = 0;

      if (t.type === 'compra') {
        const freeUnits = Math.floor(t.quantity / 4);
        map[key] += (t.quantity + freeUnits);
      } else if (t.type === 'venta') {
        map[key] -= t.quantity;
      }
    });
    setInventoryMap(map);
  };

  const extractCampaigns = (txns) => {
    const uniqueCampaigns = [...new Set(
      txns.filter(t => t.type === 'publicidad' || (t.type === 'venta' && t.campaignName))
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
      // Solo actualizar estado local
      if (list.length > 0 && list[0].productId) {
        const updatedTransactions = [...transactions, ...list];
        setTransactions(updatedTransactions);
        recalculateInventory(updatedTransactions);
        extractCampaigns(updatedTransactions);
        
        // Recargar productos para actualizar inventario
        const { data: productsData } = await getUserProductsWithInventory(user.id);
        if (productsData) setProducts(productsData);
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
        
        {user && (
            <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
            
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
                <KPIGrid transactions={transactions} inventory={totalInventory} inventoryMap={inventoryMap} prices={prices} products={products} />
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
                    <TabsTrigger value="precios" className="rounded-lg data-[state=active]:bg-yellow-600 data-[state=active]:text-black data-[state=active]:font-bold text-gray-400 px-6 py-2 transition-all">
                        Precios
                    </TabsTrigger>
                    </TabsList>
                </div>

                <div className="p-6 md:p-8 bg-gradient-to-b from-gray-900/0 to-gray-900/20">
                    <TabsContent value="compras" className="mt-0 focus-visible:outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-1">
                            <PurchaseModule 
                              onAdd={handleAddTransaction} 
                              prices={prices} 
                              products={Array.from(new Set(transactions.map(t => t.productName).filter(Boolean)))}
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
      </div>
    </>
  );
}

export default App;
