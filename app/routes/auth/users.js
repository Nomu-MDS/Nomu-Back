// Routes utilisateurs
import express from "express";
import { createUser, searchUsers, toggleSearchable, updateProfile, updateInterests, getProfileById } from "../../controllers/auth/usersController.js";
import { authenticateFirebase } from "../../middleware/authMiddleware.js";
import { User, Profile, Interest } from "../../models/index.js";

const router = express.Router();

// GET /users/me : profil de l'utilisateur connecté
router.get("/me", async (req, res) => {
  try {
    const user = await User.findOne({
      where: { firebase_uid: req.user.uid },
      include: [{ model: Profile, include: [Interest] }],
    });
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// GET /users/:id : afficher le profil public d'un utilisateur (PUBLIC)
router.get("/:id", authenticateFirebase, getProfileById);

// PATCH /users/profile : modifier le profil (+ intérêts optionnels)
router.patch("/profile", updateProfile);

// PUT /users/profile/interests : modifier uniquement les intérêts
router.put("/profile/interests", updateInterests);

// PATCH /users/searchable : activer/désactiver la visibilité
router.patch("/searchable", toggleSearchable);

// GET /users/search : recherche (enrichie si connecté)
router.get("/search", searchUsers);

router.post("/", createUser);

export default router;
