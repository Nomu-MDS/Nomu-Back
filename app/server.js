// app/server.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import usersRoutes from "./routes/auth/users.js";
import authRoutes from "./routes/auth/index.js";
import localsRoutes from "./routes/meilisearch/locals.js";
import reservationsRoutes from "./routes/reservations/index.js";
import conversationsRoutes from "./routes/conversations/index.js";
import { authenticateFirebase } from "./middleware/authMiddleware.js";
import { sequelize, User, Profile, Interest } from "./models/index.js";
import { indexUsers } from "./services/meilisearch/meiliUserService.js";
import { socketAuthMiddleware } from "./services/websocket/socketAuth.js";
import { setupChatHandlers } from "./services/websocket/chatService.js";

dotenv.config();
const app = express();
const httpServer = createServer(app);

// Determine CORS origin securely
let corsOrigin;
if (process.env.NODE_ENV === "production") {
  if (!process.env.CLIENT_URL) {
    throw new Error("CLIENT_URL must be set in production for CORS security.");
  }
  corsOrigin = process.env.CLIENT_URL;
} else {
  corsOrigin = process.env.CLIENT_URL || "*";
}

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
});

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/users", authenticateFirebase, usersRoutes);
app.use("/locals", localsRoutes);
app.use("/reservations", reservationsRoutes);
app.use("/conversations", authenticateFirebase, conversationsRoutes);

// Configuration Socket.IO
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
      "users-openai": {
        source: "openAi",
        apiKey: OPENAI_API_KEY,
        model: "text-embedding-3-small",
        documentTemplate:
          "{{doc.name}}, {{doc.location}}. Bio: {{doc.bio}}. Intérêts: {{doc.interests}}",
      },
    };

    const embedderResponse = await fetch(
      `${MEILI_HOST}/indexes/users/settings/embedders`,
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
    await fetch(`${MEILI_HOST}/indexes/users/settings/filterable-attributes`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MEILI_API_KEY}`,
      },
      body: JSON.stringify(["interests", "location"]),
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

    // Ré-indexer les utilisateurs searchable dans Meilisearch
    try {
      const users = await User.findAll({
        where: { is_searchable: true },
        include: [{ model: Profile, include: [Interest] }],
      });

      if (users.length > 0) {
        const usersData = users.map((user) => ({
          id: user.id,
          name: user.name,
          location: user.location,
          bio: user.bio,
          interests: user.Profile?.Interests?.map((i) => i.name).join(", ") || "",
        }));
        await indexUsers(usersData);
        console.log(`✅ ${users.length} utilisateur(s) indexé(s) dans Meilisearch`);
      } else {
        console.log("ℹ️  Aucun utilisateur searchable à indexer");
      }
    } catch (err) {
      console.error("⚠️  Erreur lors de l'indexation:", err.message);
    }

    const PORT = process.env.PORT || 3001;
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔌 WebSocket server ready`);
    });
  } catch (err) {
    console.error("Fatal error:", err);
  }
};

start();
