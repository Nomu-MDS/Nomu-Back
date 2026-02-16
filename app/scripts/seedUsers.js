// scripts/seedUsers.js - Ajoute des utilisateurs de test pour enrichir l'index
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { sequelize, User, Profile, Interest } from "../models/index.js";
import { indexProfiles } from "../services/meilisearch/meiliProfileService.js";

dotenv.config();

const users = [
  {
    name: "Sophie Martin",
    email: "sophie@test.com",
    bio: "Guide locale passionnée de gastronomie",
    location: "Bordeaux",
    profile: {
      first_name: "Sophie",
      last_name: "Martin",
      age: 34,
      biography: "Guide locale spécialisée en gastronomie, vins et fromages français. J'organise des dégustations et visites de vignobles.",
      country: "France",
      city: "Bordeaux",
      interests: [1, 2], // Gastronomie, Vin
    },
  },
  {
    name: "Lucas Dubois",
    email: "lucas@test.com",
    bio: "Amoureux de la montagne et du ski",
    location: "Chamonix",
    profile: {
      first_name: "Lucas",
      last_name: "Dubois",
      age: 29,
      biography: "Moniteur de ski et guide de haute montagne. Passionné de randonnée et d'alpinisme.",
      country: "France",
      city: "Chamonix",
      interests: [3, 4, 5], // Randonnée, Montagne, Ski
    },
  },
  {
    name: "Emma Bernard",
    email: "emma@test.com",
    bio: "Artiste et passionnée d'art contemporain",
    location: "Paris",
    profile: {
      first_name: "Emma",
      last_name: "Bernard",
      age: 31,
      biography: "Artiste peintre et guide culturelle. Je fais découvrir les musées et galeries parisiennes.",
      country: "France",
      city: "Paris",
      interests: [9, 11], // Art, Photographie
    },
  },
  {
    name: "Hugo Petit",
    email: "hugo@test.com",
    bio: "Surfeur et amoureux de l'océan",
    location: "Biarritz",
    profile: {
      first_name: "Hugo",
      last_name: "Petit",
      age: 27,
      biography: "Surfeur professionnel et moniteur de surf. Je connais tous les spots secrets de la côte basque.",
      country: "France",
      city: "Biarritz",
      interests: [6, 18], // Surf, Sport
    },
  },
  {
    name: "Léa Moreau",
    email: "lea@test.com",
    bio: "Passionnée de yoga et bien-être",
    location: "Nice",
    profile: {
      first_name: "Léa",
      last_name: "Moreau",
      age: 33,
      biography: "Professeure de yoga certifiée. J'organise des retraites de méditation et bien-être.",
      country: "France",
      city: "Nice",
      interests: [8, 15], // Yoga, Nature
    },
  },
  {
    name: "Thomas Roux",
    email: "thomas@test.com",
    bio: "Développeur et geek",
    location: "Lyon",
    profile: {
      first_name: "Thomas",
      last_name: "Roux",
      age: 26,
      biography: "Développeur web passionné de jeux et escape games. J'adore les défis intellectuels.",
      country: "France",
      city: "Lyon",
      interests: [19, 20], // Lecture, Cinéma
    },
  },
  {
    name: "Camille Fournier",
    email: "camille@test.com",
    bio: "Photographe nature",
    location: "Strasbourg",
    profile: {
      first_name: "Camille",
      last_name: "Fournier",
      age: 30,
      biography: "Photographe nature spécialisée en observation des oiseaux et randonnée douce.",
      country: "France",
      city: "Strasbourg",
      interests: [11, 15, 3], // Photographie, Nature, Randonnée
    },
  },
  {
    name: "Antoine Girard",
    email: "antoine@test.com",
    bio: "Chef cuisinier",
    location: "Marseille",
    profile: {
      first_name: "Antoine",
      last_name: "Girard",
      age: 38,
      biography: "Chef cuisinier étoilé. Je donne des cours de cuisine et fais découvrir les marchés locaux.",
      country: "France",
      city: "Marseille",
      interests: [1, 12], // Gastronomie, Cuisine
    },
  },
  {
    name: "Julie Lefebvre",
    email: "julie@test.com",
    bio: "Historienne passionnée",
    location: "Tours",
    profile: {
      first_name: "Julie",
      last_name: "Lefebvre",
      age: 35,
      biography: "Historienne spécialisée dans le patrimoine français. Visites de châteaux de la Loire.",
      country: "France",
      city: "Tours",
      interests: [16, 19], // Histoire, Lecture
    },
  },
  {
    name: "Maxime Mercier",
    email: "maxime@test.com",
    bio: "Œnologue et sommelier",
    location: "Reims",
    profile: {
      first_name: "Maxime",
      last_name: "Mercier",
      age: 40,
      biography: "Œnologue diplômé. Dégustations de champagne et visites de caves champenoises.",
      country: "France",
      city: "Reims",
      interests: [2, 1], // Vin, Gastronomie
    },
  },
  {
    name: "Chloé Dupont",
    email: "chloe@test.com",
    bio: "Danseuse de salsa et bachata",
    location: "Toulouse",
    profile: {
      first_name: "Chloé",
      last_name: "Dupont",
      age: 28,
      biography: "Professeure de danse latine. Soirées salsa et bachata à Toulouse.",
      country: "France",
      city: "Toulouse",
      interests: [13, 10], // Danse, Musique
    },
  },
  {
    name: "Nicolas Lambert",
    email: "nicolas@test.com",
    bio: "Cycliste passionné",
    location: "Nantes",
    profile: {
      first_name: "Nicolas",
      last_name: "Lambert",
      age: 32,
      biography: "Cycliste amateur. Je propose des tours à vélo pour découvrir la campagne nantaise.",
      country: "France",
      city: "Nantes",
      interests: [14, 18], // Vélo, Sport
    },
  },
  {
    name: "Marie Leroy",
    email: "marie.leroy@test.com",
    bio: "Jardinière urbaine",
    location: "Lille",
    profile: {
      first_name: "Marie",
      last_name: "Leroy",
      age: 29,
      biography: "Experte en permaculture et jardinage urbain. Potagers partagés et ateliers.",
      country: "France",
      city: "Lille",
      interests: [17, 15], // Jardinage, Nature
    },
  },
  {
    name: "Alexandre Simon",
    email: "alex@test.com",
    bio: "Musicien jazz",
    location: "Paris",
    profile: {
      first_name: "Alexandre",
      last_name: "Simon",
      age: 36,
      biography: "Saxophoniste jazz. Concerts live et jam sessions dans les clubs parisiens.",
      country: "France",
      city: "Paris",
      interests: [10, 9], // Musique, Art
    },
  },
  {
    name: "Laura Michel",
    email: "laura@test.com",
    bio: "Plongeuse certifiée",
    location: "Ajaccio",
    profile: {
      first_name: "Laura",
      last_name: "Michel",
      age: 31,
      biography: "Monitrice de plongée. Exploration sous-marine et snorkeling en Corse.",
      country: "France",
      city: "Ajaccio",
      interests: [7, 18], // Plongée, Sport
    },
  },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log("✅ DB connectée");

    const hashedPassword = await bcrypt.hash("test123", 10);
    const createdProfiles = [];

    for (const userData of users) {
      const exists = await User.findOne({ where: { email: userData.email } });
      if (exists) {
        console.log(`⏭️  ${userData.email} existe déjà`);
        continue;
      }

      const { profile: profileData, ...userFields } = userData;

      const user = await User.create({
        ...userFields,
        password: hashedPassword,
        role: "user",
        is_active: true,
      });

      // Créer le profile complet avec is_searchable
      const profile = await Profile.create({
        user_id: user.id,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        age: profileData.age,
        biography: profileData.biography,
        country: profileData.country,
        city: profileData.city,
        is_searchable: true,
      });

      // Ajouter les intérêts
      if (profileData.interests?.length) {
        await profile.setInterests(profileData.interests);
      }

      // Recharger le profile avec les intérêts pour l'indexation
      const fullProfile = await Profile.findByPk(profile.id, {
        include: [User, Interest],
      });

      createdProfiles.push({
        id: fullProfile.id,
        user_id: user.id,
        name: user.name,
        location: user.location,
        bio: user.bio,
        biography: fullProfile.biography,
        country: fullProfile.country,
        city: fullProfile.city,
        interests: fullProfile.Interests?.map((i) => i.name) || [],
      });

      console.log(`✅ Créé: ${user.name} (${fullProfile.city})`);
    }

    if (createdProfiles.length > 0) {
      await indexProfiles(createdProfiles);
      console.log(`\n🔍 ${createdProfiles.length} profil(s) indexé(s) dans Meilisearch`);
    }

    console.log("\n🎉 Seed terminé !");
    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur:", err.message);
    process.exit(1);
  }
}

seed();
