// app/services/meilisearch/reindexService.js
// Logique de réindexation complète des profils dans Meilisearch.
// Utilisé par :
//   - app/scripts/reindexProfiles.js  (exécution manuelle : npm run reindex)
//   - app/server.js                   (réindexation automatique toutes les 2h)

import { Profile, User, Interest } from "../../models/index.js";
import { indexProfiles } from "./meiliProfileService.js";

export const reindexAllProfiles = async () => {
  const profiles = await Profile.findAll({
    where: { is_searchable: true },
    include: [{ model: User }, { model: Interest }],
  });

  if (profiles.length === 0) {
    console.log("ℹ️  Aucun profil searchable à indexer");
    return { indexed: 0 };
  }

  const profilesData = profiles.map((profile) => ({
    id: profile.id,
    user_id: profile.user_id,
    name: profile.User?.name || "",
    location: profile.User?.location || profile.city || "",
    bio: profile.User?.bio || "",
    biography: profile.biography || "",
    country: profile.country || "",
    city: profile.city || "",
    interests: profile.Interests?.map((i) => i.name) || [],
  }));

  await indexProfiles(profilesData);
  console.log(`✅ ${profiles.length} profil(s) réindexé(s) dans Meilisearch`);
  return { indexed: profiles.length };
};
