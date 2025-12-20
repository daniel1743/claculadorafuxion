/**
 * 🔍 ADVANCED ERROR INTERCEPTOR & DEBUGGER
 *
 * Copia y pega este script en la consola de Chrome (F12)
 * para interceptar y diagnosticar todos los errores y llamadas API
 *
 * Uso:
 * 1. Abre F12 (DevTools)
 * 2. Ve a la pestaña "Console"
 * 3. Copia todo este archivo y pégalo
 * 4. Presiona Enter
 * 5. Recarga la página
 */

(function() {
    'use strict';

    console.log('%c🔍 DEBUG INTERCEPTOR ACTIVADO', 'background: #00ff00; color: #000; font-size: 20px; padding: 10px; font-weight: bold;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00;');

    // ============================================
    // 1. INTERCEPTAR FETCH
    // ============================================
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args[0] instanceof Request ? args[0].url : args[0];
        const options = args[1] || {};

        // Obtener stack trace para saber quién llamó fetch
        const stackTrace = new Error().stack;
        const callerInfo = extractCallerInfo(stackTrace);

        console.group('%c📡 FETCH INTERCEPTADO', 'background: #2196F3; color: white; padding: 4px 8px; border-radius: 3px;');
        console.log('%c🎯 URL:', 'color: #FF9800; font-weight: bold;', url);
        console.log('%c📋 Method:', 'color: #9C27B0;', options.method || 'GET');
        console.log('%c📦 Body:', 'color: #4CAF50;', options.body || 'No body');
        console.log('%c🔑 Headers:', 'color: #F44336;', options.headers || 'Default headers');
        console.log('%c📍 Llamado desde:', 'color: #00BCD4; font-weight: bold;', callerInfo);

        // Detectar si es una API de IA
        const isAIAPI = detectAIAPI(url);
        if (isAIAPI) {
            console.log('%c⚠️ ALERTA: API DE IA DETECTADA!', 'background: #ff0000; color: white; font-size: 14px; padding: 5px; font-weight: bold;');
            console.log('%c🤖 Tipo:', 'color: #FF5722;', isAIAPI);

            // Intentar extraer API key si está visible
            if (options.headers) {
                const authHeader = options.headers['Authorization'] || options.headers['authorization'];
                if (authHeader) {
                    console.log('%c🔐 API Key detectada (primeros 10 chars):', 'color: #E91E63;', authHeader.substring(0, 20) + '...');
                }
            }
        }

        console.log('%c📚 Stack Trace Completo:', 'color: #607D8B;');
        console.log(stackTrace);
        console.groupEnd();

        // Ejecutar fetch original y capturar respuesta
        return originalFetch.apply(this, args)
            .then(response => {
                console.group('%c✅ FETCH RESPONSE', 'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 3px;');
                console.log('%c🎯 URL:', 'color: #FF9800;', url);
                console.log('%c📊 Status:', 'color: ' + (response.ok ? '#4CAF50' : '#F44336') + ';', response.status, response.statusText);
                console.log('%c📋 Headers:', 'color: #9C27B0;', [...response.headers.entries()]);
                console.groupEnd();
                return response;
            })
            .catch(error => {
                console.group('%c❌ FETCH ERROR', 'background: #F44336; color: white; padding: 4px 8px; border-radius: 3px;');
                console.log('%c🎯 URL:', 'color: #FF9800;', url);
                console.log('%c💥 Error:', 'color: #F44336; font-weight: bold;', error);
                console.log('%c📍 Origen:', 'color: #00BCD4;', callerInfo);

                // Diagnóstico específico del error
                if (error.message.includes('CORS')) {
                    console.log('%c🚫 DIAGNÓSTICO:', 'background: #FF9800; color: white; padding: 3px;', 'ERROR DE CORS');
                    console.log('%c💡 SOLUCIÓN:', 'color: #4CAF50; font-weight: bold;',
                        'Esta API debe llamarse desde el BACKEND, no desde el navegador.\n' +
                        'Crea una función serverless en Vercel o usa un proxy.'
                    );
                } else if (error.message.includes('Failed to fetch')) {
                    console.log('%c🚫 DIAGNÓSTICO:', 'background: #FF9800; color: white; padding: 3px;', 'FETCH FALLIDO');
                    console.log('%c💡 POSIBLES CAUSAS:', 'color: #4CAF50; font-weight: bold;',
                        '1. Error de CORS\n' +
                        '2. API key inválida\n' +
                        '3. Servicio caído\n' +
                        '4. Bloqueado por extensión/firewall'
                    );
                }

                console.groupEnd();
                throw error;
            });
    };

    // ============================================
    // 2. INTERCEPTAR XMLHttpRequest
    // ============================================
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) {
        this._debugURL = url;
        this._debugMethod = method;
        this._debugStack = new Error().stack;
        return originalXHROpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function() {
        const xhr = this;
        console.group('%c📨 XHR INTERCEPTADO', 'background: #9C27B0; color: white; padding: 4px 8px; border-radius: 3px;');
        console.log('%c🎯 URL:', 'color: #FF9800;', this._debugURL);
        console.log('%c📋 Method:', 'color: #9C27B0;', this._debugMethod);
        console.log('%c📍 Origen:', 'color: #00BCD4;', extractCallerInfo(this._debugStack));
        console.groupEnd();

        return originalXHRSend.apply(this, arguments);
    };

    // ============================================
    // 3. INTERCEPTAR console.error
    // ============================================
    const originalConsoleError = console.error;
    console.error = function(...args) {
        const stackTrace = new Error().stack;

        console.group('%c🔴 CONSOLE.ERROR INTERCEPTADO', 'background: #F44336; color: white; padding: 4px 8px; border-radius: 3px;');
        console.log('%c💬 Mensaje:', 'color: #F44336; font-weight: bold;', ...args);
        console.log('%c📍 Stack Trace:', 'color: #607D8B;', stackTrace);

        // Analizar el error
        const errorText = args.map(arg => String(arg)).join(' ');
        if (errorText.includes('deepseek') || errorText.includes('qwen') || errorText.includes('gemini')) {
            console.log('%c⚠️ ALERTA: Error relacionado con API de IA', 'background: #FF5722; color: white; padding: 3px;');
        }

        console.groupEnd();
        return originalConsoleError.apply(console, args);
    };

    // ============================================
    // 4. CAPTURAR ERRORES GLOBALES
    // ============================================
    window.addEventListener('error', function(event) {
        console.group('%c⚠️ ERROR GLOBAL CAPTURADO', 'background: #FF5722; color: white; padding: 4px 8px; border-radius: 3px;');
        console.log('%c💥 Error:', 'color: #F44336; font-weight: bold;', event.message);
        console.log('%c📄 Archivo:', 'color: #9C27B0;', event.filename);
        console.log('%c📍 Línea:', 'color: #FF9800;', event.lineno, ':', event.colno);

        if (event.error) {
            console.log('%c📚 Stack:', 'color: #607D8B;', event.error.stack);

            // Detectar si viene de una extensión
            if (isFromExtension(event.filename)) {
                console.log('%c🔌 ORIGEN:', 'background: #9C27B0; color: white; padding: 3px;', 'EXTENSIÓN DE CHROME');
                console.log('%c💡 SOLUCIÓN:', 'color: #4CAF50;', 'Este error viene de una extensión del navegador, no de tu código.');
            }
        }

        console.groupEnd();
    });

    // ============================================
    // 5. CAPTURAR PROMESAS RECHAZADAS
    // ============================================
    window.addEventListener('unhandledrejection', function(event) {
        console.group('%c❌ PROMESA RECHAZADA (NO CAPTURADA)', 'background: #E91E63; color: white; padding: 4px 8px; border-radius: 3px;');
        console.log('%c💥 Razón:', 'color: #F44336; font-weight: bold;', event.reason);

        if (event.reason instanceof Error) {
            console.log('%c📚 Stack:', 'color: #607D8B;', event.reason.stack);
        }

        console.groupEnd();
    });

    // ============================================
    // 6. MONITOREAR SCRIPTS CARGADOS
    // ============================================
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.tagName === 'SCRIPT') {
                    console.group('%c📜 SCRIPT INYECTADO DETECTADO', 'background: #00BCD4; color: white; padding: 4px 8px; border-radius: 3px;');
                    console.log('%c📄 Src:', 'color: #FF9800;', node.src || 'Inline script');
                    console.log('%c📋 Tipo:', 'color: #9C27B0;', node.type || 'text/javascript');

                    if (isFromExtension(node.src)) {
                        console.log('%c🔌 ORIGEN:', 'background: #9C27B0; color: white; padding: 3px;', 'EXTENSIÓN DE CHROME');
                    }

                    if (node.textContent && node.textContent.length < 1000) {
                        console.log('%c📝 Contenido:', 'color: #607D8B;', node.textContent.substring(0, 200) + '...');
                    }

                    console.groupEnd();
                }
            });
        });
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // ============================================
    // FUNCIONES AUXILIARES
    // ============================================

    function extractCallerInfo(stack) {
        const lines = stack.split('\n');
        // Ignorar las primeras líneas (son del interceptor)
        const relevantLine = lines[3] || lines[2] || lines[1] || 'Unknown';

        // Detectar si viene de una extensión
        if (relevantLine.includes('chrome-extension://')) {
            const match = relevantLine.match(/chrome-extension:\/\/([a-z]+)/);
            const extId = match ? match[1] : 'unknown';
            return `🔌 EXTENSIÓN DE CHROME (ID: ${extId})`;
        }

        return relevantLine.trim();
    }

    function detectAIAPI(url) {
        const aiAPIs = {
            'api.deepseek.com': 'DeepSeek API',
            'dashscope.aliyuncs.com': 'Qwen API (Alibaba)',
            'generativelanguage.googleapis.com': 'Google Gemini API',
            'api.openai.com': 'OpenAI API',
            'api.anthropic.com': 'Anthropic Claude API',
            'api.cohere.ai': 'Cohere API',
            'api-inference.huggingface.co': 'HuggingFace API'
        };

        for (const [domain, name] of Object.entries(aiAPIs)) {
            if (url.includes(domain)) {
                return name;
            }
        }

        return null;
    }

    function isFromExtension(url) {
        return url && (url.startsWith('chrome-extension://') || url.startsWith('moz-extension://'));
    }

    // ============================================
    // COMANDOS DE AYUDA
    // ============================================

    window.debugHelp = function() {
        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00;');
        console.log('%c🔍 DEBUG INTERCEPTOR - COMANDOS DISPONIBLES', 'background: #00ff00; color: #000; font-size: 16px; padding: 8px; font-weight: bold;');
        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00;');
        console.log('');
        console.log('%cdebugHelp()%c - Muestra esta ayuda', 'color: #00BCD4; font-weight: bold;', 'color: inherit;');
        console.log('%clistExtensions()%c - Lista todas las extensiones que están haciendo fetch', 'color: #00BCD4; font-weight: bold;', 'color: inherit;');
        console.log('%cstopDebugging()%c - Desactiva el interceptor', 'color: #00BCD4; font-weight: bold;', 'color: inherit;');
        console.log('');
        console.log('%cTODO está siendo interceptado automáticamente.', 'color: #4CAF50; font-style: italic;');
        console.log('%cRevisa la consola para ver las llamadas API y errores.', 'color: #4CAF50; font-style: italic;');
        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00;');
    };

    window.listExtensions = function() {
        console.log('%c🔌 Listando extensiones activas...', 'background: #9C27B0; color: white; padding: 5px;');
        console.log('Refresca la página y observa los mensajes que digan "EXTENSIÓN DE CHROME"');
    };

    window.stopDebugging = function() {
        console.log('%c🛑 Interceptor desactivado', 'background: #F44336; color: white; padding: 5px;');
        window.fetch = originalFetch;
        XMLHttpRequest.prototype.open = originalXHROpen;
        XMLHttpRequest.prototype.send = originalXHRSend;
        console.error = originalConsoleError;
        observer.disconnect();
    };

    // Mensaje final
    console.log('');
    console.log('%c✅ Interceptor listo!', 'color: #4CAF50; font-size: 14px; font-weight: bold;');
    console.log('%cEscribe %cdebugHelp()%c para ver los comandos disponibles', 'color: #607D8B;', 'color: #00BCD4; font-weight: bold;', 'color: #607D8B;');
    console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00ff00;');
    console.log('');

})();
