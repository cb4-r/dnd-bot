# ⚔️ DnD5e Compendium Bot

Discord bot para consultar el compendio de D&D 5e. Soporta nombres en español e inglés, autocomplete en todos los comandos, y búsqueda difusa para tipeos y cognados.

---

## Comandos

| Comando | Ejemplo | Descripción |
|---|---|---|
| `/spell` | `/spell bola de fuego` | Hechizos |
| `/monster` | `/monster vampiro` | Monstruos y criaturas |
| `/item` | `/item bag of holding` | Objetos mágicos |
| `/class` | `/class mago` | Clases con estadísticas |
| `/race` | `/race elfo` | Razas con rasgos |
| `/background` | `/background acolyte` | Trasfondos con habilidades y feature |
| `/feat` | `/feat alert` | Dotes |
| `/condition` | `/condition paralizado` | Condiciones |
| `/weapon` | `/weapon longsword` | Armas |
| `/armor` | `/armor plate` | Armaduras |
| `/rule` | `/rule cover` | Reglas y mecánicas |
| `/r` | `/r 2d6+3` | Lanzador de dados |
| `/wildmagic` | `/wildmagic` | Tabla Oleada de Magia Salvaje |
| `/search` | `/search fireball` | Búsqueda general |
| `/help` | `/help` | Lista de comandos |

**Soporte de español:** nombres en español funcionan en todos los comandos — `bola de fuego`, `vampiro`, `mago`, `paralizado`, etc. Los cognados y errores tipográficos también se resuelven automáticamente (`firaball → Fireball`, `vampiro → Vampire`).

---

## Arquitectura

```
index.js              — Entrada principal. Carga comandos, maneja slash + autocomplete
deploy-commands.js    — Registra slash commands en Discord (correr una vez)
commands/             — Un archivo por comando (15 comandos)
utils/
  helpers.js          — translate(), searchWithSuggestions(), fetchSuggestions(), generalSearch()
  local-data.js       — Acceso a dnd-data: búsqueda local, fuzzy search (Fuse.js), parsers
  embeds.js           — Constructores de Discord embeds por tipo de entidad
  translations.json   — Diccionario español→inglés para términos no cognados
.env                  — DISCORD_TOKEN, CLIENT_ID (no commitear)
```

### Flujo de búsqueda

Para cada consulta:
1. **`translate()`** — strip acentos + lookup en `translations.json`
2. **`searchLocal()`** — búsqueda exact/partial en datos locales (~30k registros, sin red)
3. **`fuzzySearchLocal()`** — si local falla, Fuse.js busca por similitud de caracteres
4. **Open5e API** — fallback para endpoints sin datos locales (conditions, weapons, armor, feats, rules)

### Datos locales vs API

| Fuente local (dnd-data) | Solo API (Open5e) |
|---|---|
| Hechizos (~5,849) | Conditions |
| Monstruos (~11,463) | Weapons |
| Objetos mágicos (~15,749) | Armor |
| Trasfondos (~405) | Feats |
| Clases (~134) | Rules/Sections |
| Razas/Especies (~383) | |

Los datos locales tienen **source priority**: Player's Handbook > SRD > Free Basic Rules > suplementos de terceros.

---

## Setup

### Requisitos

- Node.js 18+
- Bot de Discord → https://discord.com/developers/applications

### Instalación

```bash
npm install
cp .env.example .env   # editar con DISCORD_TOKEN y CLIENT_ID
npm run deploy         # registrar slash commands (una vez, o al agregar comandos)
npm start
```

### Mantener el bot activo (opcional)

```bash
npm install -g pm2
pm2 start index.js --name dnd-bot
pm2 startup && pm2 save
```

---

## Variables de entorno

```
DISCORD_TOKEN=...
CLIENT_ID=1494907913590800545
```

---

*Datos: [dnd-data](https://www.npmjs.com/package/dnd-data) (local) + [Open5e API](https://open5e.com) (fallback) — contenido bajo SRD 5e / Creative Commons*
