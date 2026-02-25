// app/scripts/cleanDeletedUsers.js
// Script pour supprimer les utilisateurs inactifs de l'index Meilisearch
// et nettoyer les profils non-searchable
//
// Usage en production :
//   docker exec express-api node app/scripts/cleanDeletedUsers.js

import dotenv from "dotenv";
dotenv.config();

import { sequelize, Profile, User } from "../models/index.js";
import { clearIndex } from "../services/meilisearch/meiliProfileService.js";
import { reindexAllProfiles } from "../services/meilisearch/reindexService.js";

const run = async () => {
  try {
    console.log("🔄 Connexion à PostgreSQL...");
    await sequelize.authenticate();
    console.log("✅ Connecté à PostgreSQL");

    // Compter les profils actifs et searchable
    const activeSearchableCount = await Profile.count({
      where: { is_searchable: true },
      include: [{
        model: User,
        where: { is_active: true },
        required: true
      }]
    });

    console.log(`📊 Profils actifs et searchable dans PostgreSQL : ${activeSearchableCount}`);

    // Vider l'index Meilisearch
    console.log("🗑️  Nettoyage de l'index Meilisearch...");
    await clearIndex();
    console.log("✅ Index Meilisearch vidé");

    // Réindexer uniquement les profils actifs et searchable
    console.log("🔄 Réindexation des profils actifs...");
    const { indexed } = await reindexAllProfiles();
    console.log(`✅ ${indexed} profil(s) réindexé(s) dans Meilisearch`);

    console.log("\n🎉 Nettoyage terminé avec succès !");
  } catch (err) {
    console.error("❌ Erreur lors du nettoyage :", err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

run();
