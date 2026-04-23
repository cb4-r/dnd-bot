const { SlashCommandBuilder } = require('discord.js');
const { searchEndpoint } = require('../utils/helpers');
const { embedItem } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('item')
    .setDescription('Look up a D&D 5e magic item')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Item name (e.g. vorpal sword)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const item = await searchEndpoint('magicitems', name);
    if (!item) return interaction.editReply(`❌ Item **"${name}"** not found. Try the English name if it's not in the dictionary.`);
    return interaction.editReply({ embeds: [embedItem(item)] });
  },
};
