import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';

const ProductCardGrid = ({
  products = [],         // array de productos [{id, name, list_price, current_stock_boxes}]
  selectedQuantities,    // {productId: quantity}
  onQuantityChange,      // callback (product, newQty)
  colorTheme = 'green',
  showStock = true,
  validateStock = true,  // si true, no permite seleccionar más del stock disponible
  columns = 'auto'
}) => {

  // Helper para obtener stock (soporta ambos formatos)
  const getStock = (product) => product.current_stock_boxes ?? product.currentStockBoxes ?? 0;

  // Ordenar productos: con stock primero, sin stock al final, luego alfabético
  // IMPORTANTE: NO reordenar por selección - las tarjetas deben quedarse en su lugar
  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      // Por stock (con stock primero)
      const stockA = getStock(a);
      const stockB = getStock(b);
      if (stockA > 0 && stockB <= 0) return -1;
      if (stockB > 0 && stockA <= 0) return 1;

      // Luego alfabético
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [products]); // Solo depende de products, NO de selectedQuantities

  const handleIncrement = (product) => {
    const currentQty = selectedQuantities[product.id] || 0;
    const stock = getStock(product);

    // Validar stock si es necesario
    if (validateStock && currentQty >= stock) {
      return;
    }

    onQuantityChange(product, currentQty + 1);
  };

  const handleDecrement = (product) => {
    const currentQty = selectedQuantities[product.id] || 0;
    if (currentQty > 0) {
      onQuantityChange(product, currentQty - 1);
    }
  };

  const getGridCols = () => {
    if (columns === 'auto') {
      return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5';
    }
    const colsMap = {
      2: 'grid-cols-2',
      3: 'grid-cols-2 sm:grid-cols-3',
      4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
      5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
      6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
    };
    return colsMap[columns] || colsMap[4];
  };

  if (sortedProducts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12 text-gray-500"
      >
        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No hay productos disponibles</p>
        <p className="text-xs mt-1 opacity-60">Agrega productos desde la pestaña Precios</p>
      </motion.div>
    );
  }

  return (
    <div className={`grid ${getGridCols()} gap-3`}>
      {sortedProducts.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          quantity={selectedQuantities[product.id] || 0}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          colorTheme={colorTheme}
          showStock={showStock}
          disabled={validateStock && getStock(product) <= 0}
          delay={index * 0.02}
        />
      ))}
    </div>
  );
};

export default ProductCardGrid;
