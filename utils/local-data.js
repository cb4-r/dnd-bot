const dndData = require('dnd-data');
const Fuse = require('fuse.js');

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

const TRAIT_RE = /\b([A-Z][a-z']+(?:\s+[A-Z][a-z']+){0,3})\s*[.:]\s*(?=[A-Z])/g;

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
    TRAIT_RE.lastIndex = 0;
    let match;
    while ((match = TRAIT_RE.exec(traitsBlock)) !== null) {
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

function parseBackgroundDesc(desc) {
  const d = cleanDesc(desc);

  const skills = grab(d, /Skill Proficiencies?\s*[:.]\s*(.+?)(?=\s+Languages?|\s+Tool|\s+Equipment|\s+Feature[.:]|$)/i);
  const langs  = grab(d, /Languages?\s*[:.]\s*(.+?)(?=\s+Tool|\s+Equipment|\s+Feature[.:]|$)/i);
  const tools  = grab(d, /Tool\s+Proficiencies?\s*[:.]\s*(.+?)(?=\s+Languages?|\s+Equipment|\s+Feature[.:]|$)/i);

  let featureName = null;
  let featureDesc = null;
  const featIdx = d.search(/Feature[:.]/i);
  if (featIdx !== -1) {
    const rest = d.slice(featIdx).replace(/^Feature[:.]\s*/i, '');
    // Name ends where the description sentence begins
    const nameEnd = rest.search(/\s+(?:As|You|The|Your|When|At|This|Since|After|Before|While|If|Each|Once|Upon|Although|However)\s/);
    if (nameEnd > 0) {
      featureName = rest.slice(0, nameEnd).trim();
      const afterName = rest.slice(nameEnd).trim();
      const sentences = afterName.match(/^(?:[^.!?]*[.!?]\s*){1,2}/);
      featureDesc = sentences ? sentences[0].trim() : afterName.slice(0, 250).trim();
    } else {
      featureName = rest.slice(0, 60).trim();
    }
  }

  return { skills, langs, tools, featureName, featureDesc };
}

function parseClassDesc(desc) {
  const d = cleanDesc(desc);

  // Hit Dice: "Hit Dice: 1d12 per..."
  const hitDie = grab(d, /Hit Dice?:\s*1(d\d+)/i);

  // Saving Throws: stop before "Skills"
  const saves   = grab(d, /Saving Throws?:\s*(.+?)(?=\s*Skills?|\s*Armor:|\s*Weapons?:|$)/i);

  // Armor proficiency
  const armor   = grab(d, /Armor:\s*(.+?)(?=\s*Weapons?:|\s*Tools?:|\s*Saving|\s*Skills?|$)/i);

  // Weapon proficiency
  const weapons = grab(d, /Weapons?:\s*(.+?)(?=\s*Tools?:|\s*Saving|\s*Skills?|\s*Equipment|$)/i);

  // Skills — stop before "Equipment" (section appears without colon in PHB)
  const skills  = grab(d, /Skills?:\s*(Choose .+?)(?=\s*Equipment|\s*Tools?:|\s*[A-Z][a-z]+ Proficien|$)/is);

  // Primary ability
  const primary = grab(d, /primary ability(?:\s+score)?(?:\s+is)?\s+(.+?)(?:\.|,|and)/i);

  return {
    hitDie:  hitDie ? parseInt(hitDie.replace('d', '')) : null,
    saves,
    armor,
    weapons,
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
  const parsed = parseBackgroundDesc(raw.description);
  return {
    name:                raw.name,
    skill_proficiencies: parsed.skills      || null,
    languages:           parsed.langs       || null,
    tools:               parsed.tools       || null,
    feature:             parsed.featureName || null,
    feature_desc:        parsed.featureDesc || null,
    _fallback_desc:      cleanDesc(raw.description), // used only when parsing yields nothing
    document__title:     raw.book || raw.publisher || 'dnd-data',
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
    prof_skills:   parsed.skills   || '—',
    prof_weapons:  parsed.weapons  || null,
    prof_armor:    parsed.armor    || null,
    saving_throws: parsed.saves    || null,
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

// ─── Source priority (canonical sources first) ──────────────────────────────

const SOURCE_PRIORITY = [
  "Player's Handbook",
  "Player's Handbook (2024)",
  "System Reference Document",
  "Free Basic Rules (2014)",
  "Free Basic Rules (2024)",
  "Essentials Kit",
];

function _sourcePriority(entry) {
  const src = entry.book || entry.publisher || '';
  const idx = SOURCE_PRIORITY.findIndex(s => src.includes(s));
  return idx === -1 ? SOURCE_PRIORITY.length : idx;
}

// ─── Collection access (module is loaded once, so no extra caching needed) ──

function getCollection(endpoint) {
  const collectionKey = ENDPOINT_MAP[endpoint];
  if (!collectionKey) return null;
  return dndData[collectionKey] || null;
}

// ─── Fuzzy search (Fuse.js, indexes built at module load) ───────────────────

const FUSE_OPTIONS = {
  keys: ['name'],
  threshold: 0.35,
  includeScore: true,
  minMatchCharLength: 3,
};

const _fuseCache = {};
for (const _ep of Object.keys(ENDPOINT_MAP)) {
  const _col = getCollection(_ep);
  if (_col) _fuseCache[_ep] = new Fuse(_col, FUSE_OPTIONS);
}

function _getFuse(endpoint) {
  return _fuseCache[endpoint] || null;
}

function fuzzySearchLocal(endpoint, query) {
  if (!query || query.length < 3) return null;
  const fuse = _getFuse(endpoint);
  if (!fuse) return null;
  const hits = fuse.search(query, { limit: 10 });
  if (!hits.length) return null;
  // Ties in score → prefer shortest name ("Vampire" over "Vampirate")
  const best = hits.reduce((a, b) =>
    Math.abs(a.score - b.score) < 0.01
      ? (a.item.name.length <= b.item.name.length ? a : b)
      : (a.score < b.score ? a : b)
  );
  return best.item;
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

  // 1. Exact name match — prefer canonical source (PHB/SRD over 3rd-party)
  const exactMatches = col.filter(e => e.name.toLowerCase() === lower);
  if (exactMatches.length > 0) {
    exactMatches.sort((a, b) => _sourcePriority(a) - _sourcePriority(b));
    return { result: mapper(exactMatches[0]), suggestions: [] };
  }

  // 2. Name contains query — deduplicate by name, prefer canonical source
  const allMatches = col.filter(e => e.name.toLowerCase().includes(lower));
  const seen = new Set();
  const matches = [];
  for (const e of allMatches.sort((a, b) => _sourcePriority(a) - _sourcePriority(b))) {
    const key = e.name.toLowerCase();
    if (!seen.has(key)) { seen.add(key); matches.push(e); }
  }

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
  const pool  = lower ? col.filter(e => e.name.toLowerCase().includes(lower)) : col;

  // Deduplicate by name, keeping canonical source
  const seen = new Set();
  const unique = [];
  for (const e of pool.sort((a, b) => _sourcePriority(a) - _sourcePriority(b))) {
    const key = e.name.toLowerCase();
    if (!seen.has(key)) { seen.add(key); unique.push(e); }
  }

  // Sort by relevance: exact → starts-with → contains, then alphabetical
  if (lower) {
    unique.sort((a, b) => {
      const an = a.name.toLowerCase();
      const bn = b.name.toLowerCase();
      const aScore = an === lower ? 0 : an.startsWith(lower) ? 1 : 2;
      const bScore = bn === lower ? 0 : bn.startsWith(lower) ? 1 : 2;
      return aScore !== bScore ? aScore - bScore : a.name.localeCompare(b.name);
    });
  }

  return unique.slice(0, 25).map(e => ({ name: e.name, value: e.name }));
}

module.exports = { hasLocalData, searchLocal, fetchLocalSuggestions, fuzzySearchLocal };
