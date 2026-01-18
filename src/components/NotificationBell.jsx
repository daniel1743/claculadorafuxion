import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, CheckCheck, PartyPopper, CheckCircle, RefreshCw, CheckCircle2,
  MessageSquare, AlertCircle, Sparkles, MessageCircle, X
} from 'lucide-react';
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  subscribeToNotifications,
  formatRelativeTime,
  NOTIFICATION_TYPES
} from '@/lib/notificationService';

/**
 * NotificationBell - Campanita de notificaciones con dropdown y realtime
 */
const NotificationBell = ({ userId, onOpenSuggestion }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Cargar notificaciones al montar
  useEffect(() => {
    if (userId) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [userId]);

  // Suscripción realtime con protección contra múltiples suscripciones
  useEffect(() => {
    if (!userId) return;

    let isMounted = true;
    let subscription = null;

    const setupSubscription = () => {
      subscription = subscribeToNotifications(userId, (newNotification) => {
        if (!isMounted) return;

        // Evitar duplicados verificando si ya existe
        setNotifications(prev => {
          const exists = prev.some(n => n.id === newNotification.id);
          if (exists) return prev;
          return [newNotification, ...prev];
        });
        setUnreadCount(prev => prev + 1);
      });
    };

    setupSubscription();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [userId]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Calcular posición del dropdown al abrir
  const handleToggleDropdown = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
    setIsOpen(!isOpen);
  };

  const loadNotifications = async () => {
    setLoading(true);
    const { data } = await getUserNotifications(userId, 30);
    setNotifications(data || []);
    setLoading(false);
  };

  const loadUnreadCount = async () => {
    const { count } = await getUnreadCount(userId);
    setUnreadCount(count);
  };

  const handleMarkAsRead = async (notification) => {
    if (notification.is_read) return;

    await markAsRead(notification.id);

    // Actualizar estado local
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  // Abrir notificación en modal
  const handleNotificationClick = (notification) => {
    setSelectedNotification(notification);
    setIsOpen(false);
  };

  // Cerrar modal y marcar como leída
  const handleCloseNotificationModal = () => {
    if (selectedNotification && !selectedNotification.is_read) {
      handleMarkAsRead(selectedNotification);
    }
    setSelectedNotification(null);
  };

  const getNotificationIcon = (type) => {
    const icons = {
      bienvenida: PartyPopper,
      sugerencia_recibida: CheckCircle,
      ticket_actualizado: RefreshCw,
      ticket_resuelto: CheckCircle2,
      mensaje_admin: MessageSquare,
      sistema: AlertCircle,
      actualizacion: Sparkles,
      chat_nuevo: MessageCircle
    };
    return icons[type] || Bell;
  };

  const getNotificationStyle = (type) => {
    return NOTIFICATION_TYPES[type] || {
      bgColor: 'bg-gray-500/20',
      textColor: 'text-gray-400'
    };
  };

  return (
    <>
      {/* Botón de campanita */}
      <button
        ref={buttonRef}
        onClick={handleToggleDropdown}
        className="relative p-2.5 rounded-full bg-transparent hover:bg-white/10 active:bg-white/20 transition-all"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-yellow-400' : 'text-white/80 hover:text-white'}`} />

        {/* Badge de conteo */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Portal para renderizar dropdown fuera del banner */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
              style={{
                top: dropdownPosition.top,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100vw - 2rem)',
                maxWidth: '384px',
                zIndex: 99999
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-gray-900">
                <h3 className="text-sm font-bold text-white">Notificaciones</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Marcar todas
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-full hover:bg-white/10 text-gray-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Lista de notificaciones */}
              <div className="max-h-[60vh] sm:max-h-[400px] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-500" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <Bell className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 font-medium">Sin notificaciones</p>
                    <p className="text-gray-500 text-xs mt-1">Aquí verás tus alertas y mensajes</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {notifications.map((notification) => {
                      const Icon = getNotificationIcon(notification.type);
                      const style = getNotificationStyle(notification.type);

                      return (
                        <button
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full flex items-start gap-3 p-4 text-left hover:bg-white/5 transition-colors ${
                            !notification.is_read ? 'bg-purple-500/5' : ''
                          }`}
                        >
                          {/* Icono */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${style.bgColor} flex items-center justify-center`}>
                            <Icon className={`w-5 h-5 ${style.textColor}`} />
                          </div>

                          {/* Contenido */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={`text-sm font-medium truncate ${
                                !notification.is_read ? 'text-white' : 'text-gray-300'
                              }`}>
                                {notification.title}
                              </h4>
                              <span className="text-[10px] text-gray-500 flex-shrink-0">
                                {formatRelativeTime(notification.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                          </div>

                          {/* Indicador no leído */}
                          {!notification.is_read && (
                            <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-3 border-t border-white/5 text-center bg-gray-900">
                  <p className="text-xs text-gray-500">
                    {unreadCount > 0 ? `${unreadCount} sin leer` : 'Todas leídas'}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Portal para Modal de notificación individual */}
      {createPortal(
        <AnimatePresence>
          {selectedNotification && (
            <>
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleCloseNotificationModal}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm"
                style={{ zIndex: 100000 }}
              />

            {/* Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                style={{ zIndex: 100001 }}
              >
                {/* Header del modal */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const Icon = getNotificationIcon(selectedNotification.type);
                      const style = getNotificationStyle(selectedNotification.type);
                      return (
                        <div className={`w-10 h-10 rounded-xl ${style.bgColor} flex items-center justify-center`}>
                          <Icon className={`w-5 h-5 ${style.textColor}`} />
                        </div>
                      );
                    })()}
                    <div>
                      <h3 className="text-base font-bold text-white">{selectedNotification.title}</h3>
                      <p className="text-xs text-gray-500">{formatRelativeTime(selectedNotification.created_at)}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseNotificationModal}
                    className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Contenido del modal */}
                <div className="px-5 py-6">
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedNotification.message}
                  </p>
                </div>

                {/* Footer del modal */}
                <div className="px-5 py-4 border-t border-white/5 bg-gray-950/50">
                  <button
                    onClick={handleCloseNotificationModal}
                    className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
                  >
                    Entendido
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
};

export default NotificationBell;
