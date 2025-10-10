// app/controllers/usersController.js
import { User } from "../models/index.js";
import { indexUsers, searchInUsers, semanticSearchUsers } from "../services/meiliUserService.js";

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, actif, bio, location } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ where: { email } });
    
    if (existingUser) {
      console.log(`⚠️  Utilisateur avec l'email ${email} existe déjà`);
      return res.status(409).json({ 
        error: "Un utilisateur avec cet email existe déjà",
        field: "email"
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      actif,
      bio,
      location,
    });

    // Indexation dans Meilisearch
    await indexUsers([
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        location: user.location,
        bio: user.bio,
      },
    ]);

    console.log(`✅ Utilisateur créé: ${user.email}`);
    res.status(201).json(user);
  } catch (err) {
    console.error("Erreur createUser:", err);
    
    // Gérer spécifiquement les erreurs de contrainte unique
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ 
        error: "Un utilisateur avec cet email existe déjà",
        field: err.errors[0]?.path || "email"
      });
    }
    
    res.status(500).json({ error: "Erreur création user" });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const { q, hybrid, semanticRatio } = req.query;
    
    const options = {};
    if (hybrid === 'true') {
      options.hybrid = true;
      if (semanticRatio) {
        options.semanticRatio = parseFloat(semanticRatio);
      }
    }

    const result = await searchInUsers(q, options);
    res.json(result);
  } catch (err) {
    console.error("Erreur searchUsers:", err);
    res.status(500).json({ error: "Erreur recherche utilisateur" });
  }
};

export const semanticSearch = async (req, res) => {
  try {
    const { q, limit } = req.query;
    const result = await semanticSearchUsers(q, { limit: limit ? parseInt(limit) : 20 });
    res.json(result);
  } catch (err) {
    console.error("Erreur semanticSearch:", err);
    res.status(500).json({ error: "Erreur recherche sémantique" });
  }
};

