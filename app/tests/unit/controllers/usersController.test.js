// app/tests/unit/controllers/usersController.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockReq,
  createMockRes,
  createMockUser,
  createMockProfile,
  createMockInterest,
} from "../../helpers/mocks.js";

// Mock des modèles
vi.mock("../../../models/index.js", () => ({
  User: {
    findOne: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  Profile: {
    findOne: vi.fn(),
    findByPk: vi.fn(),
    create: vi.fn(),
  },
  Interest: {},
}));

// Mock Meilisearch (on ne teste pas Meilisearch)
vi.mock("../../../services/meilisearch/meiliProfileService.js", () => ({
  indexProfiles: vi.fn().mockResolvedValue(true),
  removeProfileFromIndex: vi.fn().mockResolvedValue(true),
  searchProfilesEnriched: vi.fn().mockResolvedValue({ hits: [] }),
  searchProfiles: vi.fn().mockResolvedValue({ hits: [] }),
}));

// Mock minioService
vi.mock("../../../services/storage/minioService.js", () => ({
  default: {
    extractPath: vi.fn((url) => {
      if (!url) return null;
      if (!url.startsWith("http://") && !url.startsWith("https://")) return url;
      return url.replace(/^https?:\/\/[^/]+\//, "");
    }),
    resolveUrl: vi.fn((path) => {
      if (!path) return null;
      if (path.startsWith("http://") || path.startsWith("https://")) return path;
      return `http://localhost:9000/${path}`;
    }),
  },
}));

import { User, Profile } from "../../../models/index.js";
import {
  createUser,
  updateProfile,
  updateInterests,
  toggleSearchable,
  getProfileById,
} from "../../../controllers/auth/usersController.js";

describe("usersController", () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = createMockReq();
    res = createMockRes();
  });

  // ─── createUser ────────────────────────────────────────────────────────────

  describe("createUser", () => {
    it("crée un utilisateur avec succès", async () => {
      req.body = {
        name: "Jean Dupont",
        email: "jean@test.com",
        password: "password123",
        is_searchable: false,
      };

      const mockUser = createMockUser({
        id: 1,
        name: "Jean Dupont",
        email: "jean@test.com",
      });
      const mockProfile = createMockProfile({ user_id: 1 });

      User.findOne.mockResolvedValue(null); // Email pas encore utilisé
      User.create.mockResolvedValue(mockUser);
      Profile.create.mockResolvedValue(mockProfile);

      await createUser(req, res);

      expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
        name: "Jean Dupont",
        email: "jean@test.com",
        password: "password123",
      }));
      expect(Profile.create).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 1,
        is_searchable: false,
      }));
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockUser);
    });

    it("rejette si email déjà utilisé (409)", async () => {
      req.body = {
        name: "Test",
        email: "existing@test.com",
        password: "password123",
      };

      User.findOne.mockResolvedValue(createMockUser({ email: "existing@test.com" }));

      await createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: "Email déjà utilisé",
        field: "email",
      });
    });

    it("gère les erreurs Sequelize de contrainte unique", async () => {
      req.body = {
        name: "Test",
        email: "test@test.com",
        password: "password123",
      };

      User.findOne.mockResolvedValue(null);
      User.create.mockRejectedValue({ name: "SequelizeUniqueConstraintError" });

      await createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it("gère les erreurs serveur génériques", async () => {
      req.body = {
        name: "Test",
        email: "test@test.com",
        password: "password123",
      };

      User.findOne.mockRejectedValue(new Error("Database error"));

      await createUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Erreur création user" });
    });
  });

  // ─── updateProfile ─────────────────────────────────────────────────────────

  describe("updateProfile", () => {
    it("met à jour le profil avec succès", async () => {
      req.body = {
        name: "Nouveau Nom",
        bio: "Nouvelle bio",
        first_name: "Jean",
        last_name: "Dupont",
        age: 30,
        biography: "Ma biographie",
        country: "France",
        city: "Lyon",
      };

      const mockProfile = createMockProfile({ user_id: 1, id: 1, is_searchable: false });
      const mockUpdatedUser = createMockUser({
        id: 1,
        Profile: mockProfile,
      });

      Profile.findOne.mockResolvedValue(mockProfile);
      Profile.findByPk.mockResolvedValue(mockProfile);
      User.update.mockResolvedValue([1]);
      User.findByPk.mockResolvedValue(mockUpdatedUser);

      await updateProfile(req, res);

      // User.update ne prend que name et location (bio est sur Profile maintenant)
      expect(User.update).toHaveBeenCalledWith(
        expect.objectContaining({ name: "Nouveau Nom" }),
        { where: { id: 1 } }
      );
      expect(mockProfile.update).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
    });

    it("crée un profil si inexistant", async () => {
      req.body = { first_name: "Jean" };

      const mockNewProfile = createMockProfile({ user_id: 1, id: 1, is_searchable: false });
      const mockUpdatedUser = createMockUser({ id: 1 });

      Profile.findOne.mockResolvedValue(null); // Pas de profil existant
      Profile.create.mockResolvedValue(mockNewProfile);
      Profile.findByPk.mockResolvedValue(mockNewProfile);
      User.findByPk.mockResolvedValue(mockUpdatedUser);

      await updateProfile(req, res);

      expect(Profile.create).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 1,
        first_name: "Jean",
      }));
    });

    it("met à jour les intérêts si fournis", async () => {
      req.body = { interest_ids: [1, 2, 3] };

      const mockProfile = createMockProfile({ user_id: 1, id: 1, is_searchable: false });
      const mockUpdatedUser = createMockUser({ id: 1 });

      Profile.findOne.mockResolvedValue(mockProfile);
      Profile.findByPk.mockResolvedValue(mockProfile);
      User.findByPk.mockResolvedValue(mockUpdatedUser);

      await updateProfile(req, res);

      expect(mockProfile.setInterests).toHaveBeenCalledWith([1, 2, 3]);
    });

    it("gère les erreurs serveur", async () => {
      req.body = { name: "Test" };

      Profile.findOne.mockRejectedValue(new Error("Database error"));

      await updateProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Erreur mise à jour profil" });
    });
  });

  // ─── updateInterests ───────────────────────────────────────────────────────

  describe("updateInterests", () => {
    it("met à jour les intérêts avec succès", async () => {
      req.body = { interest_ids: [1, 2, 3] };

      const mockProfile = createMockProfile({ user_id: 1, is_searchable: false });
      const mockUpdatedProfile = createMockProfile({
        user_id: 1,
        Interests: [
          createMockInterest({ id: 1 }),
          createMockInterest({ id: 2 }),
          createMockInterest({ id: 3 }),
        ],
      });

      Profile.findOne.mockResolvedValue(mockProfile);
      Profile.findByPk.mockResolvedValue(mockUpdatedProfile);

      await updateInterests(req, res);

      expect(mockProfile.setInterests).toHaveBeenCalledWith([1, 2, 3]);
      expect(res.json).toHaveBeenCalledWith(mockUpdatedProfile);
    });

    it("crée un profil si inexistant", async () => {
      req.body = { interest_ids: [1] };

      const mockNewProfile = createMockProfile({ user_id: 1 });

      Profile.findOne.mockResolvedValue(null);
      Profile.create.mockResolvedValue(mockNewProfile);
      Profile.findByPk.mockResolvedValue(mockNewProfile);

      await updateInterests(req, res);

      expect(Profile.create).toHaveBeenCalledWith({ user_id: 1 });
    });

    it("rejette si interest_ids n'est pas un tableau", async () => {
      req.body = { interest_ids: "not-an-array" };

      await updateInterests(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "interest_ids doit être un tableau"
      });
    });

    it("rejette si interest_ids manquant", async () => {
      req.body = {};

      await updateInterests(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("gère les erreurs serveur", async () => {
      req.body = { interest_ids: [1] };

      Profile.findOne.mockRejectedValue(new Error("Database error"));

      await updateInterests(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── toggleSearchable ──────────────────────────────────────────────────────

  describe("toggleSearchable", () => {
    it("active la visibilité", async () => {
      req.body = { is_searchable: true };

      const mockProfile = createMockProfile({
        user_id: 1,
        is_searchable: false,
        User: createMockUser(),
        Interests: [],
      });

      Profile.findOne.mockResolvedValue(mockProfile);
      Profile.findByPk.mockResolvedValue(mockProfile);

      await toggleSearchable(req, res);

      expect(mockProfile.update).toHaveBeenCalledWith({ is_searchable: true });
      expect(res.json).toHaveBeenCalledWith({ is_searchable: true });
    });

    it("désactive la visibilité", async () => {
      req.body = { is_searchable: false };

      const mockProfile = createMockProfile({
        user_id: 1,
        is_searchable: true,
      });

      Profile.findOne.mockResolvedValue(mockProfile);

      await toggleSearchable(req, res);

      expect(mockProfile.update).toHaveBeenCalledWith({ is_searchable: false });
      expect(res.json).toHaveBeenCalledWith({ is_searchable: false });
    });

    it("crée un profil si inexistant", async () => {
      req.body = { is_searchable: true };

      const mockNewProfile = createMockProfile({ user_id: 1, is_searchable: true });

      Profile.findOne.mockResolvedValue(null);
      Profile.create.mockResolvedValue(mockNewProfile);
      Profile.findByPk.mockResolvedValue(mockNewProfile);

      await toggleSearchable(req, res);

      expect(Profile.create).toHaveBeenCalledWith({
        user_id: 1,
        is_searchable: true,
      });
    });

    it("gère les erreurs serveur", async () => {
      req.body = { is_searchable: true };

      Profile.findOne.mockRejectedValue(new Error("Database error"));

      await toggleSearchable(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── getProfileById ────────────────────────────────────────────────────────

  describe("getProfileById", () => {
    it("retourne un profil public avec succès", async () => {
      req.params = { id: "1" };

      const mockProfile = createMockProfile({
        id: 1,
        is_searchable: true,
        User: createMockUser({ id: 10, is_active: true }),
        Interests: [createMockInterest({ id: 1, name: "Sport" })],
      });

      Profile.findByPk.mockResolvedValue(mockProfile);

      await getProfileById(req, res);

      expect(Profile.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
      expect(res.set).toHaveBeenCalledWith("Cache-Control", "public, max-age=3600");
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        id: 10,
        profile: expect.objectContaining({
          id: 1,
        }),
      }));
    });

    it("rejette si ID invalide (NaN)", async () => {
      req.params = { id: "abc" };

      await getProfileById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "ID profil invalide" });
    });

    it("rejette si ID négatif ou zéro", async () => {
      req.params = { id: "0" };

      await getProfileById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("retourne 404 si profil non trouvé", async () => {
      req.params = { id: "999" };

      Profile.findByPk.mockResolvedValue(null);

      await getProfileById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Profil non trouvé" });
    });

    it("retourne 403 si profil non searchable", async () => {
      req.params = { id: "1" };

      const mockProfile = createMockProfile({
        id: 1,
        is_searchable: false, // Non visible
        User: createMockUser({ is_active: true }),
      });

      Profile.findByPk.mockResolvedValue(mockProfile);

      await getProfileById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "Ce profil n'est pas accessible" });
    });

    it("retourne 403 si utilisateur inactif", async () => {
      req.params = { id: "1" };

      const mockProfile = createMockProfile({
        id: 1,
        is_searchable: true,
        User: createMockUser({ is_active: false }), // Inactif
      });

      Profile.findByPk.mockResolvedValue(mockProfile);

      await getProfileById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("retourne 403 si pas d'utilisateur associé", async () => {
      req.params = { id: "1" };

      const mockProfile = createMockProfile({
        id: 1,
        is_searchable: true,
        User: null, // Pas d'utilisateur
      });

      Profile.findByPk.mockResolvedValue(mockProfile);

      await getProfileById(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("gère les erreurs serveur", async () => {
      req.params = { id: "1" };

      Profile.findByPk.mockRejectedValue(new Error("Database error"));

      await getProfileById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Erreur serveur" });
    });
  });
});
