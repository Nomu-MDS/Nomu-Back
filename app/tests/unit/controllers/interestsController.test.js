// app/tests/unit/controllers/interestsController.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockReq,
  createMockRes,
  createMockInterest,
} from "../../helpers/mocks.js";

// Mock des modèles
vi.mock("../../../models/index.js", () => ({
  Interest: {
    findAll: vi.fn(),
    findByPk: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));

import { Interest } from "../../../models/index.js";
import {
  getAllInterests,
  adminGetAllInterests,
  adminGetInterestById,
  adminCreateInterest,
  adminUpdateInterest,
  adminDeleteInterest,
} from "../../../controllers/interestsController.js";

describe("interestsController", () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = createMockReq();
    res = createMockRes();
  });

  // ─── getAllInterests (public) ──────────────────────────────────────────────

  describe("getAllInterests", () => {
    it("retourne tous les intérêts actifs", async () => {
      const mockInterests = [
        createMockInterest({ id: 1, name: "Sport", is_active: true }),
        createMockInterest({ id: 2, name: "Musique", is_active: true }),
      ];

      Interest.findAll.mockResolvedValue(mockInterests);

      await getAllInterests(req, res);

      expect(Interest.findAll).toHaveBeenCalledWith({
        where: { is_active: true },
        order: [["name", "ASC"]],
      });
      expect(res.json).toHaveBeenCalledWith(mockInterests);
    });

    it("retourne un tableau vide si aucun intérêt actif", async () => {
      Interest.findAll.mockResolvedValue([]);

      await getAllInterests(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("gère les erreurs serveur", async () => {
      Interest.findAll.mockRejectedValue(new Error("Database error"));

      await getAllInterests(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Erreur récupération intérêts" });
    });
  });

  // ─── adminGetAllInterests ──────────────────────────────────────────────────

  describe("adminGetAllInterests", () => {
    it("retourne tous les intérêts (actifs et inactifs)", async () => {
      const mockInterests = [
        createMockInterest({ id: 1, name: "Sport", is_active: true }),
        createMockInterest({ id: 2, name: "Cuisine", is_active: false }),
      ];

      Interest.findAll.mockResolvedValue(mockInterests);

      await adminGetAllInterests(req, res);

      expect(Interest.findAll).toHaveBeenCalledWith({
        order: [["name", "ASC"]],
      });
      expect(res.json).toHaveBeenCalledWith(mockInterests);
    });

    it("gère les erreurs serveur", async () => {
      Interest.findAll.mockRejectedValue(new Error("Database error"));

      await adminGetAllInterests(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── adminGetInterestById ──────────────────────────────────────────────────

  describe("adminGetInterestById", () => {
    it("retourne un intérêt par ID", async () => {
      req.params = { id: 1 };
      const mockInterest = createMockInterest({ id: 1, name: "Sport" });

      Interest.findByPk.mockResolvedValue(mockInterest);

      await adminGetInterestById(req, res);

      expect(Interest.findByPk).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith(mockInterest);
    });

    it("retourne 404 si intérêt non trouvé", async () => {
      req.params = { id: 999 };

      Interest.findByPk.mockResolvedValue(null);

      await adminGetInterestById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Intérêt non trouvé" });
    });

    it("gère les erreurs serveur", async () => {
      req.params = { id: 1 };

      Interest.findByPk.mockRejectedValue(new Error("Database error"));

      await adminGetInterestById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── adminCreateInterest ───────────────────────────────────────────────────

  describe("adminCreateInterest", () => {
    it("crée un intérêt avec succès", async () => {
      req.body = { name: "Voyage", icon: "travel-icon", is_active: true };

      const mockInterest = createMockInterest({
        id: 3,
        name: "Voyage",
        icon: "travel-icon",
        is_active: true,
      });

      Interest.findOne.mockResolvedValue(null); // Pas d'existant
      Interest.create.mockResolvedValue(mockInterest);

      await adminCreateInterest(req, res);

      expect(Interest.create).toHaveBeenCalledWith({
        name: "Voyage",
        icon: "travel-icon",
        is_active: true,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockInterest);
    });

    it("crée un intérêt sans icon (null par défaut)", async () => {
      req.body = { name: "Lecture" };

      const mockInterest = createMockInterest({ name: "Lecture", icon: null });

      Interest.findOne.mockResolvedValue(null);
      Interest.create.mockResolvedValue(mockInterest);

      await adminCreateInterest(req, res);

      expect(Interest.create).toHaveBeenCalledWith({
        name: "Lecture",
        icon: null,
        is_active: true,
      });
    });

    it("rejette si nom vide", async () => {
      req.body = { name: "" };

      await adminCreateInterest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Le nom est requis" });
    });

    it("rejette si nom manquant", async () => {
      req.body = {};

      await adminCreateInterest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Le nom est requis" });
    });

    it("rejette si nom seulement espaces", async () => {
      req.body = { name: "   " };

      await adminCreateInterest(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("rejette si intérêt avec ce nom existe déjà (409)", async () => {
      req.body = { name: "Sport" };

      Interest.findOne.mockResolvedValue(createMockInterest({ name: "Sport" }));

      await adminCreateInterest(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: "Un intérêt avec ce nom existe déjà"
      });
    });

    it("gère les erreurs serveur", async () => {
      req.body = { name: "Test" };

      Interest.findOne.mockRejectedValue(new Error("Database error"));

      await adminCreateInterest(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── adminUpdateInterest ───────────────────────────────────────────────────

  describe("adminUpdateInterest", () => {
    it("met à jour un intérêt avec succès", async () => {
      req.params = { id: 1 };
      req.body = { name: "Sports", icon: "new-icon", is_active: false };

      const mockInterest = createMockInterest({ id: 1, name: "Sport" });

      Interest.findByPk.mockResolvedValue(mockInterest);
      Interest.findOne.mockResolvedValue(null); // Pas de conflit de nom

      await adminUpdateInterest(req, res);

      expect(mockInterest.name).toBe("Sports");
      expect(mockInterest.icon).toBe("new-icon");
      expect(mockInterest.is_active).toBe(false);
      expect(mockInterest.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockInterest);
    });

    it("met à jour partiellement (seulement is_active)", async () => {
      req.params = { id: 1 };
      req.body = { is_active: false };

      const mockInterest = createMockInterest({
        id: 1,
        name: "Sport",
        icon: "old-icon",
        is_active: true,
      });

      Interest.findByPk.mockResolvedValue(mockInterest);

      await adminUpdateInterest(req, res);

      expect(mockInterest.is_active).toBe(false);
      expect(mockInterest.name).toBe("Sport"); // Inchangé
      expect(mockInterest.save).toHaveBeenCalled();
    });

    it("retourne 404 si intérêt non trouvé", async () => {
      req.params = { id: 999 };
      req.body = { name: "Test" };

      Interest.findByPk.mockResolvedValue(null);

      await adminUpdateInterest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Intérêt non trouvé" });
    });

    it("rejette si nouveau nom déjà utilisé (409)", async () => {
      req.params = { id: 1 };
      req.body = { name: "Musique" }; // Nom déjà pris

      const mockInterest = createMockInterest({ id: 1, name: "Sport" });
      const existingInterest = createMockInterest({ id: 2, name: "Musique" });

      Interest.findByPk.mockResolvedValue(mockInterest);
      Interest.findOne.mockResolvedValue(existingInterest);

      await adminUpdateInterest(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: "Un intérêt avec ce nom existe déjà"
      });
    });

    it("autorise le même nom si c'est le même intérêt", async () => {
      req.params = { id: 1 };
      req.body = { name: "Sport", icon: "new-icon" }; // Même nom

      const mockInterest = createMockInterest({ id: 1, name: "Sport" });

      Interest.findByPk.mockResolvedValue(mockInterest);
      // findOne ne devrait pas être appelé car le nom n'a pas changé

      await adminUpdateInterest(req, res);

      expect(mockInterest.icon).toBe("new-icon");
      expect(mockInterest.save).toHaveBeenCalled();
    });

    it("gère les erreurs serveur", async () => {
      req.params = { id: 1 };
      req.body = { name: "Test" };

      Interest.findByPk.mockRejectedValue(new Error("Database error"));

      await adminUpdateInterest(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── adminDeleteInterest ───────────────────────────────────────────────────

  describe("adminDeleteInterest", () => {
    it("supprime un intérêt avec succès", async () => {
      req.params = { id: 1 };

      const mockInterest = createMockInterest({ id: 1, name: "Sport" });

      Interest.findByPk.mockResolvedValue(mockInterest);

      await adminDeleteInterest(req, res);

      expect(mockInterest.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: "Intérêt supprimé avec succès",
        id: 1,
      });
    });

    it("retourne 404 si intérêt non trouvé", async () => {
      req.params = { id: 999 };

      Interest.findByPk.mockResolvedValue(null);

      await adminDeleteInterest(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Intérêt non trouvé" });
    });

    it("gère les erreurs serveur", async () => {
      req.params = { id: 1 };

      Interest.findByPk.mockRejectedValue(new Error("Database error"));

      await adminDeleteInterest(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
