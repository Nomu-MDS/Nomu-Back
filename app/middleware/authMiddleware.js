import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;

// Session / Passport or JWT based authentication
export const authenticateSession = async (req, res, next) => {
  try {
    // 1) Prefer session-based Passport authentication
    if (req.isAuthenticated && req.isAuthenticated()) {
      // Ne pas re-wrapper si authenticateOptional a déjà normalisé req.user
      if (!req.user?.dbUser) {
        req.user = { dbUser: req.user };
      }
      return next();
    }

    // 2) Fallback to Authorization: Bearer <JWT>
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      if (!JWT_SECRET) {
        console.error("JWT_SECRET non configuré");
        return res.status(500).json({ error: "Configuration serveur invalide" });
      }
      const token = authHeader.split(" ")[1];
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        const userId = payload.id || payload.userId || payload.sub;
        if (!userId) return res.status(401).json({ error: "Token invalide" });

        const user = await User.findByPk(userId);
        if (!user) return res.status(401).json({ error: "Utilisateur introuvable" });

        req.user = { dbUser: user };
        return next();
      } catch (err) {
        return res.status(401).json({ error: "Token invalide" });
      }
    }

    return res.status(401).json({ error: "Utilisateur non authentifié" });
  } catch (err) {
    console.error("Erreur authenticateSession:", err);
    return res.status(500).json({ error: "Erreur vérification session" });
  }
};

// Middleware optionnel : identifie l'utilisateur s'il est connecté, mais ne bloque pas sinon
export const authenticateOptional = async (req, res, next) => {
  try {
    // 1) Session Passport
    if (req.isAuthenticated && req.isAuthenticated()) {
      if (!req.user?.dbUser) {
        req.user = { dbUser: req.user };
      }
      return next();
    }

    // 2) JWT Bearer
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      if (!JWT_SECRET) return next(); // Pas de secret configuré — on passe sans auth
      const token = authHeader.split(" ")[1];
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        const userId = payload.id || payload.userId || payload.sub;
        if (userId) {
          const user = await User.findByPk(userId);
          if (user) req.user = { dbUser: user };
        }
      } catch (err) {
        // Token invalide — on continue sans utilisateur
      }
    }

    return next();
  } catch (err) {
    console.error("Erreur authenticateOptional:", err);
    return next();
  }
};

// Middleware pour vérifier que l'utilisateur est admin
export const isAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.dbUser) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    if (req.user.dbUser.role !== "admin") {
      return res.status(403).json({ error: "Accès interdit : droits administrateur requis" });
    }

    next();
  } catch (err) {
    console.error("Erreur isAdmin middleware:", err);
    return res.status(500).json({ error: "Erreur vérification droits admin" });
  }
};
