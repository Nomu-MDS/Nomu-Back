// app/server.js

import "dotenv/config"; // doit être le premier import — charge .env avant tout autre module

import express from "express";
import cors from "cors"; // ✅ Ajoute cet import
import { createServer, request as httpRequest } from "http";
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
import uploadRoutes from "./routes/upload/index.js";
import adminUsersRoutes from "./routes/adminUsers.js";
import reportsRoutes from "./routes/reports/index.js";
import adminReportsRoutes from "./routes/reports/admin.js";
import { authenticateSession, authenticateOptional } from "./middleware/authMiddleware.js";
import { initBuckets } from "./config/minio.js";
import { sequelize, User, Profile, Interest } from "./models/index.js";
import { indexProfiles } from "./services/meilisearch/meiliProfileService.js";
import { reindexAllProfiles } from "./services/meilisearch/reindexService.js";

console.log(
  `🗂️  Index Meilisearch profils utilisé : ${process.env.MEILI_INDEX_PROFILES}`,
);
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
    process.env.MOBILE_APP_URL || null, // Si tu as une URL spécifique pour React Native
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
app.use(
  cors({
    origin: function (origin, callback) {
      // Autorise les requêtes sans origin (apps mobiles natives, Postman, etc.)
      if (!origin) return callback(null, true);

      if (corsOrigins.indexOf(origin) !== -1 || corsOrigins.includes("*")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// ✅ Configure CORS pour Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(express.json({ limit: "70mb" }));

// Endpoint de santé — appelé par Docker pour vérifier que l'API est prête
// Pas d'auth, pas de session : doit répondre le plus tôt possible
app.get("/health", (_req, res) => res.sendStatus(200));

// Session middleware for Passport (in-memory store; replace for production)
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || "keyboard cat",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    httpOnly: true,
  },
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use("/auth", authRoutes);
app.use("/users", authenticateOptional, usersRoutes);
app.use("/interests", interestsRoutes);
app.use("/reservations", reservationsRoutes);
app.use("/conversations", authenticateSession, conversationsRoutes);
app.use("/tokens", tokensRoutes);
app.use("/reports", authenticateSession, reportsRoutes);
app.use("/admin", adminUsersRoutes);
app.use("/admin/reports", adminReportsRoutes);
app.use("/upload", authenticateSession, uploadRoutes);

// En dev : proxy transparent vers Minio pour que les images soient accessibles
// via la même URL que l'API (ex: cloudflared tunnel unique).
// En prod, Nginx gère /profiles/* et /messages/* directement.
if (process.env.NODE_ENV !== "production") {
  app.get(/^\/(profiles|messages)\//, (req, res) => {
    const minioHost = process.env.MINIO_ENDPOINT || "localhost";
    const minioPort = parseInt(process.env.MINIO_PORT) || 9000;
    const proxyReq = httpRequest(
      { hostname: minioHost, port: minioPort, path: req.path, method: "GET" },
      (proxyRes) => {
        res.set("Content-Type", proxyRes.headers["content-type"] || "application/octet-stream");
        res.set("Cache-Control", "public, max-age=604800");
        proxyRes.pipe(res);
      }
    );
    proxyReq.on("error", () => res.status(502).end());
    proxyReq.end();
  });
  console.log("🖼️  Minio proxy actif sur /profiles/* et /messages/*");
}

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
      "⚠️  OPENAI_API_KEY non configurée - recherche sémantique désactivée",
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
      },
    );

    if (!embedderResponse.ok) {
      const error = await embedderResponse.text();
      throw new Error(`Embedder: ${error}`);
    }

    // 3. Configurer les filterable attributes pour filtrer par intérêts
    await fetch(
      `${MEILI_HOST}/indexes/${process.env.MEILI_INDEX_PROFILES}/settings/filterable-attributes`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${MEILI_API_KEY}`,
        },
        body: JSON.stringify(["interests", "location", "country", "city"]),
      },
    );

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
          `❌ DB connection failed (attempt ${attempts}/10): ${err.message}`,
        );
        await new Promise((res) => setTimeout(res, 3000));
      }
    }

    if (!connected) {
      throw new Error(
        "Impossible de se connecter à PostgreSQL après 10 tentatives.",
      );
    }

    // En développement : alter:true adapte les tables aux modèles (pratique pour itérer)
    // En production  : alter:false — on crée uniquement les tables manquantes,
    //                  sans jamais modifier les colonnes existantes (évite les corruptions)
    //                  Les changements de schéma en prod doivent passer par des migrations.
    await sequelize.sync({ alter: process.env.NODE_ENV !== "production" });
    console.log("✅ DB synced");

    // Initialiser les buckets Minio
    try {
      await initBuckets();
      console.log("✅ Minio buckets initialized");
    } catch (err) {
      console.warn("⚠️  Minio init failed (storage may not work):", err.message);
    }

    // Configurer Meilisearch AI AVANT d'indexer les utilisateurs
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Attendre Meilisearch
    await setupMeilisearchAI();
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Laisser l'embedder se configurer

    // Indexation initiale des profils au démarrage
    try {
      await reindexAllProfiles();
    } catch (err) {
      console.error("⚠️  Erreur lors de l'indexation initiale:", err.message);
    }

    // Réindexation automatique toutes les 2h pour rester synchronisé avec la DB
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    setInterval(async () => {
      console.log("🔄 Réindexation automatique des profils (toutes les 2h)...");
      try {
        await reindexAllProfiles();
      } catch (err) {
        console.error(
          "⚠️  Erreur lors de la réindexation automatique:",
          err.message,
        );
      }
    }, TWO_HOURS);

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
