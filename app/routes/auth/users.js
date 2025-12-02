// Routes utilisateurs
import express from "express";
import { createUser, searchUsers, semanticSearch } from "../../controllers/auth/usersController.js";
import { authenticateFirebase } from "../../middleware/authMiddleware.js";
import { User } from "../../models/index.js";

const router = express.Router();

// GET /users/me : profil privé de l'utilisateur connecté
router.get("/me", authenticateFirebase, async (req, res) => {
  try {
    const firebase_uid = req.user.uid;
    const user = await User.findOne({ where: { firebase_uid } });
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.post("/", createUser);
router.get("/search", searchUsers);
router.get("/semantic-search", semanticSearch);

export default router;
