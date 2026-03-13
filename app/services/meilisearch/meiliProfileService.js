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

// Construit le filtre Meilisearch à partir des options
function buildFilter(options) {
  const parts = [];

  if (options.filterInterests?.length) {
    const interestFilter = options.filterInterests
      .map(i => `interests = "${i}"`)
      .join(" OR ");
    parts.push(`(${interestFilter})`);
  }

  if (options.filterCity?.length) {
    const cityFilter = options.filterCity
      .map(c => `city = "${c}"`)
      .join(" OR ");
    parts.push(`(${cityFilter})`);
  }

  if (options.filterCountry?.length) {
    const countryFilter = options.filterCountry
      .map(c => `country = "${c}"`)
      .join(" OR ");
    parts.push(`(${countryFilter})`);
  }

  return parts.length ? parts.join(" AND ") : undefined;
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
      attributesToRetrieve: ["id", "user_id", "name", "bio", "city", "country", "location", "interests", "image_url"],
      matchingStrategy: "frequency",
    };

    const filter = buildFilter(options);
    if (filter) searchParams.filter = filter;

    return await index.search(enrichedQuery, searchParams);
  } catch (error) {
    if (error.code === "index_not_found") {
      return { hits: [], query, limit: 20, offset: 0, estimatedTotalHits: 0 };
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
      attributesToRetrieve: ["id", "user_id", "name", "bio", "city", "country", "location", "interests", "image_url"],
      matchingStrategy: "frequency",
    };

    const filter = buildFilter(options);
    if (filter) searchParams.filter = filter;

    return await index.search(query, searchParams);
  } catch (error) {
    if (error.code === "index_not_found") {
      return { hits: [], query, limit: 20, offset: 0, estimatedTotalHits: 0 };
    }
    throw error;
  }
};
