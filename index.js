require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder, Colors } = require('discord.js');
const fetch = require('node-fetch');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const BASE_URL = 'https://api.open5e.com/v1';

// ─── Helpers ────────────────────────────────────────────────────────────────

// Traduce nombres comunes ES→EN para la API (que solo habla inglés)
const TRADUCCIONES = {
  // Hechizos
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

  // Monstruos
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

  // Clases
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

  // Razas
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
};

function traducir(nombre) {
  const lower = nombre.toLowerCase().trim();
  return TRADUCCIONES[lower] || lower;
}

function truncar(texto, max = 1024) {
  if (!texto) return '*Sin descripción disponible*';
  return texto.length > max ? texto.slice(0, max - 3) + '...' : texto;
}

function titleCase(str) {
  return str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

async function buscarEnEndpoint(endpoint, nombre) {
  const traducido = traducir(nombre);
  // Primero busca por slug exacto
  try {
    const res = await fetch(`${BASE_URL}/${endpoint}/${traducido.replace(/ /g, '-')}/`);
    if (res.ok) return await res.json();
  } catch {}
  // Si no, busca con el query search
  const res = await fetch(`${BASE_URL}/${endpoint}/?search=${encodeURIComponent(traducido)}&limit=1`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.results?.[0] || null;
}

// ─── Embeds por tipo ─────────────────────────────────────────────────────────

function embedHechizo(spell) {
  const nivel = spell.level_int === 0 ? 'Truco' : `Nivel ${spell.level_int}`;
  const embed = new EmbedBuilder()
    .setTitle(`🔮 ${spell.name}`)
    .setColor(0x7B2FBE)
    .setDescription(truncar(spell.desc, 400))
    .addFields(
      { name: 'Nivel', value: nivel, inline: true },
      { name: 'Escuela', value: spell.school || '—', inline: true },
      { name: 'Tiempo de lanzamiento', value: spell.casting_time || '—', inline: true },
      { name: 'Alcance', value: spell.range || '—', inline: true },
      { name: 'Duración', value: spell.duration || '—', inline: true },
      { name: 'Componentes', value: spell.components || '—', inline: true },
    );
  if (spell.higher_level) embed.addFields({ name: '📈 A nivel superior', value: truncar(spell.higher_level, 512) });
  if (spell.concentration === 'yes') embed.addFields({ name: '⚠️', value: 'Requiere concentración', inline: true });
  embed.setFooter({ text: `Fuente: ${spell.document__title || 'SRD 5e'} • Open5e API` });
  return embed;
}

function embedMonstruo(monster) {
  const embed = new EmbedBuilder()
    .setTitle(`🐉 ${monster.name}`)
    .setColor(0xC0392B)
    .setDescription(`*${monster.size} ${monster.type}, ${monster.alignment}*`)
    .addFields(
      { name: '❤️ Puntos de Golpe', value: `${monster.hit_points} (${monster.hit_dice})`, inline: true },
      { name: '🛡️ Clase de Armadura', value: String(monster.armor_class), inline: true },
      { name: '💨 Velocidad', value: monster.speed || '—', inline: true },
      { name: '💪 FUE', value: String(monster.strength), inline: true },
      { name: '🤸 DES', value: String(monster.dexterity), inline: true },
      { name: '🏋️ CON', value: String(monster.constitution), inline: true },
      { name: '🧠 INT', value: String(monster.intelligence), inline: true },
      { name: '👁️ SAB', value: String(monster.wisdom), inline: true },
      { name: '✨ CAR', value: String(monster.charisma), inline: true },
      { name: '⚔️ FP', value: String(monster.challenge_rating), inline: true },
    );
  if (monster.senses) embed.addFields({ name: '👁️ Sentidos', value: monster.senses, inline: true });
  if (monster.languages) embed.addFields({ name: '🗣️ Idiomas', value: monster.languages, inline: true });
  if (monster.special_abilities?.length) {
    const especiales = monster.special_abilities.slice(0, 3)
      .map(a => `**${a.name}:** ${truncar(a.desc, 150)}`).join('\n');
    embed.addFields({ name: '✨ Habilidades especiales', value: especiales });
  }
  if (monster.actions?.length) {
    const acciones = monster.actions.slice(0, 3)
      .map(a => `**${a.name}:** ${truncar(a.desc, 150)}`).join('\n');
    embed.addFields({ name: '⚔️ Acciones', value: acciones });
  }
  embed.setFooter({ text: `Fuente: ${monster.document__title || 'SRD 5e'} • Open5e API` });
  return embed;
}

function embedObjeto(item) {
  const embed = new EmbedBuilder()
    .setTitle(`⚗️ ${item.name}`)
    .setColor(0xF39C12)
    .setDescription(truncar(item.desc, 800))
    .addFields(
      { name: 'Tipo', value: item.type || '—', inline: true },
      { name: 'Rareza', value: item.rarity || '—', inline: true },
    );
  if (item.requires_attunement) embed.addFields({ name: '🔗 Sintonización', value: item.requires_attunement, inline: true });
  embed.setFooter({ text: `Fuente: ${item.document__title || 'SRD 5e'} • Open5e API` });
  return embed;
}

function embedClase(cls) {
  const embed = new EmbedBuilder()
    .setTitle(`⚔️ ${cls.name}`)
    .setColor(0x27AE60)
    .setDescription(truncar(cls.desc, 600))
    .addFields(
      { name: '🎲 Dado de Golpe', value: `d${cls.hit_dice}`, inline: true },
      { name: '📖 Habilidades de clase', value: truncar(cls.prof_skills || '—', 300), inline: false },
    );
  if (cls.subtypes_name) embed.addFields({ name: '🌿 Subclases', value: cls.subtypes_name, inline: true });
  embed.setFooter({ text: `Fuente: SRD 5e • Open5e API` });
  return embed;
}

function embedRaza(race) {
  const embed = new EmbedBuilder()
    .setTitle(`🧝 ${race.name}`)
    .setColor(0x2980B9)
    .setDescription(truncar(race.desc, 600))
    .addFields(
      { name: '🏃 Velocidad', value: String(race.speed), inline: true },
      { name: '📏 Tamaño', value: race.size || '—', inline: true },
      { name: '🌐 Idiomas', value: race.languages || '—', inline: true },
    );
  if (race.traits) embed.addFields({ name: '✨ Rasgos raciales', value: truncar(race.traits, 600) });
  embed.setFooter({ text: `Fuente: SRD 5e • Open5e API` });
  return embed;
}

function embedTrasfondo(bg) {
  const embed = new EmbedBuilder()
    .setTitle(`📜 ${bg.name}`)
    .setColor(0x8E44AD)
    .setDescription(truncar(bg.desc, 600))
    .addFields(
      { name: '🛠️ Competencias en habilidades', value: bg.skill_proficiencies || '—', inline: true },
      { name: '🌐 Idiomas', value: bg.languages || 'Ninguno', inline: true },
    );
  if (bg.feature) embed.addFields({ name: `✨ Rasgo: ${bg.feature}`, value: truncar(bg.feature_desc, 512) });
  embed.setFooter({ text: `Fuente: SRD 5e • Open5e API` });
  return embed;
}

// ─── Búsqueda general ────────────────────────────────────────────────────────

async function busquedaGeneral(termino) {
  const traducido = traducir(termino);
  const res = await fetch(`${BASE_URL}/search/?text=${encodeURIComponent(traducido)}&limit=8`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.results || [];
}

// ─── Evento: bot listo ───────────────────────────────────────────────────────

client.once('ready', () => {
  console.log(`\n⚔️  Bot conectado como ${client.user.tag}`);
  console.log(`📖 Compendio D&D 5e listo!\n`);
  client.user.setActivity('D&D 5e | /hechizo /monstruo', { type: 3 }); // WATCHING
});

// ─── Evento: comandos slash ──────────────────────────────────────────────────

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  await interaction.deferReply(); // Muestra "pensando..." mientras busca

  const { commandName } = interaction;

  try {
    if (commandName === 'spell') {
      const nombre = interaction.options.getString('name');
      const spell = await buscarEnEndpoint('spells', nombre);
      if (!spell) return interaction.editReply(`❌ Spell **"${nombre}"** not found. Try searching in English if it's not in the dictionary.`);
      return interaction.editReply({ embeds: [embedHechizo(spell)] });
    }

    if (commandName === 'monster') {
      const nombre = interaction.options.getString('name');
      const monster = await buscarEnEndpoint('monsters', nombre);
      if (!monster) return interaction.editReply(`❌ Monster **"${nombre}"** not found. Try searching in English if it's not in the dictionary.`);
      return interaction.editReply({ embeds: [embedMonstruo(monster)] });
    }

    if (commandName === 'item') {
      const nombre = interaction.options.getString('name');
      const item = await buscarEnEndpoint('magicitems', nombre);
      if (!item) return interaction.editReply(`❌ Item **"${nombre}"** not found. Try searching in English if it's not in the dictionary.`);
      return interaction.editReply({ embeds: [embedObjeto(item)] });
    }

    if (commandName === 'class') {
      const nombre = interaction.options.getString('name');
      const cls = await buscarEnEndpoint('classes', nombre);
      if (!cls) return interaction.editReply(`❌ Class **"${nombre}"** not found.`);
      return interaction.editReply({ embeds: [embedClase(cls)] });
    }

    if (commandName === 'race') {
      const nombre = interaction.options.getString('name');
      const race = await buscarEnEndpoint('races', nombre);
      if (!race) return interaction.editReply(`❌ Race **"${nombre}"** not found.`);
      return interaction.editReply({ embeds: [embedRaza(race)] });
    }

    if (commandName === 'background') {
      const nombre = interaction.options.getString('name');
      const bg = await buscarEnEndpoint('backgrounds', nombre);
      if (!bg) return interaction.editReply(`❌ Background **"${nombre}"** not found.`);
      return interaction.editReply({ embeds: [embedTrasfondo(bg)] });
    }

    if (commandName === 'help') {
      const embed = new EmbedBuilder()
        .setTitle('⚔️ DnD5e Compendio Bot — Commands')
        .setColor(0x5865F2)
        .addFields(
          { name: '/spell `name`', value: 'Look up a spell (e.g. *fireball*, *bola de fuego*)' },
          { name: '/monster `name`', value: 'Look up a monster (e.g. *goblin*, *vampiro*)' },
          { name: '/item `name`', value: 'Look up a magic item (e.g. *vorpal sword*)' },
          { name: '/class `name`', value: 'Look up a class (e.g. *wizard*, *mago*)' },
          { name: '/race `name`', value: 'Look up a race (e.g. *elf*, *elfo*)' },
          { name: '/background `name`', value: 'Look up a background (e.g. *acolyte*)' },
          { name: '/search `query`', value: 'General search across the whole compendium' },
        )
        .setFooter({ text: 'Spanish names are supported • Data from Open5e API (SRD 5e)' });
      return interaction.editReply({ embeds: [embed] });
    }

    if (commandName === 'search') {
      const termino = interaction.options.getString('query');
      const resultados = await busquedaGeneral(termino);
      if (!resultados?.length) return interaction.editReply(`❌ No results found for **"${termino}"**.`);

      const embed = new EmbedBuilder()
        .setTitle(`🔍 Results for: "${termino}"`)
        .setColor(0x95A5A6)
        .setDescription(resultados.map((r, i) =>
          `${i + 1}. **${r.name}** — *${r.route?.replace('v1/', '') || 'general'}*`
        ).join('\n'))
        .setFooter({ text: 'Use /spell, /monster, /item, /class, /race for more details' });

      return interaction.editReply({ embeds: [embed] });
    }

  } catch (err) {
    console.error(`Error en /${commandName}:`, err);
    interaction.editReply('❌ Ocurrió un error buscando en el compendio. Intenta de nuevo.');
  }
});

// ─── Login ───────────────────────────────────────────────────────────────────

client.login(process.env.DISCORD_TOKEN);
