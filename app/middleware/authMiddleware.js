import admin from "../config/firebase.js";
import { User } from "../models/index.js";

export const authenticateFirebase = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token manquant" });
  }
  const idToken = authHeader.split(" ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const dbUser = await User.findOne({ where: { firebase_uid: decodedToken.uid } });
    req.user = { ...decodedToken, dbUser };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalide" });
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
