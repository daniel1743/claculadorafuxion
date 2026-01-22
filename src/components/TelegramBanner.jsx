import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, MessageCircle } from 'lucide-react';

const TelegramBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);

  useEffect(() => {
    // Verificar si ya se mostró en esta sesión
    const shown = sessionStorage.getItem('telegramBannerShown');
    if (shown) {
      setHasBeenShown(true);
      return;
    }

    // Mostrar el banner después de 2 segundos
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    // Ocultar automáticamente después de 7 segundos (5 segundos visible)
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      setHasBeenShown(true);
      sessionStorage.setItem('telegramBannerShown', 'true');
    }, 9000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setHasBeenShown(true);
    sessionStorage.setItem('telegramBannerShown', 'true');
  };

  const handleClick = () => {
    window.open('https://t.me/+Rayp5VZ2shM2ODBh', '_blank');
    handleClose();
  };

  if (hasBeenShown && !isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.8 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-md"
        >
          <div className="relative bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 rounded-2xl shadow-2xl shadow-cyan-500/30 overflow-hidden">
            {/* Botón cerrar */}
            <button
              onClick={handleClose}
              className="absolute top-2 right-2 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Contenido clickeable */}
            <button
              onClick={handleClick}
              className="w-full p-4 flex items-center gap-4 text-left hover:bg-white/10 transition-colors"
            >
              {/* Icono Telegram */}
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-lg leading-tight">
                  MEJOR GRUPO DE CUADRE Y GUEBEO CHILE
                </h3>
                <p className="text-white/80 text-sm mt-1">
                  Consejos, tips y comunidad de emprendedores
                </p>
              </div>

              {/* CTA */}
              <div className="bg-white text-blue-600 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1 flex-shrink-0">
                UNETE GRATIS
                <ExternalLink className="w-4 h-4" />
              </div>
            </button>

            {/* Barra de progreso */}
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 7, ease: 'linear' }}
              className="h-1 bg-white/40"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TelegramBanner;
