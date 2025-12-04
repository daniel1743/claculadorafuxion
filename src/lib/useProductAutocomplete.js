import { useState, useMemo, useEffect } from 'react';

/**
 * Hook para autocompletado inteligente de productos y precios
 * Sugiere productos basándose en lo que el usuario ya ha guardado
 */
export const useProductAutocomplete = (products, prices, inputValue) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Generar lista de productos con precios para sugerencias
  const productList = useMemo(() => {
    const productsWithPrices = [];
    
    // Agregar productos con precios guardados
    Object.keys(prices).forEach(productName => {
      productsWithPrices.push({
        name: productName,
        price: prices[productName],
        hasPrice: true
      });
    });

    // Agregar productos de transacciones que no tengan precio guardado
    products.forEach(productName => {
      if (!prices[productName]) {
        productsWithPrices.push({
          name: productName,
          price: null,
          hasPrice: false
        });
      }
    });

    // Ordenar: primero los que tienen precio, luego alfabéticamente
    return productsWithPrices.sort((a, b) => {
      if (a.hasPrice && !b.hasPrice) return -1;
      if (!a.hasPrice && b.hasPrice) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [products, prices]);

  // Filtrar sugerencias basándose en el input
  useEffect(() => {
    if (!inputValue || inputValue.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const searchTerm = inputValue.toLowerCase().trim();
    const filtered = productList.filter(product =>
      product.name.toLowerCase().includes(searchTerm)
    ).slice(0, 5); // Limitar a 5 sugerencias

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedIndex(-1);
  }, [inputValue, productList]);

  // Manejar teclado (flechas arriba/abajo, Enter, Escape)
  const handleKeyDown = (e, onSelect) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          const selected = suggestions[selectedIndex];
          onSelect(selected.name, selected.price);
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const selectSuggestion = (onSelect, productName, price) => {
    onSelect(productName, price);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  return {
    suggestions,
    showSuggestions,
    selectedIndex,
    handleKeyDown,
    selectSuggestion,
    hideSuggestions: () => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };
};

