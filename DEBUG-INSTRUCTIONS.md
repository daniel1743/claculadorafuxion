# 🔍 Guía de Uso del Debug Interceptor

## ¿Qué hace este script?

Este script intercepta y muestra **TODA** la actividad de red y errores en tu aplicación para ayudarte a diagnosticar problemas:

✅ **Intercepta todas las llamadas fetch()**
✅ **Intercepta XMLHttpRequest**
✅ **Captura errores de consola**
✅ **Detecta errores globales**
✅ **Identifica promesas rechazadas**
✅ **Detecta scripts inyectados (extensiones)**
✅ **Identifica APIs de IA automáticamente**
✅ **Muestra de dónde viene cada llamada**
✅ **Detecta extensiones de Chrome**

---

## 📋 Cómo Usar

### Opción 1: En el navegador (Recomendado para debugging rápido)

1. Abre tu aplicación: https://fuxion-shop.vercel.app
2. Presiona **F12** para abrir DevTools
3. Ve a la pestaña **Console**
4. Abre el archivo `debug-interceptor.js`
5. **Copia TODO el contenido** del archivo
6. **Pégalo en la consola** y presiona Enter
7. Verás el mensaje: `🔍 DEBUG INTERCEPTOR ACTIVADO`
8. **Recarga la página** (F5)
9. Observa la consola

### Opción 2: Agregar al index.html (Para debugging permanente)

Si quieres tener el debugger siempre activo en desarrollo:

1. Abre `index.html`
2. Agrega esto **justo antes de** `</head>`:

```html
<!-- DEBUG INTERCEPTOR - SOLO EN DESARROLLO -->
<script src="/debug-interceptor.js"></script>
```

3. Guarda y recarga

⚠️ **IMPORTANTE:** Elimina esto antes de hacer deploy a producción

---

## 🎯 ¿Qué verás en la consola?

### 📡 FETCH INTERCEPTADO
Cada vez que tu app hace una llamada fetch(), verás:
- 🎯 URL a la que se llama
- 📋 Método (GET, POST, etc.)
- 📦 Body de la petición
- 🔑 Headers
- 📍 Desde dónde se llamó (línea de código o extensión)
- 🤖 Si es una API de IA, mostrará una alerta

### ✅ FETCH RESPONSE
Cuando llega la respuesta:
- 📊 Status code (200, 404, 500, etc.)
- 📋 Headers de respuesta

### ❌ FETCH ERROR
Si falla:
- 💥 Error completo
- 🚫 Diagnóstico del problema (CORS, API key, etc.)
- 💡 Solución sugerida

### 🔴 CONSOLE.ERROR
Cada error en consola te muestra:
- 💬 Mensaje de error
- 📍 Stack trace completo
- ⚠️ Si es relacionado con APIs de IA

### 🔌 EXTENSIÓN DE CHROME
Si detecta que una **extensión** está haciendo llamadas:
- Te muestra el ID de la extensión
- Te avisa que NO es tu código

---

## 🎮 Comandos Disponibles

Una vez activado el debugger, puedes usar estos comandos en la consola:

```javascript
// Mostrar ayuda
debugHelp()

// Listar extensiones que están haciendo fetch
listExtensions()

// Desactivar el interceptor
stopDebugging()
```

---

## 🔍 Diagnosticando el problema de APIs de IA

### Paso 1: Activa el interceptor y recarga la página

```javascript
// Pega el script en la consola y luego:
location.reload()
```

### Paso 2: Busca mensajes con este ícono: 🤖

Si ves algo como:

```
📡 FETCH INTERCEPTADO
🎯 URL: https://api.deepseek.com/v1/chat/completions
⚠️ ALERTA: API DE IA DETECTADA!
🤖 Tipo: DeepSeek API
📍 Llamado desde: 🔌 EXTENSIÓN DE CHROME (ID: abcdefg)
```

Esto te dice **EXACTAMENTE**:
- ✅ Qué API se está llamando
- ✅ Desde dónde (extensión o tu código)
- ✅ Qué parámetros se están enviando

### Paso 3: Identifica la fuente

#### Si dice "🔌 EXTENSIÓN DE CHROME":
- **NO es tu código**
- Es una extensión del navegador
- Solución: Desactiva extensiones una por una
- Prueba en modo incógnito

#### Si dice un archivo de tu proyecto:
- **SÍ es tu código**
- Te muestra la línea exacta
- Puedes ir a arreglarlo

---

## 🐛 Casos de Uso

### Caso 1: Error CORS misterioso

```
❌ FETCH ERROR
🚫 DIAGNÓSTICO: ERROR DE CORS
💡 SOLUCIÓN: Esta API debe llamarse desde el BACKEND, no desde el navegador.
Crea una función serverless en Vercel o usa un proxy.
```

### Caso 2: API key inválida

```
✅ FETCH RESPONSE
📊 Status: 401 Unauthorized
```

El interceptor te mostrará:
- Qué API key estás usando (primeros caracteres)
- Desde dónde se está llamando
- Qué headers se están enviando

### Caso 3: Extensión haciendo llamadas no deseadas

```
📡 FETCH INTERCEPTADO
🎯 URL: https://api.deepseek.com/...
📍 Llamado desde: 🔌 EXTENSIÓN DE CHROME (ID: abcdefg)
```

Ahora sabes que es una extensión y puedes:
1. Copiar el ID
2. Ir a `chrome://extensions`
3. Buscar la extensión con ese ID
4. Desactivarla

---

## 🎨 Interpretando los Colores

- 🟢 Verde: Éxito, todo OK
- 🔵 Azul: Información, llamadas fetch normales
- 🟠 Naranja: Advertencia, algo puede estar mal
- 🔴 Rojo: Error, algo falló
- 🟣 Púrpura: Extensión de Chrome detectada

---

## 💡 Tips

1. **Siempre recarga la página** después de activar el interceptor
2. **Limpia la consola** antes de hacer pruebas (click derecho > Clear console)
3. **Filtra por tipo** usando los filtros de DevTools
4. **Guarda los logs** si necesitas compartirlos (click derecho > Save as)

---

## 🚨 Troubleshooting

### "No veo nada en la consola"
- Asegúrate de haber recargado la página después de pegar el script
- Verifica que la consola no esté filtrada (botón "All levels")

### "Veo demasiados mensajes"
- Es normal, el interceptor muestra TODO
- Usa los filtros de DevTools para buscar palabras clave
- Busca por: "ALERTA", "ERROR", "EXTENSIÓN"

### "Cómo sé si es una extensión?"
- Si ves el emoji 🔌 y dice "EXTENSIÓN DE CHROME"
- Si el stack trace incluye "chrome-extension://"

---

## 📞 Siguiente Paso

Una vez que identifiques la fuente del problema:

### Si es una extensión:
1. Desactiva la extensión
2. Recarga la página
3. Verifica que el error desaparezca

### Si es tu código:
1. Localiza el archivo y línea
2. Revisa si realmente necesitas esa API
3. Si es necesaria, mueve la llamada al backend (Vercel Functions)
4. Usa variables de entorno para API keys

---

¿Necesitas ayuda interpretando los resultados? Comparte los logs conmigo!
