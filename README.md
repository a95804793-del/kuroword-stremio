# KuroWord Stremio Addon

Addon completo para Stremio con todo el contenido sin censura.

## Catálogos incluidos
- 🎬 Películas populares
- 📺 Series populares  
- 🎌 Anime series y películas
- 🟠 Nickelodeon clásico y nuevo
- 🔞 Contenido adulto (películas y series)

## Deploy en Vercel (una sola vez)

### 1. Obtén tu API Key de TMDB (gratis)
1. Ve a https://www.themoviedb.org/signup y crea cuenta
2. En Settings → API → Request API Key (gratis)
3. Copia tu **API Key (v3 auth)**

### 2. Sube a GitHub
```bash
git init
git add .
git commit -m "KuroWord Stremio Addon"
git remote add origin https://github.com/TU_USUARIO/kuroword-stremio.git
git push -u origin main
```

### 3. Deploy en Vercel
1. Ve a https://vercel.com → New Project
2. Importa el repo de GitHub
3. En **Environment Variables** agrega:
   - `TMDB_API_KEY` = tu key de TMDB
4. Click **Deploy**
5. Copia la URL que te da Vercel, ejemplo: `https://kuroword-stremio.vercel.app`

### 4. Instala en Stremio (una sola vez, para siempre)
1. Abre Stremio
2. Ve a: `https://kuroword-stremio.vercel.app/manifest.json`
3. Stremio te pregunta si instalar → **Install**
4. ¡Listo! Nunca más tocas código.

## Fuentes de streams
- **Torrentio**: torrents de YTS, EZTV, 1337x, The Pirate Bay, NyaaSi (anime), etc.
- **Cinemeta**: metadatos de IMDB
- **TMDB**: catálogos y búsqueda

## Opcional: Debrid (streams más rápidos, sin buffering)
Si tienes Real-Debrid, AllDebrid o Premiumize, edita esta línea en `api/index.js`:

```js
const config = "providers=yts,eztv....|debridoptions=nocatalog|realdebrid=TU_API_KEY"
```

Reemplaza `TU_API_KEY` con tu key de Real-Debrid.
