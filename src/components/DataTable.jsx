
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ArrowUpRight, ArrowDownRight, Megaphone, Inbox, Pencil, X, Check, ChevronDown, ChevronUp, CheckSquare, Square, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatCLP } from '@/lib/utils';

const INITIAL_VISIBLE_ROWS = 5; // Mostrar solo 5 registros inicialmente

const DataTable = ({ transactions, onDelete, onDeleteMultiple, onEditAmount, typeFilter, title, icon: Icon, color }) => {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const handleDelete = (id) => {
    onDelete(id);
    toast({
      title: "Registro Eliminado",
      description: "La transacción ha sido removida correctamente.",
      className: "bg-red-900 border-red-600 text-white"
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;

    const idsToDelete = Array.from(selectedIds);

    // Si existe onDeleteMultiple, usarlo; sino eliminar uno por uno
    if (onDeleteMultiple) {
      await onDeleteMultiple(idsToDelete);
    } else {
      for (const id of idsToDelete) {
        await onDelete(id);
      }
    }

    toast({
      title: `${idsToDelete.length} Registros Eliminados`,
      description: "Las transacciones seleccionadas han sido removidas.",
      className: "bg-red-900 border-red-600 text-white"
    });

    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const handleStartEdit = (transaction) => {
    setEditingId(transaction.id);
    setEditAmount(transaction.total || transaction.totalAmount || 0);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAmount('');
  };

  const handleSaveEdit = async (id) => {
    const newAmount = parseFloat(editAmount);
    if (isNaN(newAmount) || newAmount < 0) {
      toast({
        title: "Monto Inválido",
        description: "Ingresa un monto válido mayor o igual a 0.",
        variant: "destructive"
      });
      return;
    }

    if (onEditAmount) {
      await onEditAmount(id, newAmount);
      toast({
        title: "Monto Actualizado",
        description: `El monto final ha sido actualizado a ${formatCLP(newAmount)}`,
        className: "bg-green-900 border-green-600 text-white"
      });
    }

    setEditingId(null);
    setEditAmount('');
  };

  // Toggle selección de un item
  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Seleccionar/deseleccionar todos los visibles
  const toggleSelectAll = () => {
    const visibleIds = visibleTransactions.map(t => t.id);
    const allSelected = visibleIds.every(id => selectedIds.has(id));

    if (allSelected) {
      // Deseleccionar todos
      const newSelected = new Set(selectedIds);
      visibleIds.forEach(id => newSelected.delete(id));
      setSelectedIds(newSelected);
    } else {
      // Seleccionar todos los visibles
      const newSelected = new Set(selectedIds);
      visibleIds.forEach(id => newSelected.add(id));
      setSelectedIds(newSelected);
    }
  };

  // Cancelar modo selección
  const cancelSelection = () => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  // Filtrar por tipo, soportando múltiples tipos equivalentes
  const filteredTransactions = transactions
    .filter(t => {
      // Para publicidad, aceptar tanto 'publicidad' como 'advertising'
      if (typeFilter === 'publicidad' || typeFilter === 'advertising') {
        return t.type === 'publicidad' || t.type === 'advertising';
      }
      // Para compras, aceptar tanto 'compra' como 'purchase'
      if (typeFilter === 'compra' || typeFilter === 'purchase') {
        return t.type === 'compra' || t.type === 'purchase';
      }
      // Para ventas, aceptar tanto 'venta' como 'sale'
      if (typeFilter === 'venta' || typeFilter === 'sale') {
        return t.type === 'venta' || t.type === 'sale';
      }
      // Para salidas (consumo personal, muestras, etc.)
      if (typeFilter === 'salidas' || typeFilter === 'exits') {
        return t.type === 'personal_consumption' || t.type === 'marketing_sample' || t.type === 'box_opening';
      }
      return t.type === typeFilter;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const colorClasses = {
    red: "text-red-400",
    green: "text-green-400",
    blue: "text-blue-400"
  };
  const accentColor = colorClasses[color] || "text-gray-400";

  // Verificar si es tabla de publicidad
  const isAdvertising = typeFilter === 'publicidad' || typeFilter === 'advertising';

  // Determinar registros visibles
  const hasMoreRows = filteredTransactions.length > INITIAL_VISIBLE_ROWS;
  const visibleTransactions = isExpanded
    ? filteredTransactions
    : filteredTransactions.slice(0, INITIAL_VISIBLE_ROWS);
  const hiddenCount = filteredTransactions.length - INITIAL_VISIBLE_ROWS;

  // Estado del checkbox "seleccionar todos"
  const visibleIds = visibleTransactions.map(t => t.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some(id => selectedIds.has(id));

  if (filteredTransactions.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gray-950/30 rounded-2xl border border-dashed border-gray-800 p-12">
        <div className="p-4 bg-gray-900 rounded-full mb-4">
            <Inbox className="w-8 h-8 opacity-30" />
        </div>
        <p className="text-lg font-medium">No hay registros de {title.toLowerCase()}</p>
        <p className="text-sm mt-1 opacity-60">Comienza agregando datos desde el formulario.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full flex flex-col bg-gray-900/40 border border-white/5 rounded-2xl overflow-hidden shadow-lg relative"
    >
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-white/5 flex items-center justify-between bg-gray-900/40">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Icon className={`w-5 h-5 ${accentColor}`} />
          <span className="hidden sm:inline">{title}</span>
          <span className="sm:hidden">{title.split(' ')[0]}</span>
        </h3>
        <div className="flex items-center gap-2">
          {/* Botón activar modo selección */}
          {!isSelectionMode ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSelectionMode(true)}
              className="text-gray-400 hover:text-white text-xs gap-1.5"
            >
              <CheckSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Seleccionar</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelSelection}
              className="text-gray-400 hover:text-white text-xs gap-1.5"
            >
              <X className="w-4 h-4" />
              Cancelar
            </Button>
          )}
          <span className="text-xs font-medium px-2.5 py-1 bg-white/5 rounded-md text-gray-400 border border-white/5">
            {filteredTransactions.length}
          </span>
        </div>
      </div>

      {/* Barra de acciones cuando hay seleccionados */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-950/50 border-b border-red-500/20 overflow-hidden"
          >
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-red-300">
                {selectedIds.size} {selectedIds.size === 1 ? 'registro seleccionado' : 'registros seleccionados'}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelSelection}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar ({selectedIds.size})
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-auto flex-grow scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-black/20 text-gray-400 font-semibold sticky top-0 backdrop-blur-md z-10">
            <tr>
              {/* Columna checkbox */}
              {isSelectionMode && (
                <th className="px-3 py-4 w-10">
                  <button
                    onClick={toggleSelectAll}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    {allVisibleSelected ? (
                      <CheckSquare className="w-4 h-4 text-purple-400" />
                    ) : someVisibleSelected ? (
                      <Minus className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Square className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </th>
              )}
              <th className="px-4 sm:px-6 py-4 font-medium tracking-wider">Fecha</th>
              <th className="px-4 sm:px-6 py-4 font-medium tracking-wider">Item</th>
              <th className="px-4 sm:px-6 py-4 font-medium tracking-wider text-right">Cant.</th>
              <th className="px-4 sm:px-6 py-4 font-medium tracking-wider text-right">Total</th>
              <th className="hidden sm:table-cell px-6 py-4 font-medium tracking-wider text-center">Detalles</th>
              {!isSelectionMode && (
                <th className="px-4 sm:px-6 py-4 font-medium tracking-wider text-center">Acción</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {visibleTransactions.map((t) => {
              const isSelected = selectedIds.has(t.id);
              return (
                <tr
                  key={t.id}
                  className={`hover:bg-white/5 transition-colors group ${isSelected ? 'bg-purple-500/10' : ''}`}
                  onClick={isSelectionMode ? () => toggleSelect(t.id) : undefined}
                  style={isSelectionMode ? { cursor: 'pointer' } : undefined}
                >
                  {/* Checkbox */}
                  {isSelectionMode && (
                    <td className="px-3 py-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSelect(t.id); }}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </td>
                  )}
                  <td className="px-4 sm:px-6 py-4 text-gray-400 whitespace-nowrap font-mono text-xs">
                    {new Date(t.date).toLocaleDateString()}
                    <span className="block text-gray-600 mt-0.5">{new Date(t.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 font-medium text-white">
                    <span className="line-clamp-1">
                      {(t.type === 'publicidad' || t.type === 'advertising') ? (t.campaignName || 'Campaña sin nombre') : t.productName}
                    </span>
                    <div className="text-[10px] text-gray-500 mt-1 max-w-[150px] sm:max-w-[200px] truncate">
                      {t.description || t.notes || ''}
                    </div>
                    {(t.type === 'venta' || t.type === 'sale') && t.campaignName && (
                        <span className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-900/30 text-blue-300 border border-blue-800/30">
                          {t.campaignName}
                        </span>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right text-gray-300 font-mono">
                    {t.quantity || '-'}
                  </td>
                  <td className={`px-4 sm:px-6 py-4 text-right font-bold font-mono ${accentColor}`}>
                    {editingId === t.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-gray-500">$</span>
                        <input
                          type="number"
                          value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)}
                          className="w-20 sm:w-24 bg-black/40 border border-blue-500/50 rounded px-2 py-1 text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(t.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                      </div>
                    ) : (
                      formatCLP(t.total)
                    )}
                  </td>
                  <td className="hidden sm:table-cell px-6 py-4 text-center text-xs">
                    {t.freeUnits ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            +{t.freeUnits} Gratis
                        </span>
                    ) : <span className="text-gray-600">-</span>}
                  </td>
                  {!isSelectionMode && (
                    <td className="px-4 sm:px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {editingId === t.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSaveEdit(t.id)}
                              className="text-green-500 hover:text-green-400 hover:bg-green-900/20 h-8 w-8 p-0"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEdit}
                              className="text-gray-500 hover:text-gray-400 hover:bg-gray-900/20 h-8 w-8 p-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            {/* Botón editar solo para publicidad */}
                            {isAdvertising && onEditAmount && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEdit(t)}
                                className="text-gray-500 hover:text-blue-400 hover:bg-blue-900/20 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Editar monto final (IVA, comisiones bancarias)"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(t.id)}
                              className="text-gray-500 hover:text-red-400 hover:bg-red-900/20 h-8 w-8 p-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Botón expandir/colapsar */}
      {hasMoreRows && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-gray-400 hover:text-white bg-gray-900/60 hover:bg-gray-800/60 border-t border-white/5 transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Mostrar menos
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Ver {hiddenCount} registros más
            </>
          )}
        </button>
      )}

      {/* Nota para publicidad */}
      {isAdvertising && onEditAmount && (
        <div className="px-4 py-2 bg-blue-500/5 border-t border-blue-500/10">
          <p className="text-xs text-blue-300/70">
            💡 Puedes editar el monto final de cada campaña para incluir IVA y comisiones bancarias
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default DataTable;
