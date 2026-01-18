
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { LayoutDashboard, Receipt, Megaphone, ShoppingCart, HandCoins, Shield, Users, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PurchaseModule from '@/components/PurchaseModule';
import ShoppingCartModule from '@/components/ShoppingCartModule';
import AdModule from '@/components/AdModule';
import SalesModule from '@/components/SalesModuleWithCart';
import ExitModule from '@/components/ExitModule';
import BoxOpeningModule from '@/components/BoxOpeningModule';
import LoanModule from '@/components/LoanModule';
import LoanRepaymentModule from '@/components/LoanRepaymentModule';
import BorrowingModule from '@/components/BorrowingModule';
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
import { supabase } from '@/lib/supabase';
import { getTransactionsV2 } from '@/lib/transactionServiceV2';
import { getUserProductsWithInventory } from '@/lib/productService';
import { getUserLoans } from '@/lib/loanService';
import { useToast } from '@/components/ui/use-toast';
import ErrorDebugger from '@/components/ErrorDebugger';
import HistoryCard from '@/components/HistoryCard';
import CustomerManagement from '@/components/CustomerManagement';
import RemindersCard from '@/components/RemindersCard';
import FuxionPaymentsModule from '@/components/FuxionPaymentsModule';
import EstadoDelNegocioModal from '@/components/EstadoDelNegocioModal';
import HelpBotModal from '@/components/HelpBotModal';
import HeroKpiCarousel from '@/components/HeroKpiCarousel';
import DailyQuote from '@/components/DailyQuote';
import NotificationBell from '@/components/NotificationBell';
import SuggestionForm from '@/components/SuggestionForm';
import { createWelcomeNotification } from '@/lib/notificationService';
import CyclesHistoryView from '@/components/CyclesHistoryView';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import SubscriptionBanner from '@/components/SubscriptionBanner';
import { TooltipProvider as TooltipContextProvider } from '@/contexts/TooltipContext';
import { TooltipProvider as RadixTooltipProvider } from '@/components/ui/tooltip';
import { getUserSubscription, checkSubscriptionStatus } from '@/lib/subscriptionService';
import { getTotalFuxionPayments } from '@/lib/fuxionPaymentsService';

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
  const [showEstadoNegocio, setShowEstadoNegocio] = useState(false);
  const [showHelpBot, setShowHelpBot] = useState(false);
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [cycleRefreshTrigger, setCycleRefreshTrigger] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [debugMinimized, setDebugMinimized] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [totalFuxionPayments, setTotalFuxionPayments] = useState(0);

  // Estados para personalización del perfil (localStorage)
  const [dashboardTitle, setDashboardTitle] = useState('Mi Dashboard FuXion');
  const [coverPhoto, setCoverPhoto] = useState(null);

  // Cargar perfil de localStorage al inicio
  useEffect(() => {
    const savedProfile = localStorage.getItem('fuxionUserProfile');
    if (savedProfile) {
      const profile = JSON.parse(savedProfile);
      setDashboardTitle(profile.dashboardTitle || 'Mi Dashboard FuXion');
      setCoverPhoto(profile.coverPhoto || null);
    }

    // Escuchar cambios del perfil
    const handleProfileUpdate = (e) => {
      const { dashboardTitle: newTitle, coverPhoto: newCover } = e.detail;
      if (newTitle) setDashboardTitle(newTitle);
      if (newCover !== undefined) setCoverPhoto(newCover);
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('profileUpdated', handleProfileUpdate);
  }, []);

  // Verificar si el usuario es admin (RE-ACTIVADO después de optimizar RLS)
  const { isAdmin, isLoading: isLoadingAdmin } = useIsAdmin(user);

  // DEBUG: Presiona F12 para ver info completa de admin
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'F12') {
        e.preventDefault();
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔍 DEBUG ADMIN - Presionaste F12');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('👤 Usuario actual:', user);
        console.log('📧 Email:', user?.email);
        console.log('🆔 User ID:', user?.id);
        console.log('🛡️ isAdmin:', isAdmin);
        console.log('⏳ isLoadingAdmin:', isLoadingAdmin);
        console.log('❓ ¿Debe mostrarse botón Admin?', isAdmin === true);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        alert(`
🔍 DEBUG ADMIN
━━━━━━━━━━━━━━━━━
Usuario: ${user?.email || 'NO LOGIN'}
User ID: ${user?.id || 'N/A'}
Es Admin: ${isAdmin ? '✅ SÍ' : '❌ NO'}
Loading: ${isLoadingAdmin ? '⏳ Cargando...' : '✅ Listo'}

¿Debe mostrarse botón?
${isAdmin ? '✅ SÍ - Debe estar visible' : '❌ NO - Usuario normal'}

Ver consola para más detalles (F12)
        `);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [user, isAdmin, isLoadingAdmin]);

  const totalInventory = (products && products.length > 0)
    ? products.reduce((sum, p) => sum + (parseInt(p.current_stock_boxes ?? p.currentStockBoxes ?? 0) || 0), 0)
    : Object.values(inventoryMap).reduce((sum, qty) => sum + qty, 0);

  // Cargar datos del usuario autenticado - SIMPLIFICADO
  const loadUserData = async (userId) => {
    try {
      setLoading(true);

      // Cargar en PARALELO sin timeouts complicados
      const [transactionsResult, productsResult, pricesResult, loansResult, subscriptionResult, fuxionPaymentsResult] = await Promise.allSettled([
        getTransactionsV2(userId),
        getUserProductsWithInventory(userId),
        getPrices(userId),
        getUserLoans(userId),
        getUserSubscription(userId),
        getTotalFuxionPayments(userId)
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
        // Actualizar inventario derivado de productos (fuente más confiable)
        const mapFromProducts = {};
        productsResult.value.data.forEach(p => {
          const stock = parseInt(p.current_stock_boxes ?? p.currentStockBoxes ?? 0) || 0;
          mapFromProducts[p.name] = stock;
        });
        setInventoryMap(mapFromProducts);

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

      // Procesar suscripción
      if (subscriptionResult.status === 'fulfilled' && subscriptionResult.value?.data) {
        console.log('[App] Suscripción cargada:', subscriptionResult.value.data);
        setSubscription(subscriptionResult.value.data);
        const status = checkSubscriptionStatus(subscriptionResult.value.data);
        setSubscriptionStatus(status);
        console.log('[App] Estado de suscripción:', status);
      } else {
        console.warn('[App] No se encontró suscripción');
        setSubscription(null);
        setSubscriptionStatus({ status: 'none', daysRemaining: 0, inGracePeriod: false });
      }

      // Procesar pagos FuXion
      if (fuxionPaymentsResult.status === 'fulfilled' && fuxionPaymentsResult.value?.data !== undefined) {
        console.log('[App] Pagos FuXion cargados:', fuxionPaymentsResult.value.data);
        setTotalFuxionPayments(fuxionPaymentsResult.value.data);
      } else {
        console.warn('[App] No se cargaron pagos FuXion');
        setTotalFuxionPayments(0);
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

  // Verificar si hay sesión guardada al inicio
  useEffect(() => {
    console.log('[App] 🚀 Iniciando app...');

    // Verificar si "Mantener sesión" está activo
    const rememberMe = localStorage.getItem('fuxionRememberMe');
    const savedUser = localStorage.getItem('fuxionSavedUser');

    if (rememberMe === 'true' && savedUser) {
      console.log('[App] 🔄 Restaurando sesión guardada...');
      try {
        const parsedUser = JSON.parse(savedUser);

        // Cargar perfil actualizado
        const savedProfile = localStorage.getItem('fuxionUserProfile');
        if (savedProfile) {
          const profile = JSON.parse(savedProfile);
          if (profile.name) parsedUser.name = profile.name;
          if (profile.avatar) parsedUser.avatar = profile.avatar;
        }

        setUser(parsedUser);
        setAuthModalOpen(false);
        loadUserData(parsedUser.id);
      } catch (error) {
        console.error('[App] Error restaurando sesión:', error);
        setAuthModalOpen(true);
      }
    } else {
      console.log('[App] No hay sesión guardada - Mostrando login');
      setAuthModalOpen(true);
    }

    setLoading(false);

    // Escuchar cambios en la autenticación (solo SIGNED_OUT)
    const { data: { subscription } } = onAuthStateChange(async (event, session) => {
      console.log('[App] 🔔 Auth event:', event);

      if (event === 'SIGNED_OUT' || !session) {
        console.log('[App] 🚪 Cerrando sesión...');
        setUser(null);
        setTransactions([]);
        setPrices({});
        setInventoryMap({});
        setCampaigns([]);
        setLoans([]);
        // Limpiar datos de "recordar sesión"
        localStorage.removeItem('fuxionRememberMe');
        localStorage.removeItem('fuxionSavedUser');
        setAuthModalOpen(true);
      }
      // NO manejar SIGNED_IN aquí - lo maneja handleLogin directamente
    });

    return () => {
      console.log('[App] Cleanup useEffect - desmontando');
      subscription.unsubscribe();
    };
  }, []); // Dependencias vacías para que solo se ejecute una vez

  // Recargar productos cuando cambian las transacciones
  useEffect(() => {
    if (user) {
      const reloadProducts = async () => {
        const { data } = await getUserProductsWithInventory(user.id);
        if (data) {
          setProducts(data);
          const mapFromProducts = {};
          data.forEach(p => {
            const stock = parseInt(p.current_stock_boxes ?? p.currentStockBoxes ?? 0) || 0;
            mapFromProducts[p.name] = stock;
          });
          setInventoryMap(mapFromProducts);
        }
      };
      reloadProducts();
    }
  }, [transactions.length, user]);

  // Sincronizar inventoryMap cuando llegan productos con stock real
  useEffect(() => {
    if (products && products.length > 0) {
      const mapFromProducts = {};
      products.forEach(p => {
        const stock = parseInt(p.current_stock_boxes ?? p.currentStockBoxes ?? 0) || 0;
        mapFromProducts[p.name] = stock;
      });
      setInventoryMap(mapFromProducts);
    }
  }, [products]);

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
        const isAd = t.type === 'publicidad' || t.type === 'advertising';
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
      // Si las transacciones ya tienen ID, ya fueron guardadas por addTransactionV2
      // Esto incluye: transacciones con productId O transacciones de publicidad (productId=null pero tienen id)
      const alreadySaved = list.length > 0 && (list[0].productId || list[0].id);

      if (alreadySaved) {
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
      console.error('Error details:', JSON.stringify(error, null, 2));

      const errorMsg = error?.message || error?.details || String(error) || "Error desconocido";
      toast({
        title: "Error al Guardar",
        description: errorMsg,
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

  // Editar monto de publicidad (IVA, comisiones bancarias)
  const handleEditAdAmount = async (id, newAmount) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .update({ total_amount: newAmount })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      // Actualizar estado local
      const updatedTransactions = transactions.map(t =>
        t.id === id ? { ...t, total: newAmount, totalAmount: newAmount } : t
      );
      setTransactions(updatedTransactions);
      extractCampaigns(updatedTransactions);

    } catch (error) {
      console.error('Error actualizando monto:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el monto. Intenta de nuevo.",
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

      // Recargar precios y productos desde BD para asegurar consistencia
      const [pricesResult, productsResult] = await Promise.all([
        getPrices(user.id),
        getUserProductsWithInventory(user.id)
      ]);

      if (!pricesResult.error && pricesResult.data) {
        setPrices(pricesResult.data);
      }

      if (!productsResult.error && productsResult.data) {
        setProducts(productsResult.data);
        // Actualizar precios desde productos
        const pricesFromProducts = {};
        productsResult.data.forEach(p => {
          if (p.listPrice > 0) {
            pricesFromProducts[p.name] = p.listPrice;
          }
        });
        setPrices(prev => ({ ...prev, ...pricesFromProducts }));
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
    console.log('[App] 🎉 handleLogin llamado');
    console.log('[App] 👤 userData:', userData);

    // IMPORTANTE: Establecer usuario Y cerrar modal PRIMERO (síncronamente)
    setUser(userData);
    setAuthModalOpen(false);
    console.log('[App] ✅ Usuario establecido y modal cerrado');

    // Cargar datos DESPUÉS (asíncronamente, sin bloquear el cierre del modal)
    setTimeout(async () => {
      console.log('[App] 📦 Cargando datos en background...');
      await loadUserData(userData.id);
      console.log('[App] ✅ Datos cargados');

      // Verificar si es la primera vez del usuario para enviar bienvenida
      const welcomeKey = `fuxion_welcome_sent_${userData.id}`;
      const welcomeAlreadySent = localStorage.getItem(welcomeKey);

      if (!welcomeAlreadySent) {
        console.log('[App] 🎊 Primera vez del usuario - Enviando bienvenida...');
        try {
          const userName = userData.name || userData.email?.split('@')[0] || 'Emprendedor';
          await createWelcomeNotification(userData.id, userName);
          localStorage.setItem(welcomeKey, 'true');
          console.log('[App] ✅ Notificación de bienvenida enviada');
        } catch (error) {
          console.error('[App] ⚠️ Error enviando bienvenida:', error);
          // No bloquear si falla, es solo una notificación
        }
      }
    }, 100);
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
      setSubscription(null);
      setSubscriptionStatus(null);
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
            <title>{dashboardTitle || 'Mi Dashboard FuXion'}</title>
            <meta name="description" content="Control total de Compras, Ventas, Publicidad y Ganancias." />
          </Helmet>

          <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white font-sans selection:bg-yellow-500/30">
            <Toaster />
            <AuthModal isOpen={authModalOpen && !user} onLogin={handleLogin} />

        {console.log('[App] 🎨 RENDER - authModalOpen:', authModalOpen, 'user:', !!user, 'loading:', loading, 'MODAL DEBE MOSTRARSE:', authModalOpen && !user)}

        {loading && !user && (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Cargando...</p>
            </div>
          </div>
        )}

        {!loading && user && (
            <div className="max-w-7xl mx-auto space-y-6">
            {console.log('[App] Renderizando dashboard - user:', user?.id, 'transactions:', transactions?.length, 'products:', products?.length, 'prices:', Object.keys(prices || {}).length)}
            {console.log('[App] Renderizando dashboard - user:', user, 'transactions:', transactions.length, 'products:', products.length, 'loading:', loading)}

            {/* Banner de Portada */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="relative h-48 md:h-56 rounded-b-3xl overflow-hidden"
            >
              {coverPhoto ? (
                <img src={coverPhoto} alt="Portada" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-yellow-600/30 via-purple-600/20 to-blue-600/30" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent" />

              {/* Iconos arriba a la derecha */}
              <div className="absolute top-3 left-0 right-0 px-3 flex justify-end z-10">
                <div className="flex items-center gap-2 bg-gray-900/70 border border-white/10 rounded-xl px-3 py-2 shadow-lg backdrop-blur max-w-fit">
                  <NotificationBell userId={user?.id} />
                  <UserProfile
                    user={user}
                    onLogout={handleLogout}
                    onUpdateUser={setUser}
                    isAdmin={isAdmin}
                    useHamburgerTrigger
                    onOpenAdminPanel={() => setShowAdminPanel(true)}
                    onCycleClosed={handleCycleClosed}
                    onOpenHelpBot={() => setShowHelpBot(true)}
                    onOpenSuggestionForm={() => setShowSuggestionForm(true)}
                  />
                </div>
              </div>

              {/* Avatar centrado verticalmente a la izquierda */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 z-10">
                <div className="w-20 h-20 md:w-28 md:h-28 rounded-full ring-4 ring-gray-950 border border-white/10 overflow-hidden bg-gray-800 shadow-2xl">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl md:text-3xl font-bold text-gray-400">
                      {(user.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* Texto abajo del banner */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="pl-28 md:pl-36">
                  <h1 className="text-xl md:text-3xl font-extrabold text-white tracking-tight">
                    {dashboardTitle}
                  </h1>
                  <p className="text-gray-400 text-xs md:text-sm font-medium">
                    Control de Compras, Ventas y Ganancias
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Frase del Día */}
            <div className="px-3 sm:px-6 mt-4">
              <DailyQuote userName={user?.name || user?.email} />
            </div>

            <div className="px-3 sm:px-6 space-y-6 sm:space-y-10">

            {/* Banner de Suscripción */}
            {subscriptionStatus && (
              <SubscriptionBanner
                subscriptionStatus={subscriptionStatus.status}
                daysRemaining={subscriptionStatus.daysRemaining}
                expiresAt={subscription?.expires_at}
              />
            )}

            {/* Hero KPI Carousel (Netflix Style) - COMENTADO: información redundante con KPIGrid
            <section>
              <HeroKpiCarousel
                transactions={transactions}
                products={products}
                prices={prices}
                inventoryMap={inventoryMap}
                loans={loans}
                fuxionPayments={totalFuxionPayments}
                onOpenEstadoNegocio={() => setShowEstadoNegocio(true)}
              />
            </section>
            */}

            {/* 1. Gestión de Operaciones */}
            <section className="bg-gray-900/40 border border-white/5 rounded-3xl p-1 backdrop-blur-sm shadow-2xl overflow-hidden">
                <Tabs defaultValue="ventas" className="w-full">
                <div className="px-4 sm:px-6 py-4 bg-gray-900/60 border-b border-white/5 flex flex-col gap-4">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-200 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    Gestión de Operaciones
                    </h2>
                    {/* Contenedor scrollable para tabs en móvil */}
                    <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent pb-2 -mb-2">
                      <TabsList className="bg-black/40 p-1 rounded-xl border border-white/5 inline-flex min-w-max">
                      <TabsTrigger value="compras" className="rounded-lg data-[state=active]:bg-red-600 data-[state=active]:text-white text-gray-400 px-3 sm:px-6 py-2 text-xs sm:text-sm transition-all whitespace-nowrap">
                          Compras
                      </TabsTrigger>
                      <TabsTrigger value="publicidad" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 px-3 sm:px-6 py-2 text-xs sm:text-sm transition-all whitespace-nowrap">
                          Publicidad
                      </TabsTrigger>
                      <TabsTrigger value="ventas" className="rounded-lg data-[state=active]:bg-green-600 data-[state=active]:text-white text-gray-400 px-3 sm:px-6 py-2 text-xs sm:text-sm transition-all whitespace-nowrap">
                          Ventas
                      </TabsTrigger>
                      <TabsTrigger value="salidas" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white text-gray-400 px-3 sm:px-6 py-2 text-xs sm:text-sm transition-all whitespace-nowrap">
                          Salidas
                      </TabsTrigger>
                      <TabsTrigger value="prestamos" className="rounded-lg data-[state=active]:bg-orange-600 data-[state=active]:text-white text-gray-400 px-3 sm:px-6 py-2 text-xs sm:text-sm transition-all whitespace-nowrap">
                          Préstamos
                      </TabsTrigger>
                      <TabsTrigger value="precios" className="rounded-lg data-[state=active]:bg-yellow-600 data-[state=active]:text-black data-[state=active]:font-bold text-gray-400 px-3 sm:px-6 py-2 text-xs sm:text-sm transition-all whitespace-nowrap">
                          Precios
                      </TabsTrigger>
                      <TabsTrigger value="clientes" className="rounded-lg data-[state=active]:bg-purple-600 data-[state=active]:text-white text-gray-400 px-3 sm:px-6 py-2 text-xs sm:text-sm transition-all whitespace-nowrap">
                          Clientes
                      </TabsTrigger>
                      <TabsTrigger value="pagos-fuxion" className="rounded-lg data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-gray-400 px-3 sm:px-6 py-2 text-xs sm:text-sm transition-all whitespace-nowrap">
                          Pagos FuXion
                      </TabsTrigger>
                      </TabsList>
                    </div>
                </div>

                <div className="p-3 sm:p-6 md:p-8 bg-gradient-to-b from-gray-900/0 to-gray-900/20">
                    <TabsContent value="compras" className="mt-0 focus-visible:outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
                        <div className="lg:col-span-1">
                            <PurchaseModule
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
                        <div className="lg:col-span-1">
                            <AdModule onAdd={handleAddTransaction} />
                        </div>
                        <div className="lg:col-span-2">
                            <DataTable typeFilter="publicidad" transactions={transactions} onDelete={handleDeleteTransaction} onEditAmount={handleEditAdAmount} title="Historial de Publicidad" icon={Megaphone} color="blue" />
                        </div>
                    </div>
                    </TabsContent>

                    <TabsContent value="ventas" className="mt-0 focus-visible:outline-none">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
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
                    {/* Sección: Prestar Producto (cuando prestas tu stock) */}
                    <div className="mb-4">
                      <h2 className="text-lg font-bold text-gray-300 flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                        📤 Prestar Producto (te deben devolver)
                      </h2>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8 mb-4 sm:mb-8">
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
                    </div>

                    {/* Sección: Recibir de Socios (ellos te prestan) */}
                    <div className="mb-4 sm:mb-8">
                      <h2 className="text-lg font-bold text-gray-300 flex items-center gap-2 mb-4">
                        <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                        📥 Recibir de Socio (debes devolverles)
                      </h2>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                          <BorrowingModule
                            products={Array.from(new Set(transactions.map(t => t.productName || t.productName).filter(Boolean)))}
                            prices={prices}
                            onUpdate={() => {
                              // Recargar datos después de actualizar préstamos recibidos
                              if (user) loadUserData(user.id);
                            }}
                          />
                      </div>
                    </div>

                    {/* Historial de Préstamos */}
                    <div className="grid grid-cols-1 gap-4 sm:gap-8">
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
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
                            <div className="lg:col-span-2">
                                <PriceManagement
                                    transactions={transactions}
                                    prices={prices}
                                    productsV2={products}
                                    onUpdatePrice={handleUpdatePrice}
                                    onDeleteProduct={handleDeleteProduct}
                                    onRenameProduct={handleRenameProduct}
                                />
                            </div>
                            <div className="lg:col-span-1">
                                <BoxOpeningModule
                                    onAdd={handleAddTransaction}
                                    products={Array.from(new Set(transactions.map(t => t.productName || t.productName).filter(Boolean)))}
                                    productsV2={products}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="clientes" className="mt-0 focus-visible:outline-none">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                            <div>
                                <CustomerManagement
                                  userId={user?.id}
                                  prices={prices}
                                  onTransactionsAdded={handleAddTransaction}
                                />
                            </div>
                            <div>
                                <RemindersCard userId={user?.id} refreshTrigger={cycleRefreshTrigger} />
                            </div>
                        </div>
                        <div className="mt-6 p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                          <h4 className="text-sm font-bold text-purple-400 mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            ¿Cómo funciona?
                          </h4>
                          <ul className="text-xs text-gray-400 space-y-1">
                            <li>• <strong>Crear clientes</strong> aquí para usarlos en ventas Recurrentes y Referidos</li>
                            <li>• En <strong>Ventas</strong>, selecciona "Venta Frecuente" o "Venta de Referidos"</li>
                            <li>• Los <strong>recordatorios automáticos</strong> se crean a los 15 y 30 días de cada venta</li>
                            <li>• Al hacer clic en un cliente verás su <strong>historial de compras</strong> y <strong>referidos</strong></li>
                          </ul>
                        </div>
                    </TabsContent>

                    <TabsContent value="pagos-fuxion" className="mt-0 focus-visible:outline-none">
                        <FuxionPaymentsModule
                          userId={user?.id}
                          onPaymentChange={async () => {
                            // Recargar total de pagos FuXion
                            if (user) {
                              const { data } = await getTotalFuxionPayments(user.id);
                              setTotalFuxionPayments(data || 0);
                            }
                          }}
                        />
                        <div className="mt-6 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                          <h4 className="text-sm font-bold text-emerald-400 mb-2 flex items-center gap-2">
                            <Banknote className="w-4 h-4" />
                            ¿Qué son los Pagos FuXion?
                          </h4>
                          <ul className="text-xs text-gray-400 space-y-1">
                            <li>• <strong>Cheques semanales</strong> - Devolución del % según tu rango (10-50%)</li>
                            <li>• <strong>Bonos Familia/Fidelización</strong> - Incentivos especiales</li>
                            <li>• <strong>Comisiones</strong> - Por ventas de tu red</li>
                            <li>• Estos pagos <strong>suman a tu Ganancia Neta</strong> en el dashboard</li>
                          </ul>
                        </div>
                    </TabsContent>
                </div>
                </Tabs>
            </section>

            {/* 2. KPI Cards Grid */}
            <section>
                <KPIGrid
                  transactions={transactions}
                  inventory={totalInventory}
                  inventoryMap={inventoryMap}
                  prices={prices}
                  products={products}
                  loans={loans}
                  fuxionPayments={totalFuxionPayments}
                  onEstadoNegocioClick={() => setShowEstadoNegocio(true)}
                />
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

            </div>
            </div>
        )}

        {/* Error Debugger - solo en entorno local */}
        <ErrorDebugger enabled={window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'} />

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

        {/* Modal Estado del Negocio */}
        {showEstadoNegocio && user && (
          <EstadoDelNegocioModal
            isOpen={showEstadoNegocio}
            onClose={() => setShowEstadoNegocio(false)}
            user={user}
            transactions={transactions}
            products={products}
            prices={prices}
            inventoryMap={inventoryMap}
            loans={loans}
            fuxionPayments={totalFuxionPayments}
          />
        )}

        {/* Robot de Ayuda */}
        <HelpBotModal
          isOpen={showHelpBot}
          onClose={() => setShowHelpBot(false)}
        />

        {/* Formulario de Sugerencias */}
        <SuggestionForm
          isOpen={showSuggestionForm}
          onClose={() => setShowSuggestionForm(false)}
          user={user}
        />

        {/* Panel de Administración */}
        {showAdminPanel && isAdmin && (
          <AdminPanel
            currentUser={user}
            onClose={() => setShowAdminPanel(false)}
          />
        )}

        {/* DEBUG: Panel solo visible en desarrollo */}
        {user && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
          <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {debugMinimized ? (
              /* Versión minimizada */
              <Button
                onClick={() => setDebugMinimized(false)}
                className="bg-purple-600/80 hover:bg-purple-500 text-white text-xs shadow-lg"
                size="sm"
              >
                🔍 DEBUG
              </Button>
            ) : (
              /* Versión expandida */
              <>
                <div className="bg-gray-900/95 border-2 border-purple-500 rounded-lg p-3 shadow-2xl text-xs relative">
                  {/* Botón minimizar */}
                  <button
                    onClick={() => setDebugMinimized(true)}
                    className="absolute top-1 right-1 text-gray-500 hover:text-white text-lg leading-none"
                    title="Minimizar"
                  >
                    −
                  </button>
                  <div className="text-purple-400 font-bold mb-1">🔍 DEBUG ADMIN</div>
                  <div className="text-gray-300">User: {user.email}</div>
                  <div className="text-gray-300">ID: {user.id?.slice(0, 8)}...</div>
                  <div className={`font-bold ${isAdmin ? 'text-green-400' : 'text-red-400'}`}>
                    isAdmin: {isAdmin ? '✅ TRUE' : '❌ FALSE'}
                  </div>
                  <div className="text-gray-400">Loading: {isLoadingAdmin ? '⏳' : '✅'}</div>
                </div>

                {/* Botón para abrir panel (siempre visible si es admin) */}
                {isAdmin && (
                  <Button
                    onClick={() => setShowAdminPanel(true)}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold shadow-2xl"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    ABRIR PANEL ADMIN
                  </Button>
                )}

                {/* Botón para presionar F12 */}
                <Button
                  onClick={() => {
                    const event = new KeyboardEvent('keydown', { key: 'F12' });
                    window.dispatchEvent(event);
                  }}
                  variant="outline"
                  className="bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Ver Info Completa
                </Button>
              </>
            )}
          </div>
        )}
          </div>
        </>
      </RadixTooltipProvider>
    </TooltipContextProvider>
  );
}

export default App;
