// services/meilisearch/meiliUserService.js
import { MeiliSearch } from "meilisearch";

const client = new MeiliSearch({
  host: process.env.MEILI_HOST,
  apiKey: process.env.MEILI_API_KEY,
});

const index = client.index("users");

export const indexUsers = async (data) => {
  return await index.addDocuments(data, { primaryKey: "id" });
};

export const searchInUsers = async (query, options = {}) => {
  try {
    const searchParams = { q: query };

    // Si hybrid est activé, utiliser la recherche IA
    if (options.hybrid) {
      searchParams.hybrid = {
        embedder: "users-openai",
        semanticRatio: options.semanticRatio || 0.5, // 50% sémantique, 50% texte
      };
    }

    return await index.search(query, searchParams);
  } catch (error) {
    // Si l'index n'existe pas encore, retourner un résultat vide
    if (error.code === "index_not_found") {
      return { hits: [], query, limit: 20, offset: 0, estimatedTotalHits: 0 };
    }
    throw error;
  }
};

// Nouvelle fonction pour recherche purement sémantique
export const semanticSearchUsers = async (query, options = {}) => {
  try {
    return await index.search(query, {
      hybrid: {
        embedder: "users-openai",
        semanticRatio: 1.0, // 100% sémantique
      },
      limit: options.limit || 20,
    });
  } catch (error) {
    if (error.code === "index_not_found") {
      return { hits: [], query, limit: 20, offset: 0, estimatedTotalHits: 0 };
    }
    throw error;
  }
};
