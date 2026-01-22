import React from 'react';
import { HelpCircle, X, CheckCircle, AlertCircle, TrendingUp, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';

/**
 * HelpPanel - Panel de ayuda detallado para cada módulo
 *
 * Propiedades:
 * - title: Título del módulo
 * - description: Descripción breve
 * - whatItDoes: Qué hace este módulo
 * - whyImportant: Por qué es importante
 * - examples: Ejemplos reales (array de strings)
 * - impact: Cómo afecta al dashboard
 * - warnings: Qué pasa si se llena mal (opcional)
 */
const HelpPanel = ({ isOpen, onClose, helpContent }) => {
  const {
    title = "Ayuda",
    description = "",
    whatItDoes = "",
    whyImportant = "",
    examples = [],
    impact = "",
    warnings = ""
  } = helpContent || {};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-gray-900/98 border-yellow-500/20 p-0">
        {/* Banner Telegram */}
        <a
          href="https://t.me/+Rayp5VZ2shM2ODBh"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 text-white text-center py-2 px-4 flex items-center justify-center gap-2 hover:from-blue-500 hover:via-cyan-400 hover:to-blue-500 transition-all rounded-t-lg"
        >
          <span className="font-bold text-sm">MEJOR GRUPO DE CUADRE Y GUEBEO CHILE</span>
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
            UNETE GRATIS
            <ExternalLink className="w-3 h-3" />
          </span>
        </a>

        <div className="p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3 text-yellow-400">
            <HelpCircle className="w-7 h-7" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-gray-300 text-base">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4 text-gray-200">
          {/* ¿Qué hace este módulo? */}
          {whatItDoes && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-400 mb-2 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                ¿Qué hace este módulo?
              </h3>
              <p className="text-gray-300 leading-relaxed">{whatItDoes}</p>
            </div>
          )}

          {/* ¿Por qué es importante? */}
          {whyImportant && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                ¿Por qué es importante?
              </h3>
              <p className="text-gray-300 leading-relaxed">{whyImportant}</p>
            </div>
          )}

          {/* Ejemplos reales */}
          {examples.length > 0 && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-400 mb-3">
                📋 Ejemplos Reales
              </h3>
              <ul className="space-y-2">
                {examples.map((example, idx) => (
                  <li key={idx} className="text-gray-300 leading-relaxed pl-4 border-l-2 border-green-500/40">
                    {example}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Impacto en el dashboard */}
          {impact && (
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-purple-400 mb-2 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                ¿Cómo afecta a mis resultados?
              </h3>
              <p className="text-gray-300 leading-relaxed">{impact}</p>
            </div>
          )}

          {/* Advertencias */}
          {warnings && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-400 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                ⚠️ Importante: Errores Comunes
              </h3>
              <p className="text-gray-300 leading-relaxed">{warnings}</p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-yellow-600 hover:bg-yellow-500 text-black font-semibold"
          >
            Entendido
          </Button>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * HelpButton - Botón reutilizable para abrir el panel de ayuda
 */
export const HelpButton = ({ onClick, className = "" }) => {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="outline"
      className={`border-yellow-500/30 hover:border-yellow-500/60 hover:bg-yellow-500/10 text-yellow-400 ${className}`}
    >
      <HelpCircle className="w-4 h-4 mr-2" />
      ¿Necesitas ayuda?
    </Button>
  );
};

export default HelpPanel;
