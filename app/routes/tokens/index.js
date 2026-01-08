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
import { authenticateFirebase } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Routes utilisateur (authentifiées)
router.get("/balance", authenticateFirebase, getBalance);
router.get("/wallet", authenticateFirebase, getWalletDetails);
router.get("/history", authenticateFirebase, getHistory);

// Routes admin/système (authentifiées - TODO: ajouter middleware admin)
router.post("/credit", authenticateFirebase, creditTokens);
router.post("/debit", authenticateFirebase, debitTokens);
router.post("/admin/adjustment", authenticateFirebase, adminAdjustment);

export default router;
