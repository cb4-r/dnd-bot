# CLAUDE.md — Contexto del Proyecto

> **Instrucciones para Claude Code:**
> Este archivo es la memoria persistente del proyecto. Sigue estas reglas estrictamente:
>
> 1. **Al inicio de cada sesión:** Lee este archivo completo antes de comenzar cualquier tarea.
> 2. **Al finalizar cada sesión:** Agrega un resumen al final de la sección "Historial de Cambios" con la fecha, lo que se trabajó y el estado final.
> 3. **Control de tamaño:** Si este archivo supera las **300 líneas**, renómbralo a `CLAUDE2.md` (o el siguiente número disponible) y crea un nuevo `CLAUDE.md` limpio con solo el contexto esencial del proyecto. El archivo archivado queda como referencia histórica.
> 4. **Nunca borres entradas anteriores** del historial — solo archívalas rotando el archivo.

---

## Descripción del Proyecto

**Nombre:** dnd5e-compendio-bot  
**Stack principal:** Node.js 24, discord.js v14, Open5e API (REST, sin auth), node-fetch v2, dotenv, dnd-data  
**Objetivo:** Bot de Discord para consultar el compendio de D&D 5e. Los usuarios pueden buscar hechizos, monstruos, razas, clases, objetos mágicos, condiciones, trasfondos, dotes, armas, armaduras y reglas directamente desde Discord mediante slash commands.  
**Estado actual:** Funcional. Comandos desplegados y bot conectado. Autocomplete implementado en todos los comandos.

---

## Contexto Técnico

### Estructura de archivos
```
index.js              — Entrada principal. Carga comandos, maneja interacciones (slash + autocomplete)
deploy-commands.js    — Script one-shot para registrar slash commands en Discord
commands/             — Un archivo por comando: spell, monster, race, class, feat, item,
                        weapon, armor, background, condition, rule, search, help
utils/helpers.js      — Lógica de búsqueda híbrida: intenta local-data primero, luego Open5e API
utils/local-data.js   — Datos locales vía dnd-data: mappers, searchLocal(), fetchLocalSuggestions()
utils/embeds.js       — Constructores de embeds de Discord para cada tipo de entidad
.env                  — Variables de entorno (no commitear): DISCORD_TOKEN, CLIENT_ID
```

### API externa
- Base URL: `https://api.open5e.com/v1`
- Endpoints usados: `spells`, `monsters`, `races`, `classes`, `feats`, `magicitems`,
  `weapons`, `armor`, `backgrounds`, `conditions`, `sections`
- Sin autenticación requerida

### Flujo de búsqueda híbrido (`searchWithSuggestions`)
1. Busca en datos locales (`utils/local-data.js`) — sin red, instantáneo
2. Si no encuentra → fallback a Open5e API:
   a. Intenta slug exacto (`/endpoint/nombre-con-guiones/`)
   b. Busca con `?search=...&limit=10` y filtra por nombre
   c. Si un resultado → devuelve directo; si varios → lista de sugerencias

### Cobertura local vs API
| Local (dnd-data)                         | Solo API                          |
|------------------------------------------|-----------------------------------|
| spells (5,849), monsters (11,463),       | conditions, weapons, armor,       |
| items (15,749), backgrounds (405),       | feats, rules/sections             |
| classes (134), races/species (383)       |                                   |

### Autocomplete
- Manejado centralmente en `index.js` con el mapa `AUTOCOMPLETE_ENDPOINTS`
- Cada tecleo llama a `fetchSuggestions(endpoint, query)` → hasta 25 resultados
- Prioriza matches por nombre sobre matches por descripción

### Variables de entorno requeridas
```
DISCORD_TOKEN=...
CLIENT_ID=1494907913590800545
```

### Comandos de operación
```
npm run deploy   — Registrar/actualizar slash commands (correr tras cambios en data de comandos)
npm start        — Iniciar el bot
```

---

## Tareas Pendientes

- [ ] Agregar más traducciones español→inglés en `TRANSLATIONS` según necesidad
- [ ] Para clases/razas/trasfondos desde local: los campos estructurados (hit_dice, speed, skill_proficiencies) no están disponibles en dnd-data — solo se muestra la descripción en texto
- [x] Implementar comando `/wildmagic`: tira 1d100 y muestra el efecto correspondiente de la tabla Oleada de Magia Salvaje. Datos embebidos en `commands/wildmagic.js`.

---

## Historial de Cambios

### [2026-04-22] — Inicialización y setup
- Archivo `CLAUDE.md` creado con estructura base y política de rotación.
- Instalación de dependencias (`npm install` — faltaba `dotenv`).
- Configuración de `.env` con `CLIENT_ID` y `DISCORD_TOKEN`.
- Comandos desplegados exitosamente con `npm run deploy`.

### [2026-04-23] — Mejoras de búsqueda y autocomplete
- Corregido bug en `/spell name:fire`: devolvía "Alchemical Form" por buscar en descripción, no en nombre.
- Implementado `searchWithSuggestions()` en `helpers.js`: busca con mayor límite y filtra por nombre, mostrando lista de posibles coincidencias si no hay match exacto.
- Implementado autocomplete nativo de Discord en los 11 comandos (spell, monster, condition, race, class, feat, item, weapon, armor, background, rule).
- Lógica de autocomplete centralizada en `index.js` usando `AUTOCOMPLETE_ENDPOINTS`.

### [2026-04-23] — Sistema híbrido dnd-data + Open5e API
- Instalado paquete `dnd-data` (5,849 hechizos, 11,463 monstruos, 15,749 ítems, 405 trasfondos, 134 clases, 383 especies).
- Creado `utils/local-data.js`: carga datos locales, mappers por tipo (spell/monster/item/background/class/race) que normalizan al formato Open5e, y funciones `searchLocal()` / `fetchLocalSuggestions()`.
- Modificado `utils/helpers.js`: `searchWithSuggestions` y `fetchSuggestions` intentan datos locales primero; si no encuentran, caen al comportamiento anterior con la API.
- Modificado `utils/embeds.js`: footer dinámico muestra `• Local` o `• Open5e API` según la fuente. Corregido bug de `"dnull"` en `embedClass` cuando `hit_dice` es null.
- Sin cambios en comandos ni en `index.js` — la integración es transparente para la capa de comandos.
- Pendiente: prueba live del bot en Discord (paso 3).

### [2026-04-23] — Tabla Oleada de Magia Salvaje (asset)
- Revisadas dos imágenes (`image copy 2.png`, `image copy 3.png`) que contenían la tabla completa de Oleada de Magia Salvaje dividida en dos partes.
- Transcriptas y combinadas en `oleada-magia-salvaje.md`: 50 entradas (d100 01-02 a 99-00) en una sola tabla Markdown.
- El archivo es la fuente de datos para el futuro comando `/wildmagic` (ver Tareas Pendientes). No requiere API externa.

### [2026-04-24] — Comando /wildmagic + scripts de inicio
- Creado `commands/wildmagic.js`: tira 1d100, mapea al rango de la tabla con `Math.floor((roll-1)/2)`, y devuelve un embed con el resultado y el efecto. Los 50 efectos van embebidos directamente en el archivo.
- Desplegado en Discord con `npm run deploy`.
- Creados `start-bot.bat` y `deploy-and-start.bat` en la raíz del proyecto para inicio con doble clic desde el escritorio.
