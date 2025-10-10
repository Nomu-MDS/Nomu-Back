# Nomu-Back - API Backend avec PostgreSQL et Meilisearch

Backend Node.js pour l'application Nomu, utilisant PostgreSQL pour la base de données et Meilisearch pour la recherche avancée avec IA.

## 🚀 Technologies

- **Express.js** - Framework web
- **PostgreSQL** - Base de données relationnelle
- **Sequelize** - ORM pour PostgreSQL
- **Meilisearch** - Moteur de recherche avec support IA
- **OpenAI Embeddings** - Recherche sémantique
- **Docker** - Containerisation

## 📦 Installation

### Prérequis
- Node.js v20+
- Docker et Docker Compose
- Une clé API OpenAI (pour la recherche sémantique)

### Configuration

1. Cloner le projet
```bash
git clone <repo-url>
cd Nomu-Back
```

2. Créer un fichier `.env` à la racine :
```env
# Port de l'application
PORT=3001

# Configuration PostgreSQL
DB_NAME=nomu_db
DB_USER=nomu_user
DB_PASSWORD=nomu_password
DB_HOST=postgres

# Configuration Meilisearch
MEILI_HOST=http://meilisearch:7700
MEILI_API_KEY=votre_cle_master
MEILI_MASTER_KEY=votre_cle_master

# OpenAI pour recherche sémantique
OPENAI_API_KEY=sk-votre-cle-openai
```

3. Lancer avec Docker Compose
```bash
docker-compose up -d
```

## 🗄️ Structure du Projet

```
app/
├── config/
│   ├── database.js       # Configuration Sequelize PostgreSQL
│   └── meilisearch.js    # Configuration Meilisearch
├── models/
│   ├── User.js           # Modèle Utilisateur
│   ├── Profil.js         # Modèle Profil
│   ├── Interet.js        # Modèle Intérêt
│   └── index.js          # Relations et exports
├── controllers/
│   ├── usersController.js    # Contrôleur Users
│   └── localsController.js   # Contrôleur Locals
├── routes/
│   ├── usersRoutes.js        # Routes Users
│   └── localsRoutes.js       # Routes Locals
├── services/
│   ├── meiliUserService.js   # Service recherche Users
│   └── meiliService.js       # Service recherche Locals
├── scripts/
│   ├── setupAIEmbedder.js    # Configuration embedder OpenAI
│   └── enableVectorStore.js  # Activation vector store
└── server.js             # Point d'entrée
```

## 📡 API Endpoints

### Users
- `POST /users` - Créer un utilisateur
- `GET /users/search?q=query&hybrid=true&semanticRatio=0.5` - Recherche hybride
- `GET /users/semantic-search?q=query&limit=20` - Recherche sémantique pure

### Locals
- `GET /locals` - Récupérer tous les locaux
- `POST /locals` - Ajouter des locaux
- `GET /locals/search?q=query` - Rechercher des locaux

## 🔧 Scripts NPM

```bash
# Démarrer l'application
npm start

# Activer le vector store de Meilisearch
npm run enable-vector

# Configurer l'embedder OpenAI
npm run setup-ai
```

## 🐳 Services Docker

- **API Express** : Port 3001
- **PostgreSQL** : Port 5432
- **Meilisearch** : Port 7700
- **Adminer** (interface DB) : Port 8080

## 🔍 Configuration Meilisearch

Après le premier lancement, configurer la recherche IA :

```bash
# 1. Activer le vector store
npm run enable-vector

# 2. Configurer l'embedder OpenAI (si nécessaire)
npm run setup-ai
```

## 🗂️ Modèles de Données

### User
- id, name, email, password, role, actif, bio, location

### Profil
- ID, Lastname, Firstname, Age, Biography, Country, City, ImgUrl
- Relations : belongsTo User, belongsToMany Interet

### Interet
- ID, Name, Icon, Actif
- Relations : belongsToMany Profil

## 📝 Notes

- La base de données se synchronise automatiquement au démarrage (`alter: true`)
- Les utilisateurs sont automatiquement indexés dans Meilisearch lors de la création
- La recherche hybride combine recherche textuelle et sémantique
- Adminer est accessible sur http://localhost:8080 pour gérer PostgreSQL

## 🛠️ Développement

Pour développer en local :

```bash
# Installer les dépendances
npm install

# Démarrer les services (DB + Meilisearch)
docker-compose up -d postgres meilisearch

# Démarrer l'API en local
npm start
```
