import React from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTooltips } from '@/contexts/TooltipContext';

/**
 * HelpTooltip - Componente reutilizable para mostrar ayuda contextual
 *
 * Uso:
 * <HelpTooltip content="Explicación clara del campo" />
 * <HelpTooltip content="Ayuda" position="top" />
 *
 * Se oculta automáticamente si el usuario desactiva los tooltips
 */
const HelpTooltip = ({ content, position = "top", className = "" }) => {
  const { tooltipsEnabled } = useTooltips();

  // DEBUG: Log para verificar rendering
  console.log('[HelpTooltip] Rendering:', { tooltipsEnabled, content: content?.substring(0, 30) });

  // No renderizar nada si los tooltips están desactivados
  if (!tooltipsEnabled) {
    console.log('[HelpTooltip] OCULTO - tooltipsEnabled es false');
    return null;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center ml-1.5 text-gray-500 hover:text-yellow-400 transition-colors ${className}`}
            aria-label="Ayuda"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={position}
          className="max-w-xs bg-gray-950 border-yellow-500/30 text-gray-200 text-sm p-3 shadow-xl"
        >
          <p className="leading-relaxed">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default HelpTooltip;
