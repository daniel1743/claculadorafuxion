import React, { useState, useEffect, useRef } from 'react';
import { Bug, X, ChevronDown, ChevronUp, Trash2, Copy, AlertTriangle } from 'lucide-react';

/**
 * 🔍 ERROR DEBUGGER COMPONENT
 *
 * Componente que intercepta y muestra TODOS los errores y llamadas API
 * automáticamente en un panel flotante en la pantalla.
 *
 * Características:
 * - Intercepta fetch() automáticamente
 * - Captura errores globales
 * - Detecta APIs de IA (DeepSeek, Qwen, Gemini, etc.)
 * - Identifica si viene de extensión de Chrome o del código
 * - Muestra diagnóstico y soluciones
 * - Panel flotante minimizable
 * - Exporta logs
 */

const ErrorDebugger = ({ enabled = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all'); // all, fetch, error, warning
  const originalFetch = useRef(null);
  const originalConsoleError = useRef(null);

  // Inicializar interceptores cuando el componente se monta
  useEffect(() => {
    if (!enabled) return;

    console.log('🔍 Error Debugger activado automáticamente');

    // Guardar referencias originales
    originalFetch.current = window.fetch;
    originalConsoleError.current = console.error;

    // ============================================
    // 1. INTERCEPTAR FETCH
    // ============================================
    window.fetch = function(...args) {
      const url = args[0] instanceof Request ? args[0].url : args[0];
      const options = args[1] || {};
      const timestamp = new Date().toLocaleTimeString();

      // Obtener stack trace
      const stackTrace = new Error().stack;
      const callerInfo = extractCallerInfo(stackTrace);

      // Detectar si es una API de IA
      const aiAPI = detectAIAPI(url);

      // Log de fetch
      const fetchLog = {
        id: Date.now() + Math.random(),
        type: aiAPI ? 'ai-api' : 'fetch',
        timestamp,
        url,
        method: options.method || 'GET',
        callerInfo,
        aiAPI,
        status: 'pending',
        headers: options.headers,
        body: options.body
      };

      addLog(fetchLog);

      // Ejecutar fetch original
      return originalFetch.current.apply(this, args)
        .then(response => {
          // Actualizar log con respuesta
          updateLog(fetchLog.id, {
            status: response.ok ? 'success' : 'error',
            statusCode: response.status,
            statusText: response.statusText
          });
          return response;
        })
        .catch(error => {
          // Actualizar log con error
          const errorMessage = error.message;
          const diagnosis = diagnoseError(error, url);

          updateLog(fetchLog.id, {
            status: 'failed',
            error: errorMessage,
            diagnosis
          });

          throw error;
        });
    };

    // ============================================
    // 2. INTERCEPTAR CONSOLE.ERROR
    // ============================================
    console.error = function(...args) {
      const timestamp = new Date().toLocaleTimeString();
      const stackTrace = new Error().stack;
      const errorText = args.map(arg => String(arg)).join(' ');

      const errorLog = {
        id: Date.now() + Math.random(),
        type: 'error',
        timestamp,
        message: errorText,
        stack: stackTrace,
        isAIRelated: /deepseek|qwen|gemini|openai|anthropic/i.test(errorText)
      };

      addLog(errorLog);

      // Llamar al console.error original
      return originalConsoleError.current.apply(console, args);
    };

    // ============================================
    // 3. CAPTURAR ERRORES GLOBALES
    // ============================================
    const handleGlobalError = (event) => {
      const errorLog = {
        id: Date.now() + Math.random(),
        type: 'global-error',
        timestamp: new Date().toLocaleTimeString(),
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        isExtension: isFromExtension(event.filename)
      };

      addLog(errorLog);
    };

    // ============================================
    // 4. CAPTURAR PROMESAS RECHAZADAS
    // ============================================
    const handleUnhandledRejection = (event) => {
      const errorLog = {
        id: Date.now() + Math.random(),
        type: 'unhandled-rejection',
        timestamp: new Date().toLocaleTimeString(),
        reason: String(event.reason),
        stack: event.reason?.stack
      };

      addLog(errorLog);
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      window.fetch = originalFetch.current;
      console.error = originalConsoleError.current;
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [enabled]);

  // Función para agregar log
  const addLog = (log) => {
    setLogs(prev => [log, ...prev].slice(0, 100)); // Mantener últimos 100 logs

    // Auto-abrir panel si hay error crítico
    if (log.type === 'ai-api' || log.type === 'error' || log.isAIRelated) {
      setIsOpen(true);
    }
  };

  // Función para actualizar log existente
  const updateLog = (id, updates) => {
    setLogs(prev => prev.map(log =>
      log.id === id ? { ...log, ...updates } : log
    ));
  };

  // Función para detectar APIs de IA
  const detectAIAPI = (url) => {
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
  };

  // Función para extraer información del caller
  const extractCallerInfo = (stack) => {
    const lines = stack.split('\n');
    const relevantLine = lines[3] || lines[2] || lines[1] || 'Unknown';

    if (relevantLine.includes('chrome-extension://')) {
      const match = relevantLine.match(/chrome-extension:\/\/([a-z]+)/);
      const extId = match ? match[1] : 'unknown';
      return `🔌 Extensión Chrome (${extId})`;
    }

    // Extraer nombre de archivo y línea
    const fileMatch = relevantLine.match(/([^/\\]+\.jsx?):(\d+):(\d+)/);
    if (fileMatch) {
      return `📄 ${fileMatch[1]}:${fileMatch[2]}`;
    }

    return relevantLine.trim();
  };

  // Función para detectar si viene de extensión
  const isFromExtension = (url) => {
    return url && (url.startsWith('chrome-extension://') || url.startsWith('moz-extension://'));
  };

  // Función para diagnosticar errores
  const diagnoseError = (error, url) => {
    const message = error.message.toLowerCase();

    if (message.includes('cors')) {
      return {
        type: 'CORS Error',
        severity: 'high',
        solution: 'Esta API debe llamarse desde el BACKEND. Crea una función serverless en Vercel.',
        color: 'red'
      };
    }

    if (message.includes('failed to fetch')) {
      return {
        type: 'Network Error',
        severity: 'high',
        solution: 'Posibles causas: CORS, API key inválida, servicio caído, o bloqueado por firewall/extensión.',
        color: 'orange'
      };
    }

    if (message.includes('unauthorized') || message.includes('401')) {
      return {
        type: 'Authentication Error',
        severity: 'high',
        solution: 'API key inválida o expirada. Verifica tus credenciales.',
        color: 'yellow'
      };
    }

    return {
      type: 'Unknown Error',
      severity: 'medium',
      solution: 'Error desconocido. Revisa el stack trace.',
      color: 'gray'
    };
  };

  // Filtrar logs
  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    if (filter === 'fetch') return log.type === 'fetch' || log.type === 'ai-api';
    if (filter === 'error') return log.type === 'error' || log.type === 'global-error' || log.status === 'failed';
    if (filter === 'warning') return log.type === 'ai-api' || log.isAIRelated;
    return true;
  });

  // Función para copiar logs
  const copyLogs = () => {
    const logsText = JSON.stringify(logs, null, 2);
    navigator.clipboard.writeText(logsText);
    alert('Logs copiados al portapapeles');
  };

  // Función para limpiar logs
  const clearLogs = () => {
    setLogs([]);
  };

  if (!enabled) return null;

  return (
    <>
      {/* Botón flotante para abrir/cerrar */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-[9999] bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-2xl transition-all hover:scale-110 border-2 border-white"
          title="Abrir Debug Console"
        >
          <Bug className="w-6 h-6" />
          {logs.filter(l => l.type === 'ai-api' || l.type === 'error').length > 0 && (
            <span className="absolute -top-2 -right-2 bg-yellow-400 text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold animate-pulse">
              {logs.filter(l => l.type === 'ai-api' || l.type === 'error').length}
            </span>
          )}
        </button>
      )}

      {/* Panel de debugging */}
      {isOpen && (
        <div className={`fixed ${isMinimized ? 'bottom-4' : 'inset-4'} right-4 z-[9999] bg-gray-900/98 backdrop-blur-xl border-2 border-red-500/50 rounded-xl shadow-2xl transition-all ${isMinimized ? 'w-96 h-16' : 'w-auto'}`}>
          {/* Header */}
          <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-between rounded-t-xl">
            <div className="flex items-center gap-3">
              <Bug className="w-5 h-5" />
              <span className="font-bold">🔍 Error Debugger Console</span>
              <span className="bg-red-800 px-2 py-1 rounded text-xs font-mono">
                {filteredLogs.length} logs
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="hover:bg-red-700 p-1 rounded transition-colors"
                title={isMinimized ? 'Maximizar' : 'Minimizar'}
              >
                {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-red-700 p-1 rounded transition-colors"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Contenido */}
          {!isMinimized && (
            <>
              {/* Controles */}
              <div className="bg-gray-800 px-4 py-3 flex items-center justify-between gap-4 border-b border-gray-700">
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    Todo ({logs.length})
                  </button>
                  <button
                    onClick={() => setFilter('fetch')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${filter === 'fetch' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    Fetch ({logs.filter(l => l.type === 'fetch' || l.type === 'ai-api').length})
                  </button>
                  <button
                    onClick={() => setFilter('error')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${filter === 'error' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    Errores ({logs.filter(l => l.type === 'error' || l.type === 'global-error' || l.status === 'failed').length})
                  </button>
                  <button
                    onClick={() => setFilter('warning')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${filter === 'warning' ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                  >
                    APIs IA ({logs.filter(l => l.type === 'ai-api' || l.isAIRelated).length})
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyLogs}
                    className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm flex items-center gap-2 transition-colors"
                    title="Copiar logs"
                  >
                    <Copy className="w-4 h-4" />
                    Copiar
                  </button>
                  <button
                    onClick={clearLogs}
                    className="bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded text-sm flex items-center gap-2 transition-colors"
                    title="Limpiar logs"
                  >
                    <Trash2 className="w-4 h-4" />
                    Limpiar
                  </button>
                </div>
              </div>

              {/* Lista de logs */}
              <div className="overflow-y-auto max-h-[calc(100vh-250px)] p-4 space-y-2">
                {filteredLogs.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No hay logs para mostrar
                  </div>
                ) : (
                  filteredLogs.map(log => <LogItem key={log.id} log={log} />)
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

// Componente para renderizar cada log
const LogItem = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  // Determinar color y emoji según tipo
  const getLogStyle = () => {
    if (log.type === 'ai-api') {
      return {
        bg: 'bg-red-900/30 border-red-500',
        icon: '🤖',
        title: `API de IA: ${log.aiAPI}`
      };
    }
    if (log.type === 'fetch') {
      return {
        bg: 'bg-blue-900/30 border-blue-500',
        icon: '📡',
        title: 'Fetch Request'
      };
    }
    if (log.type === 'error' || log.type === 'global-error' || log.status === 'failed') {
      return {
        bg: 'bg-red-900/30 border-red-500',
        icon: '❌',
        title: 'Error'
      };
    }
    if (log.status === 'success') {
      return {
        bg: 'bg-green-900/30 border-green-500',
        icon: '✅',
        title: 'Success'
      };
    }
    return {
      bg: 'bg-gray-800/50 border-gray-600',
      icon: '📋',
      title: 'Log'
    };
  };

  const style = getLogStyle();

  return (
    <div className={`${style.bg} border rounded-lg p-3 text-sm`}>
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{style.icon}</span>
            <span className="font-bold text-white">{style.title}</span>
            <span className="text-gray-500 text-xs font-mono">{log.timestamp}</span>
          </div>

          {log.url && (
            <div className="text-blue-400 font-mono text-xs truncate">{log.url}</div>
          )}

          {log.message && (
            <div className="text-gray-300 mt-1">{log.message}</div>
          )}

          {log.callerInfo && (
            <div className="text-yellow-400 text-xs mt-1">📍 {log.callerInfo}</div>
          )}

          {log.diagnosis && (
            <div className="mt-2 bg-yellow-900/30 border border-yellow-600 rounded p-2">
              <div className="text-yellow-400 font-bold text-xs mb-1">
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                {log.diagnosis.type}
              </div>
              <div className="text-yellow-200 text-xs">💡 {log.diagnosis.solution}</div>
            </div>
          )}

          {log.isExtension && (
            <div className="mt-2 bg-purple-900/30 border border-purple-500 rounded p-2">
              <div className="text-purple-400 font-bold text-xs">
                🔌 Este error viene de una EXTENSIÓN DE CHROME, no de tu código
              </div>
            </div>
          )}
        </div>

        <button className="text-gray-500 hover:text-white ml-2">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Detalles expandidos */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-700 space-y-2 text-xs">
          {log.method && (
            <div><span className="text-gray-500">Método:</span> <span className="text-white">{log.method}</span></div>
          )}
          {log.statusCode && (
            <div><span className="text-gray-500">Status:</span> <span className={log.statusCode >= 400 ? 'text-red-400' : 'text-green-400'}>{log.statusCode} {log.statusText}</span></div>
          )}
          {log.error && (
            <div><span className="text-gray-500">Error:</span> <span className="text-red-400">{log.error}</span></div>
          )}
          {log.stack && (
            <div>
              <span className="text-gray-500">Stack Trace:</span>
              <pre className="mt-1 bg-black/50 p-2 rounded text-xs overflow-x-auto text-gray-400">{log.stack}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorDebugger;
