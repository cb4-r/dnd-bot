const { SlashCommandBuilder } = require('discord.js');
const { searchWithSuggestions } = require('../utils/helpers');
const { embedMonster } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('monster')
    .setDescription('Look up a D&D 5e monster or creature')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Monster name (e.g. goblin, orco)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const { result, suggestions } = await searchWithSuggestions('monsters', name);

    if (result) return interaction.editReply({ embeds: [embedMonster(result)] });

    if (suggestions.length > 0) {
      const list = suggestions.slice(0, 8).map(s => `• **${s.name}**`).join('\n');
      return interaction.editReply(`❌ No exact match for **"${name}"**. Did you mean:\n${list}`);
    }

    return interaction.editReply(`❌ Monster **"${name}"** not found.`);
  },
};
