const { SlashCommandBuilder } = require('discord.js');
const { searchEndpoint } = require('../utils/helpers');
const { embedClass } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('class')
    .setDescription('Look up a D&D 5e class')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Class name (e.g. wizard, mago)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const cls = await searchEndpoint('classes', name);
    if (!cls) return interaction.editReply(`❌ Class **"${name}"** not found.`);
    return interaction.editReply({ embeds: [embedClass(cls)] });
  },
};
