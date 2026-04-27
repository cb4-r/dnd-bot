const { SlashCommandBuilder } = require('discord.js');
const { searchWithSuggestions } = require('../utils/helpers');
const { embedWeapon } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weapon')
    .setDescription('Look up a D&D 5e weapon')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Weapon name (e.g. longsword, shortbow)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const { result, suggestions } = await searchWithSuggestions('weapons', name);

    if (result) return interaction.editReply({ embeds: [embedWeapon(result)] });

    if (suggestions.length > 0) {
      const list = suggestions.slice(0, 8).map(s => `• **${s.name}**`).join('\n');
      return interaction.editReply(`❌ No exact match for **"${name}"**. Did you mean:\n${list}`);
    }

    return interaction.editReply(`❌ Weapon **"${name}"** not found.`);
  },
};
