import React, { createContext, useContext, useState, useEffect } from 'react';

const TooltipContext = createContext();

export const useTooltips = () => {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error('useTooltips debe usarse dentro de TooltipProvider');
  }
  return context;
};

export const TooltipProvider = ({ children }) => {
  // Leer preferencia de localStorage o habilitar por defecto
  const [tooltipsEnabled, setTooltipsEnabled] = useState(() => {
    const saved = localStorage.getItem('tooltips_enabled');
    const enabled = saved !== null ? JSON.parse(saved) : true; // Por defecto: activados

    // DEBUG: Log para verificar estado
    console.log('[TooltipContext] Inicializando tooltips:', {
      localStorage: saved,
      parsed: enabled,
      defaultUsed: saved === null
    });

    return enabled;
  });

  // Guardar preferencia en localStorage cuando cambie
  useEffect(() => {
    console.log('[TooltipContext] Guardando preferencia:', tooltipsEnabled);
    localStorage.setItem('tooltips_enabled', JSON.stringify(tooltipsEnabled));
  }, [tooltipsEnabled]);

  const toggleTooltips = () => {
    setTooltipsEnabled(prev => {
      const newValue = !prev;
      console.log('[TooltipContext] Toggle:', prev, '->', newValue);
      return newValue;
    });
  };

  return (
    <TooltipContext.Provider value={{ tooltipsEnabled, toggleTooltips }}>
      {children}
    </TooltipContext.Provider>
  );
};
