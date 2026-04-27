const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all available commands'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('⚔️ DnD5e Compendium Bot — Commands')
      .setColor(0x5865F2)
      .addFields(
        { name: '📖 Content', value: '​', inline: false },
        { name: '/spell `name`', value: 'Look up a spell (e.g. *fireball*, *bola de fuego*)' },
        { name: '/monster `name`', value: 'Look up a monster (e.g. *goblin*, *vampiro*)' },
        { name: '/item `name`', value: 'Look up a magic item (e.g. *vorpal sword*)' },
        { name: '/class `name`', value: 'Look up a class (e.g. *wizard*, *mago*)' },
        { name: '/race `name`', value: 'Look up a race (e.g. *elf*, *elfo*)' },
        { name: '/background `name`', value: 'Look up a background (e.g. *acolyte*)' },
        { name: '/feat `name`', value: 'Look up a feat (e.g. *alert*, *lucky*)' },
        { name: '⚙️ Rules & Equipment', value: '​', inline: false },
        { name: '/condition `name`', value: 'Look up a condition (e.g. *poisoned*, *paralizado*)' },
        { name: '/weapon `name`', value: 'Look up a weapon (e.g. *longsword*, *shortbow*)' },
        { name: '/armor `name`', value: 'Look up armor (e.g. *plate*, *chain mail*)' },
        { name: '/rule `name`', value: 'Look up a rule or mechanic (e.g. *cover*, *grappling*)' },
        { name: '🎲 Dice & Extras', value: '​', inline: false },
        { name: '/r `expression`', value: 'Roll dice (e.g. */r 2d6+3*, */r d20 advantage*)' },
        { name: '/wildmagic', value: 'Roll on the Wild Magic Surge table (1d100)' },
        { name: '🔍 Search', value: '​', inline: false },
        { name: '/search `query`', value: 'General search across the whole compendium' },
      )
      .setFooter({ text: 'Spanish names supported • Local data (30k+ entries) + Open5e API' });

    return interaction.editReply({ embeds: [embed] });
  },
};
