// app/tests/unit/controllers/adminUsersController.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockReq,
  createMockRes,
  createMockUser,
  createMockProfile,
  createMockWallet,
} from "../../helpers/mocks.js";

// Mock des modèles
vi.mock("../../../models/index.js", () => ({
  User: {
    findByPk: vi.fn(),
    findAndCountAll: vi.fn(),
  },
  Profile: {
    findOne: vi.fn(),
  },
  Wallet: {},
  Conversation: {
    findAll: vi.fn(),
    destroy: vi.fn(),
  },
  Message: {
    destroy: vi.fn(),
  },
  Reservation: {
    destroy: vi.fn(),
  },
  Report: {
    update: vi.fn(),
  },
}));

// Mock Meilisearch (on ne teste pas Meilisearch)
vi.mock("../../../services/meilisearch/meiliProfileService.js", () => ({
  removeProfileFromIndex: vi.fn().mockResolvedValue(true),
}));

// Mock minioService
vi.mock("../../../services/storage/minioService.js", () => ({
  default: {
    resolveUrl: vi.fn((path) => path ? `http://localhost:9000/${path}` : null),
    deleteByUrl: vi.fn().mockResolvedValue(true),
  },
}));

import { User, Profile, Conversation, Message, Reservation, Report } from "../../../models/index.js";
import {
  adminGetAllUsers,
  adminGetUserById,
  adminUpdateUser,
  adminDeleteUser,
} from "../../../controllers/adminUsersController.js";

describe("adminUsersController", () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = createMockReq({
      user: {
        dbUser: { id: 99, email: "admin@test.com", role: "admin" },
      },
    });
    res = createMockRes();
  });

  // ─── adminGetAllUsers ──────────────────────────────────────────────────────

  describe("adminGetAllUsers", () => {
    it("retourne les utilisateurs avec pagination", async () => {
      req.query = { page: "1" };

      const mockUsers = [
        createMockUser({ id: 1, name: "User 1" }),
        createMockUser({ id: 2, name: "User 2" }),
      ];

      User.findAndCountAll.mockResolvedValue({
        count: 50,
        rows: mockUsers,
      });

      await adminGetAllUsers(req, res);

      expect(User.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 25,
          offset: 0,
          order: [["created_at", "DESC"]],
        })
      );
      expect(res.json).toHaveBeenCalledWith({
        users: expect.any(Array),
        pagination: {
          currentPage: 1,
          totalPages: 2,
          totalUsers: 50,
          perPage: 25,
          hasNextPage: true,
          hasPrevPage: false,
        },
      });
    });

    it("gère la page 2", async () => {
      req.query = { page: "2" };

      User.findAndCountAll.mockResolvedValue({ count: 50, rows: [] });

      await adminGetAllUsers(req, res);

      expect(User.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 25, // (2-1) * 25
        })
      );
    });

    it("filtre par rôle", async () => {
      req.query = { role: "admin" };

      User.findAndCountAll.mockResolvedValue({ count: 5, rows: [] });

      await adminGetAllUsers(req, res);

      expect(User.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: "admin" }),
        })
      );
    });

    it("filtre par is_active", async () => {
      req.query = { is_active: "true" };

      User.findAndCountAll.mockResolvedValue({ count: 40, rows: [] });

      await adminGetAllUsers(req, res);

      expect(User.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ is_active: true }),
        })
      );
    });

    it("filtre par recherche (nom ou email)", async () => {
      req.query = { search: "test" };

      User.findAndCountAll.mockResolvedValue({ count: 10, rows: [] });

      await adminGetAllUsers(req, res);

      expect(User.findAndCountAll).toHaveBeenCalled();
    });

    it("gère les erreurs serveur", async () => {
      User.findAndCountAll.mockRejectedValue(new Error("Database error"));

      await adminGetAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Erreur récupération utilisateurs"
      });
    });
  });

  // ─── adminGetUserById ──────────────────────────────────────────────────────

  describe("adminGetUserById", () => {
    it("retourne un utilisateur par ID", async () => {
      req.params = { id: 1 };

      const mockUser = createMockUser({ id: 1, name: "Test User" });

      User.findByPk.mockResolvedValue(mockUser);

      await adminGetUserById(req, res);

      expect(User.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it("retourne 404 si utilisateur non trouvé", async () => {
      req.params = { id: 999 };

      User.findByPk.mockResolvedValue(null);

      await adminGetUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Utilisateur non trouvé" });
    });

    it("gère les erreurs serveur", async () => {
      req.params = { id: 1 };

      User.findByPk.mockRejectedValue(new Error("Database error"));

      await adminGetUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── adminUpdateUser ───────────────────────────────────────────────────────

  describe("adminUpdateUser", () => {
    it("met à jour is_active avec succès", async () => {
      req.params = { id: 1 };
      req.body = { is_active: false };

      const mockUser = createMockUser({ id: 1, is_active: true });

      User.findByPk
        .mockResolvedValueOnce(mockUser) // Premier appel pour trouver l'utilisateur
        .mockResolvedValueOnce(mockUser); // Deuxième appel pour recharger

      await adminUpdateUser(req, res);

      expect(mockUser.is_active).toBe(false);
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("met à jour le rôle avec succès", async () => {
      req.params = { id: 1 };
      req.body = { role: "local" };

      const mockUser = createMockUser({ id: 1, role: "user" });

      User.findByPk
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUser);

      await adminUpdateUser(req, res);

      expect(mockUser.role).toBe("local");
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("rejette si aucun champ à modifier", async () => {
      req.params = { id: 1 };
      req.body = {}; // Pas de is_active ni role

      await adminUpdateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Au moins un champ à modifier requis (is_active ou role)"
      });
    });

    it("rejette si rôle invalide", async () => {
      req.params = { id: 1 };
      req.body = { role: "superadmin" }; // Rôle non autorisé

      await adminUpdateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Rôle invalide. Valeurs autorisées : user, admin, local"
      });
    });

    it("retourne 404 si utilisateur non trouvé", async () => {
      req.params = { id: 999 };
      req.body = { is_active: false };

      User.findByPk.mockResolvedValue(null);

      await adminUpdateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("empêche l'admin de se désactiver lui-même", async () => {
      req.params = { id: 99 }; // Même ID que l'admin connecté
      req.body = { is_active: false };

      const mockUser = createMockUser({ id: 99, is_active: true });

      User.findByPk.mockResolvedValue(mockUser);

      await adminUpdateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Vous ne pouvez pas vous désactiver vous-même"
      });
    });

    it("empêche l'admin de changer son propre rôle", async () => {
      req.params = { id: 99 };
      req.body = { role: "user" };

      const mockUser = createMockUser({ id: 99, role: "admin" });

      User.findByPk.mockResolvedValue(mockUser);

      await adminUpdateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Vous ne pouvez pas modifier votre propre rôle"
      });
    });

    it("gère les erreurs serveur", async () => {
      req.params = { id: 1 };
      req.body = { is_active: false };

      User.findByPk.mockRejectedValue(new Error("Database error"));

      await adminUpdateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── adminDeleteUser ───────────────────────────────────────────────────────

  describe("adminDeleteUser", () => {
    it("supprime un utilisateur avec succès", async () => {
      req.params = { id: 1 };

      const mockProfile = createMockProfile({ id: 1, user_id: 1 });
      const mockUser = createMockUser({ id: 1, email: "user@test.com", Profile: mockProfile });

      User.findByPk.mockResolvedValue(mockUser);
      Conversation.findAll.mockResolvedValue([]);

      await adminDeleteUser(req, res);

      expect(mockUser.destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        message: "Utilisateur supprimé avec succès",
        deletedUserId: 1,
      });
    });

    it("retourne 404 si utilisateur non trouvé", async () => {
      req.params = { id: 999 };

      User.findByPk.mockResolvedValue(null);

      await adminDeleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Utilisateur non trouvé" });
    });

    it("empêche l'admin de se supprimer lui-même", async () => {
      req.params = { id: 99 }; // Même ID que l'admin connecté

      const mockUser = createMockUser({ id: 99 });

      User.findByPk.mockResolvedValue(mockUser);

      await adminDeleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Vous ne pouvez pas supprimer votre propre compte"
      });
    });

    it("gère les erreurs serveur", async () => {
      req.params = { id: 1 };

      User.findByPk.mockRejectedValue(new Error("Database error"));

      await adminDeleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
