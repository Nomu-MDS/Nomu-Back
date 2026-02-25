// app/routes/tokens/index.js
import express from "express";
import {
  getBalance,
  getWalletDetails,
  getHistory,
  creditTokens,
  debitTokens,
  adminAdjustment,
} from "../../controllers/tokens/tokenController.js";
import { authenticateSession } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Routes utilisateur (authentifiées)
router.get("/balance", authenticateSession, getBalance);
router.get("/wallet", authenticateSession, getWalletDetails);
router.get("/history", authenticateSession, getHistory);

// Routes admin/système (authentifiées - TODO: ajouter middleware admin)
router.post("/credit", authenticateSession, creditTokens);
router.post("/debit", authenticateSession, debitTokens);
router.post("/admin/adjustment", authenticateSession, adminAdjustment);

export default router;
