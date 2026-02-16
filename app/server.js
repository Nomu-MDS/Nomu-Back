// app/server.js

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors"; // ✅ Ajoute cet import
import { createServer } from "http";
import { Server } from "socket.io";
import session from "express-session";
import passport from "passport";
import "./config/passport.js";
import usersRoutes from "./routes/auth/users.js";
import authRoutes from "./routes/auth/index.js";
import reservationsRoutes from "./routes/reservations/index.js";
import conversationsRoutes from "./routes/conversations/index.js";
import interestsRoutes from "./routes/interests.js";
import tokensRoutes from "./routes/tokens/index.js";
import adminUsersRoutes from "./routes/adminUsers.js";
import reportsRoutes from "./routes/reports/index.js";
import adminReportsRoutes from "./routes/reports/admin.js";
import { authenticateSession } from "./middleware/authMiddleware.js";
import { sequelize, User, Profile, Interest } from "./models/index.js";
import { indexProfiles } from "./services/meilisearch/meiliProfileService.js";

console.log(`🗂️  Index Meilisearch profils utilisé : ${process.env.MEILI_INDEX_PROFILES}`);
import { socketAuthMiddleware } from "./services/websocket/socketAuth.js";
import { setupChatHandlers } from "./services/websocket/chatService.js";

const app = express();
const httpServer = createServer(app);

// ✅ Determine CORS origins (web + mobile)
let corsOrigins;
if (process.env.NODE_ENV === "production") {
  if (!process.env.CLIENT_URL) {
    throw new Error("CLIENT_URL must be set in production for CORS security.");
  }
  // En production : autorise ton site web et potentiellement ton app mobile
  corsOrigins = [
    process.env.CLIENT_URL, // https://ton-site.com
    process.env.MOBILE_APP_URL || null // Si tu as une URL spécifique pour React Native
  ].filter(Boolean);
} else {
  // En développement : autorise Nuxt (3000) et React Native (peut utiliser Expo sur un autre port)
  corsOrigins = [
    "http://localhost:3000", // Nuxt web
    "http://localhost:8081", // React Native / Expo (port par défaut)
    "http://localhost:19006", // Expo web
    "exp://localhost:8081", // Expo protocol
  ];
}

// ✅ Configure CORS pour Express (REST API)
app.use(cors({
  origin: function (origin, callback) {
    // Autorise les requêtes sans origin (apps mobiles natives, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (corsOrigins.indexOf(origin) !== -1 || corsOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ✅ Configure CORS pour Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"],
    credentials: true
  },
});

app.use(express.json());

// Session middleware for Passport (in-memory store; replace for production)
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "keyboard cat",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax',
    httpOnly: true
  },
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/auth", authRoutes);
app.use("/users", authenticateSession, usersRoutes);
app.use("/interests", interestsRoutes);
app.use("/reservations", reservationsRoutes);
app.use("/conversations", authenticateSession, conversationsRoutes);
app.use("/tokens", tokensRoutes);
app.use("/reports", authenticateSession, reportsRoutes);
app.use("/admin", adminUsersRoutes);
app.use("/admin/reports", adminReportsRoutes);

// Configuration Socket.IO: rattacher la session express puis authentifier
io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});
io.use(socketAuthMiddleware);

io.on("connection", (socket) => {
  setupChatHandlers(io, socket);
});

// Configuration automatique de Meilisearch Vector Store
const setupMeilisearchAI = async () => {
  const MEILI_HOST = process.env.MEILI_HOST || "http://localhost:7700";
  const MEILI_API_KEY = process.env.MEILI_API_KEY;
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    console.log(
      "⚠️  OPENAI_API_KEY non configurée - recherche sémantique désactivée"
    );
    return;
  }

  try {
    // 1. Activer le vector store
    console.log("🔧 Configuration Meilisearch AI...");
    const vectorResponse = await fetch(`${MEILI_HOST}/experimental-features`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MEILI_API_KEY}`,
      },
      body: JSON.stringify({ vectorStore: true }),
    });

    if (!vectorResponse.ok) {
      const error = await vectorResponse.text();
      throw new Error(`Vector store: ${error}`);
    }

    // 2. Configurer l'embedder OpenAI (inclut les intérêts)
    const embedderConfig = {
      "profiles-openai": {
        source: "openAi",
        apiKey: OPENAI_API_KEY,
        model: "text-embedding-3-small",
        documentTemplate:
          "{{doc.name}}, {{doc.location}}. {{doc.biography}}. Intérêts: {{doc.interests}}. {{doc.country}}, {{doc.city}}",
      },
    };

    const embedderResponse = await fetch(
      `${MEILI_HOST}/indexes/${process.env.MEILI_INDEX_PROFILES}/settings/embedders`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MEILI_API_KEY}`,
        },
        body: JSON.stringify(embedderConfig),
      }
    );

    if (!embedderResponse.ok) {
      const error = await embedderResponse.text();
      throw new Error(`Embedder: ${error}`);
    }

    // 3. Configurer les filterable attributes pour filtrer par intérêts
    await fetch(`${MEILI_HOST}/indexes/${process.env.MEILI_INDEX_PROFILES}/settings/filterable-attributes`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MEILI_API_KEY}`,
      },
      body: JSON.stringify(["interests", "location", "country", "city"]),
    });

    console.log("✅ Meilisearch AI configuré (recherche sémantique activée)");
  } catch (err) {
    console.error("⚠️  Erreur configuration Meilisearch AI:", err.message);
  }
};

const start = async () => {
  try {
    let connected = false;
    let attempts = 0;

    // Connexion à PostgreSQL avec retry
    while (!connected && attempts < 10) {
      try {
        await sequelize.authenticate();
        connected = true;
      } catch (err) {
        attempts++;
        console.log(
          `❌ DB connection failed (attempt ${attempts}/10): ${err.message}`
        );
        await new Promise((res) => setTimeout(res, 3000));
      }
    }

    await sequelize.sync({ alter: true });
    console.log("✅ DB synced");

    // Configurer Meilisearch AI AVANT d'indexer les utilisateurs
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Attendre Meilisearch
    await setupMeilisearchAI();
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Laisser l'embedder se configurer

    // Ré-indexer les profils searchable dans Meilisearch
    try {
      const profiles = await Profile.findAll({
        where: { is_searchable: true },
        include: [
          { model: User },
          { model: Interest },
        ],
      });

      if (profiles.length > 0) {
        const profilesData = profiles.map((profile) => ({
          id: profile.id,
          user_id: profile.user_id,
          name: profile.User?.name || "",
          location: profile.User?.location || profile.city || "",
          bio: profile.User?.bio || "",
          biography: profile.biography || "",
          country: profile.country || "",
          city: profile.city || "",
          interests: profile.Interests?.map((i) => i.name) || [],
        }));
        await indexProfiles(profilesData);
        console.log(`✅ ${profiles.length} profil(s) indexé(s) dans Meilisearch`);
      } else {
        console.log("ℹ️  Aucun profil searchable à indexer");
      }
    } catch (err) {
      console.error("⚠️  Erreur lors de l'indexation:", err.message);
    }

    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 WebSocket server ready`);
      console.log(`✅ CORS enabled for: ${corsOrigins.join(", ")}`);
    });
  } catch (err) {
    console.error("Fatal error:", err);
  }
};

start();