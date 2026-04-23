require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { fetchSuggestions } = require('./utils/helpers');
const fs = require('fs');
const path = require('path');

// Maps each slash command to its Open5e API endpoint
const AUTOCOMPLETE_ENDPOINTS = {
  spell:      'spells',
  monster:    'monsters',
  condition:  'conditions',
  race:       'races',
  class:      'classes',
  feat:       'feats',
  item:       'magicitems',
  weapon:     'weapons',
  armor:      'armor',
  background: 'backgrounds',
  rule:       'sections',
};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

// Load all commands from commands/
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`\n⚔️  Bot connected as ${client.user.tag}`);
  console.log(`📖 D&D 5e Compendium ready!\n`);
  client.user.setActivity('D&D 5e | /spell /monster', { type: 3 });
});

client.on('interactionCreate', async interaction => {
  if (interaction.isAutocomplete()) {
    const endpoint = AUTOCOMPLETE_ENDPOINTS[interaction.commandName];
    if (!endpoint) return interaction.respond([]);
    const query = interaction.options.getFocused();
    const choices = await fetchSuggestions(endpoint, query);
    return interaction.respond(choices);
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  await interaction.deferReply();

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error in /${interaction.commandName}:`, err);
    interaction.editReply('❌ An error occurred while searching the compendium. Please try again.');
  }
});

client.login(process.env.DISCORD_TOKEN);
