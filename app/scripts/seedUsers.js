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
    bio: "Guide locale à Bordeaux, passionnée de gastronomie française, de vins et de découvertes culinaires authentiques.",
    location: "Bordeaux",
    profile: {
      first_name: "Sophie",
      last_name: "Martin",
      age: 34,
      biography: "Guide locale spécialisée en gastronomie bordelaise, vins de la région et fromages français. J'organise des dégustations conviviales, des visites de vignobles et des expériences culinaires pour faire découvrir les saveurs locales de manière authentique et chaleureuse.",
      country: "France",
      city: "Bordeaux",
      interests: [1, 2],
    },
  },
  {
    name: "Lucas Dubois",
    email: "lucas@test.com",
    bio: "Moniteur de ski et amoureux de la montagne, toujours partant pour une aventure entre sommets, neige et grands espaces.",
    location: "Chamonix",
    profile: {
      first_name: "Lucas",
      last_name: "Dubois",
      age: 29,
      biography: "Moniteur de ski et guide de haute montagne basé à Chamonix. Passionné par l'alpinisme, la randonnée et les paysages alpins, j'accompagne les voyageurs qui veulent découvrir la montagne en toute sécurité, été comme hiver.",
      country: "France",
      city: "Chamonix",
      interests: [3, 4, 5],
    },
  },
  {
    name: "Emma Bernard",
    email: "emma@test.com",
    bio: "Artiste peintre parisienne passionnée d'art contemporain, de musées et de découvertes culturelles inspirantes.",
    location: "Paris",
    profile: {
      first_name: "Emma",
      last_name: "Bernard",
      age: 31,
      biography: "Artiste peintre et guide culturelle à Paris, je fais découvrir les musées, les galeries et les quartiers artistiques de la capitale. J'aime partager ma passion pour l'art contemporain, la création visuelle et les lieux qui inspirent les artistes d'aujourd'hui.",
      country: "France",
      city: "Paris",
      interests: [9, 11],
    },
  },
  {
    name: "Hugo Petit",
    email: "hugo@test.com",
    bio: "Surfeur passionné à Biarritz, amoureux de l'océan, des vagues et du mode de vie de la côte basque.",
    location: "Biarritz",
    profile: {
      first_name: "Hugo",
      last_name: "Petit",
      age: 27,
      biography: "Surfeur professionnel et moniteur de surf installé à Biarritz. Je connais les meilleurs spots de la côte basque, des plus connus aux plus confidentiels, et j'adore transmettre ma passion pour l'océan, le surf et l'esprit libre du littoral.",
      country: "France",
      city: "Biarritz",
      interests: [6, 18],
    },
  },
  {
    name: "Léa Moreau",
    email: "lea@test.com",
    bio: "Professeure de yoga à Nice, dédiée au bien-être, à la méditation et à l'équilibre du corps et de l'esprit.",
    location: "Nice",
    profile: {
      first_name: "Léa",
      last_name: "Moreau",
      age: 33,
      biography: "Professeure de yoga certifiée à Nice, j'organise des retraites de méditation, des séances de respiration et des expériences bien-être en lien avec la nature. Mon approche est douce, accessible et centrée sur l'harmonie intérieure.",
      country: "France",
      city: "Nice",
      interests: [8, 15],
    },
  },
  {
    name: "Thomas Roux",
    email: "thomas@test.com",
    bio: "Développeur web lyonnais, passionné de technologie, de jeux, d'escape games et de défis intellectuels.",
    location: "Lyon",
    profile: {
      first_name: "Thomas",
      last_name: "Roux",
      age: 26,
      biography: "Développeur web basé à Lyon, je suis passionné par l'univers geek, les jeux de réflexion, les escape games et les expériences interactives. J'aime partager mes bons plans culturels et ludiques pour découvrir la ville autrement.",
      country: "France",
      city: "Lyon",
      interests: [19, 20],
    },
  },
  {
    name: "Camille Fournier",
    email: "camille@test.com",
    bio: "Photographe nature à Strasbourg, spécialisée dans les balades douces, les oiseaux et les paysages apaisants.",
    location: "Strasbourg",
    profile: {
      first_name: "Camille",
      last_name: "Fournier",
      age: 30,
      biography: "Photographe nature spécialisée dans l'observation des oiseaux et les randonnées tranquilles autour de Strasbourg. J'aime proposer des sorties calmes, contemplatives et inspirantes pour reconnecter les gens à la nature et à la photographie.",
      country: "France",
      city: "Strasbourg",
      interests: [11, 15, 3],
    },
  },
  {
    name: "Antoine Girard",
    email: "antoine@test.com",
    bio: "Chef cuisinier à Marseille, passionné par la cuisine de terroir, les marchés locaux et le partage de saveurs.",
    location: "Marseille",
    profile: {
      first_name: "Antoine",
      last_name: "Girard",
      age: 38,
      biography: "Chef cuisinier étoilé à Marseille, je propose des cours de cuisine, des découvertes de marchés provençaux et des expériences gourmandes autour des produits locaux. Ma cuisine est généreuse, méditerranéenne et tournée vers le partage.",
      country: "France",
      city: "Marseille",
      interests: [1, 12],
    },
  },
  {
    name: "Julie Lefebvre",
    email: "julie@test.com",
    bio: "Historienne passionnée à Tours, amoureuse du patrimoine, des châteaux et des récits qui font vivre l'histoire.",
    location: "Tours",
    profile: {
      first_name: "Julie",
      last_name: "Lefebvre",
      age: 35,
      biography: "Historienne spécialisée dans le patrimoine français et plus particulièrement dans les châteaux de la Loire. Je propose des visites vivantes et documentées pour faire découvrir l'histoire, l'architecture et les personnages qui ont marqué la région.",
      country: "France",
      city: "Tours",
      interests: [16, 19],
    },
  },
  {
    name: "Maxime Mercier",
    email: "maxime@test.com",
    bio: "Œnologue à Reims, expert en champagne et passionné par les accords mets-vins et les terroirs d'exception.",
    location: "Reims",
    profile: {
      first_name: "Maxime",
      last_name: "Mercier",
      age: 40,
      biography: "Œnologue diplômé et sommelier basé à Reims, je fais découvrir les grandes maisons comme les producteurs plus confidentiels de Champagne. J'organise des dégustations commentées, des visites de caves et des expériences autour du patrimoine viticole champenois.",
      country: "France",
      city: "Reims",
      interests: [2, 1],
    },
  },
  {
    name: "Chloé Dupont",
    email: "chloe@test.com",
    bio: "Professeure de danse latine à Toulouse, passionnée par la salsa, la bachata et l'énergie des soirées dansantes.",
    location: "Toulouse",
    profile: {
      first_name: "Chloé",
      last_name: "Dupont",
      age: 28,
      biography: "Professeure de danse spécialisée en salsa et bachata à Toulouse. J'organise des cours, des initiations et des soirées conviviales pour transmettre la joie de danser, de rencontrer du monde et de profiter de l'énergie de la musique latine.",
      country: "France",
      city: "Toulouse",
      interests: [13, 10],
    },
  },
  {
    name: "Nicolas Lambert",
    email: "nicolas@test.com",
    bio: "Cycliste nantais passionné par les balades sportives, la campagne et la découverte de paysages à vélo.",
    location: "Nantes",
    profile: {
      first_name: "Nicolas",
      last_name: "Lambert",
      age: 32,
      biography: "Cycliste amateur basé à Nantes, je propose des tours à vélo pour explorer la campagne environnante, les petites routes pittoresques et les coins méconnus de la région. J'aime allier activité physique, convivialité et découverte locale.",
      country: "France",
      city: "Nantes",
      interests: [14, 18],
    },
  },
  {
    name: "Marie Leroy",
    email: "marie.leroy@test.com",
    bio: "Experte en jardinage urbain à Lille, passionnée par la permaculture, les potagers partagés et la nature en ville.",
    location: "Lille",
    profile: {
      first_name: "Marie",
      last_name: "Leroy",
      age: 29,
      biography: "Spécialiste de la permaculture et du jardinage urbain à Lille, j'anime des ateliers autour des potagers partagés, de la culture en petit espace et des pratiques durables. J'aime montrer qu'il est possible de recréer du lien avec la nature, même en pleine ville.",
      country: "France",
      city: "Lille",
      interests: [17, 15],
    },
  },
  {
    name: "Alexandre Simon",
    email: "alex@test.com",
    bio: "Saxophoniste jazz à Paris, passionné de concerts live, de jam sessions et de lieux artistiques vibrants.",
    location: "Paris",
    profile: {
      first_name: "Alexandre",
      last_name: "Simon",
      age: 36,
      biography: "Musicien de jazz basé à Paris, je suis saxophoniste et habitué des clubs, scènes intimistes et jam sessions de la capitale. J'aime faire découvrir l'ambiance musicale parisienne, entre improvisation, art vivant et rencontres passionnées.",
      country: "France",
      city: "Paris",
      interests: [10, 9],
    },
  },
  {
    name: "Laura Michel",
    email: "laura@test.com",
    bio: "Monitrice de plongée à Ajaccio, passionnée par les fonds marins, le snorkeling et les eaux cristallines de Corse.",
    location: "Ajaccio",
    profile: {
      first_name: "Laura",
      last_name: "Michel",
      age: 31,
      biography: "Monitrice de plongée certifiée à Ajaccio, je guide les amateurs de mer dans l'exploration des fonds sous-marins corses. Entre plongée, snorkeling et sensibilisation à la biodiversité marine, j'aime partager la beauté spectaculaire de la Méditerranée.",
      country: "France",
      city: "Ajaccio",
      interests: [7, 18],
    },
  },

  // --- Paris ---
  {
    name: "Julien Moreau",
    email: "julien.moreau@test.com",
    bio: "Photographe freelance à Paris, passionné de portrait urbain, de cinéma et de festivals culturels.",
    location: "Paris",
    profile: {
      first_name: "Julien",
      last_name: "Moreau",
      age: 32,
      biography: "Photographe freelance spécialisé dans le portrait urbain et l'ambiance des rues parisiennes. Grand cinéphile, je fréquente les festivals, les projections indépendantes et les lieux culturels qui font vibrer Paris au quotidien.",
      country: "France",
      city: "Paris",
      interests: [11, 20],
      gender: "Femme"
    },
  },
  {
    name: "Isabelle Blanc",
    email: "isabelle.blanc@test.com",
    bio: "Professeure de yoga parisienne, amoureuse de la nature, des plantes et des retraites en plein air.",
    location: "Paris",
    profile: {
      first_name: "Isabelle",
      last_name: "Blanc",
      age: 38,
      biography: "Enseignante de yoga depuis plus de dix ans, j'accompagne les personnes en quête de bien-être, de respiration et de reconnexion à la nature. J'organise aussi des retraites en plein air et des ateliers autour du corps, du souffle et du vivant.",
      country: "France",
      city: "Paris",
      interests: [8, 15],
      gender: "Femme"
    },
  },
  {
    name: "Marc Dupuis",
    email: "marc.dupuis@test.com",
    bio: "Artiste parisien entre musique et peinture, passionné par le jazz et les lieux créatifs cachés de la capitale.",
    location: "Paris",
    profile: {
      first_name: "Marc",
      last_name: "Dupuis",
      age: 41,
      biography: "Guitariste de jazz et peintre expressionniste, je partage ma vie entre musique et création visuelle. J'aime faire découvrir les ateliers d'artistes, les petites galeries et les lieux culturels moins connus qui donnent à Paris toute sa richesse artistique.",
      country: "France",
      city: "Paris",
      interests: [10, 9],
      gender: "Homme"
    },
  },
  {
    name: "Céline Fontaine",
    email: "celine.fontaine@test.com",
    bio: "Danseuse contemporaine à Paris, passionnée de spectacles vivants, de mouvement et de musiques du monde.",
    location: "Paris",
    profile: {
      first_name: "Céline",
      last_name: "Fontaine",
      age: 29,
      biography: "Danseuse contemporaine et professeure de danse, je vis au rythme des répétitions, des scènes et des ateliers. Je m'intéresse aussi aux musiques du monde et aux expériences artistiques immersives qui font dialoguer corps, son et émotion.",
      country: "France",
      city: "Paris",
      interests: [13, 10],
      gender: "Femme"
    },
  },
  {
    name: "Pierre Renard",
    email: "pierre.renard@test.com",
    bio: "Chef bistronomique à Paris, passionné par les bons produits, la transmission culinaire et les repas conviviaux.",
    location: "Paris",
    profile: {
      first_name: "Pierre",
      last_name: "Renard",
      age: 45,
      biography: "Chef formé au Cordon Bleu, je propose des dîners privés, des cours de cuisine et des expériences gastronomiques en petit comité. J'aime transmettre un savoir-faire précis tout en gardant une approche simple, généreuse et accessible.",
      country: "France",
      city: "Paris",
      interests: [1, 12],
      gender: "Homme"
    },
  },
  {
    name: "Aurélie Legrand",
    email: "aurelie.legrand@test.com",
    bio: "Historienne de l'art à Paris, conservatrice passionnée par les musées, les œuvres et la transmission culturelle.",
    location: "Paris",
    profile: {
      first_name: "Aurélie",
      last_name: "Legrand",
      age: 36,
      biography: "Conservatrice de musée et passionnée d'histoire de l'art, je propose des visites privées et approfondies des grands musées parisiens. Mon approche mêle regard esthétique, contexte historique et envie de rendre l'art vivant pour tous les publics.",
      country: "France",
      city: "Paris",
      interests: [16, 19],
      gender: "Femme"
    },
  },
  {
    name: "Raphaël Faure",
    email: "raphael.faure@test.com",
    bio: "Photojournaliste parisien et amoureux de randonnée, entre reportages visuels et sorties nature autour de Paris.",
    location: "Paris",
    profile: {
      first_name: "Raphaël",
      last_name: "Faure",
      age: 33,
      biography: "Reporter photo passionné par l'image documentaire et les escapades en nature, je propose des sorties photo pour apprendre à observer, composer et raconter un lieu à travers l'objectif. J'aime particulièrement les balades visuelles autour de Paris.",
      country: "France",
      city: "Paris",
      interests: [11, 3],
      gender: "Homme"
    },
  },
  {
    name: "Nathalie Perrin",
    email: "nathalie.perrin@test.com",
    bio: "Experte en jardinage urbain à Paris, créatrice de potagers de balcon et passionnée de permaculture.",
    location: "Paris",
    profile: {
      first_name: "Nathalie",
      last_name: "Perrin",
      age: 44,
      biography: "Spécialiste de jardinage urbain et de permaculture, j'accompagne les citadins dans la création de potagers adaptés aux petits espaces. Balcons, terrasses et cours intérieures deviennent des lieux fertiles, esthétiques et vivants.",
      country: "France",
      city: "Paris",
      interests: [17, 15],
      gender: "Femme"
    },
  },
  {
    name: "Florian Thibault",
    email: "florian.thibault@test.com",
    bio: "Cycliste urbain et coach sportif à Paris, adepte des sorties actives pour découvrir la ville autrement.",
    location: "Paris",
    profile: {
      first_name: "Florian",
      last_name: "Thibault",
      age: 27,
      biography: "Coach sportif et passionné de mobilité à vélo, j'organise des sorties urbaines pour découvrir Paris et ses environs de manière dynamique. J'aime combiner sport, bien-être et exploration de la ville dans une ambiance motivante et conviviale.",
      country: "France",
      city: "Paris",
      interests: [14, 18],
      gender: "Homme"
    },
  },
  {
    name: "Mélanie Guerin",
    email: "melanie.guerin@test.com",
    bio: "Journaliste culturelle à Paris, passionnée de cinéma, de débats d'idées et de littérature contemporaine.",
    location: "Paris",
    profile: {
      first_name: "Mélanie",
      last_name: "Guerin",
      age: 30,
      biography: "Critique de cinéma et grande lectrice, j'anime des ciné-clubs, des discussions culturelles et des rencontres autour du 7e art et de la littérature. J'aime créer des moments d'échange où l'on parle d'œuvres, d'émotions et de regards sur le monde.",
      country: "France",
      city: "Paris",
      interests: [20, 19],
      gender: "Femme"
    },
  },
  {
    name: "Amandine Charles",
    email: "amandine.charles@test.com",
    bio: "Artiste peintre parisienne spécialisée dans le portrait, les ateliers créatifs et les univers sensibles.",
    location: "Paris",
    profile: {
      first_name: "Amandine",
      last_name: "Charles",
      age: 34,
      biography: "Peintre figurative spécialisée dans le portrait, je propose des ateliers de dessin, des rencontres en atelier et des parcours artistiques pour découvrir les coulisses de la création. Mon univers mêle regard humain, sensibilité et transmission du geste.",
      country: "France",
      city: "Paris",
      interests: [9, 11],
      gender: "Femme"
    },
  },
  {
    name: "Sébastien Bonnet",
    email: "sebastien.bonnet@test.com",
    bio: "Alpiniste passionné et moniteur de ski hors-piste, toujours prêt à parler montagne même depuis Paris.",
    location: "Paris",
    profile: {
      first_name: "Sébastien",
      last_name: "Bonnet",
      age: 37,
      biography: "Moniteur de ski hors-piste et passionné de randonnée glaciaire, je partage ma passion pour les sommets et les grands espaces alpins. Même basé à Paris, je passe dès que possible mes week-ends et vacances à explorer la montagne.",
      country: "France",
      city: "Paris",
      interests: [5, 4],
      gender: "Homme"
    },
  },
  {
    name: "Laetitia Rousseau",
    email: "laetitia.rousseau@test.com",
    bio: "Professeure de danse et de yoga à Paris, entre mouvement, bien-être et expression du corps.",
    location: "Paris",
    profile: {
      first_name: "Laetitia",
      last_name: "Rousseau",
      age: 31,
      biography: "J'enseigne la danse orientale et le yoga à Paris, avec une approche centrée sur l'écoute du corps, la fluidité et la confiance en soi. Mes cours et ateliers mêlent énergie, ancrage et plaisir de bouger dans un cadre bienveillant.",
      country: "France",
      city: "Paris",
      interests: [13, 8],
      gender: "Femme"
    },
  },
  {
    name: "Olivier Garnier",
    email: "olivier.garnier@test.com",
    bio: "Sommelier parisien passionné de gastronomie, d'accords mets-vins et d'expériences culinaires raffinées.",
    location: "Paris",
    profile: {
      first_name: "Olivier",
      last_name: "Garnier",
      age: 48,
      biography: "Sommelier dans un restaurant étoilé à Paris, j'organise des dégustations privées, des accords mets-vins et des visites de caves pour les amateurs comme pour les curieux. J'aime raconter les terroirs, les cépages et les histoires derrière chaque bouteille.",
      country: "France",
      city: "Paris",
      interests: [2, 1],
      gender: "Homme"
    },
  },

  // --- Sud-Est (Côte d'Azur, Paca) ---
  {
    name: "Manon Pons",
    email: "manon.pons@test.com",
    bio: "Monitrice de surf à Montpellier, passionnée de sports nautiques, de soleil et de vie en plein air.",
    location: "Montpellier",
    profile: {
      first_name: "Manon",
      last_name: "Pons",
      age: 25,
      biography: "Monitrice de surf et de paddle sur la côte méditerranéenne, j'accompagne les amateurs de glisse dans une ambiance sportive et décontractée. J'aime partager l'énergie de la mer, le goût de l'effort et le plaisir d'être dehors toute l'année.",
      country: "France",
      city: "Montpellier",
      interests: [6, 18],
      gender: "Femme"
    },
  },
  {
    name: "Baptiste Dumas",
    email: "baptiste.dumas@test.com",
    bio: "Guide historique à Perpignan, passionné d'archéologie, d'histoire catalane et de patrimoine ancien.",
    location: "Perpignan",
    profile: {
      first_name: "Baptiste",
      last_name: "Dumas",
      age: 42,
      biography: "Passionné d'histoire catalane et romaine, j'organise des visites guidées autour des sites archéologiques et du patrimoine du Roussillon. J'aime faire revivre les lieux anciens à travers anecdotes, contextes historiques et passion du terrain.",
      country: "France",
      city: "Perpignan",
      interests: [16, 19],
      gender: "Homme"
    },
  },
  {
    name: "Elise Vidal",
    email: "elise.vidal@test.com",
    bio: "Coach bien-être à Nice, entre yoga, méditation, bord de mer et art de vivre apaisé sur la Côte d'Azur.",
    location: "Nice",
    profile: {
      first_name: "Elise",
      last_name: "Vidal",
      age: 35,
      biography: "Coach bien-être certifiée à Nice, je propose des séances de yoga en bord de mer, des moments de méditation et des accompagnements en sophrologie. Mon objectif est d'aider chacun à retrouver calme, énergie et équilibre dans un cadre inspirant.",
      country: "France",
      city: "Nice",
      interests: [8, 15],
      gender: "Femme"
    },
  },
  {
    name: "Franck Brun",
    email: "franck.brun@test.com",
    bio: "Réalisateur indépendant à Cannes, passionné par le cinéma, l'image et l'atmosphère unique de la Croisette.",
    location: "Cannes",
    profile: {
      first_name: "Franck",
      last_name: "Brun",
      age: 39,
      biography: "Réalisateur de courts-métrages et photographe de rue, je vis à Cannes au rythme du cinéma et de la création visuelle. Je partage ma passion pour les festivals, la narration par l'image et les coulisses de la culture cinématographique.",
      country: "France",
      city: "Cannes",
      interests: [20, 9],
      gender: "Homme"
    },
  },
  {
    name: "Sandrine Meyer",
    email: "sandrine.meyer@test.com",
    bio: "Monitrice de plongée et biologiste marine à Toulon, passionnée par les épaves et la faune méditerranéenne.",
    location: "Toulon",
    profile: {
      first_name: "Sandrine",
      last_name: "Meyer",
      age: 33,
      biography: "Monitrice PADI et biologiste marine, j'organise des plongées autour de Toulon pour explorer les épaves, observer la faune sous-marine et sensibiliser à la richesse fragile des écosystèmes marins méditerranéens.",
      country: "France",
      city: "Toulon",
      interests: [7, 18],
      gender: "Femme"
    },
  },
  {
    name: "Guillaume Morel",
    email: "guillaume.morel@test.com",
    bio: "Cycliste passionné à Montpellier, amoureux de la garrigue, des routes ensoleillées et des vignobles du Languedoc.",
    location: "Montpellier",
    profile: {
      first_name: "Guillaume",
      last_name: "Morel",
      age: 36,
      biography: "Cycliste amateur et amoureux des paysages du sud, je connais les belles routes de l'Hérault, les sentiers de garrigue et les vignobles du Languedoc. J'aime proposer des sorties mêlant effort, découverte et plaisir du plein air.",
      country: "France",
      city: "Montpellier",
      interests: [14, 15],
      gender: "Homme"
    },
  },
  {
    name: "Delphine Leclercq",
    email: "delphine.leclercq@test.com",
    bio: "Cheffe niçoise passionnée par la cuisine méditerranéenne, les marchés colorés et les recettes de tradition.",
    location: "Nice",
    profile: {
      first_name: "Delphine",
      last_name: "Leclercq",
      age: 41,
      biography: "Cheffe spécialisée dans la cuisine niçoise et méditerranéenne, je propose des cours gourmands et des visites de marchés pour découvrir produits locaux, recettes authentiques et art de vivre du Sud. La convivialité est toujours au centre de mes expériences.",
      country: "France",
      city: "Nice",
      interests: [1, 12],
      gender: "Femme"
    },
  },
  {
    name: "Rémi Gaillard",
    email: "remi.gaillard@test.com",
    bio: "Randonneur sportif à Marseille, amoureux des Calanques, des treks en plein air et des paysages provençaux.",
    location: "Marseille",
    profile: {
      first_name: "Rémi",
      last_name: "Gaillard",
      age: 28,
      biography: "Passionné de randonnée et de sport nature, j'organise des sorties dans les Calanques et les massifs provençaux pour découvrir des panoramas incroyables. J'aime les aventures dynamiques, accessibles et ancrées dans le territoire local.",
      country: "France",
      city: "Marseille",
      interests: [3, 18],
      gender: "Homme"
    },
  },
  {
    name: "Valérie Simon",
    email: "valerie.simon@test.com",
    bio: "Guide-conférencière en Provence, passionnée d'art roman, d'histoire médiévale et de patrimoine vivant.",
    location: "Avignon",
    profile: {
      first_name: "Valérie",
      last_name: "Simon",
      age: 46,
      biography: "Spécialiste du patrimoine médiéval provençal, j'accompagne les visiteurs à la découverte des grandes richesses historiques d'Avignon et de sa région. Mes visites mêlent précision historique, passion du récit et amour de l'architecture ancienne.",
      country: "France",
      city: "Avignon",
      interests: [16, 9],
      gender: "Femme"
    },
  },
  {
    name: "Arnaud Vasseur",
    email: "arnaud.vasseur@test.com",
    bio: "Moniteur de surf et de plongée à Perpignan, passionné de mer, de glisse et d'aventures aquatiques.",
    location: "Perpignan",
    profile: {
      first_name: "Arnaud",
      last_name: "Vasseur",
      age: 30,
      biography: "Double moniteur de surf et de plongée, je propose des sessions adaptées aux conditions entre Canet et Leucate. J'aime faire découvrir la diversité des activités nautiques du littoral méditerranéen, de la glisse en surface aux merveilles sous-marines.",
      country: "France",
      city: "Perpignan",
      interests: [6, 7],
      gender: "Homme"
    },
  },
  {
    name: "Nadia Benali",
    email: "nadia.benali@test.com",
    bio: "Professeure de danse à Montpellier, passionnée par le flamenco, la danse orientale et les cultures du monde.",
    location: "Montpellier",
    profile: {
      first_name: "Nadia",
      last_name: "Benali",
      age: 34,
      biography: "Professeure de danse d'origine andalouse, je transmets à Montpellier l'énergie du flamenco et la grâce de la danse orientale. Mes cours et soirées culturelles sont pensés comme des moments de partage, d'expression et de découverte.",
      country: "France",
      city: "Montpellier",
      interests: [13, 10],
      gender: "Femme"
    },
  },
  {
    name: "Émilie Payet",
    email: "emilie.payet@test.com",
    bio: "Photographe nature à Nice, passionnée par la faune sauvage, la lumière et les paysages des Alpes-Maritimes.",
    location: "Nice",
    profile: {
      first_name: "Émilie",
      last_name: "Payet",
      age: 29,
      biography: "Photographe animalière et de paysage, je propose des stages dans les Alpes-Maritimes pour apprendre à capter la lumière, observer la faune et créer des images inspirées par la nature. Mon travail mêle patience, émotion et regard attentif.",
      country: "France",
      city: "Nice",
      interests: [11, 15],
      gender: "Femme"
    },
  },
  {
    name: "Mathieu Fleury",
    email: "mathieu.fleury@test.com",
    bio: "Sommelier à Aix-en-Provence, passionné par les vins de Provence, les dégustations privées et les domaines d'exception.",
    location: "Aix-en-Provence",
    profile: {
      first_name: "Mathieu",
      last_name: "Fleury",
      age: 40,
      biography: "Sommelier et caviste passionné, je fais découvrir les vins de Provence à travers des dégustations privées, des visites de domaines et des échanges sur les cépages, les terroirs et les accords. Mon approche est à la fois accessible, précise et conviviale.",
      country: "France",
      city: "Aix-en-Provence",
      interests: [2, 1],
      gender: "Homme"
    },
  },

  // --- Côte Atlantique ---
  {
    name: "Gaël Clément",
    email: "gael.clement@test.com",
    bio: "Surfeur et plongeur à La Rochelle, passionné par l'Atlantique, les épaves et les sports nautiques.",
    location: "La Rochelle",
    profile: {
      first_name: "Gaël",
      last_name: "Clément",
      age: 27,
      biography: "Amoureux de la côte Atlantique, je partage ma passion pour le surf, la plongée et l'exploration des fonds marins de Charente-Maritime. Entre vagues, récifs et ambiance océane, j'aime faire découvrir un littoral vivant et inspirant.",
      country: "France",
      city: "La Rochelle",
      interests: [6, 7],
      gender: "Homme"
    },
  },
  {
    name: "Pascale Guichard",
    email: "pascale.guichard@test.com",
    bio: "Randonneuse en Bretagne, passionnée par le littoral, les sentiers côtiers et les paysages sauvages du Finistère.",
    location: "Brest",
    profile: {
      first_name: "Pascale",
      last_name: "Guichard",
      age: 43,
      biography: "Passionnée de randonnée sur le GR34, je fais découvrir les plus belles portions du littoral breton entre falaises, criques et phares. Mes balades privilégient le rythme, l'observation et le plaisir simple des grands paysages marins.",
      country: "France",
      city: "Brest",
      interests: [3, 15],
      gender: "Femme"
    },
  },
  {
    name: "Ludovic Marin",
    email: "ludovic.marin@test.com",
    bio: "Skipper à Saint-Malo, passionné de navigation, d'histoire maritime et des récits de corsaires.",
    location: "Saint-Malo",
    profile: {
      first_name: "Ludovic",
      last_name: "Marin",
      age: 50,
      biography: "Skipper et passionné d'histoire maritime, je propose des navigations à voile ainsi que des récits autour du patrimoine corsaire de Saint-Malo. J'aime transmettre la mémoire des grands voyages, de la mer et des légendes du littoral.",
      country: "France",
      city: "Saint-Malo",
      interests: [18, 16],
      gender: "Homme"
    },
  },
  {
    name: "Elise Pichon",
    email: "elise.pichon@test.com",
    bio: "Professeure de yoga à La Rochelle, passionnée par les séances en plein air et l'énergie apaisante de l'océan.",
    location: "La Rochelle",
    profile: {
      first_name: "Elise",
      last_name: "Pichon",
      age: 32,
      biography: "Professeure de yoga en bord de mer, j'organise des séances au lever du soleil sur les plages charentaises. Mon approche met l'accent sur la respiration, l'ancrage et le lien profond entre mouvement, nature et bien-être.",
      country: "France",
      city: "La Rochelle",
      interests: [8, 15],
      gender: "Femme"
    },
  },
  {
    name: "Damien Courbet",
    email: "damien.courbet@test.com",
    bio: "Photographe breton passionné de paysages marins, d'aubes lumineuses et de falaises sauvages.",
    location: "Brest",
    profile: {
      first_name: "Damien",
      last_name: "Courbet",
      age: 38,
      biography: "Photographe spécialisé dans les paysages côtiers bretons, j'organise des stages au lever du jour pour apprendre à capturer la lumière, les textures marines et les grands horizons du Finistère. Mon univers est contemplatif et profondément lié à l'océan.",
      country: "France",
      city: "Brest",
      interests: [11, 15],
      gender: "Homme"
    },
  },
  {
    name: "Sylvie Lebrun",
    email: "sylvie.lebrun@test.com",
    bio: "Cuisinière à Rennes, passionnée de terroir breton, de potager et de recettes généreuses.",
    location: "Rennes",
    profile: {
      first_name: "Sylvie",
      last_name: "Lebrun",
      age: 47,
      biography: "Cuisinière passionnée de gastronomie bretonne, je cultive aussi un grand potager qui nourrit ma cuisine du quotidien. J'anime des ateliers autour des produits locaux, des recettes de terroir et de la convivialité qui accompagne toujours un bon repas.",
      country: "France",
      city: "Rennes",
      interests: [12, 17],
      gender: "Femme"
    },
  },
  {
    name: "Xavier Poulin",
    email: "xavier.poulin@test.com",
    bio: "Amoureux des vins de Loire à Angers, passionné de dégustation, de caves et de patrimoine viticole.",
    location: "Angers",
    profile: {
      first_name: "Xavier",
      last_name: "Poulin",
      age: 52,
      biography: "Passionné par les vignobles du Val de Loire, j'organise des visites de caves et des dégustations mettant à l'honneur les vins d'Anjou, de Loire et des environs. J'aime faire découvrir les terroirs, les producteurs et les saveurs locales avec simplicité.",
      country: "France",
      city: "Angers",
      interests: [2, 1],
      gender: "Homme"
    },
  },
  {
    name: "Brigitte Fouchet",
    email: "brigitte.fouchet@test.com",
    bio: "Historienne bretonne passionnée par les mégalithes, les châteaux et la mémoire culturelle de la région.",
    location: "Rennes",
    profile: {
      first_name: "Brigitte",
      last_name: "Fouchet",
      age: 55,
      biography: "Historienne spécialisée dans l'histoire de Bretagne, je fais découvrir les sites mégalithiques, les châteaux et les grandes étapes culturelles de la région. Mes visites cherchent à transmettre autant des connaissances que l'émotion des lieux.",
      country: "France",
      city: "Rennes",
      interests: [16, 19],
      gender: "Femme"
    },
  },

  // --- Alpes ---
  {
    name: "Stéphane Lacroix",
    email: "stephane.lacroix@test.com",
    bio: "Guide de haute montagne à Grenoble, passionné d'ascensions, de grands espaces et d'aventure alpine.",
    location: "Grenoble",
    profile: {
      first_name: "Stéphane",
      last_name: "Lacroix",
      age: 40,
      biography: "Guide de haute montagne certifié, je propose des ascensions, des sorties d'initiation et des découvertes des massifs autour de Grenoble. Le Vercors, la Chartreuse ou Belledonne sont pour moi des terrains de jeu exceptionnels à partager.",
      country: "France",
      city: "Grenoble",
      interests: [5, 4],
      gender: "Homme"
    },
  },
  {
    name: "Anaïs Renaud",
    email: "anais.renaud@test.com",
    bio: "Randonneuse et naturaliste à Annecy, passionnée de botanique alpine et de sorties en pleine nature.",
    location: "Annecy",
    profile: {
      first_name: "Anaïs",
      last_name: "Renaud",
      age: 28,
      biography: "Passionnée de randonnée et de flore alpine, j'organise des sorties nature autour d'Annecy pour observer, apprendre et profiter de la montagne autrement. J'aime transmettre une approche sensible et curieuse du monde vivant.",
      country: "France",
      city: "Annecy",
      interests: [3, 15],
      gender: "Femme"
    },
  },
  {
    name: "Bruno Perrier",
    email: "bruno.perrier@test.com",
    bio: "Moniteur de ski en Savoie, passionné de glisse, de freeride et d'aventures hivernales en montagne.",
    location: "Chambéry",
    profile: {
      first_name: "Bruno",
      last_name: "Perrier",
      age: 35,
      biography: "Moniteur ESF passionné de ski, snowboard et raquettes, je guide petits et grands dans les stations savoyardes et les espaces plus sauvages. J'aime transmettre la confiance, le plaisir de glisser et le respect du milieu montagnard.",
      country: "France",
      city: "Chambéry",
      interests: [5, 4],
      gender: "Homme"
    },
  },
  {
    name: "Elodie Giraud",
    email: "elodie.giraud@test.com",
    bio: "Cycliste et coach sportive à Grenoble, passionnée de cols alpins, d'endurance et de performance.",
    location: "Grenoble",
    profile: {
      first_name: "Elodie",
      last_name: "Giraud",
      age: 31,
      biography: "Cycliste licenciée et coach sportive, j'organise des sorties dans les cols mythiques des Alpes pour tous ceux qui aiment l'effort, le dépassement de soi et les paysages spectaculaires. J'accompagne aussi les débutants motivés à progresser.",
      country: "France",
      city: "Grenoble",
      interests: [14, 18],
      gender: "Femme"
    },
  },
  {
    name: "Mathilde Vigneron",
    email: "mathilde.vigneron@test.com",
    bio: "Photographe paysagiste à Annecy, passionnée par les montagnes, les lacs et les lumières du matin.",
    location: "Annecy",
    profile: {
      first_name: "Mathilde",
      last_name: "Vigneron",
      age: 26,
      biography: "Photographe spécialisée dans les paysages alpins, j'aime capturer les premiers instants du jour autour du lac d'Annecy et des sommets environnants. Mes sorties photo invitent à ralentir, observer et composer avec la lumière naturelle.",
      country: "France",
      city: "Annecy",
      interests: [11, 15],
      gender: "Femme"
    },
  },
  {
    name: "Romain Forestier",
    email: "romain.forestier@test.com",
    bio: "Alpiniste et guide de trek à Chambéry, passionné de Vanoise, d'ascensions et de nature brute.",
    location: "Chambéry",
    profile: {
      first_name: "Romain",
      last_name: "Forestier",
      age: 38,
      biography: "Alpiniste passionné et accompagnateur de randonnée, j'organise des treks et des ascensions accessibles en Vanoise et dans les massifs voisins. J'aime partager l'esprit de la montagne, l'entraide et le goût de l'aventure en pleine nature.",
      country: "France",
      city: "Chambéry",
      interests: [4, 3],
      gender: "Homme"
    },
  },
  {
    name: "Patricia Collet",
    email: "patricia.collet@test.com",
    bio: "Passionnée de cuisine alpine et de jardinage, entre herbes aromatiques, terroir et saveurs de montagne.",
    location: "Valence",
    profile: {
      first_name: "Patricia",
      last_name: "Collet",
      age: 49,
      biography: "Je cultive des herbes aromatiques et je partage ma passion pour la cuisine alpine à travers des cours chaleureux et gourmands. Mon univers mêle jardin, recettes régionales et plaisir de cuisiner avec des produits simples et authentiques.",
      country: "France",
      city: "Valence",
      interests: [1, 17],
      gender: "Femme"
    },
  },
  {
    name: "Jérémy Barbier",
    email: "jeremy.barbier@test.com",
    bio: "Skieur freeride à Grenoble, passionné de hors-piste, d'adrénaline et de sécurité en montagne.",
    location: "Grenoble",
    profile: {
      first_name: "Jérémy",
      last_name: "Barbier",
      age: 29,
      biography: "Skieur hors-piste passionné par les pentes de Belledonne et les itinéraires engagés, je propose des sorties encadrées en mettant toujours la sécurité au cœur de l'expérience. L'idée est de vivre la montagne intensément, mais intelligemment.",
      country: "France",
      city: "Grenoble",
      interests: [5, 3],
      gender: "Homme"
    },
  },
  {
    name: "Lucie Moulin",
    email: "lucie.moulin@test.com",
    bio: "Professeure de yoga à Annecy, entre méditation, montagne et retraites bien-être au bord du lac.",
    location: "Annecy",
    profile: {
      first_name: "Lucie",
      last_name: "Moulin",
      age: 33,
      biography: "Professeure de yoga et de méditation, j'organise des retraites bien-être dans les Alpes autour du mouvement, du calme intérieur et de la reconnexion à la nature. Le cadre d'Annecy est pour moi une source d'équilibre et d'inspiration.",
      country: "France",
      city: "Annecy",
      interests: [8, 15],
      gender: "Femme"
    },
  },
  {
    name: "Frédéric Gimenez",
    email: "frederic.gimenez@test.com",
    bio: "Randonneur et photographe à Grenoble, passionné de faune sauvage et de paysages du Vercors.",
    location: "Grenoble",
    profile: {
      first_name: "Frédéric",
      last_name: "Gimenez",
      age: 44,
      biography: "Randonneur expérimenté et photographe de nature, je parcours le Vercors et la Chartreuse pour observer la faune, saisir les lumières changeantes et partager la beauté discrète des paysages alpins avec d'autres passionnés.",
      country: "France",
      city: "Grenoble",
      interests: [3, 11],
      gender: "Homme"
    },
  },

  // --- Nord-Est (Alsace, Lorraine) ---
  {
    name: "Clément Didier",
    email: "clement.didier@test.com",
    bio: "Historien médiéviste à Nancy, passionné par la Lorraine, le patrimoine ancien et les récits du passé.",
    location: "Nancy",
    profile: {
      first_name: "Clément",
      last_name: "Didier",
      age: 37,
      biography: "Historien spécialisé dans le duché de Lorraine, je propose des visites guidées pour explorer Nancy, son héritage baroque et ses trésors médiévaux. J'aime donner vie à l'histoire en racontant les lieux, les époques et les personnages qui les ont façonnés.",
      country: "France",
      city: "Nancy",
      interests: [16, 19],
      gender: "Homme"
    },
  },
  {
    name: "Aurore Schmitt",
    email: "aurore.schmitt@test.com",
    bio: "Passionnée de cuisine alsacienne à Strasbourg, entre traditions gourmandes, recettes familiales et convivialité.",
    location: "Strasbourg",
    profile: {
      first_name: "Aurore",
      last_name: "Schmitt",
      age: 34,
      biography: "Je partage avec enthousiasme la gastronomie alsacienne à travers des cours de cuisine traditionnelle et des moments de découverte autour des spécialités régionales. Choucroute, baeckeoffe, bredele et autres recettes prennent vie dans une ambiance chaleureuse.",
      country: "France",
      city: "Strasbourg",
      interests: [12, 1],
      gender: "Femme"
    },
  },
  {
    name: "Philippe Picard",
    email: "philippe.picard@test.com",
    bio: "Artiste plasticien à Metz, passionné de photographie artistique, de peinture et de création contemporaine.",
    location: "Metz",
    profile: {
      first_name: "Philippe",
      last_name: "Picard",
      age: 51,
      biography: "Artiste plasticien et photographe, j'explore les liens entre matière, lumière et émotion à travers mes ateliers. Mon univers mêle peinture à l'huile, expérimentation visuelle et échanges autour de l'art moderne et contemporain.",
      country: "France",
      city: "Metz",
      interests: [9, 11],
      gender: "Homme"
    },
  },
  {
    name: "Hélène Muller",
    email: "helene.muller@test.com",
    bio: "Musicienne et danseuse à Strasbourg, passionnée par les traditions alsaciennes et les soirées festives.",
    location: "Strasbourg",
    profile: {
      first_name: "Hélène",
      last_name: "Muller",
      age: 43,
      biography: "Violoniste et danseuse folklorique, je fais vivre les traditions musicales alsaciennes à travers des ateliers, des soirées et des événements culturels. J'aime transmettre l'énergie de la musique vivante et la richesse du patrimoine régional.",
      country: "France",
      city: "Strasbourg",
      interests: [10, 13],
      gender: "Femme"
    },
  },
  {
    name: "David Wagner",
    email: "david.wagner@test.com",
    bio: "Randonneur lorrain passionné par les Vosges, les forêts, les lacs et les grands bols d'air.",
    location: "Nancy",
    profile: {
      first_name: "David",
      last_name: "Wagner",
      age: 39,
      biography: "Passionné de randonnée dans les Vosges, je connais les plus beaux itinéraires entre lacs, chaumes et forêts profondes. J'aime proposer des sorties nature où l'on prend le temps de marcher, respirer et profiter pleinement des paysages.",
      country: "France",
      city: "Nancy",
      interests: [3, 15],
      gender: "Homme"
    },
  },
  {
    name: "Julie Adam",
    email: "julie.adam@test.com",
    bio: "Étudiante en lettres à Metz, passionnée de cinéma d'auteur, de lecture et de débats culturels.",
    location: "Metz",
    profile: {
      first_name: "Julie",
      last_name: "Adam",
      age: 26,
      biography: "Passionnée de littérature et de cinéma d'auteur, j'anime un ciné-club et j'organise des soirées lectures à Metz. J'aime créer des moments de discussion autour des œuvres, des sensibilités artistiques et des idées qu'elles font naître.",
      country: "France",
      city: "Metz",
      interests: [20, 19],
      gender: "Femme"
    },
  },
  {
    name: "Bernard Colin",
    email: "bernard.colin@test.com",
    bio: "Amateur éclairé de vins alsaciens à Strasbourg, passionné de cépages, de caves et de gastronomie locale.",
    location: "Strasbourg",
    profile: {
      first_name: "Bernard",
      last_name: "Colin",
      age: 58,
      biography: "Grand passionné des vins d'Alsace, je partage volontiers mes connaissances sur les cépages, les domaines et les accords gastronomiques de la région. J'aime les dégustations conviviales où le plaisir du goût rencontre la richesse du terroir.",
      country: "France",
      city: "Strasbourg",
      interests: [2, 1],
      gender: "Homme"
    },
  },
  {
    name: "Solène Michel",
    email: "solene.michel@test.com",
    bio: "Coach sportive et professeure de yoga à Nancy, passionnée par le mouvement et le bien-être global.",
    location: "Nancy",
    profile: {
      first_name: "Solène",
      last_name: "Michel",
      age: 30,
      biography: "Coach sportive certifiée et enseignante de yoga, j'accompagne celles et ceux qui souhaitent retrouver énergie, confiance et équilibre. Mes séances à Nancy mêlent renforcement, respiration et écoute du corps dans une approche bienveillante.",
      country: "France",
      city: "Nancy",
      interests: [8, 18],
      gender: "Femme"
    },
  },
  {
    name: "Marine Burger",
    email: "marine.burger@test.com",
    bio: "Photographe nature en Alsace, passionnée par les oiseaux, les paysages rhénans et les balades photo.",
    location: "Strasbourg",
    profile: {
      first_name: "Marine",
      last_name: "Burger",
      age: 28,
      biography: "Photographe amateur passionnée par la nature alsacienne, je propose des balades photo dans le Ried et les Vosges pour observer la cigogne blanche, les lumières des plaines rhénanes et la poésie des paysages locaux.",
      country: "France",
      city: "Strasbourg",
      interests: [11, 15],
      gender: "Femme"
    },
  },

  // --- Sud-Ouest ---
  {
    name: "Paulo Santos",
    email: "paulo.santos@test.com",
    bio: "Surfeur compétiteur au Pays Basque, passionné de glisse, d'océan et d'entraînement toute l'année.",
    location: "Bayonne",
    profile: {
      first_name: "Paulo",
      last_name: "Santos",
      age: 24,
      biography: "Surfeur professionnel engagé sur le circuit européen, je propose des cours de surf entre Biarritz et Hossegor pour tous les niveaux. J'aime transmettre à la fois la technique, la lecture des vagues et l'esprit libre propre à la côte basque.",
      country: "France",
      city: "Bayonne",
      interests: [6, 18],
      gender: "Homme"
    },
  },
  {
    name: "Claire Dupuy",
    email: "claire.dupuy@test.com",
    bio: "Guide de randonnée à Pau, passionnée par les Pyrénées, les cols, les refuges et les grands panoramas.",
    location: "Pau",
    profile: {
      first_name: "Claire",
      last_name: "Dupuy",
      age: 36,
      biography: "Guide de randonnée dans les Pyrénées béarnaises, je fais découvrir les cols, vallées, lacs d'altitude et refuges emblématiques de la région. J'aime proposer des aventures accessibles et sincères, ancrées dans la beauté du terrain.",
      country: "France",
      city: "Pau",
      interests: [3, 4],
      gender: "Femme"
    },
  },
  {
    name: "Étienne Barthe",
    email: "etienne.barthe@test.com",
    bio: "Trompettiste de jazz à Bayonne, passionné de musique live et de cinéma espagnol et basque.",
    location: "Bayonne",
    profile: {
      first_name: "Étienne",
      last_name: "Barthe",
      age: 33,
      biography: "Musicien de jazz et amateur de cinéma, je partage mon temps entre concerts, festivals et projections inspirantes. J'aime la richesse culturelle du Pays Basque et les moments où musique, image et convivialité se rencontrent.",
      country: "France",
      city: "Bayonne",
      interests: [10, 20],
      gender: "Homme"
    },
  },
  {
    name: "Virginie Danjou",
    email: "virginie.danjou@test.com",
    bio: "Cheffe toulousaine passionnée par la gastronomie du Sud-Ouest, les recettes de terroir et les produits d'exception.",
    location: "Toulouse",
    profile: {
      first_name: "Virginie",
      last_name: "Danjou",
      age: 44,
      biography: "Cheffe spécialisée dans la cuisine gasconne et occitane, je propose des ateliers gourmands autour des spécialités régionales, des marchés locaux et des accords savoureux. Mon approche met à l'honneur la générosité et l'identité culinaire du Sud-Ouest.",
      country: "France",
      city: "Toulouse",
      interests: [1, 12],
      gender: "Femme"
    },
  },
  {
    name: "Laurent Capelle",
    email: "laurent.capelle@test.com",
    bio: "Guide de montagne à Pau, passionné par le ski pyrénéen, les lacs d'altitude et les grands espaces.",
    location: "Pau",
    profile: {
      first_name: "Laurent",
      last_name: "Capelle",
      age: 41,
      biography: "Guide de montagne passionné par les Pyrénées, j'accompagne les amateurs de ski, de randonnée et d'altitude à travers des paysages puissants et variés. Mon objectif est de faire vivre une expérience à la fois sportive, sûre et mémorable.",
      country: "France",
      city: "Pau",
      interests: [5, 4],
      gender: "Homme"
    },
  },
  {
    name: "Renaud Dubois",
    email: "renaud.dubois@test.com",
    bio: "Passionné de surf et de plongée à Bayonne, amoureux de la côte basque et des sensations marines.",
    location: "Bayonne",
    profile: {
      first_name: "Renaud",
      last_name: "Dubois",
      age: 29,
      biography: "Je partage ma passion pour le surf et la plongée entre la côte basque et les Landes, avec des initiations et des sorties toute l'année. J'aime montrer la diversité des plaisirs de l'océan, entre glisse, respiration et exploration.",
      country: "France",
      city: "Bayonne",
      interests: [6, 7],
      gender: "Homme"
    },
  },
  {
    name: "Agnès Favier",
    email: "agnes.favier@test.com",
    bio: "Professeure de danse et yoga à Toulouse, passionnée par le tango, le yin yoga et les expériences sensibles.",
    location: "Toulouse",
    profile: {
      first_name: "Agnès",
      last_name: "Favier",
      age: 38,
      biography: "J'enseigne le tango argentin et le yoga yin avec une attention particulière à la présence, au lien et à l'expression du corps. Entre milongas, ateliers et retraites, j'aime créer des espaces où l'on se reconnecte à soi et aux autres.",
      country: "France",
      city: "Toulouse",
      interests: [13, 8],
      gender: "Femme"
    },
  },
  {
    name: "Nicolas Bonhomme",
    email: "nicolas.bonhomme@test.com",
    bio: "Vigneron à Périgueux, passionné par Bergerac, Monbazillac et les saveurs emblématiques du Périgord.",
    location: "Périgueux",
    profile: {
      first_name: "Nicolas",
      last_name: "Bonhomme",
      age: 53,
      biography: "Producteur passionné, je fais découvrir les vins de Bergerac et de Monbazillac à travers des visites de domaine et des dégustations gourmandes accompagnées de spécialités du Périgord. Mon univers mêle terroir, transmission et authenticité.",
      country: "France",
      city: "Périgueux",
      interests: [2, 1],
      gender: "Homme"
    },
  },
  {
    name: "Corinne Fabre",
    email: "corinne.fabre@test.com",
    bio: "Historienne en Occitanie, passionnée par le Moyen Âge, les cathares et les grands sites du Sud-Ouest.",
    location: "Toulouse",
    profile: {
      first_name: "Corinne",
      last_name: "Fabre",
      age: 49,
      biography: "Spécialiste de l'histoire cathare et médiévale, je propose des visites et parcours culturels autour de Carcassonne, Minerve et des châteaux cathares. J'aime faire ressentir la puissance historique et symbolique de ces lieux uniques.",
      country: "France",
      city: "Toulouse",
      interests: [16, 19],
      gender: "Femme"
    },
  },

  // --- Centre et autres villes françaises ---
  {
    name: "Daniel Perrot",
    email: "daniel.perrot@test.com",
    bio: "Randonneur en Auvergne, passionné par les volcans, les grands espaces et les treks du Massif Central.",
    location: "Clermont-Ferrand",
    profile: {
      first_name: "Daniel",
      last_name: "Perrot",
      age: 45,
      biography: "Passionné des volcans d'Auvergne, je propose des randonnées sur les puys et dans les vallées du Massif Central. Mes sorties allient découverte géologique, amour de la nature et plaisir simple de marcher dans des paysages puissants.",
      country: "France",
      city: "Clermont-Ferrand",
      interests: [3, 15],
      gender: "Homme"
    },
  },
  {
    name: "François Lacoste",
    email: "francois.lacoste@test.com",
    bio: "Caviste à Dijon, passionné par les vins de Bourgogne, les grands crus et l'art de la dégustation.",
    location: "Dijon",
    profile: {
      first_name: "François",
      last_name: "Lacoste",
      age: 48,
      biography: "Caviste expert et amoureux de la Bourgogne viticole, j'organise des dégustations et des parcours sur la Route des Grands Crus. J'aime transmettre les subtilités des appellations, des terroirs et des accords gastronomiques bourguignons.",
      country: "France",
      city: "Dijon",
      interests: [2, 1],
      gender: "Homme"
    },
  },
  {
    name: "Aurélia Morin",
    email: "aurelia.morin@test.com",
    bio: "Coach sportive à Clermont-Ferrand, passionnée par le running, le triathlon et les paysages d'Auvergne.",
    location: "Clermont-Ferrand",
    profile: {
      first_name: "Aurélia",
      last_name: "Morin",
      age: 32,
      biography: "Coach sportive et triathlète, j'accompagne les personnes qui veulent progresser en course, en endurance ou simplement retrouver une dynamique active. Les volcans d'Auvergne offrent un terrain idéal pour allier entraînement et inspiration.",
      country: "France",
      city: "Clermont-Ferrand",
      interests: [8, 18],
      gender: "Femme"
    },
  },
  {
    name: "Patrice Duval",
    email: "patrice.duval@test.com",
    bio: "Historien à Bourges, passionné par la Résistance, la mémoire collective et les visites à forte dimension humaine.",
    location: "Bourges",
    profile: {
      first_name: "Patrice",
      last_name: "Duval",
      age: 60,
      biography: "Historien spécialisé dans la Seconde Guerre mondiale et la Résistance, je propose des conférences et des visites mémorielles dans le Cher. Mon travail vise à transmettre les faits, les parcours humains et l'importance du devoir de mémoire.",
      country: "France",
      city: "Bourges",
      interests: [16, 19],
      gender: "Homme"
    },
  },
  {
    name: "Dorothée Favier",
    email: "dorothee.favier@test.com",
    bio: "Artiste photographe à Dijon, passionnée par l'aquarelle, la création et les paysages bourguignons.",
    location: "Dijon",
    profile: {
      first_name: "Dorothée",
      last_name: "Favier",
      age: 37,
      biography: "Photographe et peintre aquarelliste, j'organise des ateliers créatifs dans les vignes et les abbayes de Bourgogne. J'aime mêler contemplation, expression artistique et inspiration patrimoniale dans des cadres apaisants.",
      country: "France",
      city: "Dijon",
      interests: [9, 11],
      gender: "Femme"
    },
  },
  {
    name: "Mickaël Masson",
    email: "mickael.masson@test.com",
    bio: "Cycliste et coach à Lyon, passionné de performance, de sorties de groupe et de routes du Beaujolais.",
    location: "Lyon",
    profile: {
      first_name: "Mickaël",
      last_name: "Masson",
      age: 34,
      biography: "Cycliste compétiteur et coach sportif, j'organise des sorties dans le Beaujolais et les Monts du Lyonnais pour tous les niveaux. Mon approche combine rigueur, motivation et plaisir de pédaler ensemble dans de beaux paysages.",
      country: "France",
      city: "Lyon",
      interests: [14, 18],
      gender: "Homme"
    },
  },
  {
    name: "Yannick Noël",
    email: "yannick.noel@test.com",
    bio: "Passionné de ski nordique et de randonnée en Auvergne, amoureux des reliefs et des saisons de montagne.",
    location: "Clermont-Ferrand",
    profile: {
      first_name: "Yannick",
      last_name: "Noël",
      age: 35,
      biography: "Je pratique le ski de fond, les raquettes et la randonnée toute l'année autour du Mont-Dore et du Super-Besse. J'aime faire découvrir une Auvergne sportive, naturelle et accessible, loin des itinéraires les plus fréquentés.",
      country: "France",
      city: "Clermont-Ferrand",
      interests: [5, 3],
      gender: "Homme"
    },
  },
  {
    name: "Marianne Tissot",
    email: "marianne.tissot@test.com",
    bio: "Paysagiste à Dijon, passionnée de jardins bourguignons, de plantes aromatiques et de nature cultivée.",
    location: "Dijon",
    profile: {
      first_name: "Marianne",
      last_name: "Tissot",
      age: 50,
      biography: "Paysagiste passionnée, je partage mon amour des jardins bourguignons, des plantes aromatiques et des espaces vivants. J'aime transmettre des savoir-faire simples et poétiques autour du végétal, du soin du sol et de la beauté des jardins.",
      country: "France",
      city: "Dijon",
      interests: [17, 15],
      gender: "Femme"
    },
  },

  // --- Normandie et Nord ---
  {
    name: "Denis Chevallier",
    email: "denis.chevallier@test.com",
    bio: "Historien à Caen, passionné par le Débarquement, la mémoire de guerre et les lieux emblématiques de Normandie.",
    location: "Caen",
    profile: {
      first_name: "Denis",
      last_name: "Chevallier",
      age: 54,
      biography: "Historien spécialisé dans le Débarquement de Normandie, je propose des visites documentées et sensibles des plages, musées et mémoriaux. J'accorde une grande importance à la transmission des faits autant qu'au respect de la mémoire humaine.",
      country: "France",
      city: "Caen",
      interests: [16, 11],
      gender: "Homme"
    },
  },
  {
    name: "Aline Chartier",
    email: "aline.chartier@test.com",
    bio: "Productrice de cidre et cuisinière à Caen, passionnée par les vergers, les recettes normandes et le terroir.",
    location: "Caen",
    profile: {
      first_name: "Aline",
      last_name: "Chartier",
      age: 42,
      biography: "Je produis du cidre normand et j'organise des ateliers de cuisine autour des recettes emblématiques de la région. Entre verger, produits fermiers et traditions locales, je partage une Normandie gourmande et profondément authentique.",
      country: "France",
      city: "Caen",
      interests: [1, 12],
      gender: "Femme"
    },
  },
  {
    name: "Pascal Bourgeois",
    email: "pascal.bourgeois@test.com",
    bio: "Cyclotouriste à Rouen, passionné par les routes normandes, les vallées et les balades sportives.",
    location: "Rouen",
    profile: {
      first_name: "Pascal",
      last_name: "Bourgeois",
      age: 46,
      biography: "Cyclotouriste passionné, j'organise des sorties sur les routes de Normandie entre Seine, plateaux et campagne. J'aime faire découvrir des parcours variés qui mêlent patrimoine, nature et plaisir d'avancer au rythme du vélo.",
      country: "France",
      city: "Rouen",
      interests: [14, 15],
      gender: "Homme"
    },
  },
  {
    name: "Monique Charpentier",
    email: "monique.charpentier@test.com",
    bio: "Céramiste à Limoges, passionnée par la matière, le geste artisanal et le jardinage naturel.",
    location: "Limoges",
    profile: {
      first_name: "Monique",
      last_name: "Charpentier",
      age: 55,
      biography: "Artiste céramiste inspirée par les terres de Limoges, je propose des ateliers de poterie et de création manuelle. Mon univers s'étend aussi au jardinage naturel, dans une recherche de lien entre matière, patience et beauté du vivant.",
      country: "France",
      city: "Limoges",
      interests: [9, 17],
      gender: "Femme"
    },
  },
  {
    name: "Thibaud Remy",
    email: "thibaud.remy@test.com",
    bio: "Cycliste à Orléans, passionné par la Loire à vélo, les sorties sportives et les paysages ligériens.",
    location: "Orléans",
    profile: {
      first_name: "Thibaud",
      last_name: "Remy",
      age: 31,
      biography: "Passionné de cyclisme et des itinéraires qui longent la Loire, j'organise des sorties entre fleuve, forêt et villages de caractère. J'aime proposer des parcours accessibles qui combinent effort, découverte et plaisir du voyage à vélo.",
      country: "France",
      city: "Orléans",
      interests: [14, 18],
      gender: "Homme"
    },
  },
  {
    name: "Caroline Gros",
    email: "caroline.gros@test.com",
    bio: "Libraire et cinéphile au Mans, passionnée de lecture, de cinéma et de conversations culturelles.",
    location: "Le Mans",
    profile: {
      first_name: "Caroline",
      last_name: "Gros",
      age: 39,
      biography: "Libraire indépendante et amoureuse du cinéma, j'anime des clubs de lecture et des ciné-clubs pour faire dialoguer textes, images et idées. J'aime créer des espaces chaleureux où la culture devient une expérience vivante et partagée.",
      country: "France",
      city: "Le Mans",
      interests: [20, 19],
      gender: "Femme"
    },
  },
  {
    name: "Alexis Marques",
    email: "alexis.marques@test.com",
    bio: "Guide du patrimoine à Poitiers, passionné par l'art roman, les cryptes et l'histoire religieuse.",
    location: "Poitiers",
    profile: {
      first_name: "Alexis",
      last_name: "Marques",
      age: 40,
      biography: "Spécialiste de l'art roman poitevin, je propose des visites approfondies des baptistères, cryptes et abbayes de la région. J'aime transmettre l'élégance discrète de ce patrimoine et les histoires spirituelles et architecturales qui l'accompagnent.",
      country: "France",
      city: "Poitiers",
      interests: [16, 19],
      gender: "Homme"
    },
  },
  {
    name: "Valérie Fontaine",
    email: "valerie.fontaine@test.com",
    bio: "Vigneronne en Languedoc, passionnée de vins naturels, de terroir et de rencontres autour du domaine.",
    location: "Béziers",
    profile: {
      first_name: "Valérie",
      last_name: "Fontaine",
      age: 47,
      biography: "Vigneronne indépendante dans l'appellation Saint-Chinian, je propose des visites du domaine et des dégustations autour de vins naturels, vivants et expressifs. J'aime faire découvrir le travail de la vigne au verre avec simplicité et passion.",
      country: "France",
      city: "Béziers",
      interests: [2, 1],
      gender: "Femme"
    },
  },
  {
    name: "Henri Lambert",
    email: "henri.lambert@test.com",
    bio: "Peintre à Perpignan, passionné d'art catalan, de patrimoine sacré et de musées régionaux.",
    location: "Perpignan",
    profile: {
      first_name: "Henri",
      last_name: "Lambert",
      age: 62,
      biography: "Peintre et passionné d'art catalan, je fais découvrir les retables baroques, les musées régionaux et les grandes influences artistiques du territoire. Mon regard mêle pratique artistique personnelle et profonde connaissance du patrimoine local.",
      country: "France",
      city: "Perpignan",
      interests: [9, 16],
      gender: "Homme"
    },
  },
  {
    name: "Sabrina Bouchard",
    email: "sabrina.bouchard@test.com",
    bio: "Professeure de danse et yoga à Bordeaux, passionnée par l'énergie du mouvement et le bien-être.",
    location: "Bordeaux",
    profile: {
      first_name: "Sabrina",
      last_name: "Bouchard",
      age: 29,
      biography: "J'enseigne la danse afro et le yoga vinyasa à Bordeaux dans une approche énergique, fluide et inclusive. Mes cours hebdomadaires et stages intensifs invitent à se reconnecter à soi, à son corps et au plaisir de bouger librement.",
      country: "France",
      city: "Bordeaux",
      interests: [13, 8],
      gender: "Femme"
    },
  },
  {
    name: "Maxime Pereira",
    email: "maxime.pereira@test.com",
    bio: "Triathlète et surfeur à Bordeaux, passionné par l'entraînement, l'océan et les défis sportifs complets.",
    location: "Bordeaux",
    profile: {
      first_name: "Maxime",
      last_name: "Pereira",
      age: 26,
      biography: "Compétiteur en triathlon et passionné de surf, je m'entraîne entre Bordeaux, Lacanau et la côte landaise. J'aime le mélange entre endurance, technique, dépassement de soi et liberté que procurent le sport et l'océan.",
      country: "France",
      city: "Bordeaux",
      interests: [6, 18],
      gender: "Homme"
    },
  },
  {
    name: "Ophélie Arnaud",
    email: "ophelie.arnaud@test.com",
    bio: "Musicienne et danseuse à Rennes, passionnée de culture bretonne, de fest-noz et de musique celtique.",
    location: "Rennes",
    profile: {
      first_name: "Ophélie",
      last_name: "Arnaud",
      age: 27,
      biography: "Flûtiste traversière et danseuse bretonne, je fais vivre la culture celtique à travers concerts, fest-noz et ateliers. J'aime transmettre l'énergie collective, la musicalité et la convivialité propres aux traditions bretonnes.",
      country: "France",
      city: "Rennes",
      interests: [10, 13],
      gender: "Femme"
    },
  },
  {
    name: "Rodolphe Bruneau",
    email: "rodolphe.bruneau@test.com",
    bio: "Plongeur au Havre, passionné de sports nautiques, d'explorations sous-marines et de falaises normandes.",
    location: "Le Havre",
    profile: {
      first_name: "Rodolphe",
      last_name: "Bruneau",
      age: 35,
      biography: "Plongeur passionné de la Manche et des paysages côtiers normands, j'organise des explorations sous-marines autour du Havre. Mon univers mêle adrénaline, curiosité naturelle et amour des environnements marins souvent méconnus.",
      country: "France",
      city: "Le Havre",
      interests: [7, 18],
      gender: "Homme"
    },
  },
  {
    name: "Emmanuelle Jolly",
    email: "emmanuelle.jolly@test.com",
    bio: "Botaniste amateur à Orléans, passionnée de jardinage, d'aromates et de balades dans la nature ligérienne.",
    location: "Orléans",
    profile: {
      first_name: "Emmanuelle",
      last_name: "Jolly",
      age: 41,
      biography: "Jardinière passionnée et botaniste amateur, j'anime des balades botaniques et des ateliers autour des plantes aromatiques et du jardin naturel. Mon approche met en valeur l'observation, la transmission et le lien avec les saisons.",
      country: "France",
      city: "Orléans",
      interests: [17, 15],
      gender: "Femme"
    },
  },
  {
    name: "Cédric Perret",
    email: "cedric.perret@test.com",
    bio: "Skieur et randonneur du Jura, passionné de neige, de forêts profondes et de panoramas alpins.",
    location: "Besançon",
    profile: {
      first_name: "Cédric",
      last_name: "Perret",
      age: 36,
      biography: "Passionné de ski de fond et de randonnée dans le Jura, je fais découvrir les forêts, crêtes et belvédères les plus inspirants de la région. J'aime la nature calme, les sports d'hiver accessibles et les paysages qui invitent à respirer.",
      country: "France",
      city: "Besançon",
      interests: [5, 3],
      gender: "Homme"
    },
  },
  {
    name: "Laure Barbeau",
    email: "laure.barbeau@test.com",
    bio: "Étudiante en cinéma à Nancy, passionnée de lecture, de débats et d'œuvres qui font réfléchir.",
    location: "Nancy",
    profile: {
      first_name: "Laure",
      last_name: "Barbeau",
      age: 25,
      biography: "Étudiante en cinéma et lectrice passionnée, j'organise des ciné-débats et des cercles de lecture pour partager des œuvres, des émotions et des interprétations. J'aime les échanges sincères autour de la culture et des idées qu'elle fait naître.",
      country: "France",
      city: "Nancy",
      interests: [20, 19],
      gender: "Femme"
    },
  },
  {
    name: "Tristan Blanc",
    email: "tristan.blanc@test.com",
    bio: "Photographe de rue à Marseille, passionné de street art, de quartiers créatifs et d'ambiances urbaines.",
    location: "Marseille",
    profile: {
      first_name: "Tristan",
      last_name: "Blanc",
      age: 30,
      biography: "Photographe de rue, je me spécialise dans le street art et les textures urbaines de Marseille. J'aime explorer les quartiers vivants, capter les détails graphiques et partager une vision authentique et moderne de la ville.",
      country: "France",
      city: "Marseille",
      interests: [11, 9],
      gender: "Homme"
    },
  },
  {
    name: "Audrey Legros",
    email: "audrey.legros@test.com",
    bio: "Professeure de yoga et danse à Lyon, passionnée de mouvement, de douceur et d'expression corporelle.",
    location: "Lyon",
    profile: {
      first_name: "Audrey",
      last_name: "Legros",
      age: 33,
      biography: "Professeure de yoga restauratif et de danse contemporaine, j'accompagne les personnes qui veulent habiter leur corps avec plus de fluidité et de confiance. Mon studio à Lyon accueille tous les niveaux dans une ambiance calme et bienveillante.",
      country: "France",
      city: "Lyon",
      interests: [8, 13],
      gender: "Femme"
    },
  },
  {
    name: "Vincent Giroud",
    email: "vincent.giroud@test.com",
    bio: "Cycliste grenoblois passionné par les cols alpins, les sorties de groupe et les défis sportifs en montagne.",
    location: "Grenoble",
    profile: {
      first_name: "Vincent",
      last_name: "Giroud",
      age: 28,
      biography: "Cycliste régulier sur les routes alpines, j'organise des sorties vers la Chartreuse, le Vercors et les cols emblématiques autour de Grenoble. J'aime la camaraderie du groupe, la beauté des reliefs et la satisfaction de l'effort partagé.",
      country: "France",
      city: "Grenoble",
      interests: [14, 18],
      gender: "Homme"
    },
  },
  {
    name: "Amélie Lecomte",
    email: "amelie.lecomte@test.com",
    bio: "Cheffe pâtissière à Paris, passionnée par la transmission, les desserts élégants et les moments gourmands.",
    location: "Paris",
    profile: {
      first_name: "Amélie",
      last_name: "Lecomte",
      age: 36,
      biography: "Cheffe pâtissière et enseignante, je propose des cours autour de la viennoiserie, des macarons et des pâtisseries de fête. J'aime rendre la pâtisserie accessible, précise et joyeuse, tout en transmettant le goût du beau et du bon.",
      country: "France",
      city: "Paris",
      interests: [12, 1],
      gender: "Femme"
    },
  },

  // --- Quelques profils supplémentaires dans diverses villes ---
  {
    name: "Bastien Collin",
    email: "bastien.collin@test.com",
    bio: "Surfeur et triathlète à Bordeaux, passionné d'océan, d'endurance et de progression sportive.",
    location: "Bordeaux",
    profile: {
      first_name: "Bastien",
      last_name: "Collin",
      age: 24,
      biography: "Surfeur de Lacanau et triathlète en devenir, je partage mon temps entre entraînements sportifs et sessions sur la côte atlantique. J'aime le rythme de vie actif, le contact avec les éléments et les défis qui font progresser.",
      country: "France",
      city: "Bordeaux",
      interests: [6, 18],
      gender: "Homme"
    },
  },
  {
    name: "Priscilla Garnier",
    email: "priscilla.garnier@test.com",
    bio: "Artiste et musicienne à Lyon, passionnée de peinture, de violon et de scènes culturelles intimistes.",
    location: "Lyon",
    profile: {
      first_name: "Priscilla",
      last_name: "Garnier",
      age: 28,
      biography: "Peintre expressionniste et violoniste, j'évolue dans un univers où la musique et la couleur se répondent. J'expose dans les galeries lyonnaises et donne des concerts de musique de chambre avec une sensibilité tournée vers l'émotion artistique.",
      country: "France",
      city: "Lyon",
      interests: [9, 10],
      gender: "Femme"
    },
  },
  {
    name: "Joël Hernandez",
    email: "joel.hernandez@test.com",
    bio: "Coach sportif et professeur de yoga à Montpellier, passionné de vitalité, de discipline et de bien-être.",
    location: "Montpellier",
    profile: {
      first_name: "Joël",
      last_name: "Hernandez",
      age: 40,
      biography: "Coach fitness et professeur de yoga dynamique, j'accompagne celles et ceux qui veulent retrouver forme, mobilité et énergie. Mes séances en extérieur et mes coachings individuels allient intensité, respiration et équilibre durable.",
      country: "France",
      city: "Montpellier",
      interests: [18, 8],
      gender: "Homme"
    },
  },
  {
    name: "Pierrick Morin",
    email: "pierrick.morin@test.com",
    bio: "Randonneur et cycliste breton, passionné de GR34, de sentiers côtiers et de longues sorties nature.",
    location: "Rennes",
    profile: {
      first_name: "Pierrick",
      last_name: "Morin",
      age: 43,
      biography: "Passionné de randonnée et de cyclotourisme, je connais les sentiers de Bretagne et les plus belles portions du littoral finistérien. J'aime les expériences simples, sportives et ressourçantes qui mettent le territoire à l'honneur.",
      country: "France",
      city: "Rennes",
      interests: [3, 14],
      gender: "Homme"
    },
  },
  {
    name: "Béatrice Sartre",
    email: "beatrice.sartre@test.com",
    bio: "Cuisinière lyonnaise passionnée par les bouchons, les marchés locaux et le jardinage du quotidien.",
    location: "Lyon",
    profile: {
      first_name: "Béatrice",
      last_name: "Sartre",
      age: 52,
      biography: "Spécialiste de la cuisine traditionnelle lyonnaise, j'organise des cours gourmands et des visites de marchés pour faire découvrir les produits et recettes emblématiques de la ville. Le goût du partage est au centre de ma manière de cuisiner.",
      country: "France",
      city: "Lyon",
      interests: [12, 17],
      gender: "Femme"
    },
  },
  {
    name: "Théo Capart",
    email: "theo.capart@test.com",
    bio: "Jeune surfeur et photographe à La Rochelle, passionné par les vagues, la lumière et l'énergie de l'Atlantique.",
    location: "La Rochelle",
    profile: {
      first_name: "Théo",
      last_name: "Capart",
      age: 22,
      biography: "Surfeur passionné et photographe de vagues, je capture les meilleurs swells de la côte atlantique charentaise. J'aime raconter la mer à travers l'image, entre sport, mouvement et fascination pour les éléments naturels.",
      country: "France",
      city: "La Rochelle",
      interests: [6, 11],
      gender: "Homme"
    },
  },
  {
    name: "Isabelle Huet",
    email: "isabelle.huet@test.com",
    bio: "Professeure de danse et pianiste à Nantes, passionnée par la musique classique et les danses de salon.",
    location: "Nantes",
    profile: {
      first_name: "Isabelle",
      last_name: "Huet",
      age: 45,
      biography: "J'enseigne les danses de salon et je joue du piano avec un goût particulier pour l'élégance du mouvement et de la musique. À Nantes, j'aime créer des moments raffinés, accessibles et chaleureux autour de l'art du rythme et du lien.",
      country: "France",
      city: "Nantes",
      interests: [13, 10],
      gender: "Femme"
    },
  },
  {
    name: "Antoine Rossi",
    email: "antoine.rossi@test.com",
    bio: "Historien de l'art à Metz, passionné d'art moderne, de médiation culturelle et d'expositions inspirantes.",
    location: "Metz",
    profile: {
      first_name: "Antoine",
      last_name: "Rossi",
      age: 43,
      biography: "Historien de l'art et guide au Centre Pompidou-Metz, j'anime des conférences et des ateliers autour de l'art moderne et contemporain. J'aime rendre les œuvres accessibles en les reliant aux émotions, au contexte et aux regards d'aujourd'hui.",
      country: "France",
      city: "Metz",
      interests: [16, 9],
      gender: "Homme"
    },
  },
  {
    name: "Léa Chabert",
    email: "lea.chabert@test.com",
    bio: "Réalisatrice et artiste à Lyon, passionnée de courts-métrages, de peinture et d'histoire du cinéma.",
    location: "Lyon",
    profile: {
      first_name: "Léa",
      last_name: "Chabert",
      age: 27,
      biography: "Réalisatrice de courts-métrages et peintre, je vis entre narration visuelle et création plastique. Membre de l'Institut Lumière, je suis passionnée par l'histoire du cinéma lyonnais et les liens entre image, mémoire et émotion.",
      country: "France",
      city: "Lyon",
      interests: [20, 9],
      gender: "Femme"
    },
  },
  {
    name: "Emeline Saurel",
    email: "emeline.saurel@test.com",
    bio: "Maraîchère bio à Montauban, passionnée de permaculture, de potagers vivants et d'écologie pratique.",
    location: "Montauban",
    profile: {
      first_name: "Emeline",
      last_name: "Saurel",
      age: 38,
      biography: "Maraîchère bio et paysagiste, j'anime des ateliers de jardinage naturel et de création de potagers en permaculture. J'aime transmettre des pratiques concrètes, durables et joyeuses pour remettre le vivant au cœur du quotidien.",
      country: "France",
      city: "Montauban",
      interests: [17, 15],
      gender: "Femme"
    },
  },
];

async function seed() {
  const force = process.argv.includes("--force");

  try {
    await sequelize.authenticate();
    console.log("✅ DB connectée");

    if (force) {
      const { Op } = await import("sequelize");
      const testUsers = await User.findAll({ where: { email: { [Op.like]: "%@test.com" } } });
      if (testUsers.length) {
        const ids = testUsers.map((u) => u.id);
        await Profile.destroy({ where: { user_id: ids } });
        await User.destroy({ where: { id: ids } });
        console.log(`🗑️  ${testUsers.length} users de test supprimés`);
      }
    }

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
        bio: userFields.bio || null,
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
        bio: fullProfile.bio || "",
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
