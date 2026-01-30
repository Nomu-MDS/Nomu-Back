// Routes d'authentification (Passport local)
import express from "express";
import bcrypt from "bcrypt";
import passport from "passport";
import { User, Profile, Wallet } from "../../models/index.js";
import { indexProfiles } from "../../services/meilisearch/meiliProfileService.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Signup: création user local + profile + wallet, puis login via session
router.post("/signup", async (req, res, next) => {
  const { name, email, password, role, is_active, is_searchable, bio, location } = req.body;
  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email déjà utilisé" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      is_active,
      bio,
      location,
    });

    const profile = await Profile.create({ user_id: user.id, is_searchable: is_searchable || false });
    const wallet = await Wallet.create({ user_id: user.id, balance: 0 });

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

    // Login automatique après signup
    req.login(user, (err) => {
      if (err) return next(err);
      // Retourner l'utilisateur (toJSON supprime password)
      // Générer un JWT pour le client (utile si front mobile)
      const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || process.env.SESSION_SECRET || "secret", { expiresIn: "7d" });
      return res.status(201).json({ user, profile, wallet, token });
    });
  } catch (err) {
    console.error("Erreur signup:", err);
    return res.status(500).json({ error: "Erreur création utilisateur" });
  }
});

// Login via Passport local strategy
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || "Authentication failed" });

    req.login(user, (err) => {
      if (err) return next(err);
      const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || process.env.SESSION_SECRET || "secret", { expiresIn: "7d" });
      return res.json({ user, token });
    });
  })(req, res, next);
});

export default router;
