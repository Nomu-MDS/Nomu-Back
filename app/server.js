require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize, testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Nomu API',
    database: 'PostgreSQL 16',
    version: '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'PostgreSQL',
    uptime: process.uptime()
  });
});

// Fonction pour initialiser la base de données
async function initializeDatabase() {
  try {
    await testConnection();
    
    await sequelize.sync({ alter: false });
    console.log('✅ Modèles synchronisés avec PostgreSQL');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📊 Database: PostgreSQL 16`);
  });
}

startServer();

module.exports = app;
