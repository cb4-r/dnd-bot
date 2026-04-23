const { SlashCommandBuilder } = require('discord.js');
const { searchEndpoint } = require('../utils/helpers');
const { embedFeat } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('feat')
    .setDescription('Look up a D&D 5e feat')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Feat name (e.g. alert, lucky)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const feat = await searchEndpoint('feats', name);
    if (!feat) return interaction.editReply(`❌ Feat **"${name}"** not found.`);
    return interaction.editReply({ embeds: [embedFeat(feat)] });
  },
};
