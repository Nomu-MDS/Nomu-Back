// app/services/meilisearch/reindexService.js
// Logique de réindexation complète des profils dans Meilisearch.
// Utilisé par :
//   - app/scripts/reindexProfiles.js  (exécution manuelle : npm run reindex)
//   - app/server.js                   (réindexation automatique toutes les 2h)

import { Profile, User, Interest } from "../../models/index.js";
import { indexProfiles, clearIndex, getCityCoordinates } from "./meiliProfileService.js";

export const reindexAllProfiles = async () => {
  // Étape 1 : Vider complètement l'index Meilisearch pour supprimer les profils obsolètes
  console.log("🗑️  Suppression de tous les documents de l'index...");
  await clearIndex();
  console.log("✅ Index vidé");

  // Étape 2 : Récupérer tous les profils searchable depuis PostgreSQL
  const profiles = await Profile.findAll({
    where: { is_searchable: true },
    include: [
      {
        model: User,
        where: { is_active: true }, // Seulement les utilisateurs actifs
        required: true
      },
      { model: Interest }
    ],
  });

  if (profiles.length === 0) {
    console.log("ℹ️  Aucun profil searchable à indexer");
    return { indexed: 0 };
  }

  // Étape 3 : Formater les données pour Meilisearch
  const profilesData = profiles.map((profile) => {
    const city = profile.city || "";
    const geo = getCityCoordinates(city);
    return {
      id: profile.id,
      user_id: profile.user_id,
      name: profile.User?.name || "",
      location: profile.User?.location || city,
      bio: profile.bio || "",
      biography: profile.biography || "",
      country: profile.country || "",
      city,
      gender: profile.gender || "",
      interests: profile.Interests?.map((i) => i.name) || [],
      image_url: profile.image_url || "",
      ...(geo && { _geo: geo }),
    };
  });

  // Étape 4 : Indexer les profils actifs
  await indexProfiles(profilesData);
  console.log(`✅ ${profiles.length} profil(s) réindexé(s) dans Meilisearch`);
  return { indexed: profiles.length };
};
