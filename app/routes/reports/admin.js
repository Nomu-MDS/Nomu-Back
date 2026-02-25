// routes/reports/admin.js
import express from "express";
import {
  adminGetAllReports,
  adminGetReportById,
  adminUpdateReportStatus,
  adminDeleteReport,
  adminGetReportsStats
} from "../../controllers/reports/adminReportsController.js";
import { authenticateSession, isAdmin } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Routes admin pour la gestion des signalements (toutes protégées par authenticateSession + isAdmin)

// GET /admin/reports : liste tous les signalements avec pagination
router.get("/", authenticateSession, isAdmin, adminGetAllReports);

// GET /admin/reports/stats : statistiques des signalements
router.get("/stats", authenticateSession, isAdmin, adminGetReportsStats);

// GET /admin/reports/:reportId : récupérer un signalement par ID
router.get("/:reportId", authenticateSession, isAdmin, adminGetReportById);

// PATCH /admin/reports/:reportId : mettre à jour le statut d'un signalement
router.patch("/:reportId", authenticateSession, isAdmin, adminUpdateReportStatus);

// DELETE /admin/reports/:reportId : supprimer un signalement
router.delete("/:reportId", authenticateSession, isAdmin, adminDeleteReport);

export default router;
