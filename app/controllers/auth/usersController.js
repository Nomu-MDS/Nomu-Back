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
    const { name, first_name, last_name, email, password, role, is_active, bio, location, is_searchable } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: "Email déjà utilisé", field: "email" });
    }

    const user = await User.create({ name, email, password, role, is_active, bio, location });
    console.log(`✅ Utilisateur créé: ${user.email}`);

    // Toujours créer un profil
    const profile = await Profile.create({
      user_id: user.id,
      is_searchable: is_searchable ?? false,
      first_name: first_name || null,
      last_name: last_name || null,
    });

    // Indexer dans Meilisearch uniquement si searchable
    if (is_searchable) {
      try {
        await indexProfiles([{
          id: profile.id,
          user_id: user.id,
          name: user.name || "",
          location: user.location || "",
          bio: user.bio || "",
          biography: "",
          country: "",
          city: "",
          interests: [],
        }]);
        console.log(`🔍 Profil indexé dans Meilisearch: user_id ${user.id}`);
      } catch (indexError) {
        console.error("Erreur indexation Meilisearch:", indexError);
        // Ne pas bloquer la création de l'utilisateur si l'indexation échoue
      }
    }

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
      first_name, last_name, age, biography, country, city, image_url, is_searchable
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

    // Retourner user + profile
    const updatedUser = await User.findByPk(userId, { include: [Profile] });
    res.json(updatedUser);
  } catch (err) {
    console.error("Erreur updateProfile:", err);
    res.status(500).json({ error: "Erreur mise à jour profil" });
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

// Récupérer le profil public par ID de profil
export const getProfileById = async (req, res) => {
  try {
    // Validation du paramètre ID
    const profileId = parseInt(req.params.id, 10);
    if (isNaN(profileId) || profileId <= 0) {
      return res.status(400).json({ error: "ID profil invalide" });
    }

    // Récupérer le profil avec l'utilisateur et les intérêts
    const profile = await Profile.findByPk(profileId, {
      include: [
        {
          model: User,
          attributes: { exclude: ["password", "email"] }
        },
        Interest
      ]
    });

    if (!profile) {
      return res.status(404).json({ error: "Profil non trouvé" });
    }

    // Vérifier que le profil est searchable (visible publiquement)
    if (!profile.is_searchable) {
      return res.status(403).json({ error: "Ce profil n'est pas accessible" });
    }

    // Vérifier que l'utilisateur existe et est actif
    if (!profile.User || !profile.User.is_active) {
      return res.status(403).json({ error: "Ce profil n'est pas accessible" });
    }

    // Construire la réponse avec user_id et profil
    const publicProfile = {
      id: profile.User.id,
      name: profile.User.name || '',
      profile: {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        age: profile.age,
        biography: profile.biography,
        country: profile.country,
        city: profile.city,
        image_url: profile.image_url,
        interests: profile.Interests?.map((interest) => ({
          id: interest.id,
          name: interest.name,
        })) || []
      }
    };

    // Ajouter header de cache pour optimisation (1 heure)
    res.set("Cache-Control", "public, max-age=3600");
    res.json(publicProfile);
  } catch (err) {
    console.error("Erreur getProfileById:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};
