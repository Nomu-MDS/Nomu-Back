// scripts/seedInterests.js - Crée les intérêts prédéfinis
import dotenv from "dotenv";
import { sequelize, Interest } from "../models/index.js";

dotenv.config();

const interests = [
  { name: "Gastronomie", icon: "🍽️" },
  { name: "Vin", icon: "🍷" },
  { name: "Randonnée", icon: "🥾" },
  { name: "Montagne", icon: "⛰️" },
  { name: "Ski", icon: "⛷️" },
  { name: "Surf", icon: "🏄" },
  { name: "Plongée", icon: "🤿" },
  { name: "Yoga", icon: "🧘" },
  { name: "Art", icon: "🎨" },
  { name: "Musique", icon: "🎵" },
  { name: "Photographie", icon: "📷" },
  { name: "Cuisine", icon: "👨‍🍳" },
  { name: "Danse", icon: "💃" },
  { name: "Vélo", icon: "🚴" },
  { name: "Nature", icon: "🌿" },
  { name: "Histoire", icon: "🏛️" },
  { name: "Jardinage", icon: "🌱" },
  { name: "Sport", icon: "⚽" },
  { name: "Lecture", icon: "📚" },
  { name: "Cinéma", icon: "🎬" },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connectée");

    for (const interestData of interests) {
      const [interest, created] = await Interest.findOrCreate({
        where: { name: interestData.name },
        defaults: interestData,
      });

      if (created) {
        console.log(`✅ Créé: ${interest.name} ${interest.icon}`);
      } else {
        console.log(`⏭️  ${interest.name} existe déjà`);
      }
    }

    console.log("\n🎉 Seed des intérêts terminé !");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur:", err.message);
    process.exit(1);
  }
}

seed();
