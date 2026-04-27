const { SlashCommandBuilder } = require('discord.js');
const { searchWithSuggestions } = require('../utils/helpers');
const { embedArmor } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('armor')
    .setDescription('Look up a D&D 5e armor')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Armor name (e.g. plate, chain mail)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const { result, suggestions } = await searchWithSuggestions('armor', name);

    if (result) return interaction.editReply({ embeds: [embedArmor(result)] });

    if (suggestions.length > 0) {
      const list = suggestions.slice(0, 8).map(s => `• **${s.name}**`).join('\n');
      return interaction.editReply(`❌ No exact match for **"${name}"**. Did you mean:\n${list}`);
    }

    return interaction.editReply(`❌ Armor **"${name}"** not found.`);
  },
};
