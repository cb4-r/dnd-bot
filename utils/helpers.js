const fetch = require('node-fetch');
const { hasLocalData, searchLocal, fetchLocalSuggestions, fuzzySearchLocal } = require('./local-data');
const TRANSLATIONS = require('./translations.json');

const BASE_URL = 'https://api.open5e.com/v1';

function stripAccents(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function translate(input) {
  const normalized = stripAccents(input.toLowerCase().trim());
  return TRANSLATIONS[normalized] || normalized;
}

function truncate(text, max = 1024) {
  if (!text) return '*No description available*';
  return text.length > max ? text.slice(0, max - 3) + '...' : text;
}

function titleCase(str) {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function formatSpeed(speed) {
  if (!speed) return '—';
  if (typeof speed === 'object') {
    return Object.entries(speed)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k} ${v}`)
      .join(', ');
  }
  return String(speed);
}

async function searchWithSuggestions(endpoint, input, limit = 10) {
  const translated = translate(input);

  // 1. Try local data first (instant, no network)
  const local = searchLocal(endpoint, translated);
  if (local.result || local.suggestions.length > 0) return local;

  // 2. Fuzzy match against local names (catches cognates, typos, untranslated Spanish)
  if (hasLocalData(endpoint)) {
    const fuzzyRaw = fuzzySearchLocal(endpoint, translated);
    if (fuzzyRaw) {
      const retried = searchLocal(endpoint, fuzzyRaw.name);
      if (retried.result) return retried;
    }
  }

  // 3. Fallback: Open5e API
  const slug = translated.replace(/ /g, '-');

  try {
    const res = await fetch(`${BASE_URL}/${endpoint}/${slug}/`);
    if (res.ok) return { result: await res.json(), suggestions: [] };
  } catch {}

  const res = await fetch(`${BASE_URL}/${endpoint}/?search=${encodeURIComponent(translated)}&limit=${limit}`);
  if (!res.ok) return { result: null, suggestions: [] };
  const data = await res.json();
  const results = data.results || [];
  if (results.length === 0) return { result: null, suggestions: [] };

  const lower = translated.toLowerCase();
  const nameMatches = results.filter(r => r.name.toLowerCase().includes(lower));

  if (nameMatches.length === 1) return { result: nameMatches[0], suggestions: [] };
  if (nameMatches.length > 1)  return { result: null, suggestions: nameMatches };
  return { result: null, suggestions: results };
}

async function generalSearch(query) {
  const translated = translate(query);
  const lower = translated.toLowerCase();

  // 1. Search local data across all covered endpoints
  const localEndpoints = ['spells', 'monsters', 'magicitems', 'backgrounds', 'classes', 'races'];
  const localMatches = [];

  for (const endpoint of localEndpoints) {
    const { result, suggestions } = searchLocal(endpoint, translated);
    if (result) {
      localMatches.push({ name: result.name, route: `v1/${endpoint}` });
    } else {
      for (const s of suggestions.slice(0, 4)) {
        localMatches.push({ name: s.name, route: `v1/${endpoint}` });
      }
    }
  }

  // Sort: names that start with the query before names that just contain it
  localMatches.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(lower);
    const bStarts = b.name.toLowerCase().startsWith(lower);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return a.name.localeCompare(b.name);
  });

  if (localMatches.length >= 8) return localMatches.slice(0, 8);

  // 2. API fallback for endpoints not covered locally (conditions, weapons, armor, feats, sections)
  try {
    const res = await fetch(`${BASE_URL}/search/?text=${encodeURIComponent(translated)}&limit=8`);
    if (res.ok) {
      const data = await res.json();
      const seen = new Set(localMatches.map(r => r.name.toLowerCase()));
      for (const r of (data.results || [])) {
        if (!seen.has(r.name.toLowerCase())) {
          localMatches.push({ name: r.name, route: r.route });
          if (localMatches.length >= 8) break;
        }
      }
    }
  } catch {}

  return localMatches;
}

async function fetchSuggestions(endpoint, query) {
  const translated = translate(query);

  // Local data available → use it (instant, richer results, no network)
  if (hasLocalData(endpoint)) {
    return fetchLocalSuggestions(endpoint, translated) || [];
  }

  // API fallback for endpoints not covered locally (conditions, weapons, armor, feats, sections)
  const url = translated.length > 0
    ? `${BASE_URL}/${endpoint}/?search=${encodeURIComponent(translated)}&limit=25`
    : `${BASE_URL}/${endpoint}/?limit=25`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const results = data.results || [];
    if (translated.length > 0) {
      const lower = translated.toLowerCase();
      const nameMatches = results.filter(r => r.name.toLowerCase().includes(lower));
      if (nameMatches.length > 0)
        return nameMatches.slice(0, 25).map(r => ({ name: r.name, value: r.name }));
    }
    return results.slice(0, 25).map(r => ({ name: r.name, value: r.name }));
  } catch {
    return [];
  }
}

module.exports = { translate, truncate, titleCase, formatSpeed, searchWithSuggestions, fetchSuggestions, generalSearch };
