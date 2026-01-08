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
import { verifyToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

// Routes utilisateur (authentifiées)
router.get("/balance", verifyToken, getBalance);
router.get("/wallet", verifyToken, getWalletDetails);
router.get("/history", verifyToken, getHistory);

// Routes admin/système (authentifiées - TODO: ajouter middleware admin)
router.post("/credit", verifyToken, creditTokens);
router.post("/debit", verifyToken, debitTokens);
router.post("/admin/adjustment", verifyToken, adminAdjustment);

export default router;
