import { MeiliSearch } from "meilisearch";

// Initialisation du client Meilisearch
const client = new MeiliSearch({
  host: process.env.MEILI_HOST,
  apiKey: process.env.MEILI_API_KEY,
});

// Index "locals"
const index = client.index("locals");

/**
 * Récupère tous les documents dans l'index 'locals'
 */
export const getLocals = async () => {
  try {
    return await index.getDocuments();
  } catch (err) {
    console.error("Erreur getLocals:", err.message);
    throw err;
  }
};

/**
 * Indexe un tableau de locaux dans Meilisearch
 * @param {Array} data - Données à indexer
 */
export const indexLocals = async (data) => {
  try {
    return await index.addDocuments(data, { primaryKey: "id" });
  } catch (err) {
    console.error("Erreur indexLocals:", err.message);
    throw err;
  }
};

/**
 * Recherche dans l'index 'locals' selon une requête textuelle
 * @param {string} query - Requête utilisateur
 */
export const searchInLocals = async (query) => {
  try {
    return await index.search(query);
  } catch (err) {
    console.error("Erreur searchInLocals:", err.message);
    throw err;
  }
};

