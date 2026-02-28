// routes/reports/index.js
import express from "express";
import { createReport, getMyReports, deleteMyReport } from "../../controllers/reports/reportsController.js";

const router = express.Router();

// POST /reports : créer un signalement
router.post("/", createReport);

// GET /reports/me : récupérer mes signalements
router.get("/me", getMyReports);

// DELETE /reports/:reportId : supprimer mon signalement (si non traité)
router.delete("/:reportId", deleteMyReport);

export default router;
