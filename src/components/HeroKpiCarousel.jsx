import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Package,
  Target,
  Banknote,
  AlertCircle,
  Sparkles,
  DollarSign,
  ShoppingBag
} from "lucide-react";
import { formatCLP } from "@/lib/utils";
import { buildBusinessSummary } from "@/lib/businessSummary";

/**
 * HeroKpiCarousel (Netflix Style)
 * - Carrusel horizontal con scroll infinito
 * - Auto-scroll suave (pausable con hover)
 * - Drag con mouse/touch
 * - Wheel scroll (trackpad)
 * - USA buildBusinessSummary() para cálculos consistentes
 */
export default function HeroKpiCarousel({
  transactions = [],
  products = [],
  prices = {},
  inventoryMap = {},
  loans = [],
  fuxionPayments = 0,
  onOpenEstadoNegocio
}) {
  const containerRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);

  // ===========
  // CÁLCULOS USANDO buildBusinessSummary (CONSISTENCIA)
  // ===========
  const summary = useMemo(() => {
    return buildBusinessSummary({
      transactions,
      inventoryMap,
      prices,
      fuxionPayments
    });
  }, [transactions, inventoryMap, prices, fuxionPayments]);

  // Métricas adicionales de préstamos
  const loanMetrics = useMemo(() => {
    const prestamosActivos = (loans || []).filter(
      (l) => l.status === "active" || !l.status
    );
    const prestamosCount = prestamosActivos.length;
    const totalPrestado = prestamosActivos.reduce(
      (sum, l) => sum + (l.quantityBoxes || 0),
      0
    );
    const valorPrestamos = prestamosActivos.reduce(
      (sum, l) => sum + ((l.quantityBoxes || 0) * (l.listPrice || 0)),
      0
    );
    return { prestamosCount, totalPrestado, valorPrestamos };
  }, [loans]);

  // ===========
  // LAS 5 TARJETAS (Netflix style)
  // ===========
  const cards = useMemo(() => {
    const { metrics, formatted } = summary;

    const balancePositive = metrics.balanceTodayWithFuxion >= 0;
    const projectionPositive = metrics.projectedProfitOrLossWithFuxion >= 0;

    // Contar alertas
    const alertsCount =
      (loanMetrics.prestamosCount > 0 ? 1 : 0) +
      (metrics.totalOtrosGastos > 0 ? 1 : 0);

    return [
      {
        id: "balance-hoy",
        title: "Balance Actual",
        value: formatted.balanceTodayWithFuxion,
        subtitle: `Recuperado ${formatted.recoveredWithFuxion} · Invertido ${formatted.totalInvestment}`,
        icon: balancePositive ? TrendingUp : TrendingDown,
        tone: balancePositive ? "success" : "danger",
        cta: "Ver Estado del Negocio",
        onClick: onOpenEstadoNegocio
      },
      {
        id: "inventario",
        title: "Inventario Disponible",
        value: formatted.stockUnits,
        subtitle: `Valor aprox: ${formatted.inventoryValueSalePrice} (precio lista)`,
        icon: Package,
        tone: "info",
        cta: "Ver detalle",
        onClick: onOpenEstadoNegocio
      },
      {
        id: "proyeccion",
        title: "Si vendo TODO el stock",
        value: formatted.projectedProfitOrLossWithFuxion,
        subtitle: `Total final: ${formatted.finalProjectionIfSellAllWithFuxion}`,
        icon: Target,
        tone: projectionPositive ? "success" : "warning",
        cta: "Abrir resumen",
        onClick: onOpenEstadoNegocio
      },
      {
        id: "ingresos",
        title: "Dinero Recuperado",
        value: formatted.recoveredWithFuxion,
        subtitle: `Ventas ${formatted.recoveredToday} · FuXion ${formatted.fuxionPayments}`,
        icon: Banknote,
        tone: "premium",
        cta: "Ver desglose",
        onClick: onOpenEstadoNegocio
      },
      {
        id: "inversion",
        title: "Inversión Total",
        value: formatted.totalInvestment,
        subtitle: `Compras ${formatted.totalCompras} · Publicidad ${formatted.totalPublicidad}`,
        icon: ShoppingBag,
        tone: "neutral",
        cta: "Ver detalle",
        onClick: onOpenEstadoNegocio
      },
      {
        id: "alertas",
        title: "Alertas Activas",
        value: alertsCount === 0 ? "0" : `${alertsCount}`,
        subtitle:
          alertsCount === 0
            ? "Todo en orden - Sin pendientes"
            : `Préstamos: ${loanMetrics.prestamosCount} · Otros gastos: ${formatCLP(metrics.totalOtrosGastos)}`,
        icon: AlertCircle,
        tone: alertsCount === 0 ? "success" : "danger",
        cta: alertsCount === 0 ? "Excelente" : "Revisar",
        onClick: onOpenEstadoNegocio
      }
    ];
  }, [summary, loanMetrics, fuxionPayments, onOpenEstadoNegocio]);

  // ===========
  // INFINITO REAL (duplicamos para loop)
  // ===========
  const infiniteCards = useMemo(() => [...cards, ...cards], [cards]);

  // ===========
  // AUTOSCROLL SUAVE
  // ===========
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let raf = null;

    const step = () => {
      // Pausar si el usuario está hover/drag
      if (!isHovering) {
        el.scrollLeft += 0.4; // velocidad suave
        // Si llega al final de la primera mitad, reinicia
        if (el.scrollLeft >= el.scrollWidth / 2) {
          el.scrollLeft = 0;
        }
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isHovering]);

  // ===========
  // WHEEL HORIZONTAL (trackpad)
  // ===========
  const handleWheel = (e) => {
    const el = containerRef.current;
    if (!el) return;

    // Convertir wheel vertical en horizontal
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  };

  // ===========
  // COLORES POR TONO
  // ===========
  const getToneClasses = (tone) => {
    switch (tone) {
      case "success":
        return {
          card: "from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/30",
          icon: "text-emerald-400",
          value: "text-emerald-400"
        };
      case "danger":
        return {
          card: "from-red-500/15 via-red-500/5 to-transparent border-red-500/30",
          icon: "text-red-400",
          value: "text-red-400"
        };
      case "warning":
        return {
          card: "from-yellow-500/15 via-yellow-500/5 to-transparent border-yellow-500/30",
          icon: "text-yellow-400",
          value: "text-yellow-400"
        };
      case "info":
        return {
          card: "from-blue-500/15 via-blue-500/5 to-transparent border-blue-500/30",
          icon: "text-blue-400",
          value: "text-blue-400"
        };
      case "premium":
        return {
          card: "from-purple-500/15 via-pink-500/5 to-transparent border-purple-500/30",
          icon: "text-purple-400",
          value: "text-purple-400"
        };
      case "neutral":
      default:
        return {
          card: "from-gray-500/15 via-gray-500/5 to-transparent border-gray-500/30",
          icon: "text-gray-400",
          value: "text-white"
        };
    }
  };

  return (
    <div className="w-full">
      {/* Header mini */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-yellow-400" />
          <p className="text-sm font-semibold text-gray-200">
            Resumen Rápido
          </p>
        </div>
        <p className="text-xs text-gray-500 hidden sm:block">
          Desliza o usa el scroll →
        </p>
      </div>

      {/* Carrusel */}
      <div
        ref={containerRef}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onWheel={handleWheel}
        className="relative flex gap-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
        style={{ scrollBehavior: "auto" }}
      >
        {infiniteCards.map((card, idx) => {
          const Icon = card.icon;
          const toneClasses = getToneClasses(card.tone);

          return (
            <motion.div
              key={`${card.id}-${idx}`}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => card.onClick?.()}
              className={`
                min-w-[260px] sm:min-w-[300px] md:min-w-[340px]
                rounded-2xl border backdrop-blur-sm
                bg-gradient-to-br ${toneClasses.card}
                p-5 shadow-xl cursor-pointer select-none
                transition-all duration-300
                hover:shadow-2xl
              `}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold truncate">
                    {card.title}
                  </p>
                  <p className={`text-2xl md:text-3xl font-black mt-2 tabular-nums ${toneClasses.value}`}>
                    {card.value}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-2 leading-relaxed line-clamp-2">
                    {card.subtitle}
                  </p>
                </div>

                <div className="w-11 h-11 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon className={`w-5 h-5 ${toneClasses.icon}`} />
                </div>
              </div>

              {/* CTA mini */}
              <div className="mt-4 pt-3 border-t border-white/5">
                <p className="text-[10px] font-semibold text-yellow-400/80 uppercase tracking-wide">
                  {card.cta} →
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Indicador de scroll */}
      <div className="flex justify-center mt-2 gap-1">
        {cards.map((card, idx) => (
          <div
            key={card.id}
            className="w-1.5 h-1.5 rounded-full bg-white/20"
          />
        ))}
      </div>
    </div>
  );
}
