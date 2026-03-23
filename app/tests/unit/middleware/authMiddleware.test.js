// app/tests/unit/middleware/authMiddleware.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { createMockReq, createMockRes, createMockUser } from "../../helpers/mocks.js";

// Mock jwt
vi.mock("jsonwebtoken", () => ({
  default: {
    verify: vi.fn(),
  },
}));

// Mock des modèles
vi.mock("../../../models/index.js", () => ({
  User: {
    findByPk: vi.fn(),
  },
}));

import { User } from "../../../models/index.js";
import {
  authenticateSession,
  authenticateOptional,
  isAdmin,
} from "../../../middleware/authMiddleware.js";

describe("authMiddleware", () => {
  let req, res, next;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      isAuthenticated: vi.fn(),
      user: null,
      headers: {},
    };
    res = createMockRes();
    next = vi.fn();

    // Set env variable for tests
    process.env.JWT_SECRET = "test_jwt_secret";
  });

  // ─── authenticateSession ───────────────────────────────────────────────────

  describe("authenticateSession", () => {
    it("authentifie via session Passport", async () => {
      req.isAuthenticated.mockReturnValue(true);
      req.user = createMockUser();

      await authenticateSession(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.dbUser).toBeDefined();
    });

    it("ne wrappe pas si dbUser déjà présent", async () => {
      req.isAuthenticated.mockReturnValue(true);
      req.user = { dbUser: createMockUser() };

      await authenticateSession(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.dbUser).toBeDefined();
    });

    it("authentifie via JWT Bearer token", async () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = "Bearer valid-token";

      const mockUser = createMockUser({ id: 1 });
      jwt.verify.mockReturnValue({ id: 1 });
      User.findByPk.mockResolvedValue(mockUser);

      await authenticateSession(req, res, next);

      expect(jwt.verify).toHaveBeenCalledWith("valid-token", "test_jwt_secret");
      expect(User.findByPk).toHaveBeenCalledWith(1);
      expect(req.user.dbUser).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it("supporte userId dans le payload JWT", async () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = "Bearer valid-token";

      const mockUser = createMockUser({ id: 2 });
      jwt.verify.mockReturnValue({ userId: 2 });
      User.findByPk.mockResolvedValue(mockUser);

      await authenticateSession(req, res, next);

      expect(User.findByPk).toHaveBeenCalledWith(2);
      expect(next).toHaveBeenCalled();
    });

    it("supporte sub dans le payload JWT", async () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = "Bearer valid-token";

      const mockUser = createMockUser({ id: 3 });
      jwt.verify.mockReturnValue({ sub: 3 });
      User.findByPk.mockResolvedValue(mockUser);

      await authenticateSession(req, res, next);

      expect(User.findByPk).toHaveBeenCalledWith(3);
      expect(next).toHaveBeenCalled();
    });

    it("rejette si pas d'authentification (401)", async () => {
      req.isAuthenticated.mockReturnValue(false);
      // Pas de header Authorization

      await authenticateSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Utilisateur non authentifié" });
      expect(next).not.toHaveBeenCalled();
    });

    it("rejette si token JWT invalide (401)", async () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = "Bearer invalid-token";

      jwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await authenticateSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Token invalide" });
    });

    it("rejette si token sans userId (401)", async () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = "Bearer valid-token";

      jwt.verify.mockReturnValue({}); // Payload sans id

      await authenticateSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Token invalide" });
    });

    it("rejette si utilisateur introuvable (401)", async () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = "Bearer valid-token";

      jwt.verify.mockReturnValue({ id: 999 });
      User.findByPk.mockResolvedValue(null);

      await authenticateSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Utilisateur introuvable" });
    });

    // Note: JWT_SECRET est capturé au chargement du module, donc ce test
    // vérifie le comportement avec un token malformé plutôt que sans secret
    it("rejette si token Bearer malformé", async () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = "Bearer "; // Token vide

      jwt.verify.mockImplementation(() => {
        throw new Error("jwt malformed");
      });

      await authenticateSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Token invalide" });
    });

    it("supporte Authorization header avec majuscule", async () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.Authorization = "Bearer valid-token";

      const mockUser = createMockUser({ id: 1 });
      jwt.verify.mockReturnValue({ id: 1 });
      User.findByPk.mockResolvedValue(mockUser);

      await authenticateSession(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("gère les erreurs serveur (500)", async () => {
      req.isAuthenticated = () => {
        throw new Error("Unexpected error");
      };

      await authenticateSession(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Erreur vérification session" });
    });
  });

  // ─── authenticateOptional ──────────────────────────────────────────────────

  describe("authenticateOptional", () => {
    it("authentifie via session si disponible", async () => {
      req.isAuthenticated.mockReturnValue(true);
      req.user = createMockUser();

      await authenticateOptional(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user.dbUser).toBeDefined();
    });

    it("authentifie via JWT si disponible", async () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = "Bearer valid-token";

      const mockUser = createMockUser({ id: 1 });
      jwt.verify.mockReturnValue({ id: 1 });
      User.findByPk.mockResolvedValue(mockUser);

      await authenticateOptional(req, res, next);

      expect(req.user.dbUser).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it("continue sans erreur si pas d'auth", async () => {
      req.isAuthenticated.mockReturnValue(false);
      // Pas de header Authorization

      await authenticateOptional(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeNull();
    });

    it("continue sans erreur si token invalide", async () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = "Bearer invalid-token";

      jwt.verify.mockImplementation(() => {
        throw new Error("Invalid token");
      });

      await authenticateOptional(req, res, next);

      expect(next).toHaveBeenCalled();
      // L'utilisateur n'est pas set mais pas d'erreur
    });

    it("continue sans erreur si utilisateur introuvable", async () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = "Bearer valid-token";

      jwt.verify.mockReturnValue({ id: 999 });
      User.findByPk.mockResolvedValue(null);

      await authenticateOptional(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("continue si token expiré", async () => {
      req.isAuthenticated.mockReturnValue(false);
      req.headers.authorization = "Bearer expired-token";

      jwt.verify.mockImplementation(() => {
        throw new Error("jwt expired");
      });

      await authenticateOptional(req, res, next);

      expect(next).toHaveBeenCalled();
      // L'utilisateur n'est pas set mais pas d'erreur
    });

    it("gère les erreurs silencieusement", async () => {
      req.isAuthenticated = () => {
        throw new Error("Unexpected error");
      };

      await authenticateOptional(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── isAdmin ───────────────────────────────────────────────────────────────

  describe("isAdmin", () => {
    it("autorise si utilisateur est admin", async () => {
      req.user = { dbUser: createMockUser({ role: "admin" }) };

      await isAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("rejette si utilisateur non authentifié (401)", async () => {
      req.user = null;

      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: "Utilisateur non authentifié" });
      expect(next).not.toHaveBeenCalled();
    });

    it("rejette si dbUser manquant (401)", async () => {
      req.user = {};

      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("rejette si utilisateur n'est pas admin (403)", async () => {
      req.user = { dbUser: createMockUser({ role: "user" }) };

      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Accès interdit : droits administrateur requis"
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("rejette si rôle est local (403)", async () => {
      req.user = { dbUser: createMockUser({ role: "local" }) };

      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("gère les erreurs serveur (500)", async () => {
      req.user = {
        get dbUser() {
          throw new Error("Unexpected error");
        },
      };

      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Erreur vérification droits admin" });
    });
  });
});
