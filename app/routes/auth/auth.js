// Routes d'authentification (Passport local)
import express from "express";
import bcrypt from "bcrypt";
import passport from "passport";
import { OAuth2Client } from "google-auth-library";
import { User, Profile, Wallet } from "../../models/index.js";
import { indexProfiles } from "../../services/meilisearch/meiliProfileService.js";
import jwt from "jsonwebtoken";

const googleClient = new OAuth2Client();

const router = express.Router();

// Signup: création user local + profile + wallet, puis login via session
router.post("/signup", async (req, res, next) => {
  // role et is_active ne sont jamais acceptés du client — forcés côté serveur
  const { name, email, password, is_searchable, bio, location } = req.body;
  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: "Email déjà utilisé" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
      is_active: true,
      location,
    });

    const searchable = is_searchable !== false && is_searchable !== "false";

    const profile = await Profile.create({
      user_id: user.id,
      is_searchable: searchable,
      bio: bio || null,
    });
    const wallet = await Wallet.create({ user_id: user.id, balance: 0 });

    if (searchable) {
      await indexProfiles([
        {
          id: profile.id,
          user_id: user.id,
          name: user.name,
          location: user.location,
          bio: profile.bio || "",
          biography: "",
          country: "",
          city: "",
          interests: [],
          image_url: "",
        },
      ]);
    }

    // Login automatique après signup
    req.login(user, (err) => {
      if (err) return next(err);
      // Retourner l'utilisateur (toJSON supprime password)
      // Générer un JWT pour le client (utile si front mobile)
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || process.env.SESSION_SECRET || "secret",
        { expiresIn: "7d" },
      );
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
    if (!user)
      return res
        .status(401)
        .json({ error: info?.message || "Authentication failed" });

    req.login(user, (err) => {
      if (err) return next(err);
      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || process.env.SESSION_SECRET || "secret",
        { expiresIn: "7d" },
      );
      return res.json({ user, token });
    });
  })(req, res, next);
});

// ── Google OAuth ────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "secret";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// Web/mobile redirect — ouvre la page Google
// ?mobile=1 → redirige vers nomufront:// après auth (Expo WebBrowser)
router.get("/google", (req, res, next) => {
  if (req.query.mobile === "1") req.session.googleOAuthMobile = true;
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

// Callback — Google redirige ici après auth
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${CLIENT_URL}/login?error=google` }),
  (req, res) => {
    const token = jwt.sign(
      { id: req.user.id, email: req.user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    if (req.session?.googleOAuthMobile) {
      req.session.googleOAuthMobile = false;
      const isNew = req.user._isNew ? "1" : "0";
      return res.redirect(`nomufront://auth?token=${token}&new=${isNew}`);
    }
    const isNew = req.user._isNew ? "&new=1" : "";
    res.redirect(`${CLIENT_URL}/auth/callback?token=${token}${isNew}`);
  }
);

// Mobile — échange un id_token Google contre un JWT Nomu
router.post("/google/token", async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) return res.status(400).json({ error: "id_token requis" });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: id_token,
      audience: [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_MOBILE_CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID].filter(Boolean),
    });
    const { sub: googleId, email, name } = ticket.getPayload();

    let isNew = false;
    let user = await User.findOne({ where: { google_id: googleId } });
    if (!user) {
      user = await User.findOne({ where: { email } });
      if (user) {
        await user.update({ google_id: googleId });
      } else {
        user = await User.create({
          name: name || email.split("@")[0],
          email,
          password: null,
          google_id: googleId,
          role: "user",
          is_active: true,
        });
        await Profile.create({ user_id: user.id, is_searchable: true });
        await Wallet.create({ user_id: user.id, balance: 0 });
        isNew = true;
      }
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user, is_new_user: isNew });
  } catch (err) {
    console.error("Google token error:", err.message);
    res.status(401).json({ error: "Token Google invalide" });
  }
});

export default router;
