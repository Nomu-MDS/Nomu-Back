// scripts/seedUsers.js - Ajoute des utilisateurs de test pour enrichir l'index
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { sequelize, User, Profile } from "../models/index.js";
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

  // --- Paris ---
  {
    name: "Julien Moreau",
    email: "julien.moreau@test.com",
    bio: "Photographe freelance et cinéphile",
    location: "Paris",
    profile: { first_name: "Julien", last_name: "Moreau", age: 32, biography: "Photographe freelance spécialisé dans le portrait urbain. Cinéphile passionné, je fréquente assidûment les festivals.", country: "France", city: "Paris", interests: [11, 20] },
  },
  {
    name: "Isabelle Blanc",
    email: "isabelle.blanc@test.com",
    bio: "Professeure de yoga et amoureuse de la nature",
    location: "Paris",
    profile: { first_name: "Isabelle", last_name: "Blanc", age: 38, biography: "Enseignante de yoga depuis 10 ans. Passionnée de nature et de plantes. J'organise des retraites en plein air.", country: "France", city: "Paris", interests: [8, 15] },
  },
  {
    name: "Marc Dupuis",
    email: "marc.dupuis@test.com",
    bio: "Musicien et peintre",
    location: "Paris",
    profile: { first_name: "Marc", last_name: "Dupuis", age: 41, biography: "Guitariste de jazz et peintre expressionniste. Je fais découvrir les lieux artistiques cachés de Paris.", country: "France", city: "Paris", interests: [10, 9] },
  },
  {
    name: "Céline Fontaine",
    email: "celine.fontaine@test.com",
    bio: "Danseuse contemporaine",
    location: "Paris",
    profile: { first_name: "Céline", last_name: "Fontaine", age: 29, biography: "Danseuse contemporaine et professeure de danse. Passionnée de musiques du monde et de spectacles vivants.", country: "France", city: "Paris", interests: [13, 10] },
  },
  {
    name: "Pierre Renard",
    email: "pierre.renard@test.com",
    bio: "Chef cuisinier bistronomique",
    location: "Paris",
    profile: { first_name: "Pierre", last_name: "Renard", age: 45, biography: "Chef formé au Cordon Bleu. Je propose des dîners privés et cours de cuisine pour petits groupes.", country: "France", city: "Paris", interests: [1, 12] },
  },
  {
    name: "Aurélie Legrand",
    email: "aurelie.legrand@test.com",
    bio: "Historienne de l'art et bibliophile",
    location: "Paris",
    profile: { first_name: "Aurélie", last_name: "Legrand", age: 36, biography: "Conservatrice de musée et passionnée d'histoire de l'art. Guide pour des visites privées de musées parisiens.", country: "France", city: "Paris", interests: [16, 19] },
  },
  {
    name: "Raphaël Faure",
    email: "raphael.faure@test.com",
    bio: "Reporter photo et randonneur",
    location: "Paris",
    profile: { first_name: "Raphaël", last_name: "Faure", age: 33, biography: "Photojournaliste et randonneur passionné. Je propose des sorties photo en nature autour de Paris.", country: "France", city: "Paris", interests: [11, 3] },
  },
  {
    name: "Nathalie Perrin",
    email: "nathalie.perrin@test.com",
    bio: "Jardinière et créatrice de potagers",
    location: "Paris",
    profile: { first_name: "Nathalie", last_name: "Perrin", age: 44, biography: "Experte en jardinage urbain et permaculture. J'aide les Parisiens à créer leur potager sur balcon.", country: "France", city: "Paris", interests: [17, 15] },
  },
  {
    name: "Florian Thibault",
    email: "florian.thibault@test.com",
    bio: "Cycliste et sportif urbain",
    location: "Paris",
    profile: { first_name: "Florian", last_name: "Thibault", age: 27, biography: "Cycliste urbain et coach sportif. Je propose des sorties vélo découverte de Paris et ses environs.", country: "France", city: "Paris", interests: [14, 18] },
  },
  {
    name: "Mélanie Guerin",
    email: "melanie.guerin@test.com",
    bio: "Critique de cinéma et lectrice vorace",
    location: "Paris",
    profile: { first_name: "Mélanie", last_name: "Guerin", age: 30, biography: "Journaliste culturelle spécialisée dans le 7ème art. Organisatrice de ciné-clubs et débats littéraires.", country: "France", city: "Paris", interests: [20, 19] },
  },
  {
    name: "Amandine Charles",
    email: "amandine.charles@test.com",
    bio: "Artiste peintre et portraitiste",
    location: "Paris",
    profile: { first_name: "Amandine", last_name: "Charles", age: 34, biography: "Peintre figurative spécialisée dans le portrait. Ateliers de dessin et visites d'ateliers d'artistes.", country: "France", city: "Paris", interests: [9, 11] },
  },
  {
    name: "Sébastien Bonnet",
    email: "sebastien.bonnet@test.com",
    bio: "Skieur et alpiniste",
    location: "Paris",
    profile: { first_name: "Sébastien", last_name: "Bonnet", age: 37, biography: "Moniteur de ski hors-piste et guide de randonnée glaciaire. Basé à Paris mais les week-ends en montagne.", country: "France", city: "Paris", interests: [5, 4] },
  },
  {
    name: "Laetitia Rousseau",
    email: "laetitia.rousseau@test.com",
    bio: "Professeure de danse et yoga",
    location: "Paris",
    profile: { first_name: "Laetitia", last_name: "Rousseau", age: 31, biography: "Professeure de danse orientale et yoga. Cours hebdomadaires et ateliers bien-être à Paris.", country: "France", city: "Paris", interests: [13, 8] },
  },
  {
    name: "Olivier Garnier",
    email: "olivier.garnier@test.com",
    bio: "Sommelier et passionné de gastronomie",
    location: "Paris",
    profile: { first_name: "Olivier", last_name: "Garnier", age: 48, biography: "Sommelier dans un restaurant étoilé. J'organise des accords mets-vins et cave visites privées.", country: "France", city: "Paris", interests: [2, 1] },
  },

  // --- Sud-Est (Côte d'Azur, Paca) ---
  {
    name: "Manon Pons",
    email: "manon.pons@test.com",
    bio: "Surfeuse et monitrice de sport",
    location: "Montpellier",
    profile: { first_name: "Manon", last_name: "Pons", age: 25, biography: "Monitrice de surf et de paddle. Passionnée de sports nautiques et de vie en plein air sur la côte méditerranéenne.", country: "France", city: "Montpellier", interests: [6, 18] },
  },
  {
    name: "Baptiste Dumas",
    email: "baptiste.dumas@test.com",
    bio: "Guide historique et archéologue amateur",
    location: "Perpignan",
    profile: { first_name: "Baptiste", last_name: "Dumas", age: 42, biography: "Passionné d'histoire catalane et romaine. Visites guidées des sites archéologiques du Roussillon.", country: "France", city: "Perpignan", interests: [16, 19] },
  },
  {
    name: "Elise Vidal",
    email: "elise.vidal@test.com",
    bio: "Coach bien-être sur la Côte d'Azur",
    location: "Nice",
    profile: { first_name: "Elise", last_name: "Vidal", age: 35, biography: "Coach bien-être certifiée. Séances de yoga en bord de mer, méditation et sophrologie à Nice.", country: "France", city: "Nice", interests: [8, 15] },
  },
  {
    name: "Franck Brun",
    email: "franck.brun@test.com",
    bio: "Réalisateur indépendant et photographe",
    location: "Cannes",
    profile: { first_name: "Franck", last_name: "Brun", age: 39, biography: "Réalisateur de courts-métrages. Passionné par le Festival de Cannes et la photographie de rue.", country: "France", city: "Cannes", interests: [20, 9] },
  },
  {
    name: "Sandrine Meyer",
    email: "sandrine.meyer@test.com",
    bio: "Monitrice de plongée en Méditerranée",
    location: "Toulon",
    profile: { first_name: "Sandrine", last_name: "Meyer", age: 33, biography: "Monitrice PADI et biologiste marine. Plongée sur les épaves de la rade de Toulon et observation de la faune.", country: "France", city: "Toulon", interests: [7, 18] },
  },
  {
    name: "Guillaume Morel",
    email: "guillaume.morel@test.com",
    bio: "Cycliste et amoureux de la garrigue",
    location: "Montpellier",
    profile: { first_name: "Guillaume", last_name: "Morel", age: 36, biography: "Cycliste amateur sur les routes de l'Hérault. Connaisseur des sentiers de garrigue et des vignobles du Languedoc.", country: "France", city: "Montpellier", interests: [14, 15] },
  },
  {
    name: "Delphine Leclercq",
    email: "delphine.leclercq@test.com",
    bio: "Cheffe cuisinière niçoise",
    location: "Nice",
    profile: { first_name: "Delphine", last_name: "Leclercq", age: 41, biography: "Cheffe spécialisée dans la cuisine niçoise et méditerranéenne. Cours de cuisine et marchés guidés.", country: "France", city: "Nice", interests: [1, 12] },
  },
  {
    name: "Rémi Gaillard",
    email: "remi.gaillard@test.com",
    bio: "Randonneur urbain et sportif",
    location: "Marseille",
    profile: { first_name: "Rémi", last_name: "Gaillard", age: 28, biography: "Randonneur passionné des Calanques. Organisateur de treks et de sorties sportives dans les massifs provençaux.", country: "France", city: "Marseille", interests: [3, 18] },
  },
  {
    name: "Valérie Simon",
    email: "valerie.simon@test.com",
    bio: "Guide du patrimoine en Provence",
    location: "Avignon",
    profile: { first_name: "Valérie", last_name: "Simon", age: 46, biography: "Guide-conférencière spécialisée dans l'art roman et médiéval provençal. Visites privées du Palais des Papes.", country: "France", city: "Avignon", interests: [16, 9] },
  },
  {
    name: "Arnaud Vasseur",
    email: "arnaud.vasseur@test.com",
    bio: "Moniteur de surf et plongée",
    location: "Perpignan",
    profile: { first_name: "Arnaud", last_name: "Vasseur", age: 30, biography: "Double moniteur surf et plongée. Propose des sessions entre Canet et Leucate selon les conditions.", country: "France", city: "Perpignan", interests: [6, 7] },
  },
  {
    name: "Nadia Benali",
    email: "nadia.benali@test.com",
    bio: "Professeure de flamenco et danse orientale",
    location: "Montpellier",
    profile: { first_name: "Nadia", last_name: "Benali", age: 34, biography: "Professeure de danse d'origine andalouse. Cours de flamenco, danse orientale et soirées culturelles à Montpellier.", country: "France", city: "Montpellier", interests: [13, 10] },
  },
  {
    name: "Émilie Payet",
    email: "emilie.payet@test.com",
    bio: "Photographe nature et faune sauvage",
    location: "Nice",
    profile: { first_name: "Émilie", last_name: "Payet", age: 29, biography: "Photographe animalière dans les Alpes-Maritimes. Stage photo en forêt et bord de mer.", country: "France", city: "Nice", interests: [11, 15] },
  },
  {
    name: "Mathieu Fleury",
    email: "mathieu.fleury@test.com",
    bio: "Sommelier en Provence",
    location: "Aix-en-Provence",
    profile: { first_name: "Mathieu", last_name: "Fleury", age: 40, biography: "Sommelier et caviste passionné des vins de Provence. Visites de domaines viticoles et dégustations privées.", country: "France", city: "Aix-en-Provence", interests: [2, 1] },
  },

  // --- Côte Atlantique ---
  {
    name: "Gaël Clément",
    email: "gael.clement@test.com",
    bio: "Surfeur et plongeur atlantique",
    location: "La Rochelle",
    profile: { first_name: "Gaël", last_name: "Clément", age: 27, biography: "Surfeur passionné de la côte Atlantique et plongeur amateur. Explore les épaves et récifs de Charente-Maritime.", country: "France", city: "La Rochelle", interests: [6, 7] },
  },
  {
    name: "Pascale Guichard",
    email: "pascale.guichard@test.com",
    bio: "Randonneuse et amante du littoral breton",
    location: "Brest",
    profile: { first_name: "Pascale", last_name: "Guichard", age: 43, biography: "Randonneuse passionnée du GR34 et du littoral finistérien. Guide informelle pour des balades côtières.", country: "France", city: "Brest", interests: [3, 15] },
  },
  {
    name: "Ludovic Marin",
    email: "ludovic.marin@test.com",
    bio: "Marin et passionné d'histoire maritime",
    location: "Saint-Malo",
    profile: { first_name: "Ludovic", last_name: "Marin", age: 50, biography: "Skipper et historien amateur. Navigations à voile en baie du Mont-Saint-Michel et récits des corsaires malouins.", country: "France", city: "Saint-Malo", interests: [18, 16] },
  },
  {
    name: "Elise Pichon",
    email: "elise.pichon@test.com",
    bio: "Yoga face à l'Atlantique",
    location: "La Rochelle",
    profile: { first_name: "Elise", last_name: "Pichon", age: 32, biography: "Professeure de yoga en bord de mer. Séances au lever du soleil sur les plages charentaises.", country: "France", city: "La Rochelle", interests: [8, 15] },
  },
  {
    name: "Damien Courbet",
    email: "damien.courbet@test.com",
    bio: "Photographe de paysages bretons",
    location: "Brest",
    profile: { first_name: "Damien", last_name: "Courbet", age: 38, biography: "Photographe spécialisé dans les paysages côtiers bretons. Stages photo à l'aube sur le Finistère.", country: "France", city: "Brest", interests: [11, 15] },
  },
  {
    name: "Sylvie Lebrun",
    email: "sylvie.lebrun@test.com",
    bio: "Cuisinière bretonne et jardinière",
    location: "Rennes",
    profile: { first_name: "Sylvie", last_name: "Lebrun", age: 47, biography: "Cuisinière passionnée de gastronomie bretonne. Entretient un grand potager et propose des ateliers cuisine du terroir.", country: "France", city: "Rennes", interests: [12, 17] },
  },
  {
    name: "Xavier Poulin",
    email: "xavier.poulin@test.com",
    bio: "Vigneron amateur de la Loire",
    location: "Angers",
    profile: { first_name: "Xavier", last_name: "Poulin", age: 52, biography: "Passionné des vignobles du Val de Loire. Organise des visites de caves et dégustations de Muscadet et Anjou.", country: "France", city: "Angers", interests: [2, 1] },
  },
  {
    name: "Brigitte Fouchet",
    email: "brigitte.fouchet@test.com",
    bio: "Historienne et guide culturelle en Bretagne",
    location: "Rennes",
    profile: { first_name: "Brigitte", last_name: "Fouchet", age: 55, biography: "Historienne spécialisée dans l'histoire de Bretagne. Visites guidées des sites mégalithiques et châteaux médiévaux.", country: "France", city: "Rennes", interests: [16, 19] },
  },

  // --- Alpes ---
  {
    name: "Stéphane Lacroix",
    email: "stephane.lacroix@test.com",
    bio: "Guide de haute montagne",
    location: "Grenoble",
    profile: { first_name: "Stéphane", last_name: "Lacroix", age: 40, biography: "Guide de haute montagne certifié. Ascensions dans le Vercors, la Chartreuse et le Belledonne.", country: "France", city: "Grenoble", interests: [5, 4] },
  },
  {
    name: "Anaïs Renaud",
    email: "anais.renaud@test.com",
    bio: "Randonneuse et naturaliste",
    location: "Annecy",
    profile: { first_name: "Anaïs", last_name: "Renaud", age: 28, biography: "Passionnée de randonnée et de botanique alpine. Propose des sorties nature et identification de plantes autour d'Annecy.", country: "France", city: "Annecy", interests: [3, 15] },
  },
  {
    name: "Bruno Perrier",
    email: "bruno.perrier@test.com",
    bio: "Moniteur de ski et snowboard",
    location: "Chambéry",
    profile: { first_name: "Bruno", last_name: "Perrier", age: 35, biography: "Moniteur ESF à La Plagne. Passionné de ski freeride et de randonnée en raquettes en Savoie.", country: "France", city: "Chambéry", interests: [5, 4] },
  },
  {
    name: "Elodie Giraud",
    email: "elodie.giraud@test.com",
    bio: "Cycliste de compétition et coach",
    location: "Grenoble",
    profile: { first_name: "Elodie", last_name: "Giraud", age: 31, biography: "Cycliste licenciée et coach sportive. Sorties vélo dans les cols alpins, Alpe d'Huez et Galibier.", country: "France", city: "Grenoble", interests: [14, 18] },
  },
  {
    name: "Mathilde Vigneron",
    email: "mathilde.vigneron@test.com",
    bio: "Photographe montagne et lac d'Annecy",
    location: "Annecy",
    profile: { first_name: "Mathilde", last_name: "Vigneron", age: 26, biography: "Photographe paysagiste spécialisée dans les Alpes. Stages photo au bord du lac d'Annecy à l'aube.", country: "France", city: "Annecy", interests: [11, 15] },
  },
  {
    name: "Romain Forestier",
    email: "romain.forestier@test.com",
    bio: "Alpiniste et guide de trek",
    location: "Chambéry",
    profile: { first_name: "Romain", last_name: "Forestier", age: 38, biography: "Alpiniste amateur et guide de randonnée. Organise des treks en Vanoise et des ascensions pour débutants.", country: "France", city: "Chambéry", interests: [4, 3] },
  },
  {
    name: "Patricia Collet",
    email: "patricia.collet@test.com",
    bio: "Jardinière et cuisinière alpine",
    location: "Valence",
    profile: { first_name: "Patricia", last_name: "Collet", age: 49, biography: "Passionnée de jardinage et de cuisine alpine. Cultive des herbes aromatiques et propose des cours de cuisine savoyarde.", country: "France", city: "Valence", interests: [1, 17] },
  },
  {
    name: "Jérémy Barbier",
    email: "jeremy.barbier@test.com",
    bio: "Skieur hors-piste passionné",
    location: "Grenoble",
    profile: { first_name: "Jérémy", last_name: "Barbier", age: 29, biography: "Skieur freeride et passionné de zones hors-piste dans le massif de Belledonne. Sorties encadrées en sécurité.", country: "France", city: "Grenoble", interests: [5, 3] },
  },
  {
    name: "Lucie Moulin",
    email: "lucie.moulin@test.com",
    bio: "Yoga et méditation en montagne",
    location: "Annecy",
    profile: { first_name: "Lucie", last_name: "Moulin", age: 33, biography: "Professeure de yoga et méditation. Retraites bien-être dans les Alpes, au bord du lac d'Annecy.", country: "France", city: "Annecy", interests: [8, 15] },
  },
  {
    name: "Frédéric Gimenez",
    email: "frederic.gimenez@test.com",
    bio: "Randonneur photographe du Vercors",
    location: "Grenoble",
    profile: { first_name: "Frédéric", last_name: "Gimenez", age: 44, biography: "Randonneur chevronné dans le Vercors et la Chartreuse. Photographie de paysages alpins et faune sauvage.", country: "France", city: "Grenoble", interests: [3, 11] },
  },

  // --- Nord-Est (Alsace, Lorraine) ---
  {
    name: "Clément Didier",
    email: "clement.didier@test.com",
    bio: "Historien médiéviste passionné",
    location: "Nancy",
    profile: { first_name: "Clément", last_name: "Didier", age: 37, biography: "Historien spécialisé dans le duché de Lorraine. Visites guidées de Nancy baroque et de ses trésors médiévaux.", country: "France", city: "Nancy", interests: [16, 19] },
  },
  {
    name: "Aurore Schmitt",
    email: "aurore.schmitt@test.com",
    bio: "Cuisinière alsacienne traditionnelle",
    location: "Strasbourg",
    profile: { first_name: "Aurore", last_name: "Schmitt", age: 34, biography: "Passionnée de gastronomie alsacienne. Cours de cuisine traditionnelle, choucroute, baeckeoffe et bredele de Noël.", country: "France", city: "Strasbourg", interests: [12, 1] },
  },
  {
    name: "Philippe Picard",
    email: "philippe.picard@test.com",
    bio: "Artiste et photographe en Lorraine",
    location: "Metz",
    profile: { first_name: "Philippe", last_name: "Picard", age: 51, biography: "Artiste plasticien exposant au Centre Pompidou-Metz. Ateliers de photographie artistique et peinture à l'huile.", country: "France", city: "Metz", interests: [9, 11] },
  },
  {
    name: "Hélène Muller",
    email: "helene.muller@test.com",
    bio: "Musicienne alsacienne et danseuse folklorique",
    location: "Strasbourg",
    profile: { first_name: "Hélène", last_name: "Muller", age: 43, biography: "Violoniste dans un orchestre amateur et danseuse folklorique alsacienne. Soirées musicales et ateliers de danse traditionnelle.", country: "France", city: "Strasbourg", interests: [10, 13] },
  },
  {
    name: "David Wagner",
    email: "david.wagner@test.com",
    bio: "Randonneur et nature lover en Vosges",
    location: "Nancy",
    profile: { first_name: "David", last_name: "Wagner", age: 39, biography: "Passionné de randonnée dans les Vosges. Connaît les plus beaux sentiers entre lacs et chaumes vosgiens.", country: "France", city: "Nancy", interests: [3, 15] },
  },
  {
    name: "Julie Adam",
    email: "julie.adam@test.com",
    bio: "Cinéphile et lectrice en Lorraine",
    location: "Metz",
    profile: { first_name: "Julie", last_name: "Adam", age: 26, biography: "Étudiante en lettres et passionnée de cinéma d'auteur. Anime un ciné-club à Metz et organise des soirées lectures.", country: "France", city: "Metz", interests: [20, 19] },
  },
  {
    name: "Bernard Colin",
    email: "bernard.colin@test.com",
    bio: "Amateur de vins alsaciens et gastronomie",
    location: "Strasbourg",
    profile: { first_name: "Bernard", last_name: "Colin", age: 58, biography: "Passionné des grands vins d'Alsace, Riesling et Gewurztraminer. Visite de caves et accords gastronomiques.", country: "France", city: "Strasbourg", interests: [2, 1] },
  },
  {
    name: "Solène Michel",
    email: "solene.michel@test.com",
    bio: "Coach sportive et yogini",
    location: "Nancy",
    profile: { first_name: "Solène", last_name: "Michel", age: 30, biography: "Coach sportive certifiée et professeure de yoga. Cours collectifs et coachings individuels en Lorraine.", country: "France", city: "Nancy", interests: [8, 18] },
  },
  {
    name: "Marine Burger",
    email: "marine.burger@test.com",
    bio: "Photographe nature en Alsace",
    location: "Strasbourg",
    profile: { first_name: "Marine", last_name: "Burger", age: 28, biography: "Photographe amateur de la cigogne blanche et des paysages rhénans. Balades photo dans le Ried et les Vosges.", country: "France", city: "Strasbourg", interests: [11, 15] },
  },

  // --- Sud-Ouest ---
  {
    name: "Paulo Santos",
    email: "paulo.santos@test.com",
    bio: "Surfeur pro du Pays Basque",
    location: "Bayonne",
    profile: { first_name: "Paulo", last_name: "Santos", age: 24, biography: "Surfeur compétiteur sur le circuit européen. Propose des cours de surf à Biarritz et Hossegor pour tous niveaux.", country: "France", city: "Bayonne", interests: [6, 18] },
  },
  {
    name: "Claire Dupuy",
    email: "claire.dupuy@test.com",
    bio: "Randonneuse dans les Pyrénées",
    location: "Pau",
    profile: { first_name: "Claire", last_name: "Dupuy", age: 36, biography: "Guide de randonnée dans les Pyrénées béarnaises. Connaît chaque col et refuge du GR10.", country: "France", city: "Pau", interests: [3, 4] },
  },
  {
    name: "Étienne Barthe",
    email: "etienne.barthe@test.com",
    bio: "Musicien et cinéphile basque",
    location: "Bayonne",
    profile: { first_name: "Étienne", last_name: "Barthe", age: 33, biography: "Trompettiste de jazz et passionné de cinéma espagnol. Concerts dans les festivals basques, critique ciné amateur.", country: "France", city: "Bayonne", interests: [10, 20] },
  },
  {
    name: "Virginie Danjou",
    email: "virginie.danjou@test.com",
    bio: "Cheffe cuisinière gasconnne",
    location: "Toulouse",
    profile: { first_name: "Virginie", last_name: "Danjou", age: 44, biography: "Cheffe passionnée de gastronomie gasconne et occitane. Cours de cassoulet, foie gras et vins du Sud-Ouest.", country: "France", city: "Toulouse", interests: [1, 12] },
  },
  {
    name: "Laurent Capelle",
    email: "laurent.capelle@test.com",
    bio: "Skieur pyrénéen et guide montagne",
    location: "Pau",
    profile: { first_name: "Laurent", last_name: "Capelle", age: 41, biography: "Guide de montagne dans les Pyrénées. Ski à Cauterets, Gourette et randonnées estivales vers les lacs d'altitude.", country: "France", city: "Pau", interests: [5, 4] },
  },
  {
    name: "Renaud Dubois",
    email: "renaud.dubois@test.com",
    bio: "Surfeur et plongeur atlantique",
    location: "Bayonne",
    profile: { first_name: "Renaud", last_name: "Dubois", age: 29, biography: "Double passionné surf et plongée sur la côte basque et landaise. Initiation et perfectionnement toute l'année.", country: "France", city: "Bayonne", interests: [6, 7] },
  },
  {
    name: "Agnès Favier",
    email: "agnes.favier@test.com",
    bio: "Danseuse et yogini toulousaine",
    location: "Toulouse",
    profile: { first_name: "Agnès", last_name: "Favier", age: 38, biography: "Professeure de tango argentin et de yoga yin. Milongas hebdomadaires et retraites yoga en Ariège.", country: "France", city: "Toulouse", interests: [13, 8] },
  },
  {
    name: "Nicolas Bonhomme",
    email: "nicolas.bonhomme@test.com",
    bio: "Vigneron du Périgord",
    location: "Périgueux",
    profile: { first_name: "Nicolas", last_name: "Bonhomme", age: 53, biography: "Producteur de Bergerac et Monbazillac. Propose des visites de son domaine et des dégustations de foie gras et truffes.", country: "France", city: "Périgueux", interests: [2, 1] },
  },
  {
    name: "Corinne Fabre",
    email: "corinne.fabre@test.com",
    bio: "Historienne des cathares en Occitanie",
    location: "Toulouse",
    profile: { first_name: "Corinne", last_name: "Fabre", age: 49, biography: "Spécialiste de l'histoire cathare et médiévale. Guide vers les châteaux cathares, Carcassonne et Minerve.", country: "France", city: "Toulouse", interests: [16, 19] },
  },

  // --- Centre et autres villes françaises ---
  {
    name: "Daniel Perrot",
    email: "daniel.perrot@test.com",
    bio: "Randonneur dans le Massif Central",
    location: "Clermont-Ferrand",
    profile: { first_name: "Daniel", last_name: "Perrot", age: 45, biography: "Randonneur passionné des volcans d'Auvergne. Propose des treks sur les puys et dans les gorges de l'Allier.", country: "France", city: "Clermont-Ferrand", interests: [3, 15] },
  },
  {
    name: "François Lacoste",
    email: "francois.lacoste@test.com",
    bio: "Caviste et passionné des vins de Bourgogne",
    location: "Dijon",
    profile: { first_name: "François", last_name: "Lacoste", age: 48, biography: "Caviste expert et guide de la Route des Grands Crus. Dégustations de Gevrey-Chambertin et Pommard.", country: "France", city: "Dijon", interests: [2, 1] },
  },
  {
    name: "Aurélia Morin",
    email: "aurelia.morin@test.com",
    bio: "Coach sportive en Auvergne",
    location: "Clermont-Ferrand",
    profile: { first_name: "Aurélia", last_name: "Morin", age: 32, biography: "Coach sportive et triathlète. Entraînements running autour des volcans d'Auvergne et compétitions régionales.", country: "France", city: "Clermont-Ferrand", interests: [8, 18] },
  },
  {
    name: "Patrice Duval",
    email: "patrice.duval@test.com",
    bio: "Historien de la résistance",
    location: "Bourges",
    profile: { first_name: "Patrice", last_name: "Duval", age: 60, biography: "Historien spécialisé dans la Seconde Guerre mondiale et la Résistance. Conférences et visites mémorielles dans le Cher.", country: "France", city: "Bourges", interests: [16, 19] },
  },
  {
    name: "Dorothée Favier",
    email: "dorothee.favier@test.com",
    bio: "Artiste photographe en Bourgogne",
    location: "Dijon",
    profile: { first_name: "Dorothée", last_name: "Favier", age: 37, biography: "Photographe et peintre aquarelliste. Ateliers créatifs dans les vignes et les abbayes bourguignonnes.", country: "France", city: "Dijon", interests: [9, 11] },
  },
  {
    name: "Mickaël Masson",
    email: "mickael.masson@test.com",
    bio: "Cycliste et coach Lyon",
    location: "Lyon",
    profile: { first_name: "Mickaël", last_name: "Masson", age: 34, biography: "Cycliste compétiteur et coach. Sorties vélo dans le Beaujolais et les Monts du Lyonnais, tous niveaux.", country: "France", city: "Lyon", interests: [14, 18] },
  },
  {
    name: "Yannick Noël",
    email: "yannick.noel@test.com",
    bio: "Skieur et randonneur auvergnat",
    location: "Clermont-Ferrand",
    profile: { first_name: "Yannick", last_name: "Noël", age: 35, biography: "Passionné de ski de fond et raquettes au Super-Besse et au Mont-Dore. Randonnées en Auvergne toute l'année.", country: "France", city: "Clermont-Ferrand", interests: [5, 3] },
  },
  {
    name: "Marianne Tissot",
    email: "marianne.tissot@test.com",
    bio: "Jardinière et naturaliste en Bourgogne",
    location: "Dijon",
    profile: { first_name: "Marianne", last_name: "Tissot", age: 50, biography: "Paysagiste passionnée de jardins bourguignons. Partage la culture des plantes aromatiques et des jardins médiévaux.", country: "France", city: "Dijon", interests: [17, 15] },
  },

  // --- Normandie et Nord ---
  {
    name: "Denis Chevallier",
    email: "denis.chevallier@test.com",
    bio: "Guide des plages du Débarquement",
    location: "Caen",
    profile: { first_name: "Denis", last_name: "Chevallier", age: 54, biography: "Historien spécialisé dans le Débarquement de Normandie. Visites des plages, cimetières et musées mémoriaux.", country: "France", city: "Caen", interests: [16, 11] },
  },
  {
    name: "Aline Chartier",
    email: "aline.chartier@test.com",
    bio: "Cuisinière normande et cidricultrice",
    location: "Caen",
    profile: { first_name: "Aline", last_name: "Chartier", age: 42, biography: "Productrice de cidre normand et cuisinière. Cours de tarte aux pommes, poulet à la normande et visite de son verger.", country: "France", city: "Caen", interests: [1, 12] },
  },
  {
    name: "Pascal Bourgeois",
    email: "pascal.bourgeois@test.com",
    bio: "Cycliste sur les routes normandes",
    location: "Rouen",
    profile: { first_name: "Pascal", last_name: "Bourgeois", age: 46, biography: "Cyclotouriste passionné des routes de Normandie. Sorties à vélo dans le Pays de Caux et la Vallée de la Seine.", country: "France", city: "Rouen", interests: [14, 15] },
  },
  {
    name: "Monique Charpentier",
    email: "monique.charpentier@test.com",
    bio: "Céramiste et jardinière en Haute-Vienne",
    location: "Limoges",
    profile: { first_name: "Monique", last_name: "Charpentier", age: 55, biography: "Artiste céramiste utilisant les terres de Limoges. Ateliers de poterie et jardinage naturel autour de Limoges.", country: "France", city: "Limoges", interests: [9, 17] },
  },
  {
    name: "Thibaud Remy",
    email: "thibaud.remy@test.com",
    bio: "Cycliste et sportif du Val de Loire",
    location: "Orléans",
    profile: { first_name: "Thibaud", last_name: "Remy", age: 31, biography: "Cycliste passionné de la Loire à vélo. Sorties sur les bords de Loire et dans la Sologne.", country: "France", city: "Orléans", interests: [14, 18] },
  },
  {
    name: "Caroline Gros",
    email: "caroline.gros@test.com",
    bio: "Cinéphile et libraire",
    location: "Le Mans",
    profile: { first_name: "Caroline", last_name: "Gros", age: 39, biography: "Libraire indépendante et cinéphile. Anime un club de lecture et un ciné-club dans la Sarthe.", country: "France", city: "Le Mans", interests: [20, 19] },
  },
  {
    name: "Alexis Marques",
    email: "alexis.marques@test.com",
    bio: "Historien et guide du patrimoine",
    location: "Poitiers",
    profile: { first_name: "Alexis", last_name: "Marques", age: 40, biography: "Spécialiste de l'art roman poitevin. Guide pour les baptistères, cryptes et abbayes de la région Poitou.", country: "France", city: "Poitiers", interests: [16, 19] },
  },
  {
    name: "Valérie Fontaine",
    email: "valerie.fontaine@test.com",
    bio: "Productrice de vin en Languedoc",
    location: "Béziers",
    profile: { first_name: "Valérie", last_name: "Fontaine", age: 47, biography: "Vigneronne indépendante dans l'appellation Saint-Chinian. Visites du domaine et dégustations de vins naturels.", country: "France", city: "Béziers", interests: [2, 1] },
  },
  {
    name: "Henri Lambert",
    email: "henri.lambert@test.com",
    bio: "Artiste et guide du patrimoine catalan",
    location: "Perpignan",
    profile: { first_name: "Henri", last_name: "Lambert", age: 62, biography: "Peintre et passionné d'art catalan. Connaît tous les retables baroques de la région et les musées Catalans.", country: "France", city: "Perpignan", interests: [9, 16] },
  },
  {
    name: "Sabrina Bouchard",
    email: "sabrina.bouchard@test.com",
    bio: "Danseuse et praticienne yoga à Bordeaux",
    location: "Bordeaux",
    profile: { first_name: "Sabrina", last_name: "Bouchard", age: 29, biography: "Professeure de danse afro et yoga vinyasa. Cours hebdomadaires à Bordeaux et stages intensifs.", country: "France", city: "Bordeaux", interests: [13, 8] },
  },
  {
    name: "Maxime Pereira",
    email: "maxime.pereira@test.com",
    bio: "Surfeur et triathlète atlantique",
    location: "Bordeaux",
    profile: { first_name: "Maxime", last_name: "Pereira", age: 26, biography: "Triathlète compétiteur et surfeur entre Lacanau et Hossegor. Entraînements natation, vélo et running.", country: "France", city: "Bordeaux", interests: [6, 18] },
  },
  {
    name: "Ophélie Arnaud",
    email: "ophelie.arnaud@test.com",
    bio: "Musicienne et danseuse bretonne",
    location: "Rennes",
    profile: { first_name: "Ophélie", last_name: "Arnaud", age: 27, biography: "Flûtiste traversière et danseuse bretonne. Fest-noz et concerts de musique celtique en Bretagne.", country: "France", city: "Rennes", interests: [10, 13] },
  },
  {
    name: "Rodolphe Bruneau",
    email: "rodolphe.bruneau@test.com",
    bio: "Sportif et plongeur havrais",
    location: "Le Havre",
    profile: { first_name: "Rodolphe", last_name: "Bruneau", age: 35, biography: "Plongeur en Manche et passionné de sports nautiques. Explorations sous-marines des falaises normandes.", country: "France", city: "Le Havre", interests: [7, 18] },
  },
  {
    name: "Emmanuelle Jolly",
    email: "emmanuelle.jolly@test.com",
    bio: "Jardinière et botaniste du Val de Loire",
    location: "Orléans",
    profile: { first_name: "Emmanuelle", last_name: "Jolly", age: 41, biography: "Botaniste amateur et jardinière. Entretient un jardin d'aromates et organise des balades botaniques en Sologne.", country: "France", city: "Orléans", interests: [17, 15] },
  },
  {
    name: "Cédric Perret",
    email: "cedric.perret@test.com",
    bio: "Skieur et randonneur du Jura",
    location: "Besançon",
    profile: { first_name: "Cédric", last_name: "Perret", age: 36, biography: "Skieur de fond et randonneur dans les forêts du Jura. Connaît les plus beaux belvedères sur les Alpes.", country: "France", city: "Besançon", interests: [5, 3] },
  },
  {
    name: "Laure Barbeau",
    email: "laure.barbeau@test.com",
    bio: "Cinéphile et lectrice en Lorraine",
    location: "Nancy",
    profile: { first_name: "Laure", last_name: "Barbeau", age: 25, biography: "Étudiante en cinéma et grande lectrice. Anime des ciné-débats et cercles de lecture à Nancy.", country: "France", city: "Nancy", interests: [20, 19] },
  },
  {
    name: "Tristan Blanc",
    email: "tristan.blanc@test.com",
    bio: "Photographe de street art à Marseille",
    location: "Marseille",
    profile: { first_name: "Tristan", last_name: "Blanc", age: 30, biography: "Photographe de rue spécialisé dans le street art du Panier et de la Friche Belle de Mai.", country: "France", city: "Marseille", interests: [11, 9] },
  },
  {
    name: "Audrey Legros",
    email: "audrey.legros@test.com",
    bio: "Professeure de yoga et danse à Lyon",
    location: "Lyon",
    profile: { first_name: "Audrey", last_name: "Legros", age: 33, biography: "Professeure de yoga restauratif et danse contemporaine. Studio dans le Vieux-Lyon, cours tous niveaux.", country: "France", city: "Lyon", interests: [8, 13] },
  },
  {
    name: "Vincent Giroud",
    email: "vincent.giroud@test.com",
    bio: "Cycliste et sportif grenoblois",
    location: "Grenoble",
    profile: { first_name: "Vincent", last_name: "Giroud", age: 28, biography: "Cycliste régulier sur les cols alpins. Organise des sorties vélo groupées vers Chartreuse et Vercors.", country: "France", city: "Grenoble", interests: [14, 18] },
  },
  {
    name: "Amélie Lecomte",
    email: "amelie.lecomte@test.com",
    bio: "Cheffe pâtissière parisienne",
    location: "Paris",
    profile: { first_name: "Amélie", last_name: "Lecomte", age: 36, biography: "Cheffe pâtissière et enseignante. Cours de viennoiserie, macarons et gâteaux de fête pour particuliers.", country: "France", city: "Paris", interests: [12, 1] },
  },

  // --- International ---
  {
    name: "Maria Garcia",
    email: "maria.garcia@test.com",
    bio: "Artiste et danseuse à Barcelone",
    location: "Barcelona",
    profile: { first_name: "Maria", last_name: "Garcia", age: 30, biography: "Artiste peintre et danseuse flamenco barcelonaise. Ateliers de flamenco et visite d'ateliers d'artistes du Raval.", country: "Espagne", city: "Barcelona", interests: [9, 13] },
  },
  {
    name: "James Wilson",
    email: "james.wilson@test.com",
    bio: "Musician and film enthusiast in London",
    location: "London",
    profile: { first_name: "James", last_name: "Wilson", age: 34, biography: "Jazz guitarist and cinema lover based in East London. Live sessions in Camden clubs and indie film screenings.", country: "Royaume-Uni", city: "London", interests: [10, 20] },
  },
  {
    name: "Giulia Romano",
    email: "giulia.romano@test.com",
    bio: "Gastronome et historienne de l'art à Rome",
    location: "Rome",
    profile: { first_name: "Giulia", last_name: "Romano", age: 38, biography: "Historienne de l'art et passionnée de gastronomie romaine. Visites des trattorie historiques et des musées secrets de Rome.", country: "Italie", city: "Rome", interests: [1, 16] },
  },
  {
    name: "Carlos Mendez",
    email: "carlos.mendez@test.com",
    bio: "Danseur et musicien à Madrid",
    location: "Madrid",
    profile: { first_name: "Carlos", last_name: "Mendez", age: 27, biography: "Danseur de salsa et musicien de flamenco. Soirées salsa dans les tablaos madrilènes et cours pour débutants.", country: "Espagne", city: "Madrid", interests: [13, 10] },
  },
  {
    name: "Anna Kowalski",
    email: "anna.kowalski@test.com",
    bio: "Skieuse et randonneuse en Pologne",
    location: "Cracovie",
    profile: { first_name: "Anna", last_name: "Kowalski", age: 31, biography: "Guide de montagne dans les Tatras polonaises. Ski et randonnée toute l'année dans les plus beaux massifs polonais.", country: "Pologne", city: "Cracovie", interests: [5, 3] },
  },
  {
    name: "Luca Ferrari",
    email: "luca.ferrari@test.com",
    bio: "Gastronomie et vins italiens à Milan",
    location: "Milan",
    profile: { first_name: "Luca", last_name: "Ferrari", age: 42, biography: "Sommelier et chef cuisinant la cuisine lombarde. Dégustations de Barolo et visites des marchés de Milan.", country: "Italie", city: "Milan", interests: [1, 2] },
  },
  {
    name: "Sophie Mueller",
    email: "sophie.mueller@test.com",
    bio: "Musicienne et artiste à Berlin",
    location: "Berlin",
    profile: { first_name: "Sophie", last_name: "Mueller", age: 29, biography: "Violoncelliste classique et amoureuse de l'art contemporain. Concerts en galeries berlinoises et visites des musées de l'île aux musées.", country: "Allemagne", city: "Berlin", interests: [10, 9] },
  },
  {
    name: "Yuki Tanaka",
    email: "yuki.tanaka@test.com",
    bio: "Photographe et artiste à Tokyo",
    location: "Tokyo",
    profile: { first_name: "Yuki", last_name: "Tanaka", age: 26, biography: "Photographe de mode et artiste graphique à Tokyo. Partage les secrets des galeries d'Harajuku et des quartiers créatifs.", country: "Japon", city: "Tokyo", interests: [11, 9] },
  },
  {
    name: "Elena Popescu",
    email: "elena.popescu@test.com",
    bio: "Danseuse et musicienne à Bucarest",
    location: "Bucarest",
    profile: { first_name: "Elena", last_name: "Popescu", age: 33, biography: "Danseuse folklorique roumaine et violoniste. Spectacles de danses traditionnelles et ateliers de musique des Balkans.", country: "Roumanie", city: "Bucarest", interests: [13, 10] },
  },
  {
    name: "Ingrid Larsson",
    email: "ingrid.larsson@test.com",
    bio: "Randonneuse et amoureuse de la nature scandinave",
    location: "Stockholm",
    profile: { first_name: "Ingrid", last_name: "Larsson", age: 35, biography: "Guide de randonnée dans les forêts et archipels suédois. Propose des treks en kayak de mer et ski de fond en Laponie.", country: "Suède", city: "Stockholm", interests: [3, 15] },
  },
  {
    name: "Hassan Benkirane",
    email: "hassan.benkirane@test.com",
    bio: "Guide gastronomique à Marrakech",
    location: "Marrakech",
    profile: { first_name: "Hassan", last_name: "Benkirane", age: 40, biography: "Guide culinaire et passionné de cuisine marocaine. Visites des souks épicés, cours de tajine et de pâtisserie orientale.", country: "Maroc", city: "Marrakech", interests: [1, 12] },
  },
  {
    name: "Isabella Costa",
    email: "isabella.costa@test.com",
    bio: "Danseuse et sportive à Lisbonne",
    location: "Lisbonne",
    profile: { first_name: "Isabella", last_name: "Costa", age: 28, biography: "Danseuse de fado et professeure de capoeira à Lisbonne. Soirées fado dans l'Alfama et cours pour débutants.", country: "Portugal", city: "Lisbonne", interests: [13, 18] },
  },
  {
    name: "Pieter Van Berg",
    email: "pieter.vanberg@test.com",
    bio: "Cycliste et photographe à Amsterdam",
    location: "Amsterdam",
    profile: { first_name: "Pieter", last_name: "Van Berg", age: 36, biography: "Cycliste passionné des polders et photographe de paysages néerlandais. Tours guidés à vélo dans Amsterdam et ses environs.", country: "Pays-Bas", city: "Amsterdam", interests: [14, 11] },
  },
  {
    name: "Amina Diallo",
    email: "amina.diallo@test.com",
    bio: "Artiste et musicienne à Dakar",
    location: "Dakar",
    profile: { first_name: "Amina", last_name: "Diallo", age: 32, biography: "Artiste peintre et percussionniste sénégalaise. Ateliers de percussions africaines et expo peintures à Dakar.", country: "Sénégal", city: "Dakar", interests: [9, 10] },
  },
  {
    name: "Marco Rossi",
    email: "marco.rossi@test.com",
    bio: "Plongeur et naturaliste en Sicile",
    location: "Palerme",
    profile: { first_name: "Marco", last_name: "Rossi", age: 39, biography: "Biologiste marin et moniteur de plongée en Sicile. Exploration de la faune méditerranéenne et des épaves antiques.", country: "Italie", city: "Palerme", interests: [7, 15] },
  },

  // --- Quelques profils supplémentaires dans diverses villes ---
  {
    name: "Bastien Collin",
    email: "bastien.collin@test.com",
    bio: "Surfeur et triathlète à Bordeaux",
    location: "Bordeaux",
    profile: { first_name: "Bastien", last_name: "Collin", age: 24, biography: "Surfeur de Lacanau et triathlète en formation. Entraînements sur la côte atlantique girondine.", country: "France", city: "Bordeaux", interests: [6, 18] },
  },
  {
    name: "Priscilla Garnier",
    email: "priscilla.garnier@test.com",
    bio: "Artiste et musicienne à Lyon",
    location: "Lyon",
    profile: { first_name: "Priscilla", last_name: "Garnier", age: 28, biography: "Peintre expressionniste et violoniste. Expose dans les galeries du Vieux-Lyon et donne des concerts de musique de chambre.", country: "France", city: "Lyon", interests: [9, 10] },
  },
  {
    name: "Joël Hernandez",
    email: "joel.hernandez@test.com",
    bio: "Coach sportif et professeur de yoga",
    location: "Montpellier",
    profile: { first_name: "Joël", last_name: "Hernandez", age: 40, biography: "Coach fitness et professeur de yoga dynamique. Séances matinales en extérieur et coaching individuel à Montpellier.", country: "France", city: "Montpellier", interests: [18, 8] },
  },
  {
    name: "Pierrick Morin",
    email: "pierrick.morin@test.com",
    bio: "Randonneur et cycliste breton",
    location: "Rennes",
    profile: { first_name: "Pierrick", last_name: "Morin", age: 43, biography: "Passionné de randonnée sur le GR34 et de cyclotourisme en Bretagne. Connaît tous les sentiers côtiers du Finistère.", country: "France", city: "Rennes", interests: [3, 14] },
  },
  {
    name: "Béatrice Sartre",
    email: "beatrice.sartre@test.com",
    bio: "Cuisinière et jardinière lyonnaise",
    location: "Lyon",
    profile: { first_name: "Béatrice", last_name: "Sartre", age: 52, biography: "Cuisinière bouchon lyonnais et jardinière passionnée. Cours de cuisine traditionnelle et visites des marchés de Lyon.", country: "France", city: "Lyon", interests: [12, 17] },
  },
  {
    name: "Théo Capart",
    email: "theo.capart@test.com",
    bio: "Surfeur et photographe atlantic",
    location: "La Rochelle",
    profile: { first_name: "Théo", last_name: "Capart", age: 22, biography: "Surfeur passionné et photographe de vagues. Captures les meilleurs swells de la côte atlantique charentaise.", country: "France", city: "La Rochelle", interests: [6, 11] },
  },
  {
    name: "Isabelle Huet",
    email: "isabelle.huet@test.com",
    bio: "Danseuse et musicienne en Pays de la Loire",
    location: "Nantes",
    profile: { first_name: "Isabelle", last_name: "Huet", age: 45, biography: "Professeure de danse de salon et pianiste. Cours de valse, tango et musique classique à Nantes.", country: "France", city: "Nantes", interests: [13, 10] },
  },
  {
    name: "Antoine Rossi",
    email: "antoine.rossi@test.com",
    bio: "Historien de l'art lorrain",
    location: "Metz",
    profile: { first_name: "Antoine", last_name: "Rossi", age: 43, biography: "Historien de l'art et guide au Centre Pompidou-Metz. Conférences et ateliers autour de l'art moderne et contemporain.", country: "France", city: "Metz", interests: [16, 9] },
  },
  {
    name: "Léa Chabert",
    email: "lea.chabert@test.com",
    bio: "Cinéaste et artiste lyonnaise",
    location: "Lyon",
    profile: { first_name: "Léa", last_name: "Chabert", age: 27, biography: "Réalisatrice de courts-métrages et peintre. Membre de l'Institut Lumière, passionnée du cinéma des frères Lumière.", country: "France", city: "Lyon", interests: [20, 9] },
  },
  {
    name: "Emeline Saurel",
    email: "emeline.saurel@test.com",
    bio: "Jardinière maraîchère en Tarn-et-Garonne",
    location: "Montauban",
    profile: { first_name: "Emeline", last_name: "Saurel", age: 38, biography: "Maraîchère bio et paysagiste. Ateliers de jardinage naturel et création de potagers en permaculture.", country: "France", city: "Montauban", interests: [17, 15] },
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
      });

      // Créer le profile avec is_searchable
      await Profile.create({
        user_id: user.id,
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
