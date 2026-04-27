const { SlashCommandBuilder } = require('discord.js');
const { searchWithSuggestions } = require('../utils/helpers');
const { embedBackground } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('background')
    .setDescription('Look up a D&D 5e background')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Background name (e.g. acolyte)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const { result, suggestions } = await searchWithSuggestions('backgrounds', name);

    if (result) return interaction.editReply({ embeds: [embedBackground(result)] });

    if (suggestions.length > 0) {
      const list = suggestions.slice(0, 8).map(s => `• **${s.name}**`).join('\n');
      return interaction.editReply(`❌ No exact match for **"${name}"**. Did you mean:\n${list}`);
    }

    return interaction.editReply(`❌ Background **"${name}"** not found.`);
  },
};
