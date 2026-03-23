// app/tests/unit/services/tokenService.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock des modèles et de sequelize
const mockTransaction = {
  LOCK: { UPDATE: "UPDATE" },
  commit: vi.fn(),
  rollback: vi.fn(),
};

vi.mock("../../../models/index.js", () => ({
  Wallet: {
    create: vi.fn(),
    findOne: vi.fn(),
  },
  TokenTransaction: {
    create: vi.fn(),
    findAndCountAll: vi.fn(),
    sum: vi.fn(),
    count: vi.fn(),
  },
  User: {},
}));

vi.mock("../../../config/database.js", () => ({
  sequelize: {
    transaction: vi.fn(() => mockTransaction),
    Sequelize: {
      Op: {
        gt: Symbol("gt"),
        lt: Symbol("lt"),
      },
    },
  },
}));

import { Wallet, TokenTransaction } from "../../../models/index.js";
import tokenService from "../../../services/token/tokenService.js";

describe("tokenService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── createWallet ──────────────────────────────────────────────────────────

  describe("createWallet", () => {
    it("crée un wallet sans solde initial", async () => {
      const mockWallet = { id: 1, user_id: 1, balance: 0 };
      Wallet.create.mockResolvedValue(mockWallet);

      const result = await tokenService.createWallet(1);

      expect(Wallet.create).toHaveBeenCalledWith({
        user_id: 1,
        balance: 0,
      });
      expect(TokenTransaction.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockWallet);
    });

    it("crée un wallet avec solde initial et transaction bonus", async () => {
      const mockWallet = { id: 1, user_id: 1, balance: 100 };
      Wallet.create.mockResolvedValue(mockWallet);
      TokenTransaction.create.mockResolvedValue({});

      const result = await tokenService.createWallet(1, 100);

      expect(Wallet.create).toHaveBeenCalledWith({
        user_id: 1,
        balance: 100,
      });
      expect(TokenTransaction.create).toHaveBeenCalledWith({
        user_id: 1,
        amount: 100,
        type: "SIGNUP_BONUS",
        reason: "Bonus d'inscription",
        balance_before: 0,
        balance_after: 100,
      });
      expect(result).toEqual(mockWallet);
    });

    it("gère les erreurs de création", async () => {
      Wallet.create.mockRejectedValue(new Error("Database error"));

      await expect(tokenService.createWallet(1)).rejects.toThrow(
        "Erreur lors de la création du wallet: Database error"
      );
    });
  });

  // ─── getBalance ────────────────────────────────────────────────────────────

  describe("getBalance", () => {
    it("retourne le solde du wallet", async () => {
      Wallet.findOne.mockResolvedValue({ balance: 150 });

      const result = await tokenService.getBalance(1);

      expect(Wallet.findOne).toHaveBeenCalledWith({ where: { user_id: 1 } });
      expect(result).toBe(150);
    });

    it("lance une erreur si wallet introuvable", async () => {
      Wallet.findOne.mockResolvedValue(null);

      await expect(tokenService.getBalance(1)).rejects.toThrow(
        "Erreur lors de la récupération du solde: Wallet introuvable pour cet utilisateur"
      );
    });

    it("gère les erreurs de base de données", async () => {
      Wallet.findOne.mockRejectedValue(new Error("Connection lost"));

      await expect(tokenService.getBalance(1)).rejects.toThrow(
        "Erreur lors de la récupération du solde: Connection lost"
      );
    });
  });

  // ─── hasSufficientBalance ──────────────────────────────────────────────────

  describe("hasSufficientBalance", () => {
    it("retourne true si solde suffisant", async () => {
      Wallet.findOne.mockResolvedValue({ balance: 100 });

      const result = await tokenService.hasSufficientBalance(1, 50);

      expect(result).toBe(true);
    });

    it("retourne true si solde égal au montant", async () => {
      Wallet.findOne.mockResolvedValue({ balance: 100 });

      const result = await tokenService.hasSufficientBalance(1, 100);

      expect(result).toBe(true);
    });

    it("retourne false si solde insuffisant", async () => {
      Wallet.findOne.mockResolvedValue({ balance: 50 });

      const result = await tokenService.hasSufficientBalance(1, 100);

      expect(result).toBe(false);
    });
  });

  // ─── credit ────────────────────────────────────────────────────────────────

  describe("credit", () => {
    it("crédite des tokens avec succès", async () => {
      const mockWallet = { balance: 100, save: vi.fn() };
      const mockTokenTx = { id: 1, amount: 50 };

      Wallet.findOne.mockResolvedValue(mockWallet);
      TokenTransaction.create.mockResolvedValue(mockTokenTx);

      const result = await tokenService.credit(1, 50, "PURCHASE", "Achat");

      expect(mockWallet.balance).toBe(150);
      expect(mockWallet.save).toHaveBeenCalled();
      expect(TokenTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 1,
          amount: 50,
          type: "PURCHASE",
          reason: "Achat",
          balance_before: 100,
          balance_after: 150,
        }),
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toEqual(mockTokenTx);
    });

    it("rejette si montant négatif ou zéro", async () => {
      await expect(tokenService.credit(1, 0, "PURCHASE")).rejects.toThrow(
        "Le montant doit être positif"
      );

      await expect(tokenService.credit(1, -10, "PURCHASE")).rejects.toThrow(
        "Le montant doit être positif"
      );
    });

    it("rejette si wallet introuvable", async () => {
      Wallet.findOne.mockResolvedValue(null);

      await expect(tokenService.credit(1, 50, "PURCHASE")).rejects.toThrow(
        "Erreur lors du crédit de tokens: Wallet introuvable pour cet utilisateur"
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("rollback la transaction en cas d'erreur", async () => {
      Wallet.findOne.mockRejectedValue(new Error("DB error"));

      await expect(tokenService.credit(1, 50, "PURCHASE")).rejects.toThrow(
        "Erreur lors du crédit de tokens: DB error"
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ─── debit ─────────────────────────────────────────────────────────────────

  describe("debit", () => {
    it("débite des tokens avec succès", async () => {
      const mockWallet = { balance: 100, save: vi.fn() };
      const mockTokenTx = { id: 1, amount: -30 };

      Wallet.findOne.mockResolvedValue(mockWallet);
      TokenTransaction.create.mockResolvedValue(mockTokenTx);

      const result = await tokenService.debit(1, 30, "RESERVATION", "Paiement");

      expect(mockWallet.balance).toBe(70);
      expect(mockWallet.save).toHaveBeenCalled();
      expect(TokenTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 1,
          amount: -30, // Négatif pour débit
          type: "RESERVATION",
          reason: "Paiement",
          balance_before: 100,
          balance_after: 70,
        }),
        { transaction: mockTransaction }
      );
      expect(mockTransaction.commit).toHaveBeenCalled();
      expect(result).toEqual(mockTokenTx);
    });

    it("rejette si montant négatif ou zéro", async () => {
      await expect(tokenService.debit(1, 0, "RESERVATION")).rejects.toThrow(
        "Le montant doit être positif"
      );

      await expect(tokenService.debit(1, -10, "RESERVATION")).rejects.toThrow(
        "Le montant doit être positif"
      );
    });

    it("rejette si solde insuffisant", async () => {
      const mockWallet = { balance: 20, save: vi.fn() };
      Wallet.findOne.mockResolvedValue(mockWallet);

      await expect(tokenService.debit(1, 50, "RESERVATION")).rejects.toThrow(
        "Erreur lors du débit de tokens: Solde insuffisant"
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });

    it("rejette si wallet introuvable", async () => {
      Wallet.findOne.mockResolvedValue(null);

      await expect(tokenService.debit(1, 50, "RESERVATION")).rejects.toThrow(
        "Erreur lors du débit de tokens: Wallet introuvable pour cet utilisateur"
      );
      expect(mockTransaction.rollback).toHaveBeenCalled();
    });
  });

  // ─── getHistory ────────────────────────────────────────────────────────────

  describe("getHistory", () => {
    it("retourne l'historique avec options par défaut", async () => {
      const mockTransactions = [
        { id: 1, amount: 50 },
        { id: 2, amount: -30 },
      ];
      TokenTransaction.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockTransactions,
      });

      const result = await tokenService.getHistory(1);

      expect(TokenTransaction.findAndCountAll).toHaveBeenCalledWith({
        where: { user_id: 1 },
        order: [["created_at", "DESC"]],
        limit: 50,
        offset: 0,
      });
      expect(result).toEqual({
        transactions: mockTransactions,
        total: 2,
        limit: 50,
        offset: 0,
      });
    });

    it("retourne l'historique avec options personnalisées", async () => {
      TokenTransaction.findAndCountAll.mockResolvedValue({
        count: 10,
        rows: [],
      });

      const result = await tokenService.getHistory(1, {
        limit: 10,
        offset: 20,
        type: "PURCHASE",
      });

      expect(TokenTransaction.findAndCountAll).toHaveBeenCalledWith({
        where: { user_id: 1, type: "PURCHASE" },
        order: [["created_at", "DESC"]],
        limit: 10,
        offset: 20,
      });
    });

    it("gère les erreurs", async () => {
      TokenTransaction.findAndCountAll.mockRejectedValue(new Error("DB error"));

      await expect(tokenService.getHistory(1)).rejects.toThrow(
        "Erreur lors de la récupération de l'historique: DB error"
      );
    });
  });

  // ─── getWalletDetails ──────────────────────────────────────────────────────

  describe("getWalletDetails", () => {
    it("retourne les détails du wallet avec statistiques", async () => {
      const mockWallet = { id: 1, balance: 150 };
      Wallet.findOne.mockResolvedValue(mockWallet);
      TokenTransaction.sum
        .mockResolvedValueOnce(500) // total_credits
        .mockResolvedValueOnce(-200); // total_debits
      TokenTransaction.count.mockResolvedValue(25);

      const result = await tokenService.getWalletDetails(1);

      expect(result).toEqual({
        wallet: mockWallet,
        statistics: {
          total_credits: 500,
          total_debits: 200, // Math.abs(-200)
          transaction_count: 25,
        },
      });
    });

    it("gère les valeurs null pour les sommes", async () => {
      const mockWallet = { id: 1, balance: 0 };
      Wallet.findOne.mockResolvedValue(mockWallet);
      TokenTransaction.sum
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      TokenTransaction.count.mockResolvedValue(0);

      const result = await tokenService.getWalletDetails(1);

      expect(result.statistics).toEqual({
        total_credits: 0,
        total_debits: 0,
        transaction_count: 0,
      });
    });

    it("rejette si wallet introuvable", async () => {
      Wallet.findOne.mockResolvedValue(null);

      await expect(tokenService.getWalletDetails(1)).rejects.toThrow(
        "Erreur lors de la récupération des détails du wallet: Wallet introuvable pour cet utilisateur"
      );
    });
  });

  // ─── adminAdjustment ───────────────────────────────────────────────────────

  describe("adminAdjustment", () => {
    it("crédite pour ajustement positif", async () => {
      const mockWallet = { balance: 100, save: vi.fn() };
      const mockTokenTx = { id: 1, amount: 50 };

      Wallet.findOne.mockResolvedValue(mockWallet);
      TokenTransaction.create.mockResolvedValue(mockTokenTx);

      const result = await tokenService.adminAdjustment(1, 50, "Compensation");

      expect(TokenTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "ADMIN_ADJUSTMENT",
          reason: "Compensation",
          amount: 50,
        }),
        expect.any(Object)
      );
    });

    it("débite pour ajustement négatif", async () => {
      const mockWallet = { balance: 100, save: vi.fn() };
      const mockTokenTx = { id: 1, amount: -30 };

      Wallet.findOne.mockResolvedValue(mockWallet);
      TokenTransaction.create.mockResolvedValue(mockTokenTx);

      const result = await tokenService.adminAdjustment(1, -30, "Correction");

      expect(TokenTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "ADMIN_ADJUSTMENT",
          reason: "Correction",
          amount: -30,
        }),
        expect.any(Object)
      );
    });

    it("rejette si montant est zéro", async () => {
      await expect(tokenService.adminAdjustment(1, 0, "Test")).rejects.toThrow(
        "Le montant ne peut pas être zéro"
      );
    });
  });
});
