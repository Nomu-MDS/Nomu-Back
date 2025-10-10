# Nomu-Back

Backend API avec Express.js, PostgreSQL 16, et MeiliSearch.

## 🚀 Installation rapide

### 1. Cloner le projet
```bash
git clone https://github.com/Crmy7/Nomu-Back.git
```

### 2. Configurer les variables d'environnement
```bash
cp .env.example .env
```

Éditez le fichier `.env` avec vos valeurs

### 3. Lancer le projet avec Docker
```bash
docker-compose up -d --build
```

## 🐳 Commandes Docker

### Démarrer les conteneurs
```bash
docker-compose up -d
```

### Démarrer avec reconstruction des images
```bash
docker-compose up -d --build
```

### Arrêter les conteneurs
```bash
docker-compose down
```

### Arrêter et supprimer les volumes (⚠️ supprime les données)
```bash
docker-compose down -v
```

### Voir les logs
```bash
# Tous les services
docker-compose logs -f

# Un service spécifique
docker-compose logs -f api
docker-compose logs -f postgres
```

### Redémarrer un service
```bash
docker-compose restart api
docker-compose restart postgres
```

### Voir l'état des conteneurs
```bash
docker-compose ps
```

### Accéder au shell d'un conteneur
```bash
# API
docker exec -it express-api sh

# PostgreSQL
docker exec -it postgres-nomu psql -U nomu_user -d nomu_db
```

## 🌐 Accès aux services

Une fois lancé, accédez à :

- **API** : http://localhost:3001
- **Adminer** (interface PostgreSQL) : http://localhost:8080
- **MeiliSearch** : http://localhost:7700

### Connexion à Adminer

Sur http://localhost:8080, connectez-vous avec :
- **Système** : PostgreSQL
- **Serveur** : `postgres`
- **Utilisateur** : valeur de `DB_USER`
- **Mot de passe** : valeur de `DB_PASSWORD`
- **Base de données** : valeur de `DB_NAME`

## 📦 Stack Technique

- **Node.js 20** - Runtime
- **Express.js** - Framework web
- **PostgreSQL 16** - Base de données
- **Sequelize** - ORM
- **MeiliSearch 1.7** - Moteur de recherche
- **Adminer** - Interface d'administration PostgreSQL
- **Docker & Docker Compose** - Conteneurisation

## 🔧 Développement local (sans Docker)

```bash
# Installer les dépendances
npm install

# Lancer le serveur
npm start

# Mode développement
npm run dev
```

⚠️ Nécessite PostgreSQL et MeiliSearch installés localement.

## 📂 Structure

```
Nomu-Back/
├── config/           # Configuration (database, etc.)
├── data.ms/          # Données MeiliSearch
├── logs/             # Logs de l'application
├── docker-compose.yml
├── Dockerfile
├── index.js
├── package.json
└── .env.example
```