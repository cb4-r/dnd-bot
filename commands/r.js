const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const STANDARD_FACES = new Set([4, 6, 8, 10, 12, 20, 100]);
const MAX_DICE_PER_GROUP = 20;
const MAX_GROUPS = 10;

const WEIRD_DICE_MESSAGES = [
  '¿Qué extraño dado...?',
  'Espero no pisar este dado.',
  '¡Qué bella es la geometría!',
  'El DM te mira con sospecha.',
  'Eso no está en el manual, pero aquí vamos.',
  '¿Cuántas caras tiene eso exactamente?',
  'Los dioses del azar aceptan el desafío.',
  'Un dado digno de un hechicero de magia salvaje.',
  'En algún plano de existencia, este dado es estándar.',
  'La física en este mundo es... flexible.',
];

function parseFormula(formula) {
  const normalized = formula.replace(/\s+/g, '');
  if (!normalized) return { error: 'La fórmula está vacía.' };

  const withSign = normalized.startsWith('-') ? normalized : '+' + normalized;
  const TOKEN_RE = /([+-])(\d*)d(\d+)|([+-]\d+)/gi;

  const tokens = [];
  let lastIndex = 0;

  for (const match of withSign.matchAll(TOKEN_RE)) {
    if (match.index !== lastIndex) {
      return { error: `Fórmula inválida cerca de: \`${formula.slice(match.index - 1, match.index + 4)}\`` };
    }
    lastIndex = match.index + match[0].length;

    if (match[3]) {
      // Dice token: +NdM
      const sign = match[1] === '-' ? -1 : 1;
      const count = parseInt(match[2]) || 1;
      const sides = parseInt(match[3]);

      if (count < 1) return { error: 'El número de dados debe ser al menos 1.' };
      if (count > MAX_DICE_PER_GROUP) return { error: `Máximo ${MAX_DICE_PER_GROUP} dados por grupo.` };
      if (sides < 2) return { error: 'Un dado debe tener al menos 2 caras.' };

      tokens.push({ type: 'dice', sign, count, sides });
    } else {
      // Modifier token: +N or -N
      const value = parseInt(match[4]);
      if (isNaN(value)) return { error: 'Modificador inválido en la fórmula.' };
      tokens.push({ type: 'modifier', value });
    }
  }

  if (lastIndex !== withSign.length) {
    return { error: 'La fórmula contiene caracteres inválidos.' };
  }
  if (tokens.length === 0) return { error: 'No se encontraron dados ni modificadores.' };
  if (tokens.filter(t => t.type === 'dice').length > MAX_GROUPS) {
    return { error: `Máximo ${MAX_GROUPS} grupos de dados por tirada.` };
  }

  return { tokens };
}

function rollGroup(count, sides) {
  const rolls = [];
  for (let i = 0; i < count; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  return rolls;
}

function randomWeirdMessage() {
  return WEIRD_DICE_MESSAGES[Math.floor(Math.random() * WEIRD_DICE_MESSAGES.length)];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('r')
    .setDescription('Lanza dados de D&D (ej: 1d20 + 1d6 + 15)')
    .addStringOption(opt =>
      opt.setName('tirada')
        .setDescription('Fórmula de dados (ej: 2d6 + 1d4 + 3)')
        .setRequired(true)),

  async execute(interaction) {
    const formula = interaction.options.getString('tirada');
    const { tokens, error } = parseFormula(formula);

    if (error) {
      return interaction.editReply(`❌ ${error}\nEjemplos válidos: \`1d20\`, \`2d6 + 5\`, \`1d20 + 1d6 - 3\``);
    }

    let total = 0;
    let weirdMessage = null;
    const lines = [];

    for (const token of tokens) {
      if (token.type === 'dice') {
        if (!STANDARD_FACES.has(token.sides) && !weirdMessage) {
          weirdMessage = randomWeirdMessage();
        }

        const rolls = rollGroup(token.count, token.sides);
        const subtotal = rolls.reduce((a, b) => a + b, 0) * token.sign;
        total += subtotal;

        const sign = token.sign === -1 ? '−' : '+';
        const rollDisplay = rolls.length === 1 ? `[${rolls[0]}]` : `[${rolls.join(', ')}] = ${Math.abs(subtotal)}`;
        const label = `${token.count}d${token.sides}`;
        lines.push(`${sign} **${label}** → ${rollDisplay}`);
      } else {
        total += token.value;
        const sign = token.value >= 0 ? '+' : '−';
        lines.push(`${sign} **${Math.abs(token.value)}** *(modificador)*`);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎲 ${formula.trim()}`)
      .setColor(0xF1C40F)
      .setDescription(lines.join('\n'))
      .addFields({ name: 'Total', value: `**${total}**`, inline: false });

    if (weirdMessage) {
      embed.setFooter({ text: `⚠️ — ${weirdMessage}` });
    } else {
      embed.setFooter({ text: 'D&D 5e • Tirada de dados' });
    }

    return interaction.editReply({ embeds: [embed] });
  },
};
