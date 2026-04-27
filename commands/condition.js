const { SlashCommandBuilder } = require('discord.js');
const { searchWithSuggestions } = require('../utils/helpers');
const { embedCondition } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('condition')
    .setDescription('Look up a D&D 5e condition')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Condition name (e.g. poisoned, stunned, paralizado)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const { result, suggestions } = await searchWithSuggestions('conditions', name);

    if (result) return interaction.editReply({ embeds: [embedCondition(result)] });

    if (suggestions.length > 0) {
      const list = suggestions.slice(0, 8).map(s => `• **${s.name}**`).join('\n');
      return interaction.editReply(`❌ No exact match for **"${name}"**. Did you mean:\n${list}`);
    }

    return interaction.editReply(`❌ Condition **"${name}"** not found.`);
  },
};
