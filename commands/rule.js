const { SlashCommandBuilder } = require('discord.js');
const { searchEndpoint } = require('../utils/helpers');
const { embedRule } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rule')
    .setDescription('Look up a D&D 5e rule or mechanic')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Rule name (e.g. cover, grappling, exhaustion)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const section = await searchEndpoint('sections', name);
    if (!section) return interaction.editReply(`❌ Rule **"${name}"** not found.`);
    return interaction.editReply({ embeds: [embedRule(section)] });
  },
};
