import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Search, Filter, Clock, CheckCircle, XCircle,
  AlertTriangle, Wrench, Lightbulb, Trash2, UserMinus, HelpCircle,
  ChevronRight, Send, RefreshCw, Eye, MessageCircle, Bell, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  getAllSuggestions,
  getSuggestionById,
  updateSuggestionStatus,
  getSuggestionMessages,
  sendMessage,
  getSuggestionStats,
  SUGGESTION_CATEGORIES,
  SUGGESTION_STATUS,
  subscribeToMessages
} from '@/lib/suggestionService';
import {
  createTicketUpdatedNotification,
  createChatNotification,
  createBroadcastNotification
} from '@/lib/notificationService';

/**
 * AdminSuggestionsPanel - Panel de administración de sugerencias
 */
const AdminSuggestionsPanel = ({ currentUser }) => {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastData, setBroadcastData] = useState({ type: 'sistema', title: '', message: '' });

  // Cargar sugerencias y estadísticas
  useEffect(() => {
    loadSuggestions();
    loadStats();
  }, [filter]);

  // Suscripción realtime a mensajes
  useEffect(() => {
    if (!selectedSuggestion) return;

    const subscription = subscribeToMessages(selectedSuggestion.id, (newMsg) => {
      setMessages(prev => [...prev, newMsg]);
    });

    return () => subscription?.unsubscribe();
  }, [selectedSuggestion?.id]);

  const loadSuggestions = async () => {
    setLoading(true);
    const filters = filter !== 'all' ? { status: filter } : {};
    const { data } = await getAllSuggestions(filters);
    setSuggestions(data || []);
    setLoading(false);
  };

  const loadStats = async () => {
    const { data } = await getSuggestionStats();
    setStats(data);
  };

  const loadMessages = async (suggestionId) => {
    setLoadingMessages(true);
    const { data } = await getSuggestionMessages(suggestionId);
    setMessages(data || []);
    setLoadingMessages(false);
  };

  const handleSelectSuggestion = async (suggestion) => {
    setSelectedSuggestion(suggestion);
    await loadMessages(suggestion.id);
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedSuggestion) return;

    const { data, error } = await updateSuggestionStatus(selectedSuggestion.id, newStatus);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado.',
        variant: 'destructive'
      });
      return;
    }

    // Notificar al usuario
    await createTicketUpdatedNotification(selectedSuggestion.user_id, selectedSuggestion.id, newStatus);

    // Actualizar estado local
    setSelectedSuggestion({ ...selectedSuggestion, status: newStatus });
    setSuggestions(prev =>
      prev.map(s => s.id === selectedSuggestion.id ? { ...s, status: newStatus } : s)
    );

    toast({
      title: 'Estado actualizado',
      description: `El ticket ahora está "${SUGGESTION_STATUS[newStatus]?.label}"`,
      className: 'bg-green-900 border-green-600 text-white'
    });

    loadStats();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedSuggestion) return;

    setSendingMessage(true);

    const { error } = await sendMessage({
      suggestionId: selectedSuggestion.id,
      senderId: currentUser.id,
      senderType: 'admin',
      message: newMessage.trim()
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje.',
        variant: 'destructive'
      });
      setSendingMessage(false);
      return;
    }

    // Notificar al usuario
    await createChatNotification(selectedSuggestion.user_id, selectedSuggestion.id);

    setNewMessage('');
    setSendingMessage(false);

    // Recargar mensajes
    await loadMessages(selectedSuggestion.id);
  };

  const handleBroadcast = async () => {
    if (!broadcastData.title.trim() || !broadcastData.message.trim()) {
      toast({
        title: 'Campos requeridos',
        description: 'Debes completar título y mensaje.',
        variant: 'destructive'
      });
      return;
    }

    const { count, error } = await createBroadcastNotification({
      type: broadcastData.type,
      title: broadcastData.title,
      message: broadcastData.message,
      createdBy: currentUser.id
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo enviar la notificación masiva.',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Notificación enviada',
      description: `Se envió a ${count} usuarios.`,
      className: 'bg-green-900 border-green-600 text-white'
    });

    setShowBroadcastModal(false);
    setBroadcastData({ type: 'sistema', title: '', message: '' });
  };

  const getCategoryIcon = (category) => {
    const icons = {
      mejora: Wrench,
      nueva_funcion: Lightbulb,
      error: AlertTriangle,
      quitar_funcion: Trash2,
      dar_de_baja: UserMinus,
      otro: HelpCircle
    };
    return icons[category] || HelpCircle;
  };

  const filteredSuggestions = suggestions.filter(s => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      s.user_email?.toLowerCase().includes(term) ||
      s.title?.toLowerCase().includes(term) ||
      s.description?.toLowerCase().includes(term)
    );
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header con stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-purple-400" />
            Sugerencias y Reportes
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {stats?.total || 0} total · {stats?.pendientes || 0} pendientes
          </p>
        </div>

        <Button
          onClick={() => setShowBroadcastModal(true)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Bell className="w-4 h-4 mr-2" />
          Notificación Masiva
        </Button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <p className="text-2xl font-bold text-yellow-400">{stats.byStatus?.pendiente || 0}</p>
            <p className="text-xs text-gray-400">Pendientes</p>
          </div>
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
            <p className="text-2xl font-bold text-blue-400">{stats.byStatus?.en_progreso || 0}</p>
            <p className="text-xs text-gray-400">En progreso</p>
          </div>
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <p className="text-2xl font-bold text-green-400">{stats.byStatus?.resuelto || 0}</p>
            <p className="text-xs text-gray-400">Resueltos</p>
          </div>
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-2xl font-bold text-red-400">{stats.byCategory?.error || 0}</p>
            <p className="text-xs text-gray-400">Errores</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por email, título o descripción..."
            className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'pendiente', label: 'Pendientes' },
            { value: 'en_progreso', label: 'En progreso' },
            { value: 'resuelto', label: 'Resueltos' }
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f.value
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de tickets */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <h3 className="font-semibold text-white">Tickets ({filteredSuggestions.length})</h3>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              </div>
            ) : filteredSuggestions.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500">No hay tickets</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredSuggestions.map(suggestion => {
                  const CategoryIcon = getCategoryIcon(suggestion.category);
                  const statusStyle = SUGGESTION_STATUS[suggestion.status] || {};
                  const isSelected = selectedSuggestion?.id === suggestion.id;

                  return (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className={`w-full p-4 text-left hover:bg-white/5 transition-colors ${
                        isSelected ? 'bg-purple-500/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl ${statusStyle.bgColor || 'bg-gray-500/20'} flex items-center justify-center flex-shrink-0`}>
                          <CategoryIcon className={`w-5 h-5 ${statusStyle.textColor || 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${statusStyle.bgColor} ${statusStyle.textColor}`}>
                              {statusStyle.label}
                            </span>
                            <span className="text-xs text-gray-500">
                              {SUGGESTION_CATEGORIES[suggestion.category]?.label?.split(' ')[0]}
                            </span>
                          </div>
                          <p className="text-white font-medium mt-1 truncate">
                            {suggestion.title || suggestion.description?.substring(0, 50) + '...'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{suggestion.user_email}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[10px] text-gray-500">{formatDate(suggestion.created_at)}</span>
                          <ChevronRight className="w-4 h-4 text-gray-600" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Detalle y chat */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          {selectedSuggestion ? (
            <>
              {/* Header del ticket */}
              <div className="p-4 border-b border-white/5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500">{selectedSuggestion.user_email}</p>
                    <h3 className="text-white font-semibold mt-1">
                      {selectedSuggestion.title || 'Sin título'}
                    </h3>
                    <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded ${SUGGESTION_STATUS[selectedSuggestion.status]?.bgColor} ${SUGGESTION_STATUS[selectedSuggestion.status]?.textColor}`}>
                      {SUGGESTION_STATUS[selectedSuggestion.status]?.label}
                    </span>
                  </div>
                  <select
                    value={selectedSuggestion.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="bg-black/30 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
                  >
                    {Object.entries(SUGGESTION_STATUS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Descripción */}
              <div className="p-4 border-b border-white/5">
                <p className="text-xs text-gray-500 mb-2">Descripción:</p>
                <p className="text-gray-300 text-sm">{selectedSuggestion.description}</p>
                <p className="text-xs text-gray-600 mt-3">
                  Creado: {formatDate(selectedSuggestion.created_at)}
                </p>
              </div>

              {/* Chat */}
              <div className="flex flex-col h-[300px]">
                <div className="px-4 py-2 border-b border-white/5">
                  <p className="text-xs font-semibold text-gray-400">Chat con usuario</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-gray-500 text-sm py-8">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                      <p>Sin mensajes aún</p>
                      <p className="text-xs mt-1">Envía un mensaje al usuario</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <div
                        key={msg.id || idx}
                        className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] p-3 rounded-xl ${
                          msg.sender_type === 'admin'
                            ? 'bg-purple-500/20 text-purple-100'
                            : 'bg-white/10 text-gray-300'
                        }`}>
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-[10px] text-gray-500 mt-1">{formatDate(msg.created_at)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input de mensaje */}
                <div className="p-3 border-t border-white/5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !newMessage.trim()}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {sendingMessage ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[500px] text-gray-500">
              <div className="text-center">
                <Eye className="w-10 h-10 mx-auto mb-3 text-gray-600" />
                <p>Selecciona un ticket para ver detalles</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Broadcast */}
      <AnimatePresence>
        {showBroadcastModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-gray-900 border border-white/10 rounded-2xl p-6"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-400" />
                Notificación Masiva
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold">Tipo</label>
                  <select
                    value={broadcastData.type}
                    onChange={(e) => setBroadcastData({ ...broadcastData, type: e.target.value })}
                    className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white"
                  >
                    <option value="sistema">Sistema (mantenimiento, avisos)</option>
                    <option value="actualizacion">Actualización disponible</option>
                    <option value="mensaje_admin">Mensaje del Admin</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold">Título</label>
                  <input
                    type="text"
                    value={broadcastData.title}
                    onChange={(e) => setBroadcastData({ ...broadcastData, title: e.target.value })}
                    className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white"
                    placeholder="Ej: Mantenimiento programado"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold">Mensaje</label>
                  <textarea
                    value={broadcastData.message}
                    onChange={(e) => setBroadcastData({ ...broadcastData, message: e.target.value })}
                    rows={3}
                    className="w-full mt-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white resize-none"
                    placeholder="Describe el aviso..."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleBroadcast}
                    className="flex-1 bg-orange-600 hover:bg-orange-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar a Todos
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowBroadcastModal(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminSuggestionsPanel;
