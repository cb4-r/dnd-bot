const { SlashCommandBuilder } = require('discord.js');
const { searchEndpoint } = require('../utils/helpers');
const { embedWeapon } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('weapon')
    .setDescription('Look up a D&D 5e weapon')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Weapon name (e.g. longsword, shortbow)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const weapon = await searchEndpoint('weapons', name);
    if (!weapon) return interaction.editReply(`❌ Weapon **"${name}"** not found.`);
    return interaction.editReply({ embeds: [embedWeapon(weapon)] });
  },
};
