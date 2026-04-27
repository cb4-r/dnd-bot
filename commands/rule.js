const { SlashCommandBuilder } = require('discord.js');
const { searchWithSuggestions } = require('../utils/helpers');
const { embedRule } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rule')
    .setDescription('Look up a D&D 5e rule or mechanic')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Rule name (e.g. cover, grappling, exhaustion)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const { result, suggestions } = await searchWithSuggestions('sections', name);

    if (result) return interaction.editReply({ embeds: [embedRule(result)] });

    if (suggestions.length > 0) {
      const list = suggestions.slice(0, 8).map(s => `• **${s.name}**`).join('\n');
      return interaction.editReply(`❌ No exact match for **"${name}"**. Did you mean:\n${list}`);
    }

    return interaction.editReply(`❌ Rule **"${name}"** not found.`);
  },
};
