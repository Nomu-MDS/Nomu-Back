// app/tests/testApp.js
// App Express minimale utilisée uniquement dans les tests.
// N'ouvre pas de port HTTP, ne démarre pas Meilisearch, ne se connecte pas à la DB.
// La connexion DB est gérée dans le beforeAll/afterAll de chaque fichier de test.

import express from "express";
import session from "express-session";
import passport from "passport";
import "../config/passport.js"; // enregistre la stratégie locale
import authRoutes from "../routes/auth/index.js";

export const createApp = () => {
  const app = express();

  app.use(express.json());

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "test-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.get("/health", (_req, res) => res.sendStatus(200));
  app.use("/auth", authRoutes);

  return app;
};
