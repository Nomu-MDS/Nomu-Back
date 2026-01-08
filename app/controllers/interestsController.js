// controllers/interestsController.js
import { Interest } from "../models/index.js";

// Récupérer tous les intérêts disponibles
export const getAllInterests = async (req, res) => {
  try {
    const interests = await Interest.findAll({
      where: { is_active: true },
      order: [["name", "ASC"]],
    });
    res.json(interests);
  } catch (err) {
    console.error("Erreur getAllInterests:", err);
    res.status(500).json({ error: "Erreur récupération intérêts" });
  }
};
