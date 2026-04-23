const { SlashCommandBuilder } = require('discord.js');
const { searchEndpoint } = require('../utils/helpers');
const { embedArmor } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('armor')
    .setDescription('Look up a D&D 5e armor')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Armor name (e.g. plate, chain mail)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const armor = await searchEndpoint('armor', name);
    if (!armor) return interaction.editReply(`❌ Armor **"${name}"** not found.`);
    return interaction.editReply({ embeds: [embedArmor(armor)] });
  },
};
