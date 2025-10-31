import { indexLocals, searchInLocals } from "../../services/meilisearch/meiliService.js";
import { meiliClient } from "../../config/meilisearch.js";

export const getLocals = async (req, res) => {
  try {
    const results = await meiliClient.index("locals").getDocuments();
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération" });
  }
};

export const addLocals = async (req, res) => {
  try {
    const response = await indexLocals(req.body);
    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const searchLocals = async (req, res) => {
  try {
    const query = req.query.q || "";
    const results = await searchInLocals(query);
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

