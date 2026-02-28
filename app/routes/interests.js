// routes/interests.js
import express from "express";
import { 
  getAllInterests,
  adminGetAllInterests,
  adminGetInterestById,
  adminCreateInterest,
  adminUpdateInterest,
  adminDeleteInterest
} from "../controllers/interestsController.js";
import { authenticateSession, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Routes publiques
// GET /interests : liste tous les intérêts disponibles (actifs uniquement)
router.get("/", getAllInterests);

// Routes admin (protégées)
// GET /interests/admin : liste tous les intérêts (incluant inactifs)
router.get("/admin", authenticateSession, isAdmin, adminGetAllInterests);

// GET /interests/admin/:id : récupérer un intérêt par ID
router.get("/admin/:id", authenticateSession, isAdmin, adminGetInterestById);

// POST /interests/admin : créer un nouvel intérêt
router.post("/admin", authenticateSession, isAdmin, adminCreateInterest);

// PUT /interests/admin/:id : mettre à jour un intérêt
router.put("/admin/:id", authenticateSession, isAdmin, adminUpdateInterest);

// DELETE /interests/admin/:id : supprimer un intérêt
router.delete("/admin/:id", authenticateSession, isAdmin, adminDeleteInterest);

export default router;
