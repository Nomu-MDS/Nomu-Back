import dotenv from "dotenv";
dotenv.config();
// services/meilisearch/meiliProfileService.js
import { meiliClient } from "../../config/meilisearch.js";

const indexName = process.env.MEILI_INDEX_PROFILES;
console.log(`🗂️  [meiliProfileService] Index utilisé pour les profils : ${indexName}`);
const index = meiliClient.index(indexName);

// Indexe les profils (seulement ceux avec is_searchable = true)
export const indexProfiles = async (data) => {
  return await index.addDocuments(data, { primaryKey: "id" });
};

// Supprime un profil de l'index
export const removeProfileFromIndex = async (profileId) => {
  try {
    return await index.deleteDocument(profileId);
  } catch (error) {
    if (error.code === "index_not_found") return null;
    throw error;
  }
};

// Vide complètement l'index (utilisé lors de la réindexation complète)
export const clearIndex = async () => {
  try {
    return await index.deleteAllDocuments();
  } catch (error) {
    if (error.code === "index_not_found") return null;
    throw error;
  }
};

const RELEVANCE_THRESHOLD = 0.45;

// Coordonnées GPS des villes françaises (utilisées pour le geo-ranking)
const CITY_COORDINATES = {
  "Paris":             { lat: 48.8566,  lng: 2.3522  },
  "Lyon":              { lat: 45.7640,  lng: 4.8357  },
  "Marseille":         { lat: 43.2965,  lng: 5.3698  },
  "Bordeaux":          { lat: 44.8378,  lng: -0.5792 },
  "Toulouse":          { lat: 43.6047,  lng: 1.4442  },
  "Nice":              { lat: 43.7102,  lng: 7.2620  },
  "Nantes":            { lat: 47.2184,  lng: -1.5536 },
  "Strasbourg":        { lat: 48.5734,  lng: 7.7521  },
  "Montpellier":       { lat: 43.6108,  lng: 3.8767  },
  "Lille":             { lat: 50.6292,  lng: 3.0573  },
  "Grenoble":          { lat: 45.1885,  lng: 5.7245  },
  "Rennes":            { lat: 48.1173,  lng: -1.6778 },
  "Brest":             { lat: 48.3904,  lng: -4.4861 },
  "Annecy":            { lat: 45.8992,  lng: 6.1294  },
  "Chambéry":          { lat: 45.5646,  lng: 5.9178  },
  "Nancy":             { lat: 48.6921,  lng: 6.1844  },
  "Metz":              { lat: 49.1193,  lng: 6.1727  },
  "Bayonne":           { lat: 43.4933,  lng: -1.4748 },
  "Pau":               { lat: 43.2951,  lng: -0.3708 },
  "Reims":             { lat: 49.2583,  lng: 4.0317  },
  "Tours":             { lat: 47.3941,  lng: 0.6848  },
  "La Rochelle":       { lat: 46.1603,  lng: -1.1511 },
  "Caen":              { lat: 49.1829,  lng: -0.3707 },
  "Rouen":             { lat: 49.4432,  lng: 1.0993  },
  "Dijon":             { lat: 47.3220,  lng: 5.0415  },
  "Clermont-Ferrand":  { lat: 45.7772,  lng: 3.0870  },
  "Perpignan":         { lat: 42.6887,  lng: 2.8948  },
  "Toulon":            { lat: 43.1242,  lng: 5.9280  },
  "Avignon":           { lat: 43.9493,  lng: 4.8055  },
  "Aix-en-Provence":   { lat: 43.5297,  lng: 5.4474  },
};

// Retourne les coordonnées d'une ville (insensible à la casse)
export const getCityCoordinates = (city) => {
  if (!city) return null;
  const key = Object.keys(CITY_COORDINATES).find(
    k => k.toLowerCase() === city.toLowerCase()
  );
  return key ? CITY_COORDINATES[key] : null;
};

// Met à jour les attributs filtrables + triables de l'index
export const setupFilterableAttributes = async () => {
  try {
    await index.updateSettings({
      filterableAttributes: ["interests", "location", "city", "country", "gender"],
      sortableAttributes: ["_geo"],
    });
  } catch (error) {
    if (error.code !== "index_not_found") {
      console.error("[Meilisearch] Erreur setup filterable attributes:", error);
    }
  }
};

function escapeFilterValue(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// Cache des villes indexées dans Meilisearch (refresh toutes les 30 min)
let _citiesCache = [];
let _cacheTs = 0;
const CITIES_CACHE_TTL = 30 * 60 * 1000;

export const getCachedCities = async () => {
  const now = Date.now();
  if (_citiesCache.length && now - _cacheTs < CITIES_CACHE_TTL) {
    return _citiesCache;
  }
  try {
    const result = await index.search("", { facets: ["city"], limit: 0 });
    const cities = Object.keys(result.facetDistribution?.city || {}).filter(Boolean);
    if (cities.length) {
      _citiesCache = cities;
      _cacheTs = now;
    }
    return _citiesCache;
  } catch {
    return _citiesCache;
  }
};

// Construit le filtre Meilisearch à partir des options
function buildFilter(options) {
  const parts = [];

  if (options.filterInterests?.length) {
    const interestFilter = options.filterInterests
      .map(i => `interests = "${escapeFilterValue(i)}"`)
      .join(" OR ");
    parts.push(`(${interestFilter})`);
  }

  if (options.filterCity?.length) {
    const cityFilter = options.filterCity
      .map(c => `city = "${escapeFilterValue(c)}"`)
      .join(" OR ");
    parts.push(`(${cityFilter})`);
  }

  if (options.filterCountry?.length) {
    const countryFilter = options.filterCountry
      .map(c => `country = "${escapeFilterValue(c)}"`)
      .join(" OR ");
    parts.push(`(${countryFilter})`);
  }

  if (options.filterSex?.length) {
    const sexFilter = options.filterSex
      .map(s => `gender = "${escapeFilterValue(s)}"`)
      .join(" OR ");
    parts.push(`(${sexFilter})`);
  }

  if (
    options.geoPoint &&
    Number.isFinite(options.geoPoint.lat) &&
    Number.isFinite(options.geoPoint.lng) &&
    Number.isFinite(options.geoMaxDistanceMeters) &&
    options.geoMaxDistanceMeters > 0
  ) {
    parts.push(
      `_geoRadius(${options.geoPoint.lat}, ${options.geoPoint.lng}, ${Math.trunc(options.geoMaxDistanceMeters)})`,
    );
  }

  return parts.length ? parts.join(" AND ") : undefined;
}

// Filtre les résultats sous le seuil de pertinence (uniquement si query non vide)
function applyRelevanceThreshold(hits, hasQuery) {
  if (!hasQuery) return { hits, noRelevantResults: false };
  const filtered = hits.filter(h => (h._rankingScore ?? 1) >= RELEVANCE_THRESHOLD);
  const noRelevantResults = filtered.length === 0;
  return { hits: filtered, noRelevantResults };
}

// Recherche enrichie : combine le profil du chercheur (A) + sa requête pour trouver B
export const searchProfilesEnriched = async (searcherProfile, query, options = {}) => {
  try {
    const enrichedQuery = buildEnrichedQuery(searcherProfile, query);

    // Pas de requête → mode "For You" : full sémantique
    // Requête explicite → équilibré : le keyword match "vélo" / "paris" dans les champs texte
    const semanticRatio = options.semanticRatio ?? (query ? 0.5 : 0.8);

    const searchParams = {
      hybrid: {
        embedder: "profiles-openai",
        semanticRatio,
      },
      limit: options.limit || 20,
      attributesToRetrieve: ["id", "user_id", "name", "bio", "city", "country", "location", "interests", "image_url", "gender"],
      matchingStrategy: "all",
      showRankingScore: true,
    };

    const filter = buildFilter(options);
    if (filter) searchParams.filter = filter;

    // Geo-ranking : trier par proximité si une ville a été détectée dans la query
    if (options.geoPoint) {
      searchParams.sort = [`_geoPoint(${options.geoPoint.lat},${options.geoPoint.lng}):asc`];
    }

    const result = await index.search(enrichedQuery, searchParams);
    const { hits, noRelevantResults } = applyRelevanceThreshold(result.hits, !!query);
    return { ...result, hits, noRelevantResults };
  } catch (error) {
    if (error.code === "index_not_found") {
      return { hits: [], query, limit: 20, offset: 0, estimatedTotalHits: 0, noRelevantResults: false };
    }
    throw error;
  }
};

// Construit une requête enrichie à partir du profil du chercheur + sa requête
const buildEnrichedQuery = (searcherProfile, userQuery) => {
  // ── Cas 1 : l'utilisateur a tapé quelque chose ────────────────────────────
  // Garder la requête précise + léger contexte d'intérêts pour ne pas diluer
  if (userQuery) {
    const parts = [userQuery];
    if (searcherProfile?.interests?.length) {
      // Juste 3 intérêts max pour orienter sans noyer le signal
      parts.push(searcherProfile.interests.slice(0, 3).join(", "));
    }
    return parts.join(". ");
  }

  // ── Cas 2 : mode "For You" (pas de requête) ───────────────────────────────
  // Requête sémantique riche basée sur le profil du chercheur
  const sentences = [];

  if (searcherProfile?.interests?.length) {
    sentences.push(`Je m'intéresse à ${searcherProfile.interests.join(", ")}.`);
  }

  const bioText = searcherProfile?.biography || searcherProfile?.bio;
  if (bioText) {
    sentences.push(`Je cherche des personnes compatibles avec quelqu'un qui : ${bioText.slice(0, 300)}`);
  }

  if (searcherProfile?.location) {
    sentences.push(`Basé près de ${searcherProfile.location}.`);
  }

  // Fallback si profil vide → évite de renvoyer "" à Meilisearch
  if (sentences.length === 0) {
    return "personnes intéressantes à rencontrer et avec qui échanger";
  }

  return sentences.join(" ");
};

// Recherche simple (sans enrichissement)
export const searchProfiles = async (query, options = {}) => {
  try {
    const searchParams = {
      hybrid: {
        embedder: "profiles-openai",
        semanticRatio: options.semanticRatio || 0.5,
      },
      limit: options.limit || 20,
      attributesToRetrieve: ["id", "user_id", "name", "bio", "city", "country", "location", "interests", "image_url", "gender"],
      matchingStrategy: "all",
      showRankingScore: true,
    };

    const filter = buildFilter(options);
    if (filter) searchParams.filter = filter;

    if (options.geoPoint) {
      searchParams.sort = [`_geoPoint(${options.geoPoint.lat},${options.geoPoint.lng}):asc`];
    }

    const result = await index.search(query, searchParams);
    const { hits, noRelevantResults } = applyRelevanceThreshold(result.hits, !!query);
    return { ...result, hits, noRelevantResults };
  } catch (error) {
    if (error.code === "index_not_found") {
      return { hits: [], query, limit: 20, offset: 0, estimatedTotalHits: 0, noRelevantResults: false };
    }
    throw error;
  }
};
