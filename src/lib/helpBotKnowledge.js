/**
 * Base de Conocimiento del Robot de Ayuda
 * Sistema determinístico sin IA - matching por keywords
 *
 * Estructura de cada item:
 * - id: identificador único
 * - category: Dashboard | Operaciones | Ventas | Compras | Inventario | Publicidad | Prestamos | FuXion | FAQ
 * - title: título corto de la pregunta
 * - keywords: palabras clave para matching
 * - answer: { short, explanation, example, action }
 * - related: IDs de temas relacionados (opcional)
 */

export const HELP_BOT_KB = [
  // ═══════════════════════════════════════════════════════════════
  // DASHBOARD - TARJETAS PRINCIPALES
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'ganancia-neta',
    category: 'Dashboard',
    title: '¿Qué es Ganancia Neta?',
    keywords: ['ganancia', 'neta', 'utilidad', 'profit', 'ganando', 'perdiendo', 'resultado', 'balance', 'dinero', 'cuanto llevo', 'cuanto gano', 'estoy ganando'],
    answer: {
      short: 'Es el dinero REAL que te queda después de restar todos tus gastos.',
      explanation: 'La Ganancia Neta se calcula así: Todo lo que has vendido + Pagos que te ha dado FuXion - Lo que has gastado en compras - Lo que has gastado en publicidad - Otras salidas de dinero. Si el número es VERDE y positivo, vas ganando. Si es ROJO y negativo, aún estás recuperando tu inversión.',
      example: 'Si vendiste $500.000, FuXion te pagó $50.000, pero gastaste $400.000 en compras y $30.000 en publicidad, tu Ganancia Neta es: $500.000 + $50.000 - $400.000 - $30.000 = $120.000 de ganancia.',
      action: 'Revisa la tarjeta "Ganancia Neta" en tu dashboard. Si está en rojo, enfócate en vender más o reducir gastos en publicidad.'
    },
    related: ['inversion-compras', 'pagos-fuxion', 'publicidad']
  },
  {
    id: 'inversion-compras',
    category: 'Dashboard',
    title: '¿Qué es Inversión Compras?',
    keywords: ['inversion', 'compras', 'gastado', 'invertido', 'dinero puesto', 'cuanto he gastado', 'total compras', 'comprado'],
    answer: {
      short: 'Es el dinero REAL que has pagado por tus productos (sin contar regalos).',
      explanation: 'Esta tarjeta muestra cuánto dinero de tu bolsillo has puesto en comprar productos. Los productos que te regalan (gratis) NO cuentan aquí porque no pagaste por ellos. Es importante porque te dice cuánto necesitas recuperar para no perder dinero.',
      example: 'Si compraste 10 cajas a $30.000 cada una, tu Inversión Compras es $300.000. Si además te regalaron 2 cajas gratis, esas NO suman a la inversión (siguen siendo $300.000).',
      action: 'Compara tu Inversión Compras con tu Ganancia Neta. Si Ganancia Neta es mayor, ya recuperaste tu inversión y estás en ganancia.'
    },
    related: ['ganancia-neta', 'valor-inventario', 'regalos']
  },
  {
    id: 'inventario-disponible',
    category: 'Dashboard',
    title: '¿Qué es Inventario Disponible?',
    keywords: ['inventario', 'stock', 'disponible', 'cuantos tengo', 'productos', 'cajas', 'unidades', 'quedan'],
    answer: {
      short: 'Es la cantidad de productos que tienes AHORA MISMO para vender.',
      explanation: 'El inventario incluye TODO lo que puedes vender: productos que compraste + productos que te regalaron + productos que te devolvieron. Cada vez que vendes, el inventario baja. Cada vez que compras o recibes regalos, sube.',
      example: 'Si compraste 10 cajas, te regalaron 2, y ya vendiste 5, tu inventario es: 10 + 2 - 5 = 7 unidades disponibles.',
      action: 'Si tu inventario está bajo, considera hacer una nueva compra. Si está alto, enfócate en vender antes de comprar más.'
    },
    related: ['valor-inventario', 'registrar-compra', 'registrar-venta']
  },
  {
    id: 'valor-inventario',
    category: 'Dashboard',
    title: '¿Por qué Valor Inventario no coincide con Inversión?',
    keywords: ['valor inventario', 'precio lista', 'diferencia', 'no coincide', 'distinto', 'valor productos', 'cuanto vale'],
    answer: {
      short: 'Porque Valor Inventario usa el precio de VENTA, no el precio de COMPRA.',
      explanation: 'El Valor Inventario te dice cuánto dinero podrías obtener si vendes TODO tu stock al precio de lista. Es un valor POTENCIAL, no real. La Inversión Compras es lo que PAGASTE. La diferencia entre ambos es tu ganancia potencial.',
      example: 'Si tienes 5 cajas que compraste a $30.000 cada una (inversión = $150.000), pero las vendes a $45.000 cada una, el Valor Inventario es $225.000. La diferencia ($75.000) sería tu ganancia si vendes todo.',
      action: 'Usa el Valor Inventario para proyectar cuánto podrías ganar. No te asustes si es diferente a tu inversión, ¡eso es bueno!'
    },
    related: ['inversion-compras', 'inventario-disponible', 'ganancia-neta']
  },
  {
    id: 'regalos',
    category: 'Dashboard',
    title: '¿Qué son los Productos Gratis (Regalos)?',
    keywords: ['regalos', 'gratis', 'productos gratis', 'bonificacion', 'regalo', 'costo cero', 'sin costo', 'regalo fuxion'],
    answer: {
      short: 'Son productos que recibes SIN PAGAR. Si los vendes, todo es ganancia pura.',
      explanation: 'Los regalos son productos que FuXion u otra persona te da gratis. Estos productos SÍ cuentan en tu inventario (los puedes vender), pero NO aumentan tu inversión porque no pagaste por ellos. Cuando vendes un regalo, todo el dinero es ganancia porque tu costo fue $0.',
      example: 'Si te regalan 2 cajas valoradas en $45.000 cada una y las vendes, esos $90.000 son ganancia PURA porque no invertiste nada en ellas.',
      action: 'Registra los regalos en Compras con precio $0 y marca "Es regalo/gratis". Así tu inventario sube pero tu inversión no.'
    },
    related: ['ganancia-neta', 'registrar-compra', 'valor-inventario']
  },
  {
    id: 'publicidad',
    category: 'Dashboard',
    title: '¿Cómo afecta la Publicidad a mi ganancia?',
    keywords: ['publicidad', 'ads', 'anuncios', 'facebook', 'instagram', 'marketing', 'gasto publicidad', 'inversion publicidad'],
    answer: {
      short: 'La publicidad es un GASTO que RESTA de tu Ganancia Neta.',
      explanation: 'Todo lo que gastas en publicidad (Facebook Ads, Instagram, etc.) se descuenta de tu ganancia. Es una inversión necesaria para vender, pero debes controlarla. Si gastas mucho en publicidad pero no vendes suficiente, tu ganancia baja o se vuelve negativa.',
      example: 'Si tu Ganancia por Ventas es $100.000 pero gastaste $80.000 en publicidad, tu Ganancia Neta real es solo $20.000.',
      action: 'Registra TODOS tus gastos de publicidad. Compara cuánto gastas vs cuánto vendes para saber si tu publicidad es rentable.'
    },
    related: ['ganancia-neta', 'registrar-publicidad']
  },
  {
    id: 'pagos-fuxion',
    category: 'Dashboard',
    title: '¿Qué son los Pagos FuXion?',
    keywords: ['pagos fuxion', 'cheques', 'bonos', 'comisiones', 'fuxion paga', 'devolucion', 'cheque semanal', 'bono familia'],
    answer: {
      short: 'Es dinero que FuXion te PAGA: cheques semanales, bonos, comisiones.',
      explanation: 'FuXion te devuelve un porcentaje de tus compras según tu rango (10-50%). También te puede pagar bonos especiales (Bono Familia, Bono Fidelización) y comisiones por las ventas de tu red. Este dinero SUMA a tu Ganancia Neta.',
      example: 'Si compraste $500.000 en productos y tienes 30% de devolución, FuXion te paga $150.000. Ese dinero se suma a tu ganancia.',
      action: 'Registra cada cheque o bono que recibas en la pestaña "Pagos FuXion". Así tu Ganancia Neta reflejará tu situación real.'
    },
    related: ['ganancia-neta', 'registrar-pago-fuxion']
  },
  {
    id: 'prestamos',
    category: 'Dashboard',
    title: '¿Cómo funcionan los Préstamos?',
    keywords: ['prestamos', 'prestar', 'prestado', 'devolver', 'socio', 'preste', 'debo', 'me deben'],
    answer: {
      short: 'Los préstamos son productos que das o recibes temporalmente. No son ganancia ni pérdida.',
      explanation: 'Hay dos tipos: 1) Prestar a alguien (te deben devolver): tu inventario baja temporalmente. 2) Recibir de alguien (debes devolver): tu inventario sube temporalmente. Los préstamos NO afectan tu ganancia porque no es una venta ni una compra.',
      example: 'Si prestas 2 cajas a un socio, tu inventario baja en 2. Cuando te las devuelve, vuelve a subir. No ganaste ni perdiste dinero.',
      action: 'Registra los préstamos en la pestaña "Préstamos" para llevar control de quién te debe y a quién debes.'
    },
    related: ['inventario-disponible']
  },

  // ═══════════════════════════════════════════════════════════════
  // OPERACIONES - CÓMO REGISTRAR
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'registrar-compra',
    category: 'Operaciones',
    title: '¿Cómo registro una compra?',
    keywords: ['registrar compra', 'agregar compra', 'nueva compra', 'como comprar', 'ingresar compra', 'anotar compra'],
    answer: {
      short: 'Ve a la pestaña "Compras", selecciona el producto, cantidad y precio total.',
      explanation: 'Para registrar una compra: 1) Ve a "Gestión de Operaciones". 2) Selecciona la pestaña "Compras". 3) Elige el producto o escribe uno nuevo. 4) Ingresa la cantidad de cajas. 5) Ingresa el precio TOTAL que pagaste. 6) Haz clic en "Agregar Compra". Tu inventario subirá automáticamente.',
      example: 'Si compraste 5 cajas de VitaMix a $150.000 total: selecciona VitaMix, cantidad 5, total $150.000. Tu inventario subirá en 5 y tu inversión en $150.000.',
      action: 'Si el producto es un REGALO (costo $0), marca la opción "Es regalo/gratis" para que no sume a tu inversión.'
    },
    related: ['inversion-compras', 'inventario-disponible', 'regalos']
  },
  {
    id: 'registrar-venta',
    category: 'Operaciones',
    title: '¿Cómo registro una venta?',
    keywords: ['registrar venta', 'agregar venta', 'nueva venta', 'como vender', 'ingresar venta', 'anotar venta', 'vendi'],
    answer: {
      short: 'Ve a la pestaña "Ventas", selecciona el producto, cantidad y precio de venta.',
      explanation: 'Para registrar una venta: 1) Ve a "Gestión de Operaciones". 2) Selecciona la pestaña "Ventas". 3) Elige el producto que vendiste. 4) Ingresa la cantidad vendida. 5) Ingresa el precio TOTAL de la venta. 6) Opcionalmente, selecciona la campaña si viene de publicidad. Tu inventario bajará y tu ganancia subirá.',
      example: 'Si vendiste 2 cajas de VitaMix a $90.000 total: selecciona VitaMix, cantidad 2, total $90.000. Tu inventario baja en 2 y tus ventas suben $90.000.',
      action: 'Registra TODAS tus ventas, incluso las pequeñas. Solo así verás tu Ganancia Neta real.'
    },
    related: ['ganancia-neta', 'inventario-disponible']
  },
  {
    id: 'registrar-publicidad',
    category: 'Operaciones',
    title: '¿Cómo registro gastos de publicidad?',
    keywords: ['registrar publicidad', 'agregar publicidad', 'gasto ads', 'facebook ads', 'instagram ads', 'campana'],
    answer: {
      short: 'Ve a la pestaña "Publicidad", ingresa el nombre de la campaña y el monto gastado.',
      explanation: 'Para registrar publicidad: 1) Ve a "Gestión de Operaciones". 2) Selecciona la pestaña "Publicidad". 3) Escribe el nombre de la campaña (ej: "Facebook Mayo"). 4) Ingresa el monto total gastado. 5) Haz clic en "Agregar". Este gasto se restará de tu Ganancia Neta.',
      example: 'Si gastaste $50.000 en Facebook Ads para una campaña llamada "Promo Mayo": escribe "Promo Mayo" y monto $50.000.',
      action: 'Al registrar ventas, puedes asociarlas a una campaña para saber qué publicidad te genera más ventas.'
    },
    related: ['publicidad', 'ganancia-neta']
  },
  {
    id: 'registrar-pago-fuxion',
    category: 'Operaciones',
    title: '¿Cómo registro los pagos de FuXion?',
    keywords: ['registrar pago fuxion', 'agregar cheque', 'registrar bono', 'cheque fuxion', 'pago semanal'],
    answer: {
      short: 'Ve a la pestaña "Pagos FuXion", ingresa el título del pago y el monto.',
      explanation: 'Para registrar un pago de FuXion: 1) Ve a "Gestión de Operaciones". 2) Selecciona la pestaña "Pagos FuXion". 3) Escribe el título (ej: "Cheque Semana 12" o "Bono Familia"). 4) Ingresa el monto que recibiste. 5) Selecciona la fecha. 6) Haz clic en "Registrar". Este dinero SUMA a tu Ganancia Neta.',
      example: 'Si FuXion te pagó un cheque de $80.000 por la semana 12: título "Cheque Semana 12", monto $80.000.',
      action: 'Registra cada pago apenas lo recibas para que tu dashboard refleje tu situación real.'
    },
    related: ['pagos-fuxion', 'ganancia-neta']
  },

  // ═══════════════════════════════════════════════════════════════
  // PREGUNTAS FRECUENTES (FAQ)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'estoy-ganando-o-perdiendo',
    category: 'FAQ',
    title: '¿Estoy ganando o perdiendo dinero?',
    keywords: ['estoy ganando', 'estoy perdiendo', 'voy bien', 'voy mal', 'como voy', 'mi situacion', 'pierdo dinero'],
    answer: {
      short: 'Mira tu Ganancia Neta: si es VERDE estás ganando, si es ROJA estás recuperando inversión.',
      explanation: 'Tu situación se resume así: Si Ganancia Neta es POSITIVA (verde), ya recuperaste lo invertido y estás en ganancia real. Si es NEGATIVA (roja), aún estás recuperando tu inversión pero eso no significa que "pierdas", solo que aún no vendes suficiente. Recuerda que tienes INVENTARIO que puedes vender.',
      example: 'Si tu Ganancia Neta es -$100.000 pero tienes inventario valorado en $200.000, en realidad estás bien porque al vender todo ganarías $100.000.',
      action: 'Abre "Estado del Negocio" para ver el Resumen Final que te explica tu situación en palabras simples.'
    },
    related: ['ganancia-neta', 'valor-inventario', 'estado-negocio']
  },
  {
    id: 'estado-negocio',
    category: 'FAQ',
    title: '¿Qué es el Estado del Negocio?',
    keywords: ['estado negocio', 'resumen', 'reporte', 'estado actual', 'como estoy', 'ver resumen'],
    answer: {
      short: 'Es un reporte completo que te dice exactamente cómo va tu negocio en palabras simples.',
      explanation: 'El Estado del Negocio te muestra: 1) Cuánto has recuperado (ventas). 2) Cuánto has invertido (compras + publicidad). 3) Tu balance actual. 4) Tu inventario y su valor. 5) Qué pasaría si vendes TODO. 6) Un veredicto final claro: "vas ganando" o "te falta recuperar X".',
      example: 'El reporte te dirá algo como: "Has recuperado $450.000, invertiste $600.000, te faltan $150.000. Pero si vendes tu inventario de $300.000, terminarías con ganancia de $150.000".',
      action: 'Haz clic en la tarjeta "Estado del Negocio" en tu dashboard para abrir el reporte. También puedes exportarlo a PDF o Word.'
    },
    related: ['ganancia-neta', 'estoy-ganando-o-perdiendo']
  },
  {
    id: 'diferencia-inversion-inventario',
    category: 'FAQ',
    title: '¿Por qué mi Inversión y mi Valor Inventario son diferentes?',
    keywords: ['diferencia', 'inversion vs inventario', 'numeros distintos', 'no cuadra', 'no coinciden'],
    answer: {
      short: '¡Es normal! La Inversión es lo que PAGASTE, el Valor Inventario es lo que GANARÍAS al vender.',
      explanation: 'La Inversión Compras usa el precio que TÚ pagaste (precio de compra). El Valor Inventario usa el precio al que TÚ vendes (precio de lista). La diferencia entre ambos es tu MARGEN de ganancia. Además, si tienes productos gratis, el Valor Inventario será mayor porque son productos que no pagaste pero puedes vender.',
      example: 'Inversión: $300.000 (lo que pagaste). Valor Inventario: $450.000 (lo que ganarías). Diferencia: $150.000 (tu margen potencial).',
      action: 'No te preocupes si no coinciden. Es señal de que tu negocio tiene margen de ganancia.'
    },
    related: ['valor-inventario', 'inversion-compras', 'regalos']
  },
  {
    id: 'como-aumentar-ganancia',
    category: 'FAQ',
    title: '¿Cómo puedo aumentar mi ganancia?',
    keywords: ['aumentar ganancia', 'ganar mas', 'mejorar', 'subir ganancia', 'consejos', 'tips', 'estrategia'],
    answer: {
      short: 'Vende más, controla la publicidad, y registra todos los pagos de FuXion.',
      explanation: 'Hay 4 formas de aumentar tu Ganancia Neta: 1) VENDER MÁS: Cada venta suma. 2) CONTROLAR PUBLICIDAD: Gasta solo en lo que funciona. 3) REGISTRAR PAGOS FUXION: No olvides anotar cheques y bonos. 4) VENDER REGALOS: Los productos gratis son ganancia pura.',
      example: 'Si tu Ganancia Neta es $50.000, podrías subirla a $150.000 vendiendo tu inventario de regalos ($60.000) y registrando un cheque FuXion olvidado ($40.000).',
      action: 'Revisa si tienes pagos FuXion sin registrar. Luego enfócate en vender tu inventario actual antes de comprar más.'
    },
    related: ['ganancia-neta', 'pagos-fuxion', 'regalos']
  },
  {
    id: 'que-es-ppp',
    category: 'FAQ',
    title: '¿Qué es el PPP o Precio Promedio Ponderado?',
    keywords: ['ppp', 'precio promedio', 'ponderado', 'costo promedio', 'costo unitario'],
    answer: {
      short: 'Es el precio PROMEDIO al que has comprado cada producto, considerando todas tus compras.',
      explanation: 'El PPP (Precio Promedio Ponderado) calcula cuánto te cuesta EN PROMEDIO cada unidad de un producto. Si compraste 5 cajas a $30.000 y luego 5 más a $32.000, tu PPP no es $31.000 simple, sino un promedio ponderado por cantidad. Sirve para saber tu costo real al vender.',
      example: 'Si compraste: 10 cajas a $28.000 = $280.000 y 5 cajas a $32.000 = $160.000. Total: 15 cajas, $440.000. PPP = $440.000 / 15 = $29.333 por caja.',
      action: 'El sistema calcula el PPP automáticamente. Lo puedes ver en la sección de Precios de cada producto.'
    },
    related: ['inversion-compras', 'valor-inventario']
  },
  {
    id: 'ciclos',
    category: 'FAQ',
    title: '¿Qué son los Ciclos?',
    keywords: ['ciclo', 'ciclos', 'cerrar ciclo', 'nuevo ciclo', 'periodo', 'mes', 'historial'],
    answer: {
      short: 'Un ciclo es un período de tiempo (ej: un mes) que puedes cerrar para empezar de cero.',
      explanation: 'Los ciclos te permiten organizar tu negocio por períodos. Al cerrar un ciclo: 1) Se guarda un resumen de ese período. 2) Puedes empezar un nuevo ciclo limpio. 3) Tu historial queda guardado para comparar. Es útil para ver tu progreso mes a mes.',
      example: 'Puedes crear un ciclo "Enero 2024", trabajar todo el mes, y al final cerrarlo. Luego empiezas "Febrero 2024" con el inventario que te quedó.',
      action: 'Usa el botón "Cerrar Ciclo" en tu perfil cuando quieras guardar un período y empezar uno nuevo.'
    },
    related: ['estado-negocio']
  },
  {
    id: 'clientes-referidos',
    category: 'FAQ',
    title: '¿Para qué sirve la sección de Clientes?',
    keywords: ['clientes', 'referidos', 'frecuentes', 'recordatorios', 'seguimiento', 'cliente'],
    answer: {
      short: 'Para llevar control de tus clientes frecuentes, referidos y programar recordatorios de seguimiento.',
      explanation: 'La sección de Clientes te permite: 1) Registrar clientes frecuentes para ventas rápidas. 2) Llevar un historial de qué ha comprado cada cliente. 3) Registrar referidos (clientes que traen otros clientes). 4) Crear recordatorios automáticos para hacer seguimiento.',
      example: 'Si María te compra cada mes, la registras como cliente. El sistema te recordará contactarla a los 15 y 30 días de su última compra.',
      action: 'Ve a la pestaña "Clientes" para agregar tus compradores frecuentes y activar recordatorios.'
    },
    related: ['registrar-venta']
  }
];

/**
 * Preguntas rápidas para mostrar como botones
 */
export const QUICK_QUESTIONS = [
  { id: 'ganancia-neta', text: '¿Qué es Ganancia Neta?' },
  { id: 'estoy-ganando-o-perdiendo', text: '¿Estoy ganando o perdiendo?' },
  { id: 'diferencia-inversion-inventario', text: '¿Por qué no coinciden Inversión e Inventario?' },
  { id: 'regalos', text: '¿Qué son los Productos Gratis?' },
  { id: 'pagos-fuxion', text: '¿Qué son los Pagos FuXion?' },
  { id: 'registrar-compra', text: '¿Cómo registro una compra?' },
  { id: 'registrar-venta', text: '¿Cómo registro una venta?' },
  { id: 'estado-negocio', text: '¿Qué es Estado del Negocio?' },
  { id: 'como-aumentar-ganancia', text: '¿Cómo aumento mi ganancia?' }
];

/**
 * Categorías para las tabs del modal
 */
export const CATEGORIES = [
  { id: 'all', label: 'Todo', icon: '🔍' },
  { id: 'Dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'Operaciones', label: 'Operaciones', icon: '⚙️' },
  { id: 'FAQ', label: 'Preguntas Frecuentes', icon: '❓' }
];

/**
 * Respuesta cuando no se encuentra coincidencia
 */
export const FALLBACK_RESPONSE = {
  id: 'fallback',
  category: 'Sistema',
  title: 'No encontré esa respuesta',
  keywords: [],
  answer: {
    short: 'No encontré una respuesta para eso todavía.',
    explanation: 'Intenta reformular tu pregunta o usa palabras como: Ganancia, Inversión, Inventario, Publicidad, Regalos, FuXion, Compras, Ventas, Préstamos.',
    example: 'Puedes preguntar: "¿Qué es Ganancia Neta?", "¿Cómo registro una venta?", "¿Estoy ganando o perdiendo?"',
    action: 'Usa los botones rápidos de arriba para encontrar lo que buscas, o intenta con otras palabras.'
  },
  related: []
};

export default HELP_BOT_KB;
