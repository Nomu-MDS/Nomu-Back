// routes/adminUsers.js
import express from "express";
import {
  adminGetAllUsers,
  adminGetUserById,
  adminUpdateUser,
  adminDeleteUser,
} from "../controllers/adminUsersController.js";
import { authenticateSession, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Routes admin (toutes protégées par authenticateSession + isAdmin)
// GET /admin/users : liste tous les utilisateurs avec pagination
router.get("/users", authenticateSession, isAdmin, adminGetAllUsers);

// GET /admin/users/:id : récupérer un utilisateur par ID
router.get("/users/:id", authenticateSession, isAdmin, adminGetUserById);

// PUT /admin/users/:id : mettre à jour un utilisateur (is_active et role uniquement)
router.put("/users/:id", authenticateSession, isAdmin, adminUpdateUser);

// DELETE /admin/users/:id : supprimer un utilisateur
router.delete("/users/:id", authenticateSession, isAdmin, adminDeleteUser);

export default router;
