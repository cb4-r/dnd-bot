const { SlashCommandBuilder } = require('discord.js');
const { searchWithSuggestions } = require('../utils/helpers');
const { embedFeat } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('feat')
    .setDescription('Look up a D&D 5e feat')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Feat name (e.g. alert, lucky)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const { result, suggestions } = await searchWithSuggestions('feats', name);

    if (result) return interaction.editReply({ embeds: [embedFeat(result)] });

    if (suggestions.length > 0) {
      const list = suggestions.slice(0, 8).map(s => `• **${s.name}**`).join('\n');
      return interaction.editReply(`❌ No exact match for **"${name}"**. Did you mean:\n${list}`);
    }

    return interaction.editReply(`❌ Feat **"${name}"** not found.`);
  },
};
