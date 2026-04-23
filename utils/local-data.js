const dndData = require('dnd-data');

// Maps Open5e endpoint names to dnd-data collection keys
const ENDPOINT_MAP = {
  spells:      'spells',
  monsters:    'monsters',
  magicitems:  'items',
  backgrounds: 'backgrounds',
  classes:     'classes',
  races:       'species',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseJsonField(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val); } catch { return []; }
}

// Strip Roll20 Basic Rules promotional preamble that appears in some entries
function cleanDesc(desc) {
  if (!desc) return '';
  if (desc.startsWith('These D&D 5E Free Basic Rules')) {
    const cut = desc.indexOf('!');
    if (cut > 0 && cut < 500) return desc.slice(cut + 1).trim();
  }
  return desc;
}

function buildActionDesc(a) {
  if (a.Desc) return a.Desc;
  const parts = [];
  if (a['Type'] && a['Type Attack']) {
    const bonus  = a['Hit Bonus'] ? `+${a['Hit Bonus']} to hit` : '';
    const reach  = a['Reach']     ? `reach ${a['Reach']}`       : '';
    const target = a['Target']    ? a['Target']                  : '';
    const header = [bonus, reach, target].filter(Boolean).join(', ');
    if (header) parts.push(`${a['Type']} ${a['Type Attack']}: ${header}.`);
  }
  if (a['Damage'] && a['Damage Type']) {
    parts.push(`Hit: ${a['Damage']} ${a['Damage Type']} damage.`);
  }
  return parts.join(' ') || '—';
}

// ─── Description parsers ────────────────────────────────────────────────────

function grab(desc, pattern) {
  const m = desc.match(pattern);
  return m ? m[1].trim() : null;
}

function parseRaceDesc(desc) {
  const d = cleanDesc(desc);

  const size  = grab(d, /your size is (Small|Medium|Large|Tiny|Huge)/i);
  const speed = grab(d, /(?:base )?walking speed is (\d+\s*(?:feet|ft))/i)
             || grab(d, /Speed\s*[.:]\s*(\d+\s*(?:feet|ft))/i);

  // Languages: capture the sentence after the label
  const lang  = grab(d, /Languages?\s*[.:\s]+([^.]+\.)/i);

  // Ability Score Increase: capture until the next labelled section
  const asi   = grab(d, /Ability Score Increase\s*[.:\s]+(.+?)(?=Age\s*[.:]|Alignment\s*[.:]|Size\s*[.:]|Speed\s*[.:]|[A-Z][a-z]+\s*[.:]|\n\n|$)/s);

  // Extract trait names: title-cased phrases followed by "." or ":" that introduce a trait
  const SKIP_TRAIT_LABELS = new Set([
    "Age", "Alignment", "Size", "Speed", "Languages", "Language",
    "Ability Score Increase", "Ability Score", "Subraces", "Subrace",
    "Traits", "Racial Traits",
    "Small", "Medium", "Large", "Tiny", "Huge",
  ]);

  let traitNames = null;
  const traitsStart = d.search(/\bTraits\b/i);
  if (traitsStart !== -1) {
    const traitsBlock = d.slice(traitsStart);
    const names = [];
    // Only match fully title-cased phrases (every word starts with capital)
    const re = /\b([A-Z][a-z’]+(?:\s+[A-Z][a-z’]+){0,3})\s*[.:]\s*(?=[A-Z])/g;
    let match;
    while ((match = re.exec(traitsBlock)) !== null) {
      const name = match[1].trim();
      if (SKIP_TRAIT_LABELS.has(name)) continue;
      if (/^(You|Your|The|This|An|A|It|In|If|When)\b/.test(name)) continue;
      names.push(name);
      if (names.length >= 8) break;
    }
    if (names.length) traitNames = names.map(n => "• " + n).join("\n");
  }

  return { size, speed, languages: lang, asi, traitNames };
}

function parseClassDesc(desc) {
  const d = cleanDesc(desc);

  // Hit Dice: "Hit Dice: 1d12 per..."
  const hitDie = grab(d, /Hit Dice?:\s*1(d\d+)/i);

  // Saving Throws: stop before "Skills"
  const saves  = grab(d, /Saving Throws?:\s*(.+?)(?=\s*Skills?|\s*Armor:|\s*Weapons?:|$)/i);

  // Armor proficiency
  const armor  = grab(d, /Armor:\s*(.+?)(?=\s*Weapons?:|\s*Tools?:|\s*Saving|\s*Skills?|$)/i);

  // Skills
  const skills = grab(d, /Skills?:\s*(Choose .+?)(?=\s*Equipment:|\s*Tools?:|\s*[A-Z][a-z]+ Proficien|$)/is);

  // Primary ability (first ability after "Class Features" or just first ability mentioned)
  const primary = grab(d, /primary ability(?:\s+score)?(?:\s+is)?\s+(.+?)(?:\.|,|and)/i);

  return {
    hitDie: hitDie ? parseInt(hitDie.replace('d', '')) : null,
    saves,
    armor,
    skills,
    primary,
  };
}

// ─── Mappers: dnd-data format → Open5e-compatible format ────────────────────

function mapSpell(raw) {
  const p = raw.properties || {};
  return {
    name:         raw.name,
    desc:         raw.description,
    level_int:    p.Level ?? 0,
    school:       p.School || '—',
    casting_time: p['Casting Time'] || '—',
    range:        p['data-RangeAoe'] || '—',
    duration:     '—',
    components:   p.Components || '—',
    higher_level: null,
    concentration: null,
    document__title: raw.book || raw.publisher || 'dnd-data',
    _source: 'local',
  };
}

function mapMonster(raw) {
  const p = raw.properties || {};

  // HP: "7 (2d6)" → split into number + dice string
  const hpStr   = p.HP || '';
  const hpMatch = hpStr.match(/^(\d+)\s*\(([^)]+)\)/);
  const hit_points = p['data-HpNum'] ?? (hpMatch ? parseInt(hpMatch[1]) : 0);
  const hit_dice   = hpMatch ? hpMatch[2] : hpStr;

  const special_abilities = parseJsonField(p['data-Traits'])
    .map(t => ({ name: t.Name, desc: t.Desc || '' }));

  const actions = parseJsonField(p['data-Actions'])
    .map(a => ({ name: a.Name, desc: buildActionDesc(a) }));

  return {
    name:            raw.name,
    size:            p.Size      || '—',
    type:            p.Type      || '—',
    alignment:       p.Alignment || '—',
    hit_points,
    hit_dice,
    armor_class:     p.AC || p['data-AcNum'] || '—',
    speed:           p.Speed     || '—',
    strength:        p.STR       ?? '—',
    dexterity:       p.DEX       ?? '—',
    constitution:    p.CON       ?? '—',
    intelligence:    p.INT       ?? '—',
    wisdom:          p.WIS       ?? '—',
    charisma:        p.CHA       ?? '—',
    challenge_rating: p['Challenge Rating'] ?? '—',
    senses:          p.Senses    || null,
    languages:       p.Languages || null,
    special_abilities,
    actions,
    document__title: raw.book || raw.publisher || 'dnd-data',
    _source: 'local',
  };
}

function mapItem(raw) {
  const p = raw.properties || {};
  return {
    name:                raw.name,
    desc:                raw.description,
    type:                p['Item Type']    || '—',
    rarity:              p['Item Rarity']  || '—',
    requires_attunement: p['Requires Attunement'] || null,
    document__title:     raw.book || raw.publisher || 'dnd-data',
    _source: 'local',
  };
}

function mapBackground(raw) {
  return {
    name:               raw.name,
    desc:               cleanDesc(raw.description),
    skill_proficiencies: '—',
    languages:          '—',
    feature:            null,
    feature_desc:       null,
    document__title:    raw.book || raw.publisher || 'dnd-data',
    _source: 'local',
  };
}

function mapClass(raw) {
  const desc   = cleanDesc(raw.description);
  const parsed = parseClassDesc(raw.description);
  return {
    name:          raw.name,
    desc,
    hit_dice:      parsed.hitDie,
    prof_skills:   parsed.skills  || '—',
    prof_armor:    parsed.armor   || null,
    saving_throws: parsed.saves   || null,
    archetypes:    [],
    subtypes_name: null,
    document__title: raw.book || raw.publisher || 'dnd-data',
    _source: 'local',
  };
}

function mapRace(raw) {
  const desc   = cleanDesc(raw.description);
  const parsed = parseRaceDesc(raw.description);
  return {
    name:       raw.name,
    desc,
    speed_desc: parsed.speed     || '—',
    speed:      parsed.speed     || '—',
    size:       parsed.size      || '—',
    languages:  parsed.languages || '—',
    traits:     parsed.traitNames || null,
    asi:        parsed.asi        || null,
    subraces:   [],
    document__title: raw.book || raw.publisher || 'dnd-data',
    _source: 'local',
  };
}

const MAPPERS = {
  spells:      mapSpell,
  monsters:    mapMonster,
  magicitems:  mapItem,
  backgrounds: mapBackground,
  classes:     mapClass,
  races:       mapRace,
};

// ─── Collection access (module is loaded once, so no extra caching needed) ──

function getCollection(endpoint) {
  const collectionKey = ENDPOINT_MAP[endpoint];
  if (!collectionKey) return null;
  return dndData[collectionKey] || null;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns true when local data exists for this endpoint.
 * Used by helpers.js to decide whether to skip the API call.
 */
function hasLocalData(endpoint) {
  return endpoint in ENDPOINT_MAP;
}

/**
 * Search local data. Returns same shape as searchWithSuggestions in helpers.js.
 * { result: <mapped object> | null, suggestions: <raw entry array> }
 */
function searchLocal(endpoint, query) {
  const col    = getCollection(endpoint);
  const mapper = MAPPERS[endpoint];
  if (!col || !mapper) return { result: null, suggestions: [] };

  const lower = query.toLowerCase().trim();
  if (!lower) return { result: null, suggestions: [] };

  // 1. Exact name match
  const exact = col.find(e => e.name.toLowerCase() === lower);
  if (exact) return { result: mapper(exact), suggestions: [] };

  // 2. Name contains query
  const matches = col.filter(e => e.name.toLowerCase().includes(lower));
  if (matches.length === 1) return { result: mapper(matches[0]), suggestions: [] };
  if (matches.length > 1)  return { result: null, suggestions: matches };

  return { result: null, suggestions: [] };
}

/**
 * Fetch autocomplete suggestions from local data.
 * Returns [{name, value}] array (same shape as fetchSuggestions in helpers.js),
 * or null when the endpoint isn't covered locally.
 */
function fetchLocalSuggestions(endpoint, query) {
  const col = getCollection(endpoint);
  if (!col) return null;

  const lower = query.toLowerCase().trim();
  const pool  = lower
    ? col.filter(e => e.name.toLowerCase().includes(lower))
    : col;

  return pool.slice(0, 25).map(e => ({ name: e.name, value: e.name }));
}

module.exports = { hasLocalData, searchLocal, fetchLocalSuggestions };
