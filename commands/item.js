const { SlashCommandBuilder } = require('discord.js');
const { searchWithSuggestions } = require('../utils/helpers');
const { embedItem } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('item')
    .setDescription('Look up a D&D 5e magic item')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Item name (e.g. vorpal sword)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const { result, suggestions } = await searchWithSuggestions('magicitems', name);

    if (result) return interaction.editReply({ embeds: [embedItem(result)] });

    if (suggestions.length > 0) {
      const list = suggestions.slice(0, 8).map(s => `• **${s.name}**`).join('\n');
      return interaction.editReply(`❌ No exact match for **"${name}"**. Did you mean:\n${list}`);
    }

    return interaction.editReply(`❌ Item **"${name}"** not found.`);
  },
};
