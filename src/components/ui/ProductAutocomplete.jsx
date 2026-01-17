import React, { useRef, useEffect } from 'react';
import { Tag, DollarSign, Check } from 'lucide-react';
import { useProductAutocomplete } from '@/lib/useProductAutocomplete';
import { formatCLP } from '@/lib/utils';

/**
 * Componente de autocompletado para productos con sugerencias de precios
 */
const ProductAutocomplete = ({
  value,
  onChange,
  onSelect,
  products = [],
  prices = {},
  placeholder = "Buscar producto...",
  className = "",
  icon: Icon = Tag,
  showPriceInInput = false,
  hideIconWhenFilled = false
}) => {
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const {
    suggestions,
    showSuggestions,
    selectedIndex,
    handleKeyDown,
    selectSuggestion,
    hideSuggestions
  } = useProductAutocomplete(products, prices, value);

  // Cerrar sugerencias al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        hideSuggestions();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [hideSuggestions]);

  const handleInputChange = (e) => {
    onChange(e.target.value);
  };

  const handleInputKeyDown = (e) => {
    handleKeyDown(e, (productName, price) => {
      if (onSelect) {
        onSelect(productName, price);
      } else {
        onChange(productName);
      }
    });
  };

  const handleSuggestionClick = (productName, price) => {
    selectSuggestion((name, p) => {
      if (onSelect) {
        onSelect(name, p);
      } else {
        onChange(name);
      }
    }, productName, price);
    inputRef.current?.blur();
  };

  return (
    <div className="relative w-full">
      {/* Input */}
      <div className="relative group">
        <Icon
          className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-yellow-500 transition-colors ${hideIconWhenFilled && value ? 'opacity-0' : ''}`}
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              hideSuggestions();
              setTimeout(() => {
                if (suggestions.length > 0) {
                  // Reactivar sugerencias
                }
              }, 100);
            }
          }}
          className={className}
          placeholder={placeholder}
          autoComplete="off"
        />
      </div>

      {/* Dropdown de Sugerencias */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="max-h-64 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.name}-${index}`}
                type="button"
                onClick={() => handleSuggestionClick(suggestion.name, suggestion.price)}
                className={`
                  w-full px-4 py-3 text-left hover:bg-white/5 transition-colors
                  flex items-center justify-between gap-3
                  ${selectedIndex === index ? 'bg-white/5' : ''}
                  ${suggestion.hasPrice ? 'border-l-2 border-l-green-500/50' : ''}
                `}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-white font-medium truncate">
                    {suggestion.name}
                  </span>
                  {suggestion.hasPrice && (
                    <span className="text-xs text-green-400 font-mono flex-shrink-0 ml-auto">
                      {formatCLP(suggestion.price)}
                    </span>
                  )}
                </div>
                {suggestion.hasPrice && (
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
          
          {/* Footer con hint */}
          <div className="px-4 py-2 bg-black/40 border-t border-white/5">
            <p className="text-xs text-gray-500">
              Presiona <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-gray-400">Enter</kbd> para seleccionar
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductAutocomplete;

