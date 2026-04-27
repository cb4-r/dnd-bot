const { SlashCommandBuilder } = require('discord.js');
const { searchWithSuggestions } = require('../utils/helpers');
const { embedRace } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('race')
    .setDescription('Look up a D&D 5e race')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Race name (e.g. elf, elfo)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const { result, suggestions } = await searchWithSuggestions('races', name);

    if (result) return interaction.editReply({ embeds: [embedRace(result)] });

    if (suggestions.length > 0) {
      const list = suggestions.slice(0, 8).map(s => `• **${s.name}**`).join('\n');
      return interaction.editReply(`❌ No exact match for **"${name}"**. Did you mean:\n${list}`);
    }

    return interaction.editReply(`❌ Race **"${name}"** not found.`);
  },
};
