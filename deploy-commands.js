require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('spell')
    .setDescription('Look up a D&D 5e spell')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Spell name (e.g. fireball, bola de fuego)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('monster')
    .setDescription('Look up a D&D 5e monster or creature')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Monster name (e.g. goblin, orco)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('item')
    .setDescription('Look up a D&D 5e magic item')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Item name (e.g. vorpal sword)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('class')
    .setDescription('Look up a D&D 5e class')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Class name (e.g. wizard, mago)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('race')
    .setDescription('Look up a D&D 5e race')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Race name (e.g. elf, elfo)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('background')
    .setDescription('Look up a D&D 5e background')
    .addStringOption(opt =>
      opt.setName('name').setDescription('Background name (e.g. acolyte)').setRequired(true)),

  new SlashCommandBuilder()
    .setName('search')
    .setDescription('General search across the D&D 5e compendium')
    .addStringOption(opt =>
      opt.setName('query').setDescription('Term to search for').setRequired(true)),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all available commands'),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('⚔️  Registering slash commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ Commands registered successfully!');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
})();
