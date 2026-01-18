import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, Sparkles, BookOpen, RefreshCw, Share2, X, Clock } from 'lucide-react';
import { getFraseDelDia, getSaludoAleatorio, FRASES_DIARIAS } from '@/lib/frasesDiarias';
import { useToast } from '@/components/ui/use-toast';

/**
 * DailyQuote - Frase motivacional del día
 * Aparece debajo del banner con saludo personalizado
 * Solo permite cambiar la frase UNA vez al día
 */
const DailyQuote = ({ userName = 'Emprendedor' }) => {
  const { toast } = useToast();
  const [isVisible, setIsVisible] = useState(true);
  const [currentQuote, setCurrentQuote] = useState(null);
  const [saludo, setSaludo] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [canChange, setCanChange] = useState(true);

  // Obtener nombre sin email
  const displayName = useMemo(() => {
    if (!userName) return 'Emprendedor';
    // Si es un email, tomar la parte antes del @
    if (userName.includes('@')) {
      return userName.split('@')[0];
    }
    // Si tiene espacios, tomar el primer nombre
    return userName.split(' ')[0];
  }, [userName]);

  // Obtener fecha de hoy como string YYYY-MM-DD
  const getTodayKey = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  };

  // Cargar frase del día y estado de cambio al montar
  useEffect(() => {
    const todayKey = getTodayKey();
    const savedData = localStorage.getItem('fuxionDailyQuote');

    if (savedData) {
      const parsed = JSON.parse(savedData);

      // Si es del mismo día, usar la frase guardada
      if (parsed.date === todayKey) {
        setCurrentQuote(parsed.quote);
        setSaludo(getSaludoAleatorio(displayName, parsed.quote.autor, parsed.quote.libro));
        setCanChange(!parsed.hasChanged); // Si ya cambió, no puede cambiar más
        return;
      }
    }

    // Nuevo día: obtener frase del día y resetear
    const frase = getFraseDelDia();
    setCurrentQuote(frase);
    setSaludo(getSaludoAleatorio(displayName, frase.autor, frase.libro));
    setCanChange(true);

    // Guardar en localStorage
    localStorage.setItem('fuxionDailyQuote', JSON.stringify({
      date: todayKey,
      quote: frase,
      hasChanged: false
    }));
  }, [displayName]);

  // Función para obtener nueva frase (solo una vez al día)
  const getNewQuote = () => {
    if (!canChange) {
      // Ya usó su cambio del día
      toast({
        title: "Ya elegiste tu frase de hoy",
        description: "Mañana tendrás una nueva frase esperándote. ¡Que esta te acompañe hoy!",
        className: "bg-purple-900/90 border-purple-500/50 text-white",
        duration: 4000
      });
      return;
    }

    setIsAnimating(true);
    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * FRASES_DIARIAS.length);
      const newQuote = FRASES_DIARIAS[randomIndex];
      setCurrentQuote(newQuote);
      setSaludo(getSaludoAleatorio(displayName, newQuote.autor, newQuote.libro));
      setIsAnimating(false);
      setCanChange(false); // Ya no puede cambiar más hoy

      // Guardar en localStorage
      const todayKey = getTodayKey();
      localStorage.setItem('fuxionDailyQuote', JSON.stringify({
        date: todayKey,
        quote: newQuote,
        hasChanged: true
      }));

      toast({
        title: "Nueva frase seleccionada",
        description: "Esta será tu frase del día. ¡Aprovéchala!",
        className: "bg-yellow-900/90 border-yellow-500/50 text-white",
        duration: 3000
      });
    }, 300);
  };

  // Compartir frase
  const shareQuote = async () => {
    if (!currentQuote) return;

    const text = `"${currentQuote.frase}"\n\n— ${currentQuote.autor}, ${currentQuote.libro}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Frase del día',
          text: text
        });
      } catch (err) {
        // Usuario canceló o error
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copiar al portapapeles
      navigator.clipboard.writeText(text);
      alert('Frase copiada al portapapeles');
    }
  };

  if (!isVisible || !currentQuote) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative overflow-hidden"
      >
        {/* Fondo con gradiente animado */}
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 via-purple-500/5 to-blue-500/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-400/10 via-transparent to-transparent" />

        {/* Contenido */}
        <div className="relative px-4 py-5 sm:px-6 sm:py-6">
          {/* Header con saludo */}
          <motion.div
            className="flex items-start gap-3 mb-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                {saludo}
              </p>
            </div>
            {/* Botón cerrar */}
            <button
              onClick={() => setIsVisible(false)}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-gray-300 transition-colors"
              title="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>

          {/* Frase principal */}
          <motion.div
            key={currentQuote.frase}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: isAnimating ? 0 : 1, scale: isAnimating ? 0.95 : 1 }}
            transition={{ duration: 0.3 }}
            className="relative pl-4 sm:pl-6 border-l-4 border-yellow-500/50"
          >
            <Quote className="absolute -left-3 -top-2 w-6 h-6 text-yellow-500/30" />
            <p className="text-lg sm:text-xl md:text-2xl font-medium text-white leading-relaxed italic">
              "{currentQuote.frase}"
            </p>
          </motion.div>

          {/* Autor y libro */}
          <motion.div
            className="mt-4 flex flex-wrap items-center gap-3 sm:gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="text-yellow-400 font-semibold">{currentQuote.autor}</span>
              <span className="text-gray-600">•</span>
              <span className="flex items-center gap-1.5 text-gray-400">
                <BookOpen className="w-3.5 h-3.5" />
                {currentQuote.libro}
              </span>
            </div>
          </motion.div>

          {/* Botones de acción */}
          <motion.div
            className="mt-5 flex flex-wrap gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <button
              onClick={getNewQuote}
              disabled={isAnimating}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all disabled:opacity-50 ${
                canChange
                  ? 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-yellow-500/30 text-gray-300 hover:text-white'
                  : 'bg-gray-800/50 border-gray-700/50 text-gray-500 cursor-not-allowed'
              }`}
            >
              {canChange ? (
                <>
                  <RefreshCw className={`w-4 h-4 ${isAnimating ? 'animate-spin' : ''}`} />
                  Cambiar frase
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  Mañana habrá más
                </>
              )}
            </button>
            <button
              onClick={shareQuote}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 hover:border-yellow-500/40 text-yellow-400 hover:text-yellow-300 text-sm font-medium transition-all"
            >
              <Share2 className="w-4 h-4" />
              Compartir
            </button>
          </motion.div>
        </div>

        {/* Decoración inferior */}
        <div className="h-px bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
      </motion.div>
    </AnimatePresence>
  );
};

export default DailyQuote;
