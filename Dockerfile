# Utilise l'image officielle Node.js v20
FROM node:20

# Définit le répertoire de travail dans le conteneur
WORKDIR /app

# Copie les fichiers de dépendances
COPY package*.json ./

# Installe les dépendances
RUN npm install

# Copie le reste du code source dans le conteneur
COPY . .

# Expose le port sur lequel l'app Express écoute
EXPOSE 3001

# Commande pour lancer le serveur (corrigée pour app/server.js)
CMD ["node", "app/server.js"]
