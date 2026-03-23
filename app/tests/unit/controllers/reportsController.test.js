// app/tests/unit/controllers/reportsController.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockReq,
  createMockRes,
  createMockReport,
  createMockUser,
} from "../../helpers/mocks.js";

// Mock des modèles
vi.mock("../../../models/index.js", () => ({
  Report: {
    findOne: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
  },
  User: {
    findByPk: vi.fn(),
  },
  Profile: {},
}));

import { Report, User } from "../../../models/index.js";
import {
  createReport,
  getMyReports,
  deleteMyReport,
} from "../../../controllers/reports/reportsController.js";

describe("reportsController", () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = createMockReq();
    res = createMockRes();
  });

  // ─── createReport ──────────────────────────────────────────────────────────

  describe("createReport", () => {
    it("crée un signalement avec succès", async () => {
      req.body = {
        reportedUserId: 2,
        reason: "spam",
        message: "Cet utilisateur envoie du spam",
      };

      const mockReportedUser = createMockUser({ id: 2 });
      const mockReport = createMockReport({
        reporter_id: 1,
        reported_user_id: 2,
        reason: "spam",
        message: "Cet utilisateur envoie du spam",
      });

      User.findByPk.mockResolvedValue(mockReportedUser);
      Report.findOne.mockResolvedValue(null); // Pas de signalement existant
      Report.create.mockResolvedValue(mockReport);

      await createReport(req, res);

      expect(Report.create).toHaveBeenCalledWith({
        reporter_id: 1,
        reported_user_id: 2,
        reason: "spam",
        message: "Cet utilisateur envoie du spam",
        status: "pending",
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Signalement créé avec succès",
        report: mockReport,
      });
    });

    it("rejette si l'utilisateur se signale lui-même", async () => {
      req.body = { reportedUserId: 1, reason: "test" }; // Même ID que req.user.dbUser.id

      await createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Vous ne pouvez pas vous signaler vous-même"
      });
    });

    it("rejette si l'utilisateur signalé n'existe pas (404)", async () => {
      req.body = { reportedUserId: 999, reason: "spam" };

      User.findByPk.mockResolvedValue(null);

      await createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Utilisateur signalé introuvable" });
    });

    it("rejette si signalement déjà existant (409)", async () => {
      req.body = { reportedUserId: 2, reason: "spam" };

      const mockReportedUser = createMockUser({ id: 2 });
      const existingReport = createMockReport({ status: "pending" });

      User.findByPk.mockResolvedValue(mockReportedUser);
      Report.findOne.mockResolvedValue(existingReport);

      await createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: "Vous avez déjà signalé cet utilisateur"
      });
    });

    it("gère les erreurs serveur", async () => {
      req.body = { reportedUserId: 2, reason: "spam" };

      User.findByPk.mockRejectedValue(new Error("Database error"));

      await createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Erreur lors de la création du signalement"
      });
    });
  });

  // ─── getMyReports ──────────────────────────────────────────────────────────

  describe("getMyReports", () => {
    it("retourne les signalements de l'utilisateur", async () => {
      const mockReports = [
        createMockReport({ id: 1, reporter_id: 1 }),
        createMockReport({ id: 2, reporter_id: 1 }),
      ];

      Report.findAll.mockResolvedValue(mockReports);

      await getMyReports(req, res);

      expect(Report.findAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { reporter_id: 1 },
        order: [["createdAt", "DESC"]],
      }));
      expect(res.json).toHaveBeenCalledWith(mockReports);
    });

    it("retourne un tableau vide si aucun signalement", async () => {
      Report.findAll.mockResolvedValue([]);

      await getMyReports(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("gère les erreurs serveur", async () => {
      Report.findAll.mockRejectedValue(new Error("Database error"));

      await getMyReports(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Erreur lors de la récupération des signalements"
      });
    });
  });

  // ─── deleteMyReport ────────────────────────────────────────────────────────

  describe("deleteMyReport", () => {
    it("supprime un signalement pending avec succès", async () => {
      req.params = { reportId: 1 };

      const mockReport = createMockReport({
        id: 1,
        reporter_id: 1,
        status: "pending"
      });

      Report.findOne.mockResolvedValue(mockReport);

      await deleteMyReport(req, res);

      expect(Report.findOne).toHaveBeenCalledWith({
        where: { id: 1, reporter_id: 1 },
      });
      expect(mockReport.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: "Signalement supprimé avec succès" });
    });

    it("rejette si signalement non trouvé (404)", async () => {
      req.params = { reportId: 999 };

      Report.findOne.mockResolvedValue(null);

      await deleteMyReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Signalement introuvable" });
    });

    it("rejette si signalement déjà traité (403)", async () => {
      req.params = { reportId: 1 };

      const mockReport = createMockReport({
        id: 1,
        reporter_id: 1,
        status: "resolved", // Déjà traité
      });

      Report.findOne.mockResolvedValue(mockReport);

      await deleteMyReport(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Impossible de supprimer un signalement déjà traité"
      });
    });

    it("rejette si signalement appartient à un autre utilisateur", async () => {
      req.params = { reportId: 1 };

      // findOne avec where: { id: 1, reporter_id: 1 } ne trouve rien
      // car le signalement appartient à un autre utilisateur
      Report.findOne.mockResolvedValue(null);

      await deleteMyReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("gère les erreurs serveur", async () => {
      req.params = { reportId: 1 };

      Report.findOne.mockRejectedValue(new Error("Database error"));

      await deleteMyReport(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Erreur lors de la suppression du signalement"
      });
    });
  });
});
