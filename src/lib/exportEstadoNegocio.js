/**
 * Funciones de exportación para Estado del Negocio
 * PDF usando jsPDF + Word usando docx
 * Incluye RESUMEN FINAL (modo humano) al final
 */

import { formatCLP } from './utils';

/**
 * Exportar Estado del Negocio a PDF
 * @param {Object} metrics - Métricas calculadas
 * @param {Object} user - Datos del usuario
 * @param {Object} humanSummary - Resumen humanizado de buildBusinessSummary()
 */
export const exportEstadoNegocioPDF = async (metrics, user, humanSummary = null) => {
  // Importar jsPDF dinámicamente
  const { default: jsPDF } = await import('jspdf');

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 20;

  const fechaActual = new Date().toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // ═══════════════════════════════════════════════════════════════
  // PÁGINA 1: MÉTRICAS DETALLADAS
  // ═══════════════════════════════════════════════════════════════

  // Header
  doc.setFillColor(31, 41, 55); // gray-800
  doc.rect(0, 0, pageWidth, 45, 'F');

  doc.setTextColor(250, 204, 21); // yellow-400
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('ESTADO DEL NEGOCIO', margin, y + 8);

  doc.setTextColor(156, 163, 175); // gray-400
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Resumen Ejecutivo', margin, y + 16);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.text(`Propietario: ${user?.name || user?.email || 'Usuario'}`, margin, y + 26);
  doc.text(`Generado: ${fechaActual}`, margin, y + 32);

  y = 55;

  // Función auxiliar para agregar sección
  const addSection = (title, content, color = [34, 197, 94]) => {
    doc.setFillColor(...color);
    doc.rect(margin, y, 3, 8, 'F');

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 8, y + 6);
    y += 14;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);

    content.forEach(item => {
      if (item.bold) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(31, 41, 55);
      }

      const label = item.label;
      const value = item.value;

      doc.text(label, margin + 8, y);
      doc.text(value, pageWidth - margin - doc.getTextWidth(value), y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      y += 7;
    });

    y += 8;
  };

  // Sección 1: Estado Actual
  addSection('1. Estado Actual (HOY)', [
    { label: 'Ingresos reales (Ventas + Pagos FuXion)', value: formatCLP(metrics.ingresosReales) },
    { label: 'Gastos reales (Compras + Publicidad + Salidas)', value: `-${formatCLP(metrics.gastosReales)}` },
    { label: '', value: '' },
    { label: 'GANANCIA NETA ACTUAL', value: `${metrics.gananciaNeta >= 0 ? '+' : ''}${formatCLP(metrics.gananciaNeta)}`, bold: true },
  ], [34, 197, 94]); // green

  // Desglose
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Desglose:', margin + 8, y);
  y += 6;
  doc.text(`  Ventas: ${formatCLP(metrics.totalVentas)}`, margin + 8, y);
  doc.text(`  Pagos FuXion: ${formatCLP(metrics.fuxionPayments)}`, margin + 80, y);
  y += 5;
  doc.text(`  Compras: -${formatCLP(metrics.totalCompras)}`, margin + 8, y);
  doc.text(`  Publicidad: -${formatCLP(metrics.totalPublicidad)}`, margin + 80, y);
  y += 10;

  // Sección 2: Inventario
  addSection('2. Inventario y Valor', [
    { label: 'Stock Disponible', value: `${metrics.inventarioTotal} unidades` },
    { label: 'Valor Inventario (precio lista)', value: formatCLP(metrics.valorInventario), bold: true },
    ...(metrics.totalRegalosQty > 0 ? [
      { label: 'Productos Gratis (Regalos)', value: `${metrics.totalRegalosQty} un. (${formatCLP(metrics.totalRegalosValor)})` }
    ] : [])
  ], [59, 130, 246]); // blue

  // Sección 3: Proyección
  addSection('3. Proyección (si vendo TODO)', [
    { label: 'Recuperación Potencial', value: formatCLP(metrics.recuperacionPotencial) },
    { label: 'GANANCIA POTENCIAL ESTIMADA', value: `${metrics.gananciaPotencial >= 0 ? '+' : ''}${formatCLP(metrics.gananciaPotencial)}`, bold: true },
  ], [245, 158, 11]); // yellow

  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('* Estimacion basada en precios actuales. No incluye deudas externas.', margin + 8, y);
  y += 10;

  // Sección 4: Segmentación
  addSection('4. Segmentacion de Ingresos', [
    { label: 'Ganancia por Ventas', value: formatCLP(metrics.gananciaPorVentas) },
    { label: 'Pagos FuXion (Cheques/Bonos)', value: formatCLP(metrics.fuxionPayments) },
    ...(metrics.totalRegalosValor > 0 ? [
      { label: 'Potencial en Regalos (COGS=0)', value: formatCLP(metrics.totalRegalosValor) }
    ] : [])
  ], [168, 85, 247]); // purple

  // Préstamos si existen
  if (metrics.prestamosCount > 0) {
    y += 5;
    doc.setFillColor(249, 115, 22); // orange
    doc.rect(margin, y, pageWidth - margin * 2, 12, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(`Prestamos activos: ${metrics.prestamosCount} (${metrics.totalPrestado} unidades) - Valor: ${formatCLP(metrics.valorPrestamos)}`, margin + 5, y + 8);
    y += 18;
  }

  // ═══════════════════════════════════════════════════════════════
  // SECCIÓN 5: RESUMEN FINAL (MODO HUMANO)
  // ═══════════════════════════════════════════════════════════════

  if (humanSummary) {
    // Verificar si necesitamos nueva página
    if (y > pageHeight - 120) {
      doc.addPage();
      y = 20;
    }

    // Título de sección con fondo destacado
    doc.setFillColor(250, 204, 21); // yellow-400
    doc.rect(margin, y, pageWidth - margin * 2, 12, 'F');
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('5. RESUMEN FINAL (en simple)', margin + 5, y + 8);
    y += 20;

    // Bloque 1: Estado al día de hoy
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 35, 3, 3, 'F');

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Estado al dia de hoy', margin + 5, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(`Has recuperado (ventas): ${humanSummary.formatted.recoveredToday}`, margin + 5, y + 17);
    doc.text(`Has invertido (compras + gastos): ${humanSummary.formatted.totalInvestment}`, margin + 5, y + 24);

    doc.setFont('helvetica', 'bold');
    const balanceColor = humanSummary.metrics.balanceToday >= 0 ? [34, 197, 94] : [239, 68, 68];
    doc.setTextColor(...balanceColor);
    doc.text(`Balance actual: ${humanSummary.formatted.balanceTodayWithSign}`, margin + 5, y + 31);

    y += 42;

    // Bloque 2: Stock disponible
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 25, 3, 3, 'F');

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Stock disponible', margin + 5, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(`Te quedan en inventario: ${humanSummary.formatted.stockUnits}`, margin + 5, y + 17);
    doc.text(`Valor a precio lista: ${humanSummary.formatted.inventoryValueSalePrice}`, margin + 100, y + 17);

    y += 32;

    // Bloque 3: Resultado final
    doc.setFillColor(240, 240, 240);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 25, 3, 3, 'F');

    doc.setTextColor(31, 41, 55);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resultado final estimado', margin + 5, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99);
    doc.text(`Si vendes TODO, tendrias: ${humanSummary.formatted.finalProjectionIfSellAll}`, margin + 5, y + 17);

    const profitColor = humanSummary.metrics.projectedProfitOrLoss >= 0 ? [34, 197, 94] : [239, 68, 68];
    doc.setTextColor(...profitColor);
    doc.setFont('helvetica', 'bold');
    doc.text(`Resultado: ${humanSummary.formatted.projectedProfitOrLoss}`, margin + 100, y + 17);

    y += 32;

    // Veredicto final con recuadro destacado
    const verdictBgColor = humanSummary.humanText.verdictType === 'positive'
      ? [220, 252, 231] // green-100
      : humanSummary.humanText.verdictType === 'negative'
        ? [254, 226, 226] // red-100
        : [254, 249, 195]; // yellow-100

    const verdictTextColor = humanSummary.humanText.verdictType === 'positive'
      ? [22, 163, 74] // green-600
      : humanSummary.humanText.verdictType === 'negative'
        ? [220, 38, 38] // red-600
        : [202, 138, 4]; // yellow-600

    doc.setFillColor(...verdictBgColor);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 20, 3, 3, 'F');

    doc.setTextColor(...verdictTextColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');

    // Icono según tipo
    const icon = humanSummary.humanText.verdictType === 'positive' ? '✓' : humanSummary.humanText.verdictType === 'negative' ? '!' : '?';
    doc.text(icon, margin + 5, y + 13);

    // Texto del veredicto (puede ser largo, lo dividimos)
    const verdictLines = doc.splitTextToSize(humanSummary.humanText.verdictText, pageWidth - margin * 2 - 20);
    doc.text(verdictLines, margin + 15, y + 13);

    y += 28;

    // Nota sobre pagos FuXion
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129); // emerald
    doc.setFont('helvetica', 'normal');
    const fuxionNote = `Nota: ${humanSummary.humanText.fuxionNoteText}`;
  const fuxionLines = doc.splitTextToSize(fuxionNote, pageWidth - margin * 2 - 10);
  doc.text(fuxionLines, margin + 5, y);

  // Bloque de explicación de pérdida (solo si hay pérdida)
  if (metrics.gananciaNeta < 0) {
    y += 20;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(239, 68, 68); // red
    doc.text('📉 ¿Por qué tengo una pérdida?', margin, y);

    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(229, 231, 235); // light gray
    const lossText = `Pérdida actual: ${formatCLP(metrics.perdidaAbsoluta)}. No es un error: se debe a gastos reales o inversión aún no recuperada.`;
    const lossLines = doc.splitTextToSize(lossText, pageWidth - margin * 2);
    doc.text(lossLines, margin, y);

    y += lossLines.length * 5 + 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Se explica por:', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    if (metrics.totalPublicidad > 0) {
      doc.text(`• Publicidad: ${formatCLP(metrics.totalPublicidad)}`, margin, y); y += 5;
    }
    if (metrics.totalPersonalUse > 0) {
      doc.text(`• Consumo personal: ${formatCLP(metrics.totalPersonalUse)}`, margin, y); y += 5;
    }
    if (metrics.totalMarketingSamples > 0) {
      doc.text(`• Muestras/Regalos entregados: ${formatCLP(metrics.totalMarketingSamples)}`, margin, y); y += 5;
    }
    if (metrics.inversionNoRecuperada > 0) {
      doc.text(`• Inversión no recuperada (stock pendiente de vender): ${formatCLP(metrics.inversionNoRecuperada)}`, margin, y); y += 5;
    }
    y += 6;
    doc.setFont('helvetica', 'italic');
    const calmLines = doc.splitTextToSize('Esta pérdida es temporal: tienes inventario y gastos que se recuperan al vender. Si faltan pagos de FuXion, agrégalos para reflejar el balance completo.', pageWidth - margin * 2);
    doc.text(calmLines, margin, y);
  }
}

  // Footer
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(229, 231, 235);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  doc.setFontSize(8);
  doc.setTextColor(156, 163, 175);
  doc.text('Gestion de Operaciones - Reporte informativo basado en registros del sistema', pageWidth / 2, footerY, { align: 'center' });

  // Descargar
  const fileName = `Estado_Negocio_${user?.name || 'Reporte'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

/**
 * Exportar Estado del Negocio a Word (DOCX)
 * @param {Object} metrics - Métricas calculadas
 * @param {Object} user - Datos del usuario
 * @param {Object} humanSummary - Resumen humanizado de buildBusinessSummary()
 */
export const exportEstadoNegocioDOCX = async (metrics, user, humanSummary = null) => {
  // Importar docx dinámicamente
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel, ShadingType } = await import('docx');

  const fechaActual = new Date().toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Función para crear una fila de tabla simple
  const createTableRow = (label, value, bold = false) => {
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 60, type: WidthType.PERCENTAGE },
          children: [new Paragraph({
            children: [new TextRun({ text: label, size: 22 })]
          })]
        }),
        new TableCell({
          width: { size: 40, type: WidthType.PERCENTAGE },
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: value, size: 22, bold })]
          })]
        })
      ]
    });
  };

  // Construir children del documento
  const documentChildren = [
    // Header
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({
          text: 'ESTADO DEL NEGOCIO',
          bold: true,
          size: 48,
          color: '1F2937'
        })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Resumen Ejecutivo', size: 24, color: '6B7280', italics: true })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Propietario: ${user?.name || user?.email || 'Usuario'}`, size: 22 })
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Generado: ${fechaActual}`, size: 20, color: '9CA3AF' })
      ],
      spacing: { after: 400 }
    }),

    // Sección 1
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: '1. Estado Actual (HOY)', bold: true, size: 28, color: '22C55E' })]
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.SINGLE, color: 'E5E7EB', size: 1 },
        insideVertical: { style: BorderStyle.NONE }
      },
      rows: [
        createTableRow('Ingresos reales (Ventas + Pagos FuXion)', formatCLP(metrics.ingresosReales)),
        createTableRow('Gastos reales (Compras + Publicidad + Salidas)', `-${formatCLP(metrics.gastosReales)}`),
        createTableRow('GANANCIA NETA ACTUAL', `${metrics.gananciaNeta >= 0 ? '+' : ''}${formatCLP(metrics.gananciaNeta)}`, true),
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Desglose: Ventas ${formatCLP(metrics.totalVentas)} | Pagos FuXion ${formatCLP(metrics.fuxionPayments)} | Compras -${formatCLP(metrics.totalCompras)} | Publicidad -${formatCLP(metrics.totalPublicidad)}`, size: 18, color: '6B7280' })
      ],
      spacing: { after: 300 }
    }),

    // Sección 2
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: '2. Inventario y Valor', bold: true, size: 28, color: '3B82F6' })]
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.SINGLE, color: 'E5E7EB', size: 1 },
        insideVertical: { style: BorderStyle.NONE }
      },
      rows: [
        createTableRow('Stock Disponible', `${metrics.inventarioTotal} unidades`),
        createTableRow('Valor Inventario (precio lista)', formatCLP(metrics.valorInventario), true),
        ...(metrics.totalRegalosQty > 0 ? [
          createTableRow('Productos Gratis (Regalos)', `${metrics.totalRegalosQty} un. (${formatCLP(metrics.totalRegalosValor)})`)
        ] : [])
      ]
    }),
    new Paragraph({ spacing: { after: 300 } }),

    // Sección 3
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: '3. Proyeccion (si vendo TODO el inventario)', bold: true, size: 28, color: 'F59E0B' })]
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.SINGLE, color: 'E5E7EB', size: 1 },
        insideVertical: { style: BorderStyle.NONE }
      },
      rows: [
        createTableRow('Recuperacion Potencial', formatCLP(metrics.recuperacionPotencial)),
        createTableRow('GANANCIA POTENCIAL ESTIMADA', `${metrics.gananciaPotencial >= 0 ? '+' : ''}${formatCLP(metrics.gananciaPotencial)}`, true),
      ]
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '* Estimacion basada en precios actuales. No incluye deudas externas.', size: 18, color: '9CA3AF', italics: true })
      ],
      spacing: { after: 300 }
    }),

    // Sección 4
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [new TextRun({ text: '4. Segmentacion de Ingresos', bold: true, size: 28, color: 'A855F7' })]
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.SINGLE, color: 'E5E7EB', size: 1 },
        insideVertical: { style: BorderStyle.NONE }
      },
      rows: [
        createTableRow('Ganancia por Ventas', formatCLP(metrics.gananciaPorVentas)),
        createTableRow('Pagos FuXion (Cheques/Bonos)', formatCLP(metrics.fuxionPayments)),
        ...(metrics.totalRegalosValor > 0 ? [
          createTableRow('Potencial en Regalos (COGS=0)', formatCLP(metrics.totalRegalosValor))
        ] : [])
      ]
    }),

    // Préstamos
    ...(metrics.prestamosCount > 0 ? [
      new Paragraph({ spacing: { after: 200 } }),
      new Paragraph({
        shading: { type: ShadingType.SOLID, fill: 'FEF3C7' },
        children: [
          new TextRun({ text: `⚠ Prestamos activos: ${metrics.prestamosCount} (${metrics.totalPrestado} unidades) - Valor: ${formatCLP(metrics.valorPrestamos)}`, size: 22, color: 'D97706' })
        ]
      })
    ] : [])
  ];

  // ═══════════════════════════════════════════════════════════════
  // SECCIÓN 5: RESUMEN FINAL (MODO HUMANO)
  // ═══════════════════════════════════════════════════════════════

  if (humanSummary) {
    // Determinar colores según veredicto
    const verdictColor = humanSummary.humanText.verdictType === 'positive'
      ? '16A34A'
      : humanSummary.humanText.verdictType === 'negative'
        ? 'DC2626'
        : 'CA8A04';

    const verdictBgColor = humanSummary.humanText.verdictType === 'positive'
      ? 'DCFCE7'
      : humanSummary.humanText.verdictType === 'negative'
        ? 'FEE2E2'
        : 'FEF9C3';

    const balanceColor = humanSummary.metrics.balanceToday >= 0 ? '16A34A' : 'DC2626';
    const profitColor = humanSummary.metrics.projectedProfitOrLoss >= 0 ? '16A34A' : 'DC2626';

    documentChildren.push(
      new Paragraph({ spacing: { after: 400 } }),

      // Título de sección
      new Paragraph({
        shading: { type: ShadingType.SOLID, fill: 'FACC15' },
        children: [
          new TextRun({ text: '5. RESUMEN FINAL (en simple)', bold: true, size: 28, color: '1F2937' })
        ],
        spacing: { after: 200 }
      }),

      // Bloque 1: Estado al día de hoy
      new Paragraph({
        shading: { type: ShadingType.SOLID, fill: 'F3F4F6' },
        children: [
          new TextRun({ text: 'ESTADO AL DIA DE HOY', bold: true, size: 20, color: '374151' })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Has recuperado (ventas realizadas): `, size: 22, color: '4B5563' }),
          new TextRun({ text: humanSummary.formatted.recoveredToday, size: 22, bold: true, color: '16A34A' })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Has invertido (compras + gastos): `, size: 22, color: '4B5563' }),
          new TextRun({ text: humanSummary.formatted.totalInvestment, size: 22, bold: true, color: 'DC2626' })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Balance actual: `, size: 22, color: '4B5563' }),
          new TextRun({ text: humanSummary.formatted.balanceTodayWithSign, size: 24, bold: true, color: balanceColor })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: humanSummary.humanText.balanceTodayText, size: 20, italics: true, color: '6B7280' })
        ],
        spacing: { after: 300 }
      }),

      // Bloque 2: Stock disponible
      new Paragraph({
        shading: { type: ShadingType.SOLID, fill: 'F3F4F6' },
        children: [
          new TextRun({ text: 'STOCK DISPONIBLE', bold: true, size: 20, color: '374151' })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Te quedan en inventario: `, size: 22, color: '4B5563' }),
          new TextRun({ text: humanSummary.formatted.stockUnits, size: 22, bold: true, color: '3B82F6' })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Valor si los vendes a precio lista: `, size: 22, color: '4B5563' }),
          new TextRun({ text: humanSummary.formatted.inventoryValueSalePrice, size: 22, bold: true, color: 'F59E0B' })
        ],
        spacing: { after: 300 }
      }),

      // Bloque 3: Resultado final
      new Paragraph({
        shading: { type: ShadingType.SOLID, fill: 'F3F4F6' },
        children: [
          new TextRun({ text: 'RESULTADO FINAL ESTIMADO', bold: true, size: 20, color: '374151' })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Si vendes TODO tu inventario, tendrias: `, size: 22, color: '4B5563' }),
          new TextRun({ text: humanSummary.formatted.finalProjectionIfSellAll, size: 22, bold: true, color: 'F59E0B' })
        ]
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Comparado contra tu inversion: `, size: 22, color: '4B5563' }),
          new TextRun({ text: humanSummary.formatted.projectedProfitOrLoss, size: 24, bold: true, color: profitColor })
        ],
        spacing: { after: 300 }
      }),

      // Veredicto final
      new Paragraph({
        shading: { type: ShadingType.SOLID, fill: verdictBgColor },
        border: {
          top: { style: BorderStyle.SINGLE, size: 12, color: verdictColor },
          bottom: { style: BorderStyle.SINGLE, size: 12, color: verdictColor },
          left: { style: BorderStyle.SINGLE, size: 12, color: verdictColor },
          right: { style: BorderStyle.SINGLE, size: 12, color: verdictColor }
        },
        children: [
          new TextRun({
            text: humanSummary.humanText.verdictType === 'positive' ? '✓ ' : humanSummary.humanText.verdictType === 'negative' ? '⚠ ' : '? ',
            size: 28,
            bold: true,
            color: verdictColor
          }),
          new TextRun({
            text: humanSummary.humanText.verdictText,
            size: 24,
            bold: true,
            color: verdictColor
          })
        ],
        spacing: { after: 300 }
      }),

      // Nota sobre FuXion
      new Paragraph({
        shading: { type: ShadingType.SOLID, fill: 'D1FAE5' },
        children: [
          new TextRun({ text: 'Nota sobre Pagos FuXion: ', size: 20, bold: true, color: '059669' }),
          new TextRun({ text: humanSummary.humanText.fuxionNoteText, size: 20, color: '047857' })
        ],
        spacing: { after: 400 }
      })
    );
  }

  // Footer
  documentChildren.push(
    new Paragraph({ spacing: { after: 600 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, color: 'E5E7EB', size: 1 } },
      children: [
        new TextRun({ text: 'Gestion de Operaciones - Reporte informativo basado en registros del sistema', size: 18, color: '9CA3AF' })
      ]
    })
  );

  const doc = new Document({
    sections: [{
      properties: {},
      children: documentChildren
    }]
  });

  // Generar y descargar
  const blob = await Packer.toBlob(doc);
  const fileName = `Estado_Negocio_${user?.name || 'Reporte'}_${new Date().toISOString().split('T')[0]}.docx`;

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
};
