// app/tests/unit/controllers/tokenController.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockReq,
  createMockRes,
  createMockTransaction,
  createMockWallet,
} from "../../helpers/mocks.js";

// Mock du service token
vi.mock("../../../services/token/tokenService.js", () => ({
  default: {
    getBalance: vi.fn(),
    getWalletDetails: vi.fn(),
    getHistory: vi.fn(),
    credit: vi.fn(),
    debit: vi.fn(),
    adminAdjustment: vi.fn(),
  },
}));

import tokenService from "../../../services/token/tokenService.js";
import {
  getBalance,
  getWalletDetails,
  getHistory,
  creditTokens,
  debitTokens,
  adminAdjustment,
} from "../../../controllers/tokens/tokenController.js";

describe("tokenController", () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = createMockReq();
    res = createMockRes();
  });

  // ─── getBalance ────────────────────────────────────────────────────────────

  describe("getBalance", () => {
    it("retourne le solde de l'utilisateur", async () => {
      tokenService.getBalance.mockResolvedValue(150);

      await getBalance(req, res);

      expect(tokenService.getBalance).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith({ balance: 150 });
    });

    it("gère les erreurs du service", async () => {
      tokenService.getBalance.mockRejectedValue(new Error("Service error"));

      await getBalance(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Service error" });
    });
  });

  // ─── getWalletDetails ──────────────────────────────────────────────────────

  describe("getWalletDetails", () => {
    it("retourne les détails du wallet", async () => {
      const mockDetails = {
        balance: 150,
        totalEarned: 500,
        totalSpent: 350,
        transactionCount: 25,
      };
      tokenService.getWalletDetails.mockResolvedValue(mockDetails);

      await getWalletDetails(req, res);

      expect(tokenService.getWalletDetails).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith(mockDetails);
    });

    it("gère les erreurs du service", async () => {
      tokenService.getWalletDetails.mockRejectedValue(new Error("Wallet not found"));

      await getWalletDetails(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Wallet not found" });
    });
  });

  // ─── getHistory ────────────────────────────────────────────────────────────

  describe("getHistory", () => {
    it("retourne l'historique avec options par défaut", async () => {
      const mockHistory = [
        createMockTransaction({ id: 1, amount: 50 }),
        createMockTransaction({ id: 2, amount: -30 }),
      ];
      tokenService.getHistory.mockResolvedValue(mockHistory);

      await getHistory(req, res);

      expect(tokenService.getHistory).toHaveBeenCalledWith(1, {
        limit: 50,
        offset: 0,
        type: null,
      });
      expect(res.json).toHaveBeenCalledWith(mockHistory);
    });

    it("retourne l'historique avec options personnalisées", async () => {
      req.query = { limit: "10", offset: "20", type: "credit" };
      const mockHistory = [createMockTransaction()];
      tokenService.getHistory.mockResolvedValue(mockHistory);

      await getHistory(req, res);

      expect(tokenService.getHistory).toHaveBeenCalledWith(1, {
        limit: 10,
        offset: 20,
        type: "credit",
      });
      expect(res.json).toHaveBeenCalledWith(mockHistory);
    });

    it("gère les erreurs du service", async () => {
      tokenService.getHistory.mockRejectedValue(new Error("History error"));

      await getHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── creditTokens ──────────────────────────────────────────────────────────

  describe("creditTokens", () => {
    it("crédite des tokens avec succès", async () => {
      req.body = {
        userId: 2,
        amount: 100,
        type: "purchase",
        reason: "Achat de tokens",
        metadata: { orderId: "123" },
      };
      const mockTransaction = createMockTransaction({ amount: 100, type: "credit" });
      tokenService.credit.mockResolvedValue(mockTransaction);

      await creditTokens(req, res);

      expect(tokenService.credit).toHaveBeenCalledWith(
        2, 100, "purchase", "Achat de tokens", { orderId: "123" }
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Tokens crédités avec succès",
        transaction: mockTransaction,
      });
    });

    it("rejette si userId manquant", async () => {
      req.body = { amount: 100, type: "purchase" };

      await creditTokens(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "userId, amount et type sont requis"
      });
    });

    it("rejette si amount manquant", async () => {
      req.body = { userId: 2, type: "purchase" };

      await creditTokens(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("rejette si type manquant", async () => {
      req.body = { userId: 2, amount: 100 };

      await creditTokens(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("gère les erreurs du service", async () => {
      req.body = { userId: 2, amount: 100, type: "purchase" };
      tokenService.credit.mockRejectedValue(new Error("Credit failed"));

      await creditTokens(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── debitTokens ───────────────────────────────────────────────────────────

  describe("debitTokens", () => {
    it("débite des tokens avec succès", async () => {
      req.body = {
        userId: 2,
        amount: 50,
        type: "reservation",
        reason: "Paiement réservation",
      };
      const mockTransaction = createMockTransaction({ amount: -50, type: "debit" });
      tokenService.debit.mockResolvedValue(mockTransaction);

      await debitTokens(req, res);

      expect(tokenService.debit).toHaveBeenCalledWith(
        2, 50, "reservation", "Paiement réservation", undefined
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Tokens débités avec succès",
        transaction: mockTransaction,
      });
    });

    it("rejette si champs requis manquants", async () => {
      req.body = { userId: 2 };

      await debitTokens(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "userId, amount et type sont requis"
      });
    });

    it("retourne 402 si solde insuffisant", async () => {
      req.body = { userId: 2, amount: 1000, type: "reservation" };
      tokenService.debit.mockRejectedValue(new Error("Solde insuffisant: 100 disponible, 1000 requis"));

      await debitTokens(req, res);

      expect(res.status).toHaveBeenCalledWith(402);
      expect(res.json).toHaveBeenCalledWith({
        error: "Solde insuffisant: 100 disponible, 1000 requis"
      });
    });

    it("retourne 500 pour autres erreurs", async () => {
      req.body = { userId: 2, amount: 50, type: "reservation" };
      tokenService.debit.mockRejectedValue(new Error("Database error"));

      await debitTokens(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── adminAdjustment ───────────────────────────────────────────────────────

  describe("adminAdjustment", () => {
    it("effectue un ajustement positif", async () => {
      req.body = { userId: 2, amount: 50, reason: "Compensation client" };
      const mockTransaction = createMockTransaction({ amount: 50, type: "adjustment" });
      tokenService.adminAdjustment.mockResolvedValue(mockTransaction);

      await adminAdjustment(req, res);

      expect(tokenService.adminAdjustment).toHaveBeenCalledWith(2, 50, "Compensation client");
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Ajustement effectué avec succès",
        transaction: mockTransaction,
      });
    });

    it("effectue un ajustement négatif", async () => {
      req.body = { userId: 2, amount: -30, reason: "Correction erreur" };
      const mockTransaction = createMockTransaction({ amount: -30, type: "adjustment" });
      tokenService.adminAdjustment.mockResolvedValue(mockTransaction);

      await adminAdjustment(req, res);

      expect(tokenService.adminAdjustment).toHaveBeenCalledWith(2, -30, "Correction erreur");
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it("rejette si userId manquant", async () => {
      req.body = { amount: 50, reason: "Test" };

      await adminAdjustment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "userId, amount et reason sont requis"
      });
    });

    it("rejette si amount undefined", async () => {
      req.body = { userId: 2, reason: "Test" };

      await adminAdjustment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("rejette si reason manquant", async () => {
      req.body = { userId: 2, amount: 50 };

      await adminAdjustment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("gère les erreurs du service", async () => {
      req.body = { userId: 2, amount: 50, reason: "Test" };
      tokenService.adminAdjustment.mockRejectedValue(new Error("Adjustment failed"));

      await adminAdjustment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
