/**
 * Contenido de ayuda para todos los módulos
 * Lenguaje simple, orientado a negocios, sin tecnicismos
 */

// ========================================
// MÓDULO: COMPRAS (PURCHASES)
// ========================================
export const purchasesHelp = {
  title: "Módulo de Compras",
  description: "Registra las compras de productos que haces a tu proveedor",
  whatItDoes: "Este módulo te permite registrar cada vez que compras inventario. Es como llevar un registro de cuánto dinero gastas en reponer tu stock y cuántas unidades recibes.",
  whyImportant: "Registrar tus compras es fundamental para saber cuánto dinero inviertes en tu negocio y controlar tu inventario. Sin este registro, no sabrías cuánto te cuesta realmente cada producto ni cuánta ganancia obtienes al venderlo.",
  examples: [
    "Compré 10 cajas de Omnilife a $25,000 cada una el 15 de enero → Total: $250,000",
    "Mi proveedor me regaló 2 cajas adicionales por comprar 8 cajas → Registro 8 pagadas + 2 gratis",
    "Compré 5 cajas del producto X y 3 cajas del producto Y en el mismo pedido → Registro cada producto por separado"
  ],
  impact: "Cada compra que registras aumenta tu 'Inversión en Compras' en el dashboard y añade ese producto a tu inventario disponible. También afecta tu 'Costo Unitario Real' y tu 'Ganancia Neta' cuando vendas.",
  warnings: "Si no registras una compra, tu inventario quedará incorrecto y no sabrás cuánto dinero realmente gastaste. Si registras el precio equivocado, tus ganancias aparecerán mal calculadas."
};

// Tooltips para campos de Compras
export const purchasesFieldHelp = {
  product: "Selecciona el producto que estás comprando. Si no existe, primero debes crearlo en la sección de Precios.",
  quantity: "Número de CAJAS que estás comprando y PAGANDO a tu proveedor. No incluyas las unidades gratis aquí.",
  unitCost: "Precio por CAJA que te cobra tu proveedor. Por ejemplo: si te cobran $25,000 por caja, escribe 25000.",
  freeUnits: "Si tu proveedor te regala cajas adicionales (promoción 4x1, bonificación, etc.), escribe cuántas cajas gratis recibes. Esto aumenta tu inventario sin aumentar tu costo.",
  total: "Se calcula automáticamente: Cantidad × Precio Unitario. Este es el dinero total que pagas al proveedor.",
  notes: "Opcional. Puedes escribir detalles adicionales: número de factura, nombre del proveedor, condiciones especiales, etc."
};

// ========================================
// MÓDULO: PUBLICIDAD (ADVERTISING)
// ========================================
export const advertisingHelp = {
  title: "Módulo de Publicidad",
  description: "Registra los gastos en anuncios de Facebook, Instagram, Google y otras plataformas",
  whatItDoes: "Aquí registras todo el dinero que inviertes en publicidad para atraer clientes. Puedes crear diferentes campañas y ver cuál te genera más ventas.",
  whyImportant: "La publicidad es una inversión. Necesitas saber cuánto gastas en cada campaña y cuántas ventas genera para calcular si es rentable o si estás perdiendo dinero.",
  examples: [
    "Gasté $50,000 en anuncios de Facebook durante enero para promocionar el producto X",
    "Invertí $20,000 en publicidad de Instagram y generé $80,000 en ventas → ROI positivo",
    "Creé una campaña llamada 'Verano 2024' con $100,000 de presupuesto para ver cuántas ventas trae"
  ],
  impact: "El gasto en publicidad reduce tu 'Ganancia Neta'. El sistema calcula automáticamente el ROI (retorno de inversión) de cada campaña: cuánto vendes por cada peso que gastas en anuncios.",
  warnings: "Si no registras tus gastos de publicidad, tus ganancias aparecerán infladas (más altas de lo que realmente son). Si no asocias las ventas a la campaña correcta, no sabrás qué publicidad funciona."
};

export const advertisingFieldHelp = {
  campaignName: "Nombre que le das a tu campaña publicitaria. Ejemplos: 'Facebook Enero', 'Instagram Producto X', 'Google Ads Verano'. Úsalo para identificar y comparar campañas.",
  amount: "Dinero total que gastaste en esta campaña. Ejemplo: si pagaste $50,000 a Facebook por anuncios, escribe 50000.",
  platform: "Dónde publicaste: Facebook, Instagram, Google, TikTok, etc. Te ayuda a saber qué plataforma funciona mejor.",
  startDate: "Fecha en que empezó la campaña publicitaria.",
  endDate: "Fecha en que terminó la campaña (opcional, si ya finalizó).",
  notes: "Opcional. Puedes escribir detalles: objetivo de la campaña, público objetivo, tipo de anuncio, etc."
};

// ========================================
// MÓDULO: VENTAS (SALES)
// ========================================
export const salesHelp = {
  title: "Módulo de Ventas",
  description: "Registra cada venta que realizas a tus clientes",
  whatItDoes: "Cada vez que vendes un producto, lo registras aquí. El sistema automáticamente reduce tu inventario, suma el ingreso y calcula tu ganancia real.",
  whyImportant: "Las ventas son tu fuente de ingresos. Sin registrarlas, no sabes cuánto dinero entra a tu negocio, cuánto inventario te queda ni cuál es tu ganancia real.",
  examples: [
    "Vendí 2 cajas del producto X a $35,000 cada una → Total: $70,000. Mi inventario baja en 2 cajas.",
    "Un cliente compró 1 caja por $35,000. Llegó desde mi campaña de Facebook 'Verano 2024'.",
    "Vendí 1 caja + 5 sobres sueltos del mismo producto por un total de $40,000"
  ],
  impact: "Cada venta aumenta tus 'Ventas Totales' y tu 'Ganancia Neta' en el dashboard. Reduce tu inventario disponible. Si asocias la venta a una campaña, se suma al ROI de esa campaña.",
  warnings: "Si no registras una venta, no sabrás cuánto dinero ingresó y tu inventario quedará incorrecto. Si registras el producto equivocado, tu inventario de ese producto quedará mal."
};

export const salesFieldHelp = {
  product: "Producto que estás vendiendo. Debe existir en tu catálogo y tener stock disponible.",
  quantityBoxes: "Número de CAJAS completas que vendes al cliente. Si vendes 2 cajas, escribe 2.",
  quantitySachets: "Número de SOBRES SUELTOS que vendes (si aplica). Si vendes solo cajas completas, déjalo en 0.",
  totalAmount: "Dinero total que recibes del cliente. Ejemplo: si vendes 2 cajas a $35,000 cada una, escribe 70000.",
  campaign: "Si esta venta vino de una campaña publicitaria específica, selecciónala. Si es venta orgánica (sin anuncios), deja en 'Orgánico'.",
  paymentMethod: "Forma de pago: Efectivo, Transferencia, Tarjeta, etc. Te ayuda a controlar cómo recibes tu dinero.",
  client: "Nombre del cliente (opcional). Útil para saber quiénes son tus mejores clientes.",
  notes: "Opcional. Puedes escribir detalles adicionales: descuentos aplicados, promociones, etc."
};

// ========================================
// MÓDULO: SALIDAS / GASTOS (EXITS)
// ========================================
export const exitsHelp = {
  title: "Módulo de Salidas y Gastos",
  description: "Registra gastos operativos del negocio: envíos, comisiones, servicios, etc.",
  whatItDoes: "Aquí registras todos los gastos que no son compras de inventario ni publicidad. Por ejemplo: envíos, comisiones a vendedores, servicios, mantenimiento, etc.",
  whyImportant: "Estos gastos reducen tu ganancia real. Si no los registras, creerás que ganas más dinero del que realmente queda en tu bolsillo.",
  examples: [
    "Pagué $5,000 de envío para entregar un pedido a un cliente en otra ciudad",
    "Di $10,000 de comisión a mi vendedor por cerrar una venta grande",
    "Pagué $3,000 de servicio de internet para mi negocio este mes",
    "Gasté $2,000 en embalaje y cajas para enviar productos"
  ],
  impact: "Cada salida reduce tu 'Ganancia Neta' en el dashboard. Es importante registrarlas para ver cuánto dinero realmente te queda después de todos los gastos.",
  warnings: "Si no registras estos gastos, tus ganancias aparecerán infladas. Podrías pensar que ganas $100,000 cuando en realidad solo te quedan $70,000 después de pagar envíos y comisiones."
};

export const exitsFieldHelp = {
  category: "Tipo de gasto: Envío, Comisión, Servicios, Mantenimiento, Otros. Te ayuda a clasificar y analizar tus gastos.",
  amount: "Dinero total que pagaste. Ejemplo: si pagaste $5,000 de envío, escribe 5000.",
  description: "Descripción clara del gasto. Ejemplo: 'Envío a cliente en Bogotá', 'Comisión vendedor Juan', 'Internet del mes'.",
  date: "Fecha en que realizaste el gasto.",
  notes: "Opcional. Detalles adicionales que quieras recordar."
};

// ========================================
// MÓDULO: PRÉSTAMOS (LOANS)
// ========================================
export const loansHelp = {
  title: "Módulo de Préstamos",
  description: "Registra productos que prestas a vendedores, distribuidores o socios",
  whatItDoes: "Cuando prestas productos a alguien (para que los venda y te pague después), lo registras aquí. El sistema controla quién tiene tus productos y cuándo te deben pagar.",
  whyImportant: "Los préstamos son productos que salieron de tu inventario pero no te han pagado todavía. Necesitas controlarlos para saber quién te debe y cuándo esperas el pago.",
  examples: [
    "Presté 5 cajas a Juan para que las venda en su zona. Me pagará en 15 días.",
    "Di 10 cajas a mi distribuidor en crédito. Fecha límite de pago: 30 de enero.",
    "Presté 3 cajas + 10 sobres a María para evento especial este fin de semana"
  ],
  impact: "Los préstamos activos se muestran en el dashboard como 'Préstamos Activos'. Reducen tu inventario disponible pero no son ventas aún. El 'Valor Estimado' te muestra cuánto dinero representan esos productos.",
  warnings: "Si no registras un préstamo, perderás el control de quién tiene tus productos y cuándo debes cobrar. Tu inventario quedará incorrecto porque faltarán productos que no sabes dónde están."
};

export const loansFieldHelp = {
  borrower: "Nombre de la persona a quien le prestas los productos. Ejemplo: 'Juan Pérez', 'Distribuidor Sur', 'María González'.",
  product: "Producto que estás prestando. Debe existir en tu inventario y tener stock disponible.",
  quantityBoxes: "Número de CAJAS completas que prestas.",
  quantitySachets: "Número de SOBRES SUELTOS que prestas (si aplica).",
  dueDate: "Fecha límite en que esperasrecibir el pago o la devolución. Te ayuda a hacer seguimiento.",
  notes: "Opcional. Puedes escribir condiciones del préstamo, forma de pago acordada, contacto de la persona, etc."
};

// ========================================
// MÓDULO: PRECIOS (PRICES)
// ========================================
export const pricesHelp = {
  title: "Módulo de Precios y Productos",
  description: "Gestiona tu catálogo de productos y sus precios de venta",
  whatItDoes: "Aquí creas y gestionas tu lista de productos. Defines el precio de venta al público y mantienes actualizado tu catálogo.",
  whyImportant: "Tener tus productos y precios bien definidos te permite registrar compras y ventas rápidamente. También te ayuda a calcular automáticamente tus ganancias.",
  examples: [
    "Creo el producto 'Omnilife Supreme' con precio de venta de $35,000 por caja",
    "Actualizo el precio del producto X de $30,000 a $33,000 porque subió el costo del proveedor",
    "Agrego un nuevo producto a mi catálogo con su precio de lista"
  ],
  impact: "Los precios que defines aquí se usan para calcular el 'Valor del Inventario' en tu dashboard. También se usan como referencia al registrar ventas.",
  warnings: "Si no mantienes los precios actualizados, tus cálculos de inventario y ganancias potenciales serán incorrectos."
};

export const pricesFieldHelp = {
  productName: "Nombre del producto. Usa nombres claros y consistentes. Ejemplo: 'Omnilife Supreme', 'Power Maker', 'Aloe Vera'.",
  listPrice: "Precio de venta al público por CAJA. Este es el precio al que normalmente vendes. Ejemplo: si vendes cada caja a $35,000, escribe 35000.",
  sachetsPerBox: "Cuántos sobres tiene una caja completa. Ejemplo: si cada caja trae 30 sobres, escribe 30. Por defecto: 28 sobres."
};

// ========================================
// TOOLTIPS GENERALES DE NAVEGACIÓN
// ========================================
export const navigationHelp = {
  dashboard: "Aquí ves el resumen de tu negocio: ganancias, gastos, inventario y estadísticas clave. Es tu centro de control.",
  compras: "Registra las compras de inventario que haces a tu proveedor. Cada compra aumenta tu stock y se resta de tus ganancias.",
  publicidad: "Registra tus inversiones en anuncios de Facebook, Instagram, Google, etc. Controla qué campañas te dan mejor retorno.",
  ventas: "Registra cada venta a clientes. El dinero ingresa, el inventario baja y ves tu ganancia real.",
  salidas: "Registra gastos operativos: envíos, comisiones, servicios. Todo lo que reduce tu ganancia final.",
  prestamos: "Controla productos que prestas a vendedores o distribuidores. Sabes quién tiene tus productos y cuándo deben pagar."
};
