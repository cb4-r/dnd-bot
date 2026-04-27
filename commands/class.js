const { SlashCommandBuilder } = require('discord.js');
const { searchWithSuggestions } = require('../utils/helpers');
const { embedClass } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('class')
    .setDescription('Look up a D&D 5e class')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Class name (e.g. wizard, mago)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const { result, suggestions } = await searchWithSuggestions('classes', name);

    if (result) return interaction.editReply({ embeds: [embedClass(result)] });

    if (suggestions.length > 0) {
      const list = suggestions.slice(0, 8).map(s => `• **${s.name}**`).join('\n');
      return interaction.editReply(`❌ No exact match for **"${name}"**. Did you mean:\n${list}`);
    }

    return interaction.editReply(`❌ Class **"${name}"** not found.`);
  },
};
