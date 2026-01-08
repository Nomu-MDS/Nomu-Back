// controllers/auth/usersController.js
import { User, Profile, Interest } from "../../models/index.js";
import {
  indexUsers,
  removeUserFromIndex,
  searchUsersEnriched,
  searchUsers as searchUsersService,
} from "../../services/meilisearch/meiliUserService.js";

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, is_active, bio, location } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "Email déjà utilisé", field: "email" });
    }

    const user = await User.create({ name, email, password, role, is_active, bio, location });
    console.log(`✅ Utilisateur créé: ${user.email}`);
    res.status(201).json(user);
  } catch (err) {
    console.error("Erreur createUser:", err);
    if (err.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ error: "Email déjà utilisé", field: "email" });
    }
    res.status(500).json({ error: "Erreur création user" });
  }
};

// Active/désactive la visibilité dans la recherche
export const toggleSearchable = async (req, res) => {
  try {
    const userId = req.user.dbUser.id;
    const { is_searchable } = req.body;

    await User.update({ is_searchable }, { where: { id: userId } });

    if (is_searchable) {
      // Indexer l'utilisateur avec ses intérêts
      const user = await User.findByPk(userId, {
        include: [{ model: Profile, include: [Interest] }],
      });
      await indexUsers([{
        id: user.id,
        name: user.name,
        location: user.location,
        bio: user.bio,
        interests: user.Profile?.Interests?.map((i) => i.name).join(", ") || "",
      }]);
    } else {
      await removeUserFromIndex(userId);
    }

    res.json({ is_searchable });
  } catch (err) {
    console.error("Erreur toggleSearchable:", err);
    res.status(500).json({ error: "Erreur mise à jour visibilité" });
  }
};

// Recherche : enrichie si connecté, sinon simple
export const searchUsers = async (req, res) => {
  try {
    const { q, filterInterests, limit } = req.query;
    const options = {
      limit: limit ? parseInt(limit) : 20,
      filterInterests: filterInterests ? filterInterests.split(",") : null,
    };

    // Si connecté, enrichir avec le profil du chercheur
    const searcherId = req.user?.dbUser?.id;
    if (searcherId) {
      const searcher = await User.findByPk(searcherId, {
        include: [{ model: Profile, include: [Interest] }],
      });
      const searcherProfile = searcher ? {
        bio: searcher.bio,
        location: searcher.location,
        interests: searcher.Profile?.Interests?.map((i) => i.name) || [],
      } : null;

      const result = await searchUsersEnriched(searcherProfile, q || "", options);
      // Exclure le chercheur des résultats
      result.hits = result.hits.filter((hit) => hit.id !== searcherId);
      return res.json(result);
    }

    // Sinon recherche simple
    const result = await searchUsersService(q || "", options);
    res.json(result);
  } catch (err) {
    console.error("Erreur searchUsers:", err);
    res.status(500).json({ error: "Erreur recherche" });
  }
};

