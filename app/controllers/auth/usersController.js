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

// Mettre à jour le profil
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.dbUser.id;
    const {
      // Champs User
      name, bio, location,
      // Champs Profile
      first_name, last_name, age, biography, country, city, image_url, is_searchable,
      // Intérêts
      interest_ids
    } = req.body;

    // Mettre à jour User si nécessaire
    if (name || bio || location) {
      await User.update(
        { name, bio, location },
        { where: { id: userId } }
      );
    }

    // Mettre à jour Profile
    let profile = await Profile.findOne({ where: { user_id: userId } });
    if (!profile) {
      profile = await Profile.create({ user_id: userId, first_name, last_name, age, biography, country, city, image_url, is_searchable });
    } else {
      await profile.update({ first_name, last_name, age, biography, country, city, image_url, is_searchable });
    }

    // Gérer les intérêts si fournis
    if (interest_ids && Array.isArray(interest_ids)) {
      await profile.setInterests(interest_ids);
    }

    // Si is_searchable a changé, gérer l'indexation
    if (is_searchable !== undefined) {
      if (is_searchable) {
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
    }

    // Retourner user + profile + intérêts
    const updatedUser = await User.findByPk(userId, {
      include: [{ model: Profile, include: [Interest] }],
    });
    res.json(updatedUser);
  } catch (err) {
    console.error("Erreur updateProfile:", err);
    res.status(500).json({ error: "Erreur mise à jour profil" });
  }
};

// Gérer uniquement les intérêts du profil
export const updateInterests = async (req, res) => {
  try {
    const userId = req.user.dbUser.id;
    const { interest_ids } = req.body;

    if (!interest_ids || !Array.isArray(interest_ids)) {
      return res.status(400).json({ error: "interest_ids doit être un tableau" });
    }

    let profile = await Profile.findOne({ where: { user_id: userId } });
    if (!profile) {
      profile = await Profile.create({ user_id: userId });
    }

    await profile.setInterests(interest_ids);

    // Ré-indexer si searchable
    if (profile.is_searchable) {
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
    }

    const updatedProfile = await Profile.findByPk(profile.id, {
      include: [Interest],
    });
    res.json(updatedProfile);
  } catch (err) {
    console.error("Erreur updateInterests:", err);
    res.status(500).json({ error: "Erreur mise à jour intérêts" });
  }
};

// Active/désactive la visibilité dans la recherche
export const toggleSearchable = async (req, res) => {
  try {
    const userId = req.user.dbUser.id;
    const { is_searchable } = req.body;

    let profile = await Profile.findOne({ where: { user_id: userId } });
    if (!profile) {
      profile = await Profile.create({ user_id: userId, is_searchable });
    } else {
      await profile.update({ is_searchable });
    }

    if (is_searchable) {
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

