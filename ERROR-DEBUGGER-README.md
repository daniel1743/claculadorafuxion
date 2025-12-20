# 🔍 Error Debugger Automático - Guía Completa

## ✅ ¿Qué se ha instalado?

Se ha integrado un **sistema completo de debugging automático** en tu aplicación React que:

✅ **Se activa automáticamente** al cargar la app (no necesitas F12)
✅ **Intercepta TODAS las llamadas fetch/API**
✅ **Captura todos los errores** en tiempo real
✅ **Detecta APIs de IA** (DeepSeek, Qwen, Gemini, OpenAI, etc.)
✅ **Identifica si viene de tu código o de extensiones de Chrome**
✅ **Muestra diagnóstico y soluciones** automáticamente
✅ **Panel flotante en la pantalla** con UI profesional
✅ **Exporta logs** para análisis

---

## 🎯 Cómo Funciona

### Automático al Cargar

El debugger se carga automáticamente cuando abres la aplicación. Verás un **botón rojo flotante** en la esquina inferior derecha con un ícono de bug 🐛.

### Estados del Botón

- **Sin número**: No hay errores críticos
- **Con número rojo pulsante**: Hay errores o APIs de IA detectadas (¡ALERTA!)

---

## 🚀 Uso Paso a Paso

### Paso 1: Desplegar la Aplicación

```bash
cd "C:\Users\Lenovo\Desktop\proyectos desplegados importante\PAGINA REGISTRO GASTOS FUXION COMPLETA"

# Instalar dependencias si es necesario
npm install

# Ejecutar en desarrollo
npm run dev

# O hacer build y desplegar
npm run build
```

### Paso 2: Abrir la Aplicación

Abre tu navegador y ve a:
- **Local**: http://localhost:3000
- **Producción**: https://fuxion-shop.vercel.app

### Paso 3: Observar el Botón Flotante

Verás un **botón rojo con ícono de bug** en la esquina inferior derecha.

### Paso 4: Click en el Botón

Al hacer click, se abre el **Panel de Debugging** que muestra:

- 📡 **Todas las llamadas fetch/API** en tiempo real
- ❌ **Todos los errores** capturados
- 🤖 **APIs de IA detectadas** con alerta
- 📍 **Origen exacto** (archivo:línea o extensión)
- 💡 **Diagnóstico y soluciones** automáticas

---

## 📊 Interfaz del Panel

### Header (Superior)

```
🔍 Error Debugger Console        [15 logs]    [↓] [X]
```

- **Contador de logs**: Muestra cuántos eventos se han capturado
- **Botón minimizar** (↓): Reduce el panel a la barra
- **Botón cerrar** (X): Cierra el panel (puedes reabrirlo con el botón flotante)

### Filtros

```
[Todo (50)] [Fetch (30)] [Errores (10)] [APIs IA (5)]
```

- **Todo**: Muestra todos los logs
- **Fetch**: Solo llamadas fetch/API
- **Errores**: Solo errores capturados
- **APIs IA**: Solo APIs de inteligencia artificial detectadas

### Controles

```
[📋 Copiar]  [🗑️ Limpiar]
```

- **Copiar**: Copia todos los logs al portapapeles en formato JSON
- **Limpiar**: Borra todos los logs del panel

---

## 🎨 Tipos de Logs

### 📡 Fetch Request (Azul)

```
📡 Fetch Request                    10:30:45
https://supabase.co/rest/v1/transactions
📍 src/lib/supabaseService.js:123
```

**Información mostrada:**
- URL completa
- Método (GET/POST/etc.)
- Headers
- Body
- Origen exacto del código

### 🤖 API de IA (Rojo Intenso)

```
🤖 API de IA: DeepSeek API         10:31:02
https://api.deepseek.com/v1/chat/completions
⚠️ ALERTA: API DE IA DETECTADA!
📍 🔌 Extensión Chrome (abcdefg)

⚠️ CORS Error
💡 Esta API debe llamarse desde el BACKEND.
   Crea una función serverless en Vercel.
```

**Información mostrada:**
- Tipo de API de IA detectada
- URL completa
- Si viene de extensión de Chrome o de tu código
- **Diagnóstico automático del problema**
- **Solución sugerida**

### ❌ Error (Rojo)

```
❌ Error                           10:32:15
TypeError: Cannot read property 'map' of undefined
📍 src/components/DataTable.jsx:87
```

**Información mostrada:**
- Mensaje de error
- Archivo y línea exacta
- Stack trace completo (expandible)

### ✅ Success (Verde)

```
✅ Success                         10:33:00
https://supabase.co/rest/v1/prices
📊 Status: 200 OK
```

---

## 🔍 Identificando el Problema de las APIs de IA

### Caso 1: Viene de una Extensión de Chrome

Si ves esto:

```
📍 🔌 Extensión Chrome (abcdefg)

🔌 Este error viene de una EXTENSIÓN DE CHROME,
   no de tu código
```

**Solución:**
1. Ve a `chrome://extensions`
2. Busca extensiones de IA, chatbots, o asistentes
3. Desactívalas una por una
4. Recarga tu app y observa cuál desaparece
5. Desinstala la extensión problemática

**O prueba en modo incógnito:**
1. Ctrl+Shift+N (Chrome)
2. Abre tu app
3. Si no hay errores, confirma que es una extensión

### Caso 2: Viene de tu Código

Si ves algo como:

```
📍 src/components/AIChat.jsx:45
```

**Esto significa que TU código está llamando a la API.**

**Diagnóstico y Solución:**

El debugger te mostrará automáticamente:

```
⚠️ CORS Error
💡 SOLUCIÓN: Esta API debe llamarse desde el BACKEND.
   Crea una función serverless en Vercel.
```

**Pasos para solucionarlo:**

1. **NO llamar APIs de IA desde el frontend**
2. **Crear una función serverless** en Vercel
3. **Mover la API key a variables de entorno**

---

## 📋 Ejemplo de Flujo de Debugging

### Escenario: App cargada, ves el botón con número "3"

```
1. Click en el botón flotante
2. Se abre el panel
3. Click en filtro "APIs IA"
4. Ves 3 logs:

   🤖 API de IA: DeepSeek API
   https://api.deepseek.com/v1/chat/completions
   📍 🔌 Extensión Chrome (hkgfoiooedgoejojocmhlaklaeopbecg)

   🤖 API de IA: Qwen API
   https://dashscope.aliyuncs.com/.../chat/completions
   📍 🔌 Extensión Chrome (hkgfoiooedgoejojocmhlaklaeopbecg)

   🤖 API de IA: Google Gemini API
   https://generativelanguage.googleapis.com/v1beta/...
   📍 🔌 Extensión Chrome (hkgfoiooedgoejojocmhlaklaeopbecg)

5. Conclusión: TODOS vienen de la MISMA extensión
6. Copias el ID: hkgfoiooedgoejojocmhlaklaeopbecg
7. Vas a chrome://extensions
8. Buscas la extensión con ese ID
9. La desactivas
10. Recargas tu app
11. ✅ Errores desaparecen
```

---

## ⚙️ Configuración Avanzada

### Desactivar el Debugger en Producción

Si quieres que solo se active en desarrollo:

**Opción 1: Variable de entorno**

Crea `.env`:
```
VITE_ENABLE_DEBUGGER=true
```

Edita `src/App.jsx`:
```javascript
<ErrorDebugger enabled={import.meta.env.VITE_ENABLE_DEBUGGER === 'true'} />
```

**Opción 2: Detectar automáticamente**

Edita `src/App.jsx`:
```javascript
<ErrorDebugger enabled={import.meta.env.DEV} />
```

Esto solo lo activa en modo desarrollo (`npm run dev`), NO en producción.

### Cambiar Posición del Botón

Edita `src/components/ErrorDebugger.jsx` línea ~460:

```javascript
// Cambiar de bottom-4 right-4 a otra posición
className="fixed bottom-4 left-4 z-[9999] ..."  // Abajo izquierda
className="fixed top-4 right-4 z-[9999] ..."    // Arriba derecha
className="fixed top-4 left-4 z-[9999] ..."     // Arriba izquierda
```

---

## 🛠️ Exportar Logs para Análisis

### Copiar Logs

1. Abre el panel
2. Click en **"Copiar"**
3. Los logs se copian al portapapeles en formato JSON
4. Pégalos en un archivo `.json` o compártelos

### Formato de los Logs

```json
[
  {
    "id": 1703001234567.123,
    "type": "ai-api",
    "timestamp": "10:30:45",
    "url": "https://api.deepseek.com/v1/chat/completions",
    "method": "POST",
    "callerInfo": "🔌 Extensión Chrome (abcdefg)",
    "aiAPI": "DeepSeek API",
    "status": "failed",
    "error": "Failed to fetch",
    "diagnosis": {
      "type": "CORS Error",
      "severity": "high",
      "solution": "Esta API debe llamarse desde el BACKEND...",
      "color": "red"
    }
  }
]
```

---

## 🎯 Casos de Uso Específicos

### Caso 1: Detectar qué extensión está causando problemas

1. Abre el panel
2. Filtra por "APIs IA"
3. Busca el emoji 🔌
4. Copia el ID de la extensión
5. Desactívala en `chrome://extensions`

### Caso 2: Encontrar errores en mi código

1. Abre el panel
2. Filtra por "Errores"
3. Busca logs que NO tengan 🔌
4. Verás el archivo y línea exacta
5. Ve a ese archivo y corrige

### Caso 3: Auditar todas las llamadas API

1. Abre el panel
2. Filtra por "Fetch"
3. Revisa todas las URLs
4. Identifica llamadas sospechosas o lentas

### Caso 4: Compartir errores con soporte

1. Reproduce el error
2. Abre el panel
3. Click en "Copiar"
4. Comparte el JSON con tu equipo

---

## 🚨 Solución a Problemas Comunes

### "No veo el botón flotante"

**Posibles causas:**
1. El debugger está desactivado (`enabled={false}`)
2. Hay un error de compilación
3. El componente no se importó correctamente

**Solución:**
Verifica en `src/App.jsx`:
```javascript
import ErrorDebugger from '@/components/ErrorDebugger';
...
<ErrorDebugger enabled={true} />
```

### "El panel no muestra nada"

**Causa:**
No ha habido errores ni llamadas API aún.

**Solución:**
Navega por la app, haz operaciones, y los logs aparecerán automáticamente.

### "Demasiados logs, no encuentro el error"

**Solución:**
1. Click en "Limpiar" para borrar logs antiguos
2. Reproduce el problema
3. Usa los filtros para ver solo lo relevante

---

## 📸 Próximos Pasos

### AHORA MISMO:

1. **Despliega la app**:
   ```bash
   npm run dev
   ```

2. **Abre en el navegador**:
   http://localhost:3000

3. **Observa el botón flotante** en la esquina

4. **Click en el botón** para ver el panel

5. **Si ves errores de APIs de IA**:
   - Revisa si dice 🔌 (extensión) o 📄 (tu código)
   - Sigue las soluciones del panel

6. **Comparte los resultados**:
   - Toma screenshot
   - O copia los logs
   - Muéstrame qué encontraste

---

## 💡 Tips Finales

✅ **Deja el debugger activado siempre** en desarrollo
✅ **Usa los filtros** para encontrar rápido lo que buscas
✅ **Expande los logs** para ver detalles completos
✅ **Copia y guarda** logs de errores importantes
✅ **Prueba en modo incógnito** para descartar extensiones
✅ **Lee los diagnósticos**, tienen soluciones específicas

---

¿Encontraste el origen de los errores? ¡Comparte los resultados! 🎉
