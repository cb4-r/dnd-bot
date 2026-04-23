const fetch = require('node-fetch');
const { hasLocalData, searchLocal, fetchLocalSuggestions } = require('./local-data');

const BASE_URL = 'https://api.open5e.com/v1';

// Spanish→English lookup so users can query in their language
const TRANSLATIONS = {
  // Spells
  'bola de fuego': 'fireball',
  'muro de fuego': 'wall of fire',
  'muro de llamas': 'wall of fire',
  'bola de rayos': 'lightning bolt',
  'rayo': 'lightning bolt',
  'curar heridas': 'cure wounds',
  'detectar magia': 'detect magic',
  'misil magico': 'magic missile',
  'misil mágico': 'magic missile',
  'escudo': 'shield',
  'dardo': 'magic missile',
  'invisibilidad': 'invisibility',
  'levitar': 'levitate',
  'vuelo': 'fly',
  'tinieblas': 'darkness',
  'luz': 'light',
  'oscuridad': 'darkness',
  'armadura de mago': 'mage armor',
  'imagen mayor': 'major image',
  'contrahechizo': 'counterspell',
  'desintegrar': 'disintegrate',
  'teleportación': 'teleport',
  'resurreccion': 'resurrection',
  'resurrección': 'resurrection',
  'revivir': 'revivify',
  'revivificar': 'revivify',
  'palabra de poder': 'power word kill',
  'palabra de poder matar': 'power word kill',

  // Monsters
  'goblin': 'goblin',
  'orco': 'orc',
  'dragón rojo': 'ancient red dragon',
  'dragon rojo': 'ancient red dragon',
  'esqueleto': 'skeleton',
  'zombi': 'zombie',
  'zombie': 'zombie',
  'troll': 'troll',
  'ogro': 'ogre',
  'vampiro': 'vampire',
  'licántropo': 'werewolf',
  'hombre lobo': 'werewolf',
  'demonio': 'demon',
  'diablo': 'devil',
  'aboleth': 'aboleth',
  'beholder': 'beholder',
  'lich': 'lich',
  'mente colmena': 'mind flayer',
  'devorador de mentes': 'mind flayer',
  'gárgola': 'gargoyle',
  'gargola': 'gargoyle',

  // Classes
  'mago': 'wizard',
  'brujo': 'warlock',
  'hechicero': 'sorcerer',
  'clerigo': 'cleric',
  'clérigo': 'cleric',
  'druida': 'druid',
  'bardo': 'bard',
  'paladin': 'paladin',
  'paladín': 'paladin',
  'explorador': 'ranger',
  'montaraz': 'ranger',
  'ladron': 'rogue',
  'ladrón': 'rogue',
  'picaro': 'rogue',
  'pícaro': 'rogue',
  'guerrero': 'fighter',
  'barbaro': 'barbarian',
  'bárbaro': 'barbarian',
  'monje': 'monk',

  // Races
  'elfo': 'elf',
  'enano': 'dwarf',
  'humano': 'human',
  'mediano': 'halfling',
  'gnomo': 'gnome',
  'semielfo': 'half-elf',
  'semi-elfo': 'half-elf',
  'semiorco': 'half-orc',
  'semi-orco': 'half-orc',
  'tiefling': 'tiefling',
  'draconido': 'dragonborn',
  'dracónido': 'dragonborn',

  // Conditions
  'cegado': 'blinded',
  'hechizado': 'charmed',
  'ensordecido': 'deafened',
  'asustado': 'frightened',
  'agarrado': 'grappled',
  'incapacitado': 'incapacitated',
  'paralizado': 'paralyzed',
  'petrificado': 'petrified',
  'envenenado': 'poisoned',
  'tumbado': 'prone',
  'postrado': 'prone',
  'restringido': 'restrained',
  'aturdido': 'stunned',
  'inconsciente': 'unconscious',
  'agotamiento': 'exhaustion',
  'exhausto': 'exhaustion',
};

function translate(input) {
  const lower = input.toLowerCase().trim();
  return TRANSLATIONS[lower] || lower;
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

async function searchEndpoint(endpoint, input) {
  const { result } = await searchWithSuggestions(endpoint, input);
  return result;
}

async function searchWithSuggestions(endpoint, input, limit = 10) {
  const translated = translate(input);

  // 1. Try local data first (instant, no network)
  const local = searchLocal(endpoint, translated);
  if (local.result || local.suggestions.length > 0) return local;

  // 2. Fallback: Open5e API
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
  const res = await fetch(`${BASE_URL}/search/?text=${encodeURIComponent(translated)}&limit=8`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.results || [];
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

module.exports = { translate, truncate, titleCase, formatSpeed, searchEndpoint, searchWithSuggestions, fetchSuggestions, generalSearch };
