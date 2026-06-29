const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const fetch = require("node-fetch");

const TORRENTIO_BASE = "https://torrentio.strem.fun";
const CINEMETA_BASE = "https://v3-cinemeta.strem.io";
const TMDB_BASE = "https://api.themoviedb.org/3";

// ─── MANIFEST ────────────────────────────────────────────────────────────────
const manifest = {
  id: "community.kuroword.all",
  version: "1.0.0",
  name: "KuroWord – Todo Sin Censura",
  description:
    "Series, películas, anime, contenido adulto, Nickelodeon y más. Sin censura. Powered by KuroWord.",
  logo: "https://i.imgur.com/YPDPcFQ.png",
  background: "https://i.imgur.com/8WMJPKR.jpg",
  types: ["movie", "series"],
  catalogs: [
    {
      type: "movie",
      id: "kw_movies_popular",
      name: "🎬 Películas Populares",
      extra: [{ name: "search", isRequired: false }, { name: "skip" }],
    },
    {
      type: "series",
      id: "kw_series_popular",
      name: "📺 Series Populares",
      extra: [{ name: "search", isRequired: false }, { name: "skip" }],
    },
    {
      type: "movie",
      id: "kw_anime_movies",
      name: "🎌 Anime – Películas",
      extra: [{ name: "search", isRequired: false }, { name: "skip" }],
    },
    {
      type: "series",
      id: "kw_anime_series",
      name: "🎌 Anime – Series",
      extra: [{ name: "search", isRequired: false }, { name: "skip" }],
    },
    {
      type: "series",
      id: "kw_nickelodeon",
      name: "🟠 Nickelodeon – Clásico & Nuevo",
      extra: [{ name: "search", isRequired: false }, { name: "skip" }],
    },
    {
      type: "movie",
      id: "kw_adult",
      name: "🔞 Adultos – Películas",
      extra: [{ name: "search", isRequired: false }, { name: "skip" }],
    },
    {
      type: "series",
      id: "kw_adult_series",
      name: "🔞 Adultos – Series",
      extra: [{ name: "search", isRequired: false }, { name: "skip" }],
    },
  ],
  resources: ["catalog", "meta", "stream"],
  idPrefixes: ["tt", "kitsu"],
  behaviorHints: { adult: true, p2p: true },
};

const builder = new addonBuilder(manifest);

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function tmdbFetch(path) {
  const TMDB_KEY = process.env.TMDB_API_KEY || "";
  if (!TMDB_KEY) return null;
  const url = `${TMDB_BASE}${path}&api_key=${TMDB_KEY}&language=es-MX`;
  try {
    const r = await fetch(url);
    return await r.json();
  } catch {
    return null;
  }
}

async function getImdbId(tmdbId, type) {
  const mediaType = type === "series" ? "tv" : "movie";
  try {
    const r = await fetch(
      `${TMDB_BASE}/${mediaType}/${tmdbId}/external_ids?api_key=${process.env.TMDB_API_KEY}`
    );
    const d = await r.json();
    return d.imdb_id || null;
  } catch {
    return null;
  }
}

function tmdbToMeta(item, type, imdbId) {
  const id = imdbId || `tmdb:${item.id}`;
  return {
    id,
    type,
    name: item.title || item.name,
    poster: item.poster_path
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : undefined,
    background: item.backdrop_path
      ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
      : undefined,
    description: item.overview,
    releaseInfo: (item.release_date || item.first_air_date || "").slice(0, 4),
    imdbRating: item.vote_average?.toFixed(1),
  };
}

async function cinemetaMeta(type, id) {
  try {
    const r = await fetch(`${CINEMETA_BASE}/meta/${type}/${id}.json`);
    const d = await r.json();
    return d.meta || null;
  } catch {
    return null;
  }
}

async function torrentioStreams(type, id) {
  // Torrentio config: all providers, no filter, debrid optional
  const config =
    "providers=yts,eztv,rarbg,1337x,thepiratebay,kickasstorrents,torrentgalaxy,magnetdl,horriblesubs,nyaasi,tokyotosho,animezite|sort=qualitysize|qualityfilter=other,scr,cam";
  try {
    const url = `${TORRENTIO_BASE}/${config}/stream/${type}/${id}.json`;
    const r = await fetch(url);
    const d = await r.json();
    return (d.streams || []).map((s) => ({
      ...s,
      behaviorHints: { ...s.behaviorHints, notWebReady: true },
    }));
  } catch {
    return [];
  }
}

// ─── CATALOG ─────────────────────────────────────────────────────────────────

builder.defineCatalogHandler(async ({ type, id, extra }) => {
  const skip = parseInt(extra?.skip || "0");
  const page = Math.floor(skip / 20) + 1;
  const search = extra?.search;

  // ── Nickelodeon ──
  if (id === "kw_nickelodeon") {
    const nickShows = [
      "tt0110148", // Rugrats
      "tt0103569", // Doug
      "tt0106001", // The Ren & Stimpy Show
      "tt0112005", // Hey Arnold!
      "tt0120738", // Rocket Power
      "tt0184111", // The Fairly OddParents
      "tt0279695", // SpongeBob SquarePants
      "tt0277371", // Invader Zim
      "tt0318155", // The Adventures of Jimmy Neutron
      "tt0290978", // As Told by Ginger
      "tt0277538", // Drake & Josh
      "tt0482461", // iCarly
      "tt1220617", // Victorious
      "tt1831454", // Sam & Cat
      "tt1843198", // Henry Danger
      "tt3526078", // The Loud House
      "tt7016936", // Loud House
      "tt9813644", // Star Trek: Prodigy
    ];
    const metas = await Promise.all(
      nickShows.map((imdbId) => cinemetaMeta("series", imdbId))
    );
    return { metas: metas.filter(Boolean) };
  }

  // Helper para convertir lista de resultados TMDB a metas con IMDB IDs
  async function resultsToMetas(results, type) {
    const metas = await Promise.all(
      results.slice(0, 20).map(async (item) => {
        const imdbId = await getImdbId(item.id, type);
        return tmdbToMeta(item, type, imdbId);
      })
    );
    return metas.filter((m) => m.id);
  }

  // ── Anime series ──
  if (id === "kw_anime_series") {
    const endpoint = search
      ? `/search/tv?query=${encodeURIComponent(search)}&with_keywords=210024&page=${page}`
      : `/discover/tv?with_keywords=210024&sort_by=popularity.desc&page=${page}`;
    const data = await tmdbFetch(endpoint);
    if (!data?.results) return { metas: [] };
    return { metas: await resultsToMetas(data.results, "series") };
  }

  // ── Anime movies ──
  if (id === "kw_anime_movies") {
    const endpoint = search
      ? `/search/movie?query=${encodeURIComponent(search)}&with_keywords=210024&page=${page}`
      : `/discover/movie?with_keywords=210024&sort_by=popularity.desc&page=${page}`;
    const data = await tmdbFetch(endpoint);
    if (!data?.results) return { metas: [] };
    return { metas: await resultsToMetas(data.results, "movie") };
  }

  // ── Adultos ──
  if (id === "kw_adult" || id === "kw_adult_series") {
    const contentType = id === "kw_adult" ? "movie" : "series";
    const adultKeywords = search || "adult";
    const endpoint =
      contentType === "movie"
        ? `/search/movie?query=${encodeURIComponent(adultKeywords)}&include_adult=true&page=${page}`
        : `/search/tv?query=${encodeURIComponent(adultKeywords)}&include_adult=true&page=${page}`;
    const data = await tmdbFetch(endpoint);
    if (data?.results?.length) {
      return { metas: await resultsToMetas(data.results, contentType) };
    }
    return { metas: [] };
  }

  // ── Películas populares ──
  if (id === "kw_movies_popular") {
    const endpoint = search
      ? `/search/movie?query=${encodeURIComponent(search)}&page=${page}`
      : `/movie/popular?page=${page}`;
    const data = await tmdbFetch(endpoint);
    if (!data?.results) return { metas: [] };
    return { metas: await resultsToMetas(data.results, "movie") };
  }

  // ── Series populares ──
  if (id === "kw_series_popular") {
    const endpoint = search
      ? `/search/tv?query=${encodeURIComponent(search)}&page=${page}`
      : `/tv/popular?page=${page}`;
    const data = await tmdbFetch(endpoint);
    if (!data?.results) return { metas: [] };
    return { metas: await resultsToMetas(data.results, "series") };
  }

  return { metas: [] };
});

// ─── META ────────────────────────────────────────────────────────────────────

builder.defineMetaHandler(async ({ type, id }) => {
  const meta = await cinemetaMeta(type, id);
  if (meta) return { meta };
  return { meta: null };
});

// ─── STREAMS ─────────────────────────────────────────────────────────────────

builder.defineStreamHandler(async ({ type, id }) => {
  const streams = await torrentioStreams(type, id);
  return { streams };
});

// ─── SERVER ──────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 7000;
serveHTTP(builder.getInterface(), { port: PORT });
console.log(`KuroWord Addon running on port ${PORT}`);
