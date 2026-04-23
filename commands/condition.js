const { SlashCommandBuilder } = require('discord.js');
const { searchEndpoint } = require('../utils/helpers');
const { embedCondition } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('condition')
    .setDescription('Look up a D&D 5e condition')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Condition name (e.g. poisoned, stunned, paralizado)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const condition = await searchEndpoint('conditions', name);
    if (!condition) return interaction.editReply(`❌ Condition **"${name}"** not found.`);
    return interaction.editReply({ embeds: [embedCondition(condition)] });
  },
};
