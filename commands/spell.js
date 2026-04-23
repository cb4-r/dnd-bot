const { SlashCommandBuilder } = require('discord.js');
const { searchWithSuggestions } = require('../utils/helpers');
const { embedSpell } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('spell')
    .setDescription('Look up a D&D 5e spell')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Spell name (e.g. fireball, bola de fuego)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const { result, suggestions } = await searchWithSuggestions('spells', name);

    if (result) return interaction.editReply({ embeds: [embedSpell(result)] });

    if (suggestions.length === 0)
      return interaction.editReply(`❌ Spell **"${name}"** not found. Try the English name if it's not in the dictionary.`);

    const list = suggestions.slice(0, 8).map(s => `• **${s.name}**`).join('\n');
    return interaction.editReply(`❌ No exact match for **"${name}"**. Did you mean:\n${list}`);
  },
};
