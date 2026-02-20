// app/scripts/reindexProfiles.js
// Script de réindexation manuelle des profils dans Meilisearch.
//
// Usage :
//   npm run reindex
//
// En production (depuis le VPS) :
//   docker exec express-api npm run reindex

import dotenv from "dotenv";
dotenv.config();

import { sequelize } from "../config/database.js";
import { reindexAllProfiles } from "../services/meilisearch/reindexService.js";

const run = async () => {
  try {
    console.log("🔄 Connexion à PostgreSQL...");
    await sequelize.authenticate();
    console.log("✅ Connecté à PostgreSQL");

    console.log("🔄 Réindexation des profils dans Meilisearch...");
    const { indexed } = await reindexAllProfiles();
    console.log(`✅ Réindexation terminée — ${indexed} profil(s) mis à jour`);
  } catch (err) {
    console.error("❌ Erreur lors de la réindexation :", err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

run();
