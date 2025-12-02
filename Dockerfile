# Utilise l'image officielle Node.js v20
FROM node:20

# Répertoire de travail
WORKDIR /app

# Copie les fichiers de dépendances
COPY package*.json ./

# Installe les dépendances + nodemon pour le dev
RUN npm install && npm install -g nodemon

# Copie le reste du code
COPY . .

# Expose le port de l'app
EXPOSE 3001

# Lancer avec nodemon pour recharger automatiquement en dev
CMD ["npm", "run", "dev"]
