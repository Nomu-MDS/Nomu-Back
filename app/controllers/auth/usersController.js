// controllers/auth/usersController.js
import { User, Profile, Interest } from "../../models/index.js";
import {
  indexProfiles,
  removeProfileFromIndex,
  searchProfilesEnriched,
  searchProfiles as searchProfilesService,
  getCachedCities,
  getCityCoordinates,
} from "../../services/meilisearch/meiliProfileService.js";
import minioService from "../../services/storage/minioService.js";

export const createUser = async (req, res) => {
  try {
    const {
      name,
      first_name,
      last_name,
      email,
      password,
      role,
      is_active,
      bio,
      location,
      is_searchable,
    } = req.body;

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(409)
        .json({ error: "Email déjà utilisé", field: "email" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      is_active,
      location,
    });
    console.log(`✅ Utilisateur créé: ${user.email}`);

    // Toujours créer un profil
    const profile = await Profile.create({
      user_id: user.id,
      is_searchable: is_searchable ?? false,
      bio: bio || null,
      first_name: first_name || null,
      last_name: last_name || null,
    });

    // Indexer dans Meilisearch uniquement si searchable
    if (is_searchable) {
      try {
        await indexProfiles([
          {
            id: profile.id,
            user_id: user.id,
            name: user.name || "",
            location: user.location || "",
            bio: profile.bio || "",
            biography: "",
            country: "",
            city: "",
            interests: [],
          },
        ]);
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
      return res
        .status(409)
        .json({ error: "Email déjà utilisé", field: "email" });
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
      name,
      location,
      // Champs Profile
      bio,
      first_name,
      last_name,
      age,
      biography,
      country,
      city,
      gender,
      image_url: rawImageUrl,
      is_searchable,
      // Intérêts
      interest_ids,
    } = req.body;

    // Normaliser image_url : stocker le path, pas l'URL complète
    // undefined = non fourni → ne pas écraser la valeur existante
    const image_url = rawImageUrl !== undefined ? minioService.extractPath(rawImageUrl) : undefined;

    // Mettre à jour User si nécessaire
    if (name || location) {
      await User.update({ name, location }, { where: { id: userId } });
    }

    // Mettre à jour Profile
    let profile = await Profile.findOne({ where: { user_id: userId } });
    if (!profile) {
      profile = await Profile.create({
        user_id: userId,
        bio,
        first_name,
        last_name,
        age,
        biography,
        country,
        city,
        gender,
        image_url,
        is_searchable,
      });
    } else {
      const profileFields = { bio, first_name, last_name, age, biography, country, city, gender, is_searchable };
      if (image_url !== undefined) profileFields.image_url = image_url;
      await profile.update(profileFields);
    }

    // Gérer les intérêts si fournis
    if (interest_ids && Array.isArray(interest_ids)) {
      await profile.setInterests(interest_ids);
    }

    // Re-indexer si is_searchable a changé OU si les intérêts/données ont été mis à jour
    const profileChanged =
      is_searchable !== undefined ||
      (interest_ids && Array.isArray(interest_ids)) ||
      name || location || bio || first_name || last_name || age ||
      biography || country || city || gender || image_url !== undefined;

    if (profileChanged) {
      const freshProfile = await Profile.findByPk(profile.id, {
        include: [User, Interest],
      });
      if (freshProfile.is_searchable) {
        try {
          const _freshCity = freshProfile.city || "";
          const _freshGeo = getCityCoordinates(_freshCity);
          await indexProfiles([
            {
              id: freshProfile.id,
              user_id: freshProfile.user_id,
              name: freshProfile.User?.name || "",
              location: freshProfile.User?.location || _freshCity,
              bio: freshProfile.bio || "",
              biography: freshProfile.biography || "",
              country: freshProfile.country || "",
              city: _freshCity,
              gender: freshProfile.gender || "",
              interests: freshProfile.Interests?.map((i) => i.name) || [],
              image_url: freshProfile.image_url || "",
              ...(_freshGeo && { _geo: _freshGeo }),
            },
          ]);
        } catch (e) {
          console.error("[Meilisearch] Erreur indexation updateProfile:", e);
        }
      } else if (is_searchable === false) {
        try {
          await removeProfileFromIndex(profile.id);
        } catch (e) {
          console.error("[Meilisearch] Erreur suppression index updateProfile:", e);
        }
      }
    }

    // Retourner user + profile + intérêts
    const updatedUser = await User.findByPk(userId, {
      include: [{ model: Profile, include: [Interest] }],
    });
    const updatedUserJson = updatedUser.toJSON();
    if (updatedUserJson.Profile?.image_url) {
      updatedUserJson.Profile.image_url = minioService.resolveUrl(updatedUserJson.Profile.image_url);
    }
    res.json(updatedUserJson);
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
      return res
        .status(400)
        .json({ error: "interest_ids doit être un tableau" });
    }

    let profile = await Profile.findOne({ where: { user_id: userId } });
    if (!profile) {
      profile = await Profile.create({ user_id: userId });
    }

    await profile.setInterests(interest_ids);

    // Ré-indexer si searchable
    if (profile.is_searchable) {
      const updatedProfile = await Profile.findByPk(profile.id, {
        include: [User, Interest],
      });
      const _iCity = updatedProfile.city || "";
      const _iGeo = getCityCoordinates(_iCity);
      await indexProfiles([
        {
          id: updatedProfile.id,
          user_id: updatedProfile.user_id,
          name: updatedProfile.User?.name || "",
          location: updatedProfile.User?.location || _iCity,
          bio: updatedProfile.bio || "",
          biography: updatedProfile.biography || "",
          country: updatedProfile.country || "",
          city: _iCity,
          gender: updatedProfile.gender || "",
          interests: updatedProfile.Interests?.map((i) => i.name) || [],
          image_url: updatedProfile.image_url || "",
          ...(_iGeo && { _geo: _iGeo }),
        },
      ]);
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
      const updatedProfile = await Profile.findByPk(profile.id, {
        include: [User, Interest],
      });
      const _tCity = updatedProfile.city || "";
      const _tGeo = getCityCoordinates(_tCity);
      await indexProfiles([
        {
          id: updatedProfile.id,
          user_id: updatedProfile.user_id,
          name: updatedProfile.User?.name || "",
          location: updatedProfile.User?.location || _tCity,
          bio: updatedProfile.bio || "",
          biography: updatedProfile.biography || "",
          country: updatedProfile.country || "",
          city: _tCity,
          gender: updatedProfile.gender || "",
          interests: updatedProfile.Interests?.map((i) => i.name) || [],
          image_url: updatedProfile.image_url || "",
          ...(_tGeo && { _geo: _tGeo }),
        },
      ]);
    } else {
      await removeProfileFromIndex(profile.id);
    }

    res.json({ is_searchable });
  } catch (err) {
    console.error("Erreur toggleSearchable:", err);
    res.status(500).json({ error: "Erreur mise à jour visibilité" });
  }
};

// Extrait les villes depuis la query libre en les comparant aux villes indexées dans Meilisearch
async function extractCitiesFromQuery(query) {
  if (!query) return { cleanQuery: query, detectedCities: [] };
  const cities = await getCachedCities();
  const detectedCities = [];
  let cleanQuery = query;
  // Trier par longueur décroissante pour matcher "Aix-en-Provence" avant "Aix"
  const sorted = [...cities].sort((a, b) => b.length - a.length);
  for (const city of sorted) {
    const escaped = city.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    const regex = new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`, "i");
    if (regex.test(cleanQuery)) {
      // Retrouver la casing canonique depuis l'index
      detectedCities.push(city);
      cleanQuery = cleanQuery.replace(regex, " ").replace(/\s{2,}/g, " ").trim();
    }
  }
  return { cleanQuery, detectedCities };
}

// Recherche : enrichie si connecté, sinon simple
export const searchUsers = async (req, res) => {
  try {
    const {
      q,
      filterInterests,
      filterCity,
      filterCountry,
      filterSex,
      filterGender,
      limit,
    } = req.query;

    // Extraire les villes depuis la query libre ("yoga annecy" → q="yoga", geoPoint=Annecy)
    // Ville détectée dans le texte → geo-ranking par proximité (Annecy d'abord, puis voisines)
    // Ville sélectionnée dans le filtre sidebar → hard filter (uniquement cette ville)
    const { cleanQuery, detectedCities } = await extractCitiesFromQuery(q);
    const explicitCities = filterCity ? filterCity.split(",") : [];

    // Geo-sort basé sur la première ville détectée dans la query libre
    const geoPoint = detectedCities.length > 0
      ? getCityCoordinates(detectedCities[0])
      : null;

    const geoMaxDistanceMeters = geoPoint
      ? parseInt(process.env.MEILI_GEO_MAX_DISTANCE_METERS || "250000", 10)
      : null;

    const normalizedGenderFilter = filterSex ?? filterGender;

    const options = {
      limit: limit ? parseInt(limit) : 20,
      filterInterests: filterInterests ? filterInterests.split(",") : null,
      filterCity: explicitCities.length ? explicitCities : null,
      filterCountry: filterCountry ? filterCountry.split(",") : null,
      filterSex: normalizedGenderFilter
        ? normalizedGenderFilter.split(",")
        : null,
      geoPoint,
      geoMaxDistanceMeters,
    };

    const effectiveQuery = cleanQuery || "";

    // Si connecté, enrichir avec le profil du chercheur
    const searcherId = req.user?.dbUser?.id;
    let searcherProfileId = null;

    if (searcherId) {
      const searcherProfile = await Profile.findOne({
        where: { user_id: searcherId },
        include: [User, Interest],
      });

      searcherProfileId = searcherProfile?.id;

      const profileData = searcherProfile
        ? {
            bio: searcherProfile.bio || "",
            biography: searcherProfile.biography || "",
            location:
              searcherProfile.User?.location || searcherProfile.city || "",
            interests: searcherProfile.Interests?.map((i) => i.name) || [],
            image_url: searcherProfile.image_url || "",
          }
        : null;

      const result = await searchProfilesEnriched(
        profileData,
        effectiveQuery,
        options,
      );
      // Exclure le profil du chercheur + résoudre les image_url (path → URL Minio)
      result.hits = result.hits
        .filter((hit) => hit.id !== searcherProfileId)
        .map((hit) => ({ ...hit, image_url: minioService.resolveUrl(hit.image_url) }));
      return res.json({ ...result, noRelevantResults: result.noRelevantResults ?? false });
    }

    // Sinon recherche simple
    const result = await searchProfilesService(effectiveQuery, options);
    result.hits = result.hits.map((hit) => ({ ...hit, image_url: minioService.resolveUrl(hit.image_url) }));
    res.json({ ...result, noRelevantResults: result.noRelevantResults ?? false });
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
          attributes: { exclude: ["password", "email"] },
        },
        Interest,
      ],
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
      name: profile.User.name || "",
      profile: {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        age: profile.age,
        biography: profile.biography,
        country: profile.country,
        city: profile.city,
        image_url: minioService.resolveUrl(profile.image_url),
        interests:
          profile.Interests?.map((interest) => ({
            id: interest.id,
            name: interest.name,
          })) || [],
      },
    };

    // Ajouter header de cache pour optimisation (1 heure)
    res.set("Cache-Control", "public, max-age=3600");
    res.json(publicProfile);
  } catch (err) {
    console.error("Erreur getProfileById:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};
