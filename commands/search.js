const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { generalSearch } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('General search across the D&D 5e compendium')
    .addStringOption(opt =>
      opt.setName('query').setDescription('Term to search for').setRequired(true)),

  async execute(interaction) {
    const query = interaction.options.getString('query');
    const results = await generalSearch(query);
    if (!results?.length) return interaction.editReply(`❌ No results found for **"${query}"**.`);

    const embed = new EmbedBuilder()
      .setTitle(`🔍 Results for: "${query}"`)
      .setColor(0x95A5A6)
      .setDescription(results.map((r, i) =>
        `${i + 1}. **${r.name}** — *${r.route?.replace('v1/', '') || 'general'}*`
      ).join('\n'))
      .setFooter({ text: 'Use /spell, /monster, /item, /class, /race for details' });

    return interaction.editReply({ embeds: [embed] });
  },
};
