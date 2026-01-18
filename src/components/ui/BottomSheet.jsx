import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * BottomSheet - Componente mobile-first con gestos drag
 *
 * Features:
 * - Drag-to-dismiss desde el handle
 * - Snap points: cerrado, parcial (50%), completo (90%)
 * - Backdrop click para cerrar
 * - Animaciones fluidas
 * - Safe area para notch/home indicator
 */
const BottomSheet = ({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = ['50%', '90%'],
  initialSnap = 0,
  showHandle = true,
  showCloseButton = true,
  className = ''
}) => {
  const dragControls = useDragControls();

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevenir scroll del body
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Calcular altura basada en snap point
  const getSnapHeight = useCallback((snapIndex) => {
    const snap = snapPoints[snapIndex] || snapPoints[0];
    if (typeof snap === 'string' && snap.endsWith('%')) {
      return `${snap}`;
    }
    return snap;
  }, [snapPoints]);

  const handleDragEnd = (event, info) => {
    // Si arrastra hacia abajo más de 100px, cerrar
    if (info.offset.y > 100) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
              mass: 0.8
            }}
            drag="y"
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-gray-900 border-t border-white/10 rounded-t-3xl shadow-2xl ${className}`}
            style={{
              maxHeight: getSnapHeight(initialSnap === 1 ? 1 : 0),
              height: 'auto',
              minHeight: '50vh',
              maxWidth: '100%',
              touchAction: 'none'
            }}
          >
            {/* Handle de arrastre */}
            {showHandle && (
              <div
                className="flex-shrink-0 pt-3 pb-2 cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => dragControls.start(e)}
              >
                <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto" />
              </div>
            )}

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/5">
                {title && (
                  <h3 className="text-lg font-bold text-white">{title}</h3>
                )}
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 -mr-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-safe">
              {children}
            </div>

            {/* Safe area bottom padding para dispositivos con home indicator */}
            <div className="h-safe-bottom flex-shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 20px)' }} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BottomSheet;
