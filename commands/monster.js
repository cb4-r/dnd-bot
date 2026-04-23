const { SlashCommandBuilder } = require('discord.js');
const { searchEndpoint } = require('../utils/helpers');
const { embedMonster } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('monster')
    .setDescription('Look up a D&D 5e monster or creature')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Monster name (e.g. goblin, orco)').setRequired(true).setAutocomplete(true)),

  async execute(interaction) {
    const name = interaction.options.getString('name');
    const monster = await searchEndpoint('monsters', name);
    if (!monster) return interaction.editReply(`❌ Monster **"${name}"** not found. Try the English name if it's not in the dictionary.`);
    return interaction.editReply({ embeds: [embedMonster(monster)] });
  },
};
