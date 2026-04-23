# ⚔️ DnD5e Compendium Bot

A Discord bot for querying D&D 5e spells, monsters, magic items, classes, races, backgrounds, feats, conditions, weapons, armor, and rules — powered by the Open5e public API.

---

## Project Analysis

### Architecture

The project is a single-process Discord bot with a modular command structure:

- **`index.js`** — entry point: loads commands dynamically, registers Discord event handlers
- **`commands/`** — one file per slash command; each exports `data` (SlashCommandBuilder) and `execute(interaction)`
- **`utils/helpers.js`** — Spanish→English translation dictionary, API search functions
- **`utils/embeds.js`** — Discord embed builders, one per content type
- **`deploy-commands.js`** — registers slash commands with Discord's API (run once)

Adding a new command only requires creating a file in `commands/` — no changes needed elsewhere.

### Data Source

All content is fetched live from the [Open5e API](https://api.open5e.com/v1), a free REST API that aggregates D&D 5e SRD content under Creative Commons licensing. There is no local database or cache.

**Available endpoints used:**

| Endpoint | Content |
|---|---|
| `/v1/spells/` | ~300 spells from the SRD |
| `/v1/monsters/` | ~300+ monsters (SRD + Tome of Beasts, Creature Codex) |
| `/v1/magicitems/` | SRD magic items |
| `/v1/classes/` | 12 base classes with nested subclass lists |
| `/v1/races/` | SRD races with nested subrace lists |
| `/v1/backgrounds/` | SRD backgrounds |
| `/v1/feats/` | SRD feats |
| `/v1/conditions/` | All 15 conditions |
| `/v1/weapons/` | SRD weapons |
| `/v1/armor/` | SRD armor |
| `/v1/sections/` | Rules and mechanics (cover, grappling, etc.) |
| `/v1/search/` | Cross-endpoint full-text search |

**Content limitation:** Only SRD and OGL-licensed content is available. Books like Xanathar's Guide, Tasha's Cauldron of Everything, and Mordenkainen's are not included, as that content is not freely redistributable.

### Current State

| Area | Status |
|---|---|
| Commands | 13 slash commands implemented |
| Spanish translation | ~90 terms mapped (spells, monsters, classes, races, conditions) |
| Subclasses | Listed inline within `/class` |
| Subraces | Listed inline within `/race` |
| Error handling | Basic — catches API errors, no retry logic |
| Caching | None — every query hits the API live |
| Autocomplete | Not implemented |
| Database | None |
| Tests | None |

### Known Limitations

- **No cache:** high latency on every query; bot fails silently if Open5e is down
- **No autocomplete:** users must type exact or near-exact names
- **No interactive results:** `/search` returns a list but offers no click-through to details
- **Translation coverage is partial:** terms not in the dictionary fall back to a raw English search, which may or may not find a match

---

## Setup

### Requirements

- Node.js 18+ → https://nodejs.org
- A Discord bot application → https://discord.com/developers/applications

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Configure credentials
cp .env.example .env
# Edit .env with your DISCORD_TOKEN and CLIENT_ID

# 3. Register slash commands with Discord (run once, or after adding new commands)
npm run deploy

# 4. Start the bot
npm start
```

---

## Commands

| Command | Example | Description |
|---|---|---|
| `/spell` | `/spell fireball` | Look up a spell |
| `/monster` | `/monster goblin` | Look up a monster |
| `/item` | `/item vorpal sword` | Look up a magic item |
| `/class` | `/class wizard` | Class info + subclass list |
| `/race` | `/race elf` | Race info + subrace list |
| `/background` | `/background acolyte` | Background info |
| `/feat` | `/feat alert` | Look up a feat |
| `/condition` | `/condition poisoned` | Look up a condition |
| `/weapon` | `/weapon longsword` | Look up a weapon |
| `/armor` | `/armor plate` | Look up armor |
| `/rule` | `/rule grappling` | Look up a rule or mechanic |
| `/search` | `/search fireball` | General search across all content |
| `/help` | `/help` | List all commands |

Spanish names are supported for common terms (e.g. `bola de fuego`, `vampiro`, `mago`, `paralizado`).

---

## Project Structure

```
dnd-bot/
├── commands/           # One file per slash command
│   ├── spell.js
│   ├── monster.js
│   ├── item.js
│   ├── class.js
│   ├── race.js
│   ├── background.js
│   ├── feat.js
│   ├── condition.js
│   ├── weapon.js
│   ├── armor.js
│   ├── rule.js
│   ├── search.js
│   └── help.js
├── utils/
│   ├── helpers.js      # ES→EN translations, API search logic
│   └── embeds.js       # Discord embed builders
├── index.js            # Bot entry point
├── deploy-commands.js  # Registers commands with Discord
└── .env.example
```

## Keeping the Bot Online (optional)

```bash
npm install -g pm2
pm2 start index.js --name dnd-bot
pm2 startup && pm2 save
```

Or deploy for free on Railway or Render.

---

*Data provided by [Open5e API](https://open5e.com) — content licensed under Creative Commons (SRD 5e)*
