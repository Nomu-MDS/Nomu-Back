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
      const { token, refreshToken } = issueTokens(user);
      return res.status(201).json({ user, profile, wallet, token, refreshToken });
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
      const { token, refreshToken } = issueTokens(user);
      return res.json({ user, token, refreshToken });
    });
  })(req, res, next);
});

// ── Google OAuth ────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "secret";
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET + "_refresh";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

function issueTokens(user) {
  const payload = { id: user.id, email: user.email };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: "30d" });
  return { token, refreshToken };
}

// Web/mobile redirect — ouvre la page Google
// ?mobile=1 → le flag est encodé dans le state OAuth (survit au redirect Google)
router.get("/google", (req, res, next) => {
  const mobile = req.query.mobile === "1";
  passport.authenticate("google", {
    scope: ["profile", "email"],
    state: mobile ? "mobile" : "web",
  })(req, res, next);
});

// Callback — Google redirige ici après auth
// req.query.state contient "mobile" ou "web" (renvoyé intact par Google)
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: `${CLIENT_URL}/login?error=google` }),
  (req, res) => {
    const { token, refreshToken } = issueTokens(req.user);
    if (req.query.state === "mobile") {
      const isNew = req.user._isNew ? "1" : "0";
      const photo = req.user._googlePhoto ? `&photo=${encodeURIComponent(req.user._googlePhoto)}` : "";
      return res.redirect(`nomufront://auth?token=${token}&refreshToken=${encodeURIComponent(refreshToken)}&new=${isNew}${photo}`);
    }
    const isNew = req.user._isNew ? "&new=1" : "";
    const photo = req.user._googlePhoto ? `&photo=${encodeURIComponent(req.user._googlePhoto)}` : "";
    res.redirect(`${CLIENT_URL}/auth/callback?token=${token}&refreshToken=${encodeURIComponent(refreshToken)}${isNew}${photo}`);
  }
);

// Mobile — échange un id_token Google contre un JWT Nomu
router.post("/google/token", async (req, res) => {
  const { id_token } = req.body;
  if (!id_token) return res.status(400).json({ error: "id_token requis" });

  try {
    const audiences = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_MOBILE_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
    ].filter(Boolean);

    if (audiences.length === 0) {
      console.error("[Google token] No GOOGLE_*_CLIENT_ID configured");
      return res.status(500).json({ error: "Configuration OAuth Google invalide (client_id manquant)" });
    }

    const ticket = await googleClient.verifyIdToken({ idToken: id_token, audience: audiences });
    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.status(401).json({ error: "Email Google manquant dans le token" });
    }
    if (payload.email_verified === false) {
      return res.status(401).json({ error: "Adresse email Google non vérifiée" });
    }

    const { sub: googleId, email, name, picture } = payload;
    const rawPhoto = picture || null;
    // Supprime le suffixe de taille Google (=s96-c) pour avoir la photo en haute qualité
    const googlePhoto = rawPhoto ? rawPhoto.replace(/=s\d+-c$/, "=s400-c") : null;

    let isNew = false;
    let user = await User.findOne({ where: { google_id: googleId } });
    if (!user) {
      user = await User.findOne({ where: { email } });
      if (user) {
        await user.update({ google_id: googleId });
        // Met à jour la photo si le profil n'en a pas encore
        if (googlePhoto) {
          const profile = await Profile.findOne({ where: { user_id: user.id } });
          if (profile && !profile.image_url) {
            await profile.update({ image_url: googlePhoto });
          }
        }
      } else {
        user = await User.create({
          name: name || email.split("@")[0],
          email,
          password: null,
          google_id: googleId,
          role: "user",
          is_active: true,
        });
        await Profile.create({ user_id: user.id, is_searchable: true, image_url: googlePhoto });
        await Wallet.create({ user_id: user.id, balance: 0 });
        isNew = true;
      }
    } else if (googlePhoto) {
      // Utilisateur existant : met à jour la photo si elle a changé
      const profile = await Profile.findOne({ where: { user_id: user.id } });
      if (profile && !profile.image_url) {
        await profile.update({ image_url: googlePhoto });
      }
    }

    const { token, refreshToken } = issueTokens(user);
    res.json({ token, refreshToken, user, is_new_user: isNew, google_photo: googlePhoto });
  } catch (err) {
    console.error("Google token error:", err.message);
    res.status(401).json({ error: "Token Google invalide" });
  }
});

// ── Refresh token ───────────────────────────────────────────────────────────────
router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "refreshToken requis" });

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await User.findByPk(payload.id);
    if (!user || !user.is_active) return res.status(401).json({ error: "Token invalide" });

    const tokens = issueTokens(user);
    return res.json(tokens);
  } catch {
    return res.status(401).json({ error: "Token invalide ou expiré" });
  }
});

export default router;
