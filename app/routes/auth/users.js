// Routes utilisateurs
import express from "express";
import { createUser, searchUsers, toggleSearchable, updateProfile } from "../../controllers/auth/usersController.js";
import { User, Profile } from "../../models/index.js";

const router = express.Router();

// GET /users/me : profil de l'utilisateur connecté
router.get("/me", async (req, res) => {
  try {
    const user = await User.findOne({
      where: { firebase_uid: req.user.uid },
      include: [Profile],
    });
    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// PATCH /users/profile : modifier le profil
router.patch("/profile", updateProfile);

// PATCH /users/searchable : activer/désactiver la visibilité
router.patch("/searchable", toggleSearchable);

// GET /users/search : recherche (enrichie si connecté)
router.get("/search", searchUsers);

router.post("/", createUser);

export default router;
