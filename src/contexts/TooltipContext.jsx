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
    return saved !== null ? JSON.parse(saved) : true; // Por defecto: activados
  });

  // Guardar preferencia en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('tooltips_enabled', JSON.stringify(tooltipsEnabled));
  }, [tooltipsEnabled]);

  const toggleTooltips = () => {
    setTooltipsEnabled(prev => !prev);
  };

  return (
    <TooltipContext.Provider value={{ tooltipsEnabled, toggleTooltips }}>
      {children}
    </TooltipContext.Provider>
  );
};
