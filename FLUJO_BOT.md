# Cómo funciona el bot — flujo detallado

## `npm run deploy` → `node deploy-commands.js`

Este script **no inicia el bot**. Solo le dice a Discord "estos comandos slash existen".
Se corre una sola vez, o cada vez que cambias la definición de un comando.

```js
require('dotenv').config();
```
Lee el archivo `.env` e inyecta sus variables (`DISCORD_TOKEN`, `CLIENT_ID`, etc.) en
`process.env`. Sin esto las líneas siguientes obtendrían `undefined`.

```js
const { REST, Routes } = require('discord.js');
```
- `REST` — cliente HTTP de discord.js para hablar con la **Discord REST API** (no WebSocket, solo HTTP).
- `Routes` — objeto con helpers que generan URLs de la API.
  Ej: `Routes.applicationCommands(clientId)` → `/applications/1234/commands`.

```js
const commands = [];
const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  commands.push(command.data.toJSON());
}
```
- Lee todos los `.js` de `commands/`.
- Cada archivo exporta `{ data, execute }`. Aquí solo importa `data`, que es un `SlashCommandBuilder`.
- `.toJSON()` lo convierte al formato JSON que espera la API de Discord (nombre, descripción, opciones).
- Al final, `commands` es un array de 15 objetos JSON, uno por comando.

```js
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
```
Crea el cliente HTTP autenticado. `version: '10'` es la versión de la API de Discord.
El token identifica tu aplicación ante Discord.

```js
const guildId = process.env.GUILD_ID;
const route = guildId
  ? Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId)
  : Routes.applicationCommands(process.env.CLIENT_ID);
await rest.put(route, { body: commands });
```
- Si hay `GUILD_ID` en `.env` → registra los comandos **solo en ese servidor** (instantáneo, ideal para desarrollo).
- Si no hay `GUILD_ID` → registra **globalmente** en todos los servidores donde está el bot (puede tardar hasta 1 hora en propagarse).
- `PUT` **reemplaza todo** — no agrega, reemplaza la lista entera. Si borras un comando del código y volvés a deployar, desaparece de Discord.

**¿Qué logra esto?** Discord guarda en sus servidores el esquema de tus comandos. Cuando un
usuario escribe `/` en Discord, el cliente ya sabe qué comandos mostrar porque los tiene
guardados. **El bot no necesita estar encendido para que aparezcan los comandos en el menú.**
Pero sí necesita estar encendido para ejecutarlos.

---

## `npm run start` → `node index.js`

Este script **inicia el bot**. Abre una conexión persistente con Discord y escucha eventos.

```js
require('dotenv').config();
```
Igual que antes: carga `.env`.

```js
const { Client, GatewayIntentBits, Collection } = require('discord.js');
```
- `Client` — la clase principal del bot. Representa tu bot en Discord.
- `GatewayIntentBits` — permisos para recibir ciertos eventos. `Guilds` es el mínimo necesario para slash commands.
- `Collection` — como un `Map` de JavaScript pero con métodos extra de discord.js.

```js
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();
```
- Crea la instancia del bot con el intent `Guilds`. No necesita `GuildMessages` porque slash
  commands no leen mensajes de texto, solo reciben interacciones.
- Le cuelga una propiedad `.commands` que será el mapa `nombre → módulo de comando`.

```js
for (const file of fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}
```
Carga todos los archivos de `commands/`. Guarda el módulo **completo** (con `execute`)
en `client.commands`, indexado por nombre. Ej: `client.commands.get('spell')` devuelve
el módulo entero de `spell.js`.

```js
client.once('ready', () => {
  console.log(`⚔️  Bot connected as ${client.user.tag}`);
  client.user.setActivity('D&D 5e | /spell /monster', { type: 3 });
});
```
`'ready'` se dispara una sola vez cuando el bot terminó de autenticarse. Ahí ya existe
`client.user` y se puede cambiar el estado/actividad visible en Discord.

```js
client.login(process.env.DISCORD_TOKEN);
```
**Esta es la línea que conecta el bot a Discord.** Abre una conexión **WebSocket**
(persistente, bidireccional) con los servidores Gateway de Discord. El token autentica
quién sos. Desde este momento Discord empieza a enviarte eventos en tiempo real.

---

## El ciclo de vida de una interacción (`/spell fireball`)

Una vez el bot está conectado, todo pasa en el listener de `interactionCreate`:

```js
client.on('interactionCreate', async interaction => {
```
Discord envía un evento WebSocket cada vez que alguien usa un slash command, hace click
en un botón, o escribe en un autocomplete. Este callback se ejecuta para **todos** esos casos.

### Rama 1 — Autocomplete (el usuario está escribiendo)

```js
if (interaction.isAutocomplete()) {
  const endpoint = AUTOCOMPLETE_ENDPOINTS[interaction.commandName]; // 'spells'
  const query = interaction.options.getFocused(); // lo que escribió hasta ahora, ej: "fire"
  const choices = await fetchSuggestions(endpoint, query); // busca localmente + API
  return interaction.respond(choices); // devuelve hasta 25 sugerencias a Discord
}
```
Discord espera una respuesta en **< 3 segundos** o el autocomplete falla silenciosamente.
Por eso la búsqueda local es clave — no depende de red.

### Rama 2 — Comando ejecutado (el usuario presionó Enter)

```js
await interaction.deferReply();
const command = client.commands.get(interaction.commandName); // busca 'spell' en el mapa
await command.execute(interaction); // llama a la función execute de spell.js
```
`deferReply()` es crítico: Discord da **3 segundos** para responder antes de considerar
la interacción fallida. Como buscar en la API puede tardar más, `deferReply()` extiende
ese plazo a **15 minutos** mostrando un spinner al usuario. Luego `editReply()` reemplaza
el spinner con la respuesta real.

### Dentro de `spell.js`

```js
const name = interaction.options.getString('name'); // "fireball"
const { result, suggestions } = await searchWithSuggestions('spells', name);
// busca local → fuzzy → API
// result = objeto del hechizo, o null si no encontró
// suggestions = array de candidatos si no hay match exacto

if (result) return interaction.editReply({ embeds: [embedSpell(result)] });
// si encontró → construye embed y lo manda
```

---

## Diagrama del flujo completo

```
DEPLOY (una vez):
  deploy-commands.js
    → lee commands/*.js y extrae .data.toJSON()
    → HTTP PUT a api.discord.com/applications/{CLIENT_ID}/commands
    → Discord guarda el esquema de los 15 comandos
    → proceso termina

START (siempre activo):
  index.js
    → carga commands/*.js con execute
    → client.login(TOKEN)
        → WebSocket abierto con Discord Gateway
        → evento 'ready' → bot online

  Usuario escribe /spell en Discord:
    → Discord consulta sus registros guardados (del deploy) → muestra el menú
    → Usuario escribe "fire"
        → Discord envía evento autocomplete por WebSocket
        → fetchSuggestions('spells', 'fire') → choices → interaction.respond()
    → Usuario selecciona "Fireball" y presiona Enter
        → Discord envía evento chatInputCommand
        → interaction.deferReply()      ← spinner al usuario
        → searchWithSuggestions(...)   ← busca local o en API
        → interaction.editReply(embed)  ← spinner reemplazado por el embed
```

---

## La clave de la separación

`deploy` registra la *forma* de los comandos en Discord (estructura, opciones, descripciones).
`start` maneja la *lógica* cuando se ejecutan. Son completamente independientes — podés tener
el bot corriendo sin haber deployado recientemente, pero los usuarios no verían comandos nuevos
que hayas creado.
