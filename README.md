# ⚔️ DnD5e Compendio Bot

Bot de Discord para consultar hechizos, monstruos, objetos mágicos, clases, razas y trasfondos de D&D 5e usando la API gratuita de Open5e.

## 📋 Requisitos

- Node.js 18 o superior → https://nodejs.org
- Una cuenta de Discord con un servidor propio

## 🚀 Instalación paso a paso

### 1. Instalar dependencias

Abre una terminal en la carpeta del bot y ejecuta:
```
npm install
```

### 2. Configurar el token

Crea un archivo llamado `.env` (copia el `.env.example`) con este contenido:
```
DISCORD_TOKEN=TU_TOKEN_AQUI
CLIENT_ID=1494907913590800545
```

Reemplaza `TU_TOKEN_AQUI` con el token de tu bot (el que reseteaste).

### 3. Registrar los comandos slash

Solo necesitas hacer esto UNA VEZ:
```
npm run deploy
```

### 4. Iniciar el bot

```
npm start
```

Deberías ver:
```
⚔️  Bot conectado como DnD5e Compendio#1234
📖 Compendio D&D 5e listo!
```

---

## 🎲 Comandos disponibles

| Comando | Ejemplo | Descripción |
|--------|---------|-------------|
| `/hechizo` | `/hechizo bola de fuego` | Busca un hechizo |
| `/monstruo` | `/monstruo goblin` | Busca un monstruo o criatura |
| `/objeto` | `/objeto capa de invisibilidad` | Busca un objeto mágico |
| `/clase` | `/clase mago` | Info de una clase |
| `/raza` | `/raza elfo` | Info de una raza |
| `/trasfondo` | `/trasfondo sabio` | Info de un trasfondo |
| `/buscar` | `/buscar fireball` | Búsqueda general |

## 💡 Tips

- Si un nombre en español no funciona, prueba en **inglés** (la API es inglesa)
- El bot incluye un diccionario de traducciones ES→EN para los términos más comunes
- La API usa el SRD (System Reference Document) oficial de 5e — algunos contenidos de libros adicionales pueden no estar

## 🔧 Mantener el bot encendido (opcional)

Para que el bot esté siempre activo, puedes usar **PM2**:
```
npm install -g pm2
pm2 start index.js --name dnd-bot
pm2 startup
pm2 save
```

O en el futuro, hosting gratuito en Railway.app o Render.com.

---

*Datos provistos por Open5e API (open5e.com) — contenido bajo licencia Creative Commons SRD 5e*
