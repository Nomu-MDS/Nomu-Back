// scripts/seedUsers.js - Ajoute des utilisateurs de test pour enrichir l'index
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { sequelize, User } from "../models/index.js";
import { indexUsers } from "../services/meilisearch/meiliUserService.js";

dotenv.config();

const users = [
  {
    name: "Sophie Martin",
    email: "sophie@test.com",
    bio: "Guide locale passionnée de gastronomie, vins et fromages français",
    location: "Bordeaux",
  },
  {
    name: "Lucas Dubois",
    email: "lucas@test.com",
    bio: "Amoureux de la montagne, ski et randonnée en haute altitude",
    location: "Chamonix",
  },
  {
    name: "Emma Bernard",
    email: "emma@test.com",
    bio: "Artiste et passionnée d'art contemporain, musées et galeries",
    location: "Paris",
  },
  {
    name: "Hugo Petit",
    email: "hugo@test.com",
    bio: "Surfeur et amoureux de l'océan, spots secrets de la côte basque",
    location: "Biarritz",
  },
  {
    name: "Léa Moreau",
    email: "lea@test.com",
    bio: "Passionnée de yoga, méditation et bien-être, retraites spirituelles",
    location: "Nice",
  },
  {
    name: "Thomas Roux",
    email: "thomas@test.com",
    bio: "Développeur et geek, escape games et jeux de société",
    location: "Lyon",
  },
  {
    name: "Camille Fournier",
    email: "camille@test.com",
    bio: "Photographe nature, observation des oiseaux et randonnée douce",
    location: "Strasbourg",
  },
  {
    name: "Antoine Girard",
    email: "antoine@test.com",
    bio: "Chef cuisinier, cours de cuisine et marchés locaux",
    location: "Marseille",
  },
  {
    name: "Julie Lefebvre",
    email: "julie@test.com",
    bio: "Historienne passionnée, visites de châteaux et patrimoine",
    location: "Tours",
  },
  {
    name: "Maxime Mercier",
    email: "maxime@test.com",
    bio: "Œnologue, dégustation de vins et visites de vignobles",
    location: "Reims",
  },
  {
    name: "Chloé Dupont",
    email: "chloe@test.com",
    bio: "Danseuse de salsa et bachata, soirées latines et cours de danse",
    location: "Toulouse",
  },
  {
    name: "Nicolas Lambert",
    email: "nicolas@test.com",
    bio: "Cycliste passionné, tours à vélo et découverte de la campagne",
    location: "Nantes",
  },
  {
    name: "Marie Leroy",
    email: "marie.leroy@test.com",
    bio: "Jardinière urbaine, permaculture et potagers partagés",
    location: "Lille",
  },
  {
    name: "Alexandre Simon",
    email: "alex@test.com",
    bio: "Musicien jazz, concerts live et jam sessions",
    location: "Paris",
  },
  {
    name: "Laura Michel",
    email: "laura@test.com",
    bio: "Plongeuse certifiée, exploration sous-marine et snorkeling",
    location: "Ajaccio",
  },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connectée");

    const hashedPassword = await bcrypt.hash("test123", 10);
    const createdUsers = [];

    for (const userData of users) {
      const exists = await User.findOne({ where: { email: userData.email } });
      if (exists) {
        console.log(`⏭️  ${userData.email} existe déjà`);
        continue;
      }

      const user = await User.create({
        ...userData,
        password: hashedPassword,
        role: "user",
        is_active: true,
        is_searchable: true,
      });

      createdUsers.push({
        id: user.id,
        name: user.name,
        location: user.location,
        bio: user.bio,
        interests: "",
      });

      console.log(`✅ Créé: ${user.name} (${user.location})`);
    }

    if (createdUsers.length > 0) {
      await indexUsers(createdUsers);
      console.log(`\n🔍 ${createdUsers.length} utilisateur(s) indexé(s) dans Meilisearch`);
    }

    console.log("\n🎉 Seed terminé !");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur:", err.message);
    process.exit(1);
  }
}

seed();
