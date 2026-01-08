// Routes d'authentification
import express from "express";
import admin from "../../config/firebase.js";
import { User, Profile } from "../../models/index.js";
import { indexUsers } from "../../services/meilisearch/meiliUserService.js";
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

    // Si l'utilisateur veut être visible, l'indexer dans Meilisearch
    if (is_searchable) {
      await indexUsers([{
        id: user.id,
        name: user.name,
        location: user.location,
        bio: user.bio,
        interests: "",
      }]);
    }

    const customToken = await admin.auth().createCustomToken(userRecord.uid);
    res.status(201).json({ user, profile, firebase_uid: userRecord.uid, firebaseToken: customToken });
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
    res.json({ idToken: data.idToken, refreshToken: data.refreshToken, email: data.email });
  } catch (err) {
    res.status(500).json({ error: "Erreur login utilisateur" });
  }
});

export default router;
