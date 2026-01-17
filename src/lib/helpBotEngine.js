/**
 * Motor de Búsqueda del Robot de Ayuda
 * Sistema determinístico sin IA - matching por keywords con scoring
 */

import { HELP_BOT_KB, FALLBACK_RESPONSE } from './helpBotKnowledge';

/**
 * Normaliza texto para comparación
 * - Convierte a minúsculas
 * - Elimina acentos
 * - Elimina puntuación
 * - Trim espacios
 */
export const normalizeText = (text) => {
  if (!text) return '';

  return text
    .toLowerCase()
    .trim()
    // Eliminar acentos
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Eliminar puntuación excepto espacios
    .replace(/[^\w\s]/g, ' ')
    // Múltiples espacios a uno solo
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Calcula el score de coincidencia entre una query y un item del KB
 * @param {string} normalizedQuery - Query normalizada del usuario
 * @param {Object} item - Item del Knowledge Base
 * @returns {number} Score de coincidencia
 */
export const scoreMatch = (normalizedQuery, item) => {
  let score = 0;
  const queryWords = normalizedQuery.split(' ').filter(w => w.length > 2);

  // Normalizar keywords del item
  const normalizedKeywords = item.keywords.map(k => normalizeText(k));
  const normalizedTitle = normalizeText(item.title);

  // Score por keywords exactas (+3 por cada match)
  normalizedKeywords.forEach(keyword => {
    if (normalizedQuery.includes(keyword)) {
      score += 3;
    }
    // Score parcial si alguna palabra del keyword está en la query (+1)
    const keywordWords = keyword.split(' ');
    keywordWords.forEach(kw => {
      if (kw.length > 2 && normalizedQuery.includes(kw)) {
        score += 1;
      }
    });
  });

  // Score por título (+5 si la query contiene el título o viceversa)
  if (normalizedQuery.includes(normalizedTitle) || normalizedTitle.includes(normalizedQuery)) {
    score += 5;
  }

  // Score por palabras individuales del título
  const titleWords = normalizedTitle.split(' ').filter(w => w.length > 2);
  titleWords.forEach(word => {
    if (normalizedQuery.includes(word)) {
      score += 1;
    }
  });

  // Score por palabras de la query que aparecen en keywords
  queryWords.forEach(queryWord => {
    normalizedKeywords.forEach(keyword => {
      if (keyword.includes(queryWord)) {
        score += 2;
      }
    });
  });

  return score;
};

/**
 * Obtiene la mejor respuesta para una query
 * @param {string} query - Pregunta del usuario
 * @param {Array} kb - Knowledge Base (opcional, usa default)
 * @param {number} threshold - Score mínimo para considerar una respuesta válida
 * @returns {Object} Item con la mejor respuesta o fallback
 */
export const getBestAnswer = (query, kb = HELP_BOT_KB, threshold = 3) => {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery || normalizedQuery.length < 2) {
    return FALLBACK_RESPONSE;
  }

  // Calcular scores para todos los items
  const scoredItems = kb.map(item => ({
    ...item,
    score: scoreMatch(normalizedQuery, item)
  }));

  // Ordenar por score descendente
  scoredItems.sort((a, b) => b.score - a.score);

  // Retornar el mejor si supera el threshold
  const bestMatch = scoredItems[0];

  if (bestMatch && bestMatch.score >= threshold) {
    return bestMatch;
  }

  return FALLBACK_RESPONSE;
};

/**
 * Obtiene un item específico por ID
 * @param {string} id - ID del item
 * @returns {Object|null} Item encontrado o null
 */
export const getAnswerById = (id) => {
  return HELP_BOT_KB.find(item => item.id === id) || null;
};

/**
 * Obtiene items relacionados a un item
 * @param {Object} item - Item del cual buscar relacionados
 * @returns {Array} Array de items relacionados
 */
export const getRelatedAnswers = (item) => {
  if (!item || !item.related || item.related.length === 0) {
    return [];
  }

  return item.related
    .map(id => getAnswerById(id))
    .filter(Boolean)
    .slice(0, 3); // Máximo 3 relacionados
};

/**
 * Filtra items por categoría
 * @param {string} category - Categoría a filtrar ('all' para todas)
 * @returns {Array} Items filtrados
 */
export const getItemsByCategory = (category = 'all') => {
  if (category === 'all') {
    return HELP_BOT_KB;
  }
  return HELP_BOT_KB.filter(item => item.category === category);
};

/**
 * Busca items que contengan cierto texto en título o keywords
 * @param {string} searchText - Texto a buscar
 * @returns {Array} Items que coinciden, ordenados por relevancia
 */
export const searchItems = (searchText) => {
  const normalizedSearch = normalizeText(searchText);

  if (!normalizedSearch || normalizedSearch.length < 2) {
    return [];
  }

  const results = HELP_BOT_KB
    .map(item => ({
      ...item,
      score: scoreMatch(normalizedSearch, item)
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return results.slice(0, 5); // Top 5 resultados
};

/**
 * Genera sugerencias basadas en el historial de preguntas
 * @param {Array} history - Historial de preguntas del usuario
 * @returns {Array} IDs de items sugeridos
 */
export const getSuggestions = (history = []) => {
  if (history.length === 0) {
    // Sugerencias por defecto para nuevos usuarios
    return ['ganancia-neta', 'estoy-ganando-o-perdiendo', 'registrar-compra'];
  }

  // Obtener items relacionados a las últimas preguntas
  const lastQuestions = history.slice(-3);
  const relatedIds = new Set();

  lastQuestions.forEach(q => {
    if (q.related) {
      q.related.forEach(id => relatedIds.add(id));
    }
  });

  // Excluir items ya vistos
  const seenIds = new Set(history.map(h => h.id));
  const suggestions = Array.from(relatedIds).filter(id => !seenIds.has(id));

  return suggestions.slice(0, 3);
};

export default {
  normalizeText,
  scoreMatch,
  getBestAnswer,
  getAnswerById,
  getRelatedAnswers,
  getItemsByCategory,
  searchItems,
  getSuggestions
};
