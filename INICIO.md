# Inicio rápido — dnd5e-compendio-bot

## 1. Requisitos previos
- Node.js 24 instalado
- Archivo `.env` en la raíz con:
  ```
  DISCORD_TOKEN=tu_token_aqui
  CLIENT_ID=1494907913590800545
  ```

## 2. Instalar dependencias (solo la primera vez o tras `npm install`)
```bash
npm install
```

## 3. Registrar slash commands en Discord
Correr **solo cuando cambies la definición de un comando** (nombre, descripción, opciones):
```bash
npm run deploy
```

## 4. Iniciar el bot
```bash
npm start
```
El bot queda corriendo. Para detenerlo: `Ctrl + C`.

---

## Flujo normal de trabajo

| Tarea | Comando |
|---|---|
| Solo iniciar el bot | `npm start` |
| Cambié un comando y quiero actualizarlo | `npm run deploy` → `npm start` |
| Instalé una dependencia nueva | `npm install` → `npm start` |

---

## Archivos clave
- `index.js` — lógica principal, carga comandos, maneja slash + autocomplete
- `commands/` — un archivo por comando slash (15 comandos)
- `utils/helpers.js` — translate(), búsqueda híbrida (local→fuzzy→API), fetchSuggestions()
- `utils/local-data.js` — datos locales vía dnd-data (~30k registros), Fuse.js, parsers
- `utils/embeds.js` — constructores de embeds de Discord por tipo de entidad
- `deploy-commands.js` — registrar slash commands en Discord (correr tras cambios en comandos)
- `clear-commands.js` — eliminar todos los slash commands del bot (mantenimiento)
