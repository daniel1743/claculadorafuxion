import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, MessageCircle, Lightbulb, ChevronRight, Sparkles, BookOpen, HelpCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBestAnswer, getAnswerById, getRelatedAnswers } from '@/lib/helpBotEngine';
import { QUICK_QUESTIONS, CATEGORIES, FALLBACK_RESPONSE } from '@/lib/helpBotKnowledge';

const HelpBotModal = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll automático al último mensaje
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Focus en input al abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Mensaje de bienvenida al abrir
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        type: 'bot',
        content: {
          short: '¡Hola! Soy tu asistente de ayuda.',
          explanation: 'Estoy aquí para explicarte cómo funciona tu dashboard y cómo registrar tus operaciones. No te preocupes, ¡te lo explico todo de forma simple!',
          example: null,
          action: 'Escribe tu pregunta o usa los botones rápidos de abajo para empezar.'
        },
        isWelcome: true
      }]);
    }
  }, [isOpen]);

  const handleSendMessage = (query) => {
    if (!query.trim()) return;

    // Agregar mensaje del usuario
    setMessages(prev => [...prev, {
      type: 'user',
      content: query
    }]);

    setInputValue('');
    setIsTyping(true);

    // Simular "pensando" para mejor UX
    setTimeout(() => {
      const answer = getBestAnswer(query);
      const related = getRelatedAnswers(answer);

      setMessages(prev => [...prev, {
        type: 'bot',
        content: answer.answer,
        title: answer.title,
        category: answer.category,
        related: related,
        isFallback: answer.id === 'fallback'
      }]);

      setIsTyping(false);
    }, 500);
  };

  const handleQuickQuestion = (questionId) => {
    const answer = getAnswerById(questionId);
    if (answer) {
      // Agregar pregunta como mensaje del usuario
      setMessages(prev => [...prev, {
        type: 'user',
        content: answer.title
      }]);

      setIsTyping(true);

      setTimeout(() => {
        const related = getRelatedAnswers(answer);

        setMessages(prev => [...prev, {
          type: 'bot',
          content: answer.answer,
          title: answer.title,
          category: answer.category,
          related: related
        }]);

        setIsTyping(false);
      }, 300);
    }
  };

  const handleRelatedClick = (relatedItem) => {
    handleQuickQuestion(relatedItem.id);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const clearChat = () => {
    setMessages([{
      type: 'bot',
      content: {
        short: 'Chat reiniciado.',
        explanation: '¿En qué más puedo ayudarte?',
        example: null,
        action: 'Escribe tu pregunta o usa los botones rápidos.'
      },
      isWelcome: true
    }]);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 border border-white/10 rounded-3xl w-full max-w-2xl h-[85vh] max-h-[700px] overflow-hidden shadow-2xl flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Banner Telegram */}
          <a
            href="https://t.me/+Rayp5VZ2shM2ODBh"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 text-white text-center py-2 px-4 flex items-center justify-center gap-2 hover:from-blue-500 hover:via-cyan-400 hover:to-blue-500 transition-all"
          >
            <span className="font-bold text-sm">MEJOR GRUPO DE CUADRE Y GUEBEO CHILE</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
              UNETE GRATIS
              <ExternalLink className="w-3 h-3" />
            </span>
          </a>

          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600/20 via-blue-600/10 to-cyan-600/20 border-b border-white/10 p-4 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Asistente de Ayuda
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                  </h2>
                  <p className="text-gray-400 text-sm">Aprende a usar tu dashboard sin miedo</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-700">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    activeCategory === cat.id
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500/30'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent'
                  }`}
                >
                  <span className="mr-1.5">{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {msg.type === 'user' ? (
                  // Mensaje del usuario
                  <div className="flex justify-end">
                    <div className="bg-purple-500/20 border border-purple-500/30 rounded-2xl rounded-br-md px-4 py-2.5 max-w-[85%]">
                      <p className="text-white">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  // Mensaje del bot
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="flex-1 space-y-2">
                      {/* Título si existe */}
                      {msg.title && !msg.isWelcome && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium">
                            {msg.category}
                          </span>
                          <span className="text-sm text-gray-400">{msg.title}</span>
                        </div>
                      )}

                      {/* Contenido principal */}
                      <div className={`bg-white/5 border rounded-2xl rounded-tl-md p-4 space-y-3 ${
                        msg.isFallback ? 'border-yellow-500/30' : 'border-white/10'
                      }`}>
                        {/* Resumen */}
                        <p className="text-white font-medium">{msg.content.short}</p>

                        {/* Explicación */}
                        {msg.content.explanation && (
                          <p className="text-gray-300 text-sm leading-relaxed">
                            {msg.content.explanation}
                          </p>
                        )}

                        {/* Ejemplo */}
                        {msg.content.example && (
                          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-blue-400 text-xs font-medium mb-1">
                              <Lightbulb className="w-3.5 h-3.5" />
                              Ejemplo
                            </div>
                            <p className="text-gray-300 text-sm">{msg.content.example}</p>
                          </div>
                        )}

                        {/* Acción sugerida */}
                        {msg.content.action && (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
                            <div className="flex items-center gap-2 text-green-400 text-xs font-medium mb-1">
                              <ChevronRight className="w-3.5 h-3.5" />
                              Qué hacer ahora
                            </div>
                            <p className="text-gray-300 text-sm">{msg.content.action}</p>
                          </div>
                        )}
                      </div>

                      {/* Temas relacionados */}
                      {msg.related && msg.related.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs text-gray-500">Relacionado:</span>
                          {msg.related.map(rel => (
                            <button
                              key={rel.id}
                              onClick={() => handleRelatedClick(rel)}
                              className="text-xs px-2 py-1 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
                            >
                              {rel.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Indicador de "escribiendo" */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-purple-400" />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Questions */}
          <div className="border-t border-white/5 p-3 bg-gray-900/50">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-700">
              {QUICK_QUESTIONS
                .filter(q => activeCategory === 'all' || {
                  'Dashboard': ['ganancia-neta', 'estoy-ganando-o-perdiendo', 'diferencia-inversion-inventario', 'regalos', 'pagos-fuxion'],
                  'Operaciones': ['registrar-compra', 'registrar-venta'],
                  'FAQ': ['estado-negocio', 'como-aumentar-ganancia', 'estoy-ganando-o-perdiendo']
                }[activeCategory]?.includes(q.id))
                .map(q => (
                  <button
                    key={q.id}
                    onClick={() => handleQuickQuestion(q.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap bg-white/5 text-gray-300 hover:bg-purple-500/20 hover:text-purple-300 border border-white/5 hover:border-purple-500/30 transition-all"
                  >
                    {q.text}
                  </button>
                ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-white/10 p-4 bg-gray-900/80">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe tu pregunta..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 outline-none pr-12"
                />
                <button
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim() || isTyping}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-gray-500">
                Presiona Enter para enviar
              </p>
              <button
                onClick={clearChat}
                className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
              >
                Limpiar chat
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default HelpBotModal;
