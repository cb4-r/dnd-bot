const { SlashCommandBuilder } = require('discord.js');
const { searchEndpoint } = require('../utils/helpers');
const { embedBackground } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('background')
    .setDescription('Look up a D&D 5e background')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Background name (e.g. acolyte)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const bg = await searchEndpoint('backgrounds', name);
    if (!bg) return interaction.editReply(`❌ Background **"${name}"** not found.`);
    return interaction.editReply({ embeds: [embedBackground(bg)] });
  },
};
