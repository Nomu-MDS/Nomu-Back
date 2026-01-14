// Routes d'authentification
import express from "express";
import admin from "../../config/firebase.js";
import { User, Profile, Wallet } from "../../models/index.js";
import { indexProfiles } from "../../services/meilisearch/meiliProfileService.js";
import fetch from "node-fetch";
import bcrypt from "bcrypt";

const router = express.Router();

// Signup
router.post("/signup", async (req, res) => {
  const { name, email, password, role, is_active, is_searchable, bio, location } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Création Firebase
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    // Création User PostgreSQL
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      is_active,
      bio,
      location,
      firebase_uid: userRecord.uid,
    });

    // Création Profile avec is_searchable
    const profile = await Profile.create({
      user_id: user.id,
      is_searchable: is_searchable || false,
    });

    // Création Wallet avec solde initial à 0
    const wallet = await Wallet.create({
      user_id: user.id,
      balance: 0,
    });

    // Si l'utilisateur veut être visible, indexer le profil dans Meilisearch
    if (is_searchable) {
      await indexProfiles([{
        id: profile.id,
        user_id: user.id,
        name: user.name,
        location: user.location,
        bio: user.bio,
        biography: "",
        country: "",
        city: "",
        interests: "",
      }]);
    }

    const customToken = await admin.auth().createCustomToken(userRecord.uid);
    res.status(201).json({ user, profile, wallet, firebase_uid: userRecord.uid, firebaseToken: customToken });
  } catch (err) {
    if (err.code === "auth/email-already-exists") {
      res.status(400).json({ error: "Email already exists in Firebase." });
    } else if (err.name === "SequelizeUniqueConstraintError") {
      res.status(400).json({ error: "Email already exists in PostgreSQL." });
    } else {
      console.error("Erreur signup:", err);
      res.status(500).json({ error: "Erreur création utilisateur." });
    }
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const data = await response.json();
    if (data.error) {
      return res.status(401).json({ error: data.error.message });
    }
    
    // Récupérer les infos complètes de l'utilisateur
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Utilisateur non trouvé" });
    }

    res.json({ 
      idToken: data.idToken, 
      refreshToken: data.refreshToken, 
      email: data.email,
      user: {
        name: user.name,
        role: user.role,
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur login utilisateur" });
  }
});

export default router;
