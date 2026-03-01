// Routes utilisateurs
import express from "express";
import { createUser, searchUsers, toggleSearchable, updateProfile, updateInterests, getProfileById } from "../../controllers/auth/usersController.js";
import { authenticateSession } from "../../middleware/authMiddleware.js";
import { User, Profile, Interest } from "../../models/index.js";
import minioService from "../../services/storage/minioService.js";

const router = express.Router();

// GET /users/me : profil de l'utilisateur connecté
router.get("/me", authenticateSession, async (req, res) => {
  try {
    const userId = req.user?.dbUser?.id;
    if (!userId) return res.status(401).json({ error: "Utilisateur non authentifié" });

    const user = await User.findOne({
      where: { id: userId },
      include: [{ model: Profile, include: [Interest] }],
    });
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    // Résoudre le path Minio → URL complète avant d'envoyer au client
    const userJson = user.toJSON();
    if (userJson.Profile?.image_url) {
      userJson.Profile.image_url = minioService.resolveUrl(userJson.Profile.image_url);
    }
    res.json(userJson);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PATCH /users/profile : modifier le profil (+ intérêts optionnels)
router.patch("/profile", authenticateSession, updateProfile);

// PUT /users/profile/interests : modifier uniquement les intérêts
router.put("/profile/interests", authenticateSession, updateInterests);

// PATCH /users/searchable : activer/désactiver la visibilité
router.patch("/searchable", authenticateSession, toggleSearchable);

// GET /users/search : recherche (enrichie si connecté)
router.get("/search", searchUsers);

router.post("/", createUser);

// GET /users/:id : afficher le profil public d'un utilisateur (doit être en dernier)
router.get("/:id", getProfileById);

export default router;
