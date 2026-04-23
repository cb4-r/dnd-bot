const { SlashCommandBuilder } = require('discord.js');
const { searchEndpoint } = require('../utils/helpers');
const { embedRace } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('race')
    .setDescription('Look up a D&D 5e race')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Race name (e.g. elf, elfo)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const race = await searchEndpoint('races', name);
    if (!race) return interaction.editReply(`❌ Race **"${name}"** not found.`);
    return interaction.editReply({ embeds: [embedRace(race)] });
  },
};
