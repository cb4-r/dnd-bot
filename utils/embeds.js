const { EmbedBuilder } = require('discord.js');
const { truncate, formatSpeed } = require('./helpers');

const _GAME_TERMS = /\b(?:action|bonus action|reaction|your turn|attack|saving throw|ability check|hit points?|proficiency|advantage|disadvantage|spell|combat|damage|armor class|d[468]\b|d1[02]\b|d20\b|dc\s*\d|speed|initiative|concentration|casting|modifier|spellcasting|hit dice|spell slot)\b/i;

function _skipLoreIntros(desc) {
  if (desc.length < 1200) return desc;
  const paras = desc.split('\n\n');
  let startIdx = 0;
  for (let i = 0; i < Math.min(paras.length - 1, 5); i++) {
    const p = paras[i].trim();
    if (/^#+\s/.test(p) || /^\*\*/.test(p) || _GAME_TERMS.test(p)) break;
    startIdx = i + 1;
  }
  return paras.slice(startIdx).join('\n\n').trim();
}

const sourceLabel = e => e._source === 'local' ? 'Local' : 'Open5e API';
const footer      = e => `Source: ${e.document__title ?? 'SRD 5e'} • ${sourceLabel(e)}`;

function _ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function _splitAtBoundary(text, max) {
  if (text.length <= max) return text;
  const paraBreak = text.lastIndexOf('\n\n', max);
  if (paraBreak > max * 0.5) return text.slice(0, paraBreak);
  const lineBreak = text.lastIndexOf('\n', max);
  if (lineBreak > max * 0.5) return text.slice(0, lineBreak);
  const spaceBreak = text.lastIndexOf(' ', max);
  if (spaceBreak > max * 0.5) return text.slice(0, spaceBreak);
  return text.slice(0, max);
}

function _pluralizeDuration(dur) {
  return dur.replace(/(\d+)\s+(minute|hour|round|day|week)(?!s)/gi, (_, n, unit) =>
    `${n} ${unit}${parseInt(n) !== 1 ? 's' : ''}`
  );
}

// dnd-data embeds the meta block at the start of the description.
// Extract duration from it and return the clean description body.
function _parseLocalSpellDesc(raw) {
  // Match explicit D&D 5e duration formats — avoids fragile lookaheads
  const m = raw.slice(0, 700).match(
    /Duration\s*[:\s]+(Concentration,?\s+up\s+to\s+\d+\s+\w+s?|Instantaneous|Until\s+dispelled?|Special|\d+\s+\w+s?)/i
  );
  if (!m) return { duration: null, cleanDesc: raw };
  return {
    duration:  _pluralizeDuration(m[1].trim()),
    cleanDesc: raw.slice(m.index + m[0].length).trimStart(),
  };
}

function embedSpell(spell) {
  const level = spell.level_int === 0 ? 'Cantrip' : _ordinal(spell.level_int);

  let desc     = spell.desc || '—';
  let duration = spell.duration !== '—' ? spell.duration : null;

  if (spell._source === 'local') {
    const parsed = _parseLocalSpellDesc(desc);
    if (parsed.duration) duration = parsed.duration;
    desc = parsed.cleanDesc;
  }

  const meta = [
    level,
    spell.school,
    spell.casting_time,
    spell.range,
    spell.components,
    duration,
  ].filter(v => v && v !== '—').join(' | ');

  const metaBlock = meta + '\n\n';
  const firstMax  = 4096 - metaBlock.length;

  const chunks = [];
  let remaining = desc;
  const first = _splitAtBoundary(remaining, firstMax);
  chunks.push(first);
  remaining = remaining.slice(first.length).trimStart();
  while (remaining.length > 0) {
    const chunk = _splitAtBoundary(remaining, 1024);
    chunks.push(chunk);
    remaining = remaining.slice(chunk.length).trimStart();
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔮 ${spell.name}`)
    .setColor(0x7B2FBE)
    .setDescription(metaBlock + chunks[0]);

  for (let i = 1; i < chunks.length; i++) {
    embed.addFields({ name: '​', value: chunks[i] });
  }

  if (spell.higher_level) {
    embed.addFields({ name: '📈 At Higher Levels', value: truncate(spell.higher_level, 1024) });
  }

  embed.setFooter({ text: footer(spell) });
  return embed;
}

function embedMonster(monster) {
  const val = v => v !== '—' && v != null && v !== 0;

  const metaParts = [
    val(monster.hit_points) ? `HP ${monster.hit_points}${monster.hit_dice ? ` (${monster.hit_dice})` : ''}` : null,
    val(monster.armor_class)     ? `AC ${monster.armor_class}`              : null,
    val(monster.speed)           ? `Speed ${monster.speed}`                 : null,
    val(monster.challenge_rating)? `CR ${monster.challenge_rating}`         : null,
  ].filter(Boolean);

  const statParts = [monster.strength, monster.dexterity, monster.constitution,
                     monster.intelligence, monster.wisdom, monster.charisma];
  const hasStats = statParts.some(v => v !== '—' && v != null);

  const descLines = [
    `*${monster.size} ${monster.type}, ${monster.alignment}*`,
    metaParts.length ? metaParts.join(' | ') : null,
    hasStats ? `STR ${monster.strength} | DEX ${monster.dexterity} | CON ${monster.constitution} | INT ${monster.intelligence} | WIS ${monster.wisdom} | CHA ${monster.charisma}` : null,
    monster.senses    ? `Senses: ${monster.senses}`       : null,
    monster.languages ? `Languages: ${monster.languages}` : null,
  ].filter(Boolean).join('\n');

  const embed = new EmbedBuilder()
    .setTitle(monster.name)
    .setColor(0xC0392B)
    .setDescription(descLines);

  if (monster.special_abilities?.length) {
    const value = monster.special_abilities.slice(0, 3)
      .map(a => `**${a.name}:** ${truncate(a.desc, 150)}`).join('\n');
    embed.addFields({ name: 'Special Abilities', value });
  }
  if (monster.actions?.length) {
    const value = monster.actions.slice(0, 3)
      .map(a => `**${a.name}:** ${truncate(a.desc, 150)}`).join('\n');
    embed.addFields({ name: 'Actions', value });
  }
  embed.setFooter({ text: footer(monster) });
  return embed;
}

function embedItem(item) {
  let desc = item.desc || '';
  // Strip redundant "Item Name Type, rarity" header present in dnd-data local entries
  if (desc.toLowerCase().startsWith(item.name.toLowerCase())) {
    desc = desc.replace(/^.+?\b(?:common|uncommon|rare|very rare|legendary|artifact)\b\s*/i, '').trim();
  }
  const embed = new EmbedBuilder()
    .setTitle(`⚗️ ${item.name}`)
    .setColor(0xF39C12)
    .setDescription(truncate(desc, 700))
    .addFields(
      { name: 'Type',   value: item.type   ?? '—', inline: true },
      { name: 'Rarity', value: item.rarity ?? '—', inline: true },
    );
  if (item.requires_attunement) embed.addFields({ name: '🔗 Attunement', value: item.requires_attunement, inline: true });
  embed.setFooter({ text: footer(item) });
  return embed;
}

function embedClass(cls) {
  const embed = new EmbedBuilder()
    .setTitle(`⚔️ ${cls.name}`)
    .setColor(0x27AE60)
    .addFields(
      { name: '🎲 Hit Die',        value: cls.hit_dice ? `d${cls.hit_dice}` : '—',            inline: true },
      { name: '🛡️ Saving Throws',  value: cls.saving_throws ?? '—',                            inline: true },
      { name: '🧥 Armor',          value: cls.prof_armor    ?? '—',                            inline: true },
    );
  if (cls.prof_weapons) {
    embed.addFields({ name: '⚔️ Weapons', value: cls.prof_weapons });
  }
  if (cls.prof_skills && cls.prof_skills !== '—') {
    embed.addFields({ name: '📖 Skills', value: cls.prof_skills });
  }
  if (cls.archetypes?.length) {
    const list = cls.archetypes.map(a => `• ${a.name}`).join('\n');
    embed.addFields({ name: `🌿 ${cls.subtypes_name || 'Subclasses'}`, value: truncate(list, 600) });
  } else if (cls.subtypes_name) {
    embed.addFields({ name: '🌿 Subclasses', value: cls.subtypes_name, inline: true });
  }
  embed.setFooter({ text: footer(cls) });
  return embed;
}

function embedRace(race) {
  const embed = new EmbedBuilder()
    .setTitle(`🧝 ${race.name}`)
    .setColor(0x2980B9)
    .addFields(
      { name: '🏃 Speed',     value: (race.speed_desc || formatSpeed(race.speed)) ?? '—', inline: true },
      { name: '📏 Size',      value: race.size       ?? '—',                             inline: true },
      { name: '🌐 Languages', value: race.languages  ?? '—',                             inline: true },
    );
  if (race.asi)    embed.addFields({ name: '⬆️ Ability Score Increase', value: truncate(race.asi, 300) });
  if (race.traits) embed.addFields({ name: '✨ Racial Traits', value: truncate(race.traits, 500) });
  if (race.subraces?.length) {
    embed.addFields({ name: '🔀 Subraces', value: race.subraces.map(s => `• ${s.name}`).join('\n') });
  }
  embed.setFooter({ text: footer(race) });
  return embed;
}

function embedBackground(bg) {
  const hasParsed = bg.skill_proficiencies || bg.feature;
  const embed = new EmbedBuilder()
    .setTitle(`📜 ${bg.name}`)
    .setColor(0x8E44AD);

  if (hasParsed) {
    embed.addFields(
      { name: '🛠️ Skills',    value: bg.skill_proficiencies ?? '—', inline: true },
      { name: '🌐 Languages', value: bg.languages           ?? '—', inline: true },
    );
    if (bg.tools) embed.addFields({ name: '🔧 Tools', value: bg.tools, inline: true });
    if (bg.feature) {
      embed.addFields({ name: `✨ Feature: ${bg.feature}`, value: truncate(bg.feature_desc ?? '—', 300) });
    }
  } else {
    // Parsing yielded nothing — fall back to raw description
    embed.setDescription(truncate(bg._fallback_desc || bg.desc || '', 600));
  }

  embed.setFooter({ text: footer(bg) });
  return embed;
}

function embedFeat(feat) {
  const embed = new EmbedBuilder()
    .setTitle(`🌟 ${feat.name}`)
    .setColor(0x9B59B6);
  if (feat.prerequisite) embed.addFields({ name: '📋 Prerequisite', value: feat.prerequisite, inline: true });
  if (feat.effects_desc?.length) {
    // effects_desc is the mechanic — skip lore desc when structured effects exist
    embed.addFields({ name: '✨ Effects', value: truncate(feat.effects_desc.join('\n'), 1000) });
  } else {
    // No structured effects — the desc itself is the rule
    embed.setDescription(truncate(feat.desc, 900));
  }
  embed.setFooter({ text: footer(feat) });
  return embed;
}

function embedCondition(condition) {
  return new EmbedBuilder()
    .setTitle(`🔴 ${condition.name}`)
    .setColor(0xE74C3C)
    .setDescription(truncate(condition.desc, 1500))
    .setFooter({ text: footer(condition) });
}

function embedWeapon(weapon) {
  const damage = weapon.damage_dice
    ? `${weapon.damage_dice} ${weapon.damage_type}`
    : '—';
  const embed = new EmbedBuilder()
    .setTitle(`🗡️ ${weapon.name}`)
    .setColor(0xC0392B)
    .addFields(
      { name: 'Category', value: weapon.category ?? '—', inline: true },
      { name: 'Damage', value: damage, inline: true },
      { name: 'Cost', value: weapon.cost ?? '—', inline: true },
      { name: 'Weight', value: weapon.weight ?? '—', inline: true },
    );
  if (weapon.properties?.length) {
    embed.addFields({ name: '⚙️ Properties', value: weapon.properties.join(', ') });
  }
  embed.setFooter({ text: footer(weapon) });
  return embed;
}

function embedArmor(armor) {
  const embed = new EmbedBuilder()
    .setTitle(`🛡️ ${armor.name}`)
    .setColor(0x7F8C8D)
    .addFields(
      { name: 'Category', value: armor.category ?? '—', inline: true },
      { name: 'AC', value: (armor.ac_string || String(armor.base_ac)) ?? '—', inline: true },
      { name: 'Cost', value: armor.cost ?? '—', inline: true },
      { name: 'Weight', value: armor.weight ?? '—', inline: true },
    );
  if (armor.strength_requirement) {
    embed.addFields({ name: '💪 Strength Required', value: String(armor.strength_requirement), inline: true });
  }
  if (armor.stealth_disadvantage) {
    embed.addFields({ name: '⚠️ Stealth', value: 'Disadvantage', inline: true });
  }
  embed.setFooter({ text: footer(armor) });
  return embed;
}

function tryParseListSection(text) {
  if (!text) return null;

  // Pattern 1: heading-based list (## or ### Name followed by content)
  // Try deepest level first so "### Attack" wins over "## Types of Actions"
  const paras = text.split(/\n\n+/);
  for (let level = 4; level >= 2; level--) {
    const hRe = new RegExp(`^#{${level}}\\s+(.+)`);
    const items = [];
    let intro = null;
    let inIntro = true;

    for (let i = 0; i < paras.length; i++) {
      const p  = paras[i].trim();
      const hm = p.match(hRe);
      if (hm) {
        inIntro = false;
        const next = paras[i + 1]?.trim() || '';
        if (next && !/^#+/.test(next)) {
          let desc;
          if (/^[*\-•]/.test(next)) {
            // Bullet list: first bullet text
            desc = next.match(/^[*\-•]\s+([^\n]+)/)?.[1]?.trim() ?? next.slice(0, 200);
          } else {
            // Paragraph: first sentence
            const flat = next.replace(/\s+/g, ' ');
            desc = (flat.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? flat).slice(0, 200);
          }
          items.push({ name: hm[1].trim(), desc: desc.trim() });
          i++;
        } else {
          items.push({ name: hm[1].trim(), desc: '—' });
        }
      } else if (inIntro && !/^#+/.test(p)) {
        if (!intro) intro = p.slice(0, 300);
      }
    }

    if (items.length >= 3) return { intro: intro || null, items };
  }

  // Pattern 2: **_Name_**. Description at line start (Poisons-style)
  const BI_RE = /^\*\*_([^_\n]+?)_?\*\*[.,:]?\s+(.+)/gm;
  const items2 = [];
  let firstIdx = -1;
  for (const m of text.matchAll(BI_RE)) {
    if (firstIdx === -1) firstIdx = m.index;
    const name = m[1].trim().replace(/\.$/, '');
    const raw  = m[2].replace(/\s+/g, ' ').trim();
    const desc = (raw.match(/^.+?[.!?](?=\s|$)/)?.[0] ?? raw).slice(0, 200).trim();
    items2.push({ name, desc });
  }
  if (items2.length >= 3) {
    const intro = firstIdx > 0
      ? text.slice(0, firstIdx).replace(/^#+\s[^\n]*/gm, '').trim().slice(0, 300) || null
      : null;
    return { intro, items: items2 };
  }

  return null;
}

function embedRule(section) {
  const raw    = section.desc || '';
  const desc   = _skipLoreIntros(raw);
  const parsed = tryParseListSection(desc);

  const embed = new EmbedBuilder()
    .setTitle(`📖 ${section.name}`)
    .setColor(0x34495E);

  if (parsed) {
    const shown = parsed.items.slice(0, 8);
    const extra = parsed.items.length - shown.length;
    const introLines = [
      parsed.intro,
      extra > 0 ? `*Showing ${shown.length} of ${parsed.items.length}.*` : null,
    ].filter(Boolean).join('\n\n');
    if (introLines) embed.setDescription(introLines);
    for (const item of shown) {
      embed.addFields({ name: item.name, value: item.desc || '—' });
    }
  } else {
    embed.setDescription(truncate(desc, 1200));
  }

  if (section.parent) embed.addFields({ name: '📂 Chapter', value: section.parent, inline: true });
  embed.setFooter({ text: footer(section) });
  return embed;
}

module.exports = {
  embedSpell, embedMonster, embedItem, embedClass, embedRace, embedBackground,
  embedFeat, embedCondition, embedWeapon, embedArmor, embedRule,
};
