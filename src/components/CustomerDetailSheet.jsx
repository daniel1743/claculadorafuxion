import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, FileText, Calendar, ShoppingBag, Users,
  Edit2, Trash2, Plus, UserPlus, ChevronRight, Package,
  DollarSign, Clock, Star, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import BottomSheet from '@/components/ui/BottomSheet';
import { getCustomerPurchaseHistory, getClientReferrals } from '@/lib/customerService';

/**
 * CustomerDetailSheet - Panel de detalles del cliente
 * Mobile: Bottom sheet con gestos
 * Desktop: Drawer lateral (futuro)
 */
const CustomerDetailSheet = ({
  customer,
  isOpen,
  onClose,
  userId,
  referralCount = 0,
  onEdit,
  onDelete,
  onQuickSale,
  onAddReferral
}) => {
  const [activeTab, setActiveTab] = useState('info');
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar datos al abrir
  useEffect(() => {
    if (isOpen && customer && userId) {
      loadCustomerData();
    }
  }, [isOpen, customer?.id, userId]);

  const loadCustomerData = async () => {
    if (!customer || !userId) return;

    setLoading(true);
    try {
      const [historyRes, referralsRes] = await Promise.all([
        getCustomerPurchaseHistory(userId, customer.id),
        getClientReferrals(customer.id)
      ]);

      setPurchaseHistory(historyRes.data || []);
      setReferrals(referralsRes.data || []);
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reset al cerrar
  useEffect(() => {
    if (!isOpen) {
      setActiveTab('info');
      setPurchaseHistory([]);
      setReferrals([]);
    }
  }, [isOpen]);

  if (!customer) return null;

  const tabs = [
    { id: 'info', label: 'Info', icon: User },
    { id: 'history', label: 'Compras', icon: ShoppingBag, count: purchaseHistory.length },
    { id: 'referrals', label: 'Referidos', icon: Users, count: referralCount }
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Calcular totales
  const totalPurchases = purchaseHistory.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
  const totalBoxes = purchaseHistory.reduce((sum, p) => sum + (p.quantityBoxes || 0), 0);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
    >
      {/* Header con avatar y nombre */}
      <div className="flex items-start gap-4 pb-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
          <span className="text-xl font-bold text-white">
            {customer.full_name?.charAt(0)?.toUpperCase() || '?'}
          </span>
        </div>

        {/* Info básica */}
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-white truncate">{customer.full_name}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {referralCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full">
                <Star className="w-3 h-3" />
                {referralCount} referido{referralCount > 1 ? 's' : ''}
              </span>
            )}
            {customer.referrer && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
                <UserPlus className="w-3 h-3" />
                Ref. por {customer.referrer.full_name?.split(' ')[0]}
              </span>
            )}
          </div>
        </div>

        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="p-2 -mt-1 -mr-2 rounded-full hover:bg-white/10 text-gray-400"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Stats rápidos */}
      {purchaseHistory.length > 0 && (
        <div className="grid grid-cols-3 gap-3 py-4 border-y border-white/5">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{purchaseHistory.length}</p>
            <p className="text-xs text-gray-500">Compras</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{formatCurrency(totalPurchases)}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">{totalBoxes}</p>
            <p className="text-xs text-gray-500">Cajas</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 py-3 border-b border-white/5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden xs:inline">{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-xs px-1.5 rounded-full ${
                  isActive ? 'bg-purple-500/30' : 'bg-white/10'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="py-4 min-h-[200px]">
        <AnimatePresence mode="wait">
          {/* Tab: Info */}
          {activeTab === 'info' && (
            <motion.div
              key="info"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4"
            >
              {/* Datos de contacto */}
              <div className="space-y-3">
                {customer.rut && (
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                    <FileText className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">RUT</p>
                      <p className="text-white font-medium">{customer.rut}</p>
                    </div>
                  </div>
                )}

                {customer.email && (
                  <a
                    href={`mailto:${customer.email}`}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <Mail className="w-5 h-5 text-blue-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-white font-medium truncate">{customer.email}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </a>
                )}

                {customer.phone && (
                  <a
                    href={`tel:${customer.phone}`}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <Phone className="w-5 h-5 text-green-400" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Teléfono</p>
                      <p className="text-white font-medium">{customer.phone}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  </a>
                )}

                {customer.notes && (
                  <div className="p-3 bg-white/5 rounded-xl">
                    <p className="text-xs text-gray-500 mb-1">Notas</p>
                    <p className="text-gray-300 text-sm">{customer.notes}</p>
                  </div>
                )}

                {!customer.rut && !customer.email && !customer.phone && !customer.notes && (
                  <div className="text-center py-8">
                    <User className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Sin información adicional</p>
                  </div>
                )}
              </div>

              {/* Fecha de registro */}
              {customer.created_at && (
                <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
                  <Calendar className="w-3.5 h-3.5" />
                  Cliente desde {formatDate(customer.created_at)}
                </div>
              )}
            </motion.div>
          )}

          {/* Tab: Historial de compras */}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500" />
                </div>
              ) : purchaseHistory.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400">Sin compras registradas</p>
                  <Button
                    onClick={() => {
                      onClose();
                      onQuickSale?.(customer);
                    }}
                    className="mt-4 bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Registrar primera venta
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {purchaseHistory.map((purchase, idx) => (
                    <div
                      key={purchase.id || idx}
                      className="p-3 bg-white/5 rounded-xl border border-white/5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                            <Package className="w-5 h-5 text-green-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{purchase.productName}</p>
                            <p className="text-xs text-gray-500">
                              {purchase.quantityBoxes} caja{purchase.quantityBoxes > 1 ? 's' : ''}
                              {purchase.referredBy && (
                                <span className="ml-2 text-purple-400">
                                  (Ref: {purchase.referredBy})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-bold">{formatCurrency(purchase.totalAmount)}</p>
                          <p className="text-xs text-gray-500">{formatDate(purchase.date)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Tab: Referidos */}
          {activeTab === 'referrals' && (
            <motion.div
              key="referrals"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500" />
                </div>
              ) : referrals.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400">Sin referidos aún</p>
                  <Button
                    onClick={() => {
                      onClose();
                      onAddReferral?.(customer);
                    }}
                    className="mt-4 bg-purple-600 hover:bg-purple-700"
                    size="sm"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Agregar primer referido
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {referrals.map((referral, idx) => (
                    <div
                      key={referral.id || idx}
                      className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-purple-400">
                          {referral.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{referral.full_name}</p>
                        <p className="text-xs text-gray-500">
                          Agregado {formatDate(referral.created_at)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action buttons - Fixed at bottom */}
      <div className="sticky bottom-0 pt-4 pb-2 bg-gray-900 border-t border-white/5 -mx-5 px-5">
        <div className="grid grid-cols-4 gap-2">
          <Button
            onClick={() => {
              onClose();
              onQuickSale?.(customer);
            }}
            className="bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Venta</span>
          </Button>

          <Button
            onClick={() => {
              onClose();
              onAddReferral?.(customer);
            }}
            variant="outline"
            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
            size="sm"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Referir</span>
          </Button>

          <Button
            onClick={() => {
              onClose();
              onEdit?.(customer);
            }}
            variant="outline"
            className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            size="sm"
          >
            <Edit2 className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Editar</span>
          </Button>

          <Button
            onClick={() => onDelete?.(customer.id, customer.full_name)}
            variant="outline"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            size="sm"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline ml-1">Borrar</span>
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default CustomerDetailSheet;
