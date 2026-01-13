// controllers/interestsController.js
import { Interest } from "../models/index.js";

// Récupérer tous les intérêts disponibles (public)
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

// ===== ADMIN CRUD OPERATIONS =====

// Récupérer tous les intérêts (admin - incluant inactifs)
export const adminGetAllInterests = async (req, res) => {
  try {
    const interests = await Interest.findAll({
      order: [["name", "ASC"]],
    });
    res.json(interests);
  } catch (err) {
    console.error("Erreur adminGetAllInterests:", err);
    res.status(500).json({ error: "Erreur récupération intérêts" });
  }
};

// Récupérer un intérêt par ID (admin)
export const adminGetInterestById = async (req, res) => {
  try {
    const { id } = req.params;
    const interest = await Interest.findByPk(id);
    
    if (!interest) {
      return res.status(404).json({ error: "Intérêt non trouvé" });
    }
    
    res.json(interest);
  } catch (err) {
    console.error("Erreur adminGetInterestById:", err);
    res.status(500).json({ error: "Erreur récupération intérêt" });
  }
};

// Créer un nouvel intérêt (admin)
export const adminCreateInterest = async (req, res) => {
  try {
    const { name, icon, is_active } = req.body;
    
    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Le nom est requis" });
    }
    
    // Vérifier si l'intérêt existe déjà
    const existing = await Interest.findOne({ where: { name: name.trim() } });
    if (existing) {
      return res.status(409).json({ error: "Un intérêt avec ce nom existe déjà" });
    }
    
    const interest = await Interest.create({
      name: name.trim(),
      icon: icon || null,
      is_active: is_active !== undefined ? is_active : true,
    });
    
    res.status(201).json(interest);
  } catch (err) {
    console.error("Erreur adminCreateInterest:", err);
    res.status(500).json({ error: "Erreur création intérêt" });
  }
};

// Mettre à jour un intérêt (admin)
export const adminUpdateInterest = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, is_active } = req.body;
    
    const interest = await Interest.findByPk(id);
    
    if (!interest) {
      return res.status(404).json({ error: "Intérêt non trouvé" });
    }
    
    // Vérifier l'unicité du nom si modifié
    if (name && name.trim() !== interest.name) {
      const existing = await Interest.findOne({ 
        where: { name: name.trim() } 
      });
      if (existing) {
        return res.status(409).json({ error: "Un intérêt avec ce nom existe déjà" });
      }
    }
    
    // Mise à jour des champs
    if (name !== undefined && name.trim()) {
      interest.name = name.trim();
    }
    if (icon !== undefined) {
      interest.icon = icon;
    }
    if (is_active !== undefined) {
      interest.is_active = is_active;
    }
    
    await interest.save();
    
    res.json(interest);
  } catch (err) {
    console.error("Erreur adminUpdateInterest:", err);
    res.status(500).json({ error: "Erreur mise à jour intérêt" });
  }
};

// Supprimer un intérêt (admin)
export const adminDeleteInterest = async (req, res) => {
  try {
    const { id } = req.params;
    
    const interest = await Interest.findByPk(id);
    
    if (!interest) {
      return res.status(404).json({ error: "Intérêt non trouvé" });
    }
    
    await interest.destroy();
    
    res.json({ message: "Intérêt supprimé avec succès", id: parseInt(id) });
  } catch (err) {
    console.error("Erreur adminDeleteInterest:", err);
    res.status(500).json({ error: "Erreur suppression intérêt" });
  }
};
