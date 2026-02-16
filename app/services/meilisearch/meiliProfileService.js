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

// Recherche enrichie : combine le profil du chercheur (A) + sa requête pour trouver B
export const searchProfilesEnriched = async (searcherProfile, query, options = {}) => {
  try {
    // Construire une requête enrichie avec le contexte du chercheur
    const enrichedQuery = buildEnrichedQuery(searcherProfile, query);
    
    const searchParams = {
      hybrid: {
        embedder: "profiles-openai",
        semanticRatio: options.semanticRatio || 0.7,
      },
      limit: options.limit || 20,
    };

    // Filtrer par intérêts si spécifié
    if (options.filterInterests?.length) {
      searchParams.filter = options.filterInterests
        .map(i => `interests = "${i}"`)
        .join(" OR ");
    }

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
  const parts = [];

  // Ajouter la requête de l'utilisateur en priorité
  if (userQuery) parts.push(userQuery);

  // Enrichir avec les intérêts du chercheur
  if (searcherProfile?.interests?.length) {
    parts.push(`intérêts: ${searcherProfile.interests.join(", ")}`);
  }

  // Enrichir avec la bio du chercheur pour trouver des profils compatibles
  if (searcherProfile?.bio) {
    parts.push(`compatible avec: ${searcherProfile.bio.slice(0, 100)}`);
  }

  // Enrichir avec la localisation si pertinent
  if (searcherProfile?.location) {
    parts.push(`proche de ${searcherProfile.location}`);
  }

  return parts.join(" | ");
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
    };

    if (options.filterInterests?.length) {
      searchParams.filter = options.filterInterests
        .map(i => `interests = "${i}"`)
        .join(" OR ");
    }

    return await index.search(query, searchParams);
  } catch (error) {
    if (error.code === "index_not_found") {
      return { hits: [], query, limit: 20, offset: 0, estimatedTotalHits: 0 };
    }
    throw error;
  }
};
