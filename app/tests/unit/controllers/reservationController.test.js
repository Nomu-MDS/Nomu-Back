// app/tests/unit/controllers/reservationController.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockReq,
  createMockRes,
  createMockReservation,
  createMockConversation,
  createMockUser,
} from "../../helpers/mocks.js";

// Mock des modèles
vi.mock("../../../models/index.js", () => ({
  Reservation: {
    findByPk: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
  },
  Conversation: {
    findByPk: vi.fn(),
    findAll: vi.fn(),
  },
  User: {
    findByPk: vi.fn(),
  },
}));

import { Reservation, Conversation, User } from "../../../models/index.js";
import {
  createReservation,
  getMyReservations,
  acceptReservation,
  declineReservation,
} from "../../../controllers/reservations/reservationController.js";

describe("reservationController", () => {
  let req, res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = createMockReq();
    res = createMockRes();
  });

  // ─── createReservation ─────────────────────────────────────────────────────

  describe("createReservation", () => {
    it("crée une réservation avec données valides", async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const futureEndDate = new Date(Date.now() + 172800000).toISOString();

      req.body = {
        title: "Visite guidée",
        conversation_id: 1,
        price: 50,
        date: futureDate,
        end_date: futureEndDate,
      };

      const mockConversation = createMockConversation({ voyager_id: 1 });
      const mockReservation = createMockReservation({
        ...req.body,
        creator_id: 1,
        status: "pending",
      });

      Conversation.findByPk.mockResolvedValue(mockConversation);
      Reservation.create.mockResolvedValue(mockReservation);

      await createReservation(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockReservation);
    });

    it("rejette si champs requis manquants", async () => {
      req.body = { title: "Test" }; // manque conversation_id, price, date, end_date

      await createReservation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Tous les champs sont requis" });
    });

    it("rejette si le prix n'est pas un nombre valide", async () => {
      req.body = {
        title: "Test",
        conversation_id: 1,
        price: "invalid",
        date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
      };

      await createReservation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Le prix doit être un nombre valide" });
    });

    it("rejette si le prix est négatif ou zéro", async () => {
      req.body = {
        title: "Test",
        conversation_id: 1,
        price: 0,
        date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
      };

      Conversation.findByPk.mockResolvedValue(createMockConversation());

      await createReservation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Le prix doit être supérieur à zéro" });
    });

    it("rejette si date de fin avant date de début", async () => {
      const futureDate = new Date(Date.now() + 172800000).toISOString();
      const earlierDate = new Date(Date.now() + 86400000).toISOString();

      req.body = {
        title: "Test",
        conversation_id: 1,
        price: 50,
        date: futureDate,
        end_date: earlierDate, // avant date
      };

      await createReservation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "La date de fin doit être postérieure à la date de début"
      });
    });

    it("rejette si date de début dans le passé", async () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      req.body = {
        title: "Test",
        conversation_id: 1,
        price: 50,
        date: pastDate,
        end_date: futureDate,
      };

      await createReservation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "La date de début doit être dans le futur" });
    });

    it("rejette si conversation non trouvée (404)", async () => {
      req.body = {
        title: "Test",
        conversation_id: 999,
        price: 50,
        date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
      };

      Conversation.findByPk.mockResolvedValue(null);

      await createReservation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Conversation non trouvée" });
    });

    it("rejette si utilisateur pas dans la conversation (403)", async () => {
      req.body = {
        title: "Test",
        conversation_id: 1,
        price: 50,
        date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
      };

      // Conversation où l'utilisateur (id=1) n'est ni voyager ni local
      const mockConversation = createMockConversation({ voyager_id: 3, local_id: 4 });
      Conversation.findByPk.mockResolvedValue(mockConversation);

      await createReservation(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Vous ne faites pas partie de cette conversation"
      });
    });

    it("rejette si utilisateur non authentifié (401)", async () => {
      req.user = null;
      req.body = {
        title: "Test",
        conversation_id: 1,
        price: 50,
        date: new Date(Date.now() + 86400000).toISOString(),
        end_date: new Date(Date.now() + 172800000).toISOString(),
      };

      await createReservation(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ─── getMyReservations ─────────────────────────────────────────────────────

  describe("getMyReservations", () => {
    it("retourne les réservations de l'utilisateur", async () => {
      const mockConversations = [
        createMockConversation({ id: 1 }),
        createMockConversation({ id: 2 }),
      ];
      const mockReservations = [
        createMockReservation({ id: 1, conversation_id: 1 }),
        createMockReservation({ id: 2, conversation_id: 2 }),
      ];

      Conversation.findAll.mockResolvedValue(mockConversations);
      Reservation.findAll.mockResolvedValue(mockReservations);

      await getMyReservations(req, res);

      expect(res.json).toHaveBeenCalledWith(mockReservations);
    });

    it("retourne tableau vide si aucune conversation", async () => {
      Conversation.findAll.mockResolvedValue([]);

      await getMyReservations(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    it("rejette si utilisateur non authentifié (401)", async () => {
      req.user = null;

      await getMyReservations(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ─── acceptReservation ─────────────────────────────────────────────────────

  describe("acceptReservation", () => {
    it("accepte une réservation pending", async () => {
      req.params = { id: 1 };
      req.user.dbUser.id = 2; // L'autre utilisateur de la conversation

      const mockConversation = createMockConversation({ voyager_id: 1, local_id: 2 });
      const mockReservation = createMockReservation({
        id: 1,
        creator_id: 1, // Créée par l'autre
        status: "pending",
        Conversation: mockConversation,
      });

      Reservation.findByPk.mockResolvedValue(mockReservation);

      await acceptReservation(req, res);

      expect(mockReservation.status).toBe("accepted");
      expect(mockReservation.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockReservation);
    });

    it("rejette si réservation déjà traitée", async () => {
      req.params = { id: 1 };
      req.user.dbUser.id = 2;

      const mockConversation = createMockConversation({ voyager_id: 1, local_id: 2 });
      const mockReservation = createMockReservation({
        status: "accepted", // Déjà acceptée
        creator_id: 1,
        Conversation: mockConversation,
      });

      Reservation.findByPk.mockResolvedValue(mockReservation);

      await acceptReservation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "La réservation a déjà été traitée" });
    });

    it("rejette si créateur tente d'accepter sa propre réservation", async () => {
      req.params = { id: 1 };
      req.user.dbUser.id = 1; // Même ID que creator_id

      const mockConversation = createMockConversation({ voyager_id: 1, local_id: 2 });
      const mockReservation = createMockReservation({
        creator_id: 1,
        status: "pending",
        Conversation: mockConversation,
      });

      Reservation.findByPk.mockResolvedValue(mockReservation);

      await acceptReservation(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: "Vous ne pouvez pas accepter ou refuser votre propre réservation"
      });
    });

    it("rejette si réservation non trouvée (404)", async () => {
      req.params = { id: 999 };

      Reservation.findByPk.mockResolvedValue(null);

      await acceptReservation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it("rejette si utilisateur pas autorisé (403)", async () => {
      req.params = { id: 1 };
      req.user.dbUser.id = 99; // Pas dans la conversation

      const mockConversation = createMockConversation({ voyager_id: 1, local_id: 2 });
      const mockReservation = createMockReservation({
        Conversation: mockConversation,
      });

      Reservation.findByPk.mockResolvedValue(mockReservation);

      await acceptReservation(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── declineReservation ────────────────────────────────────────────────────

  describe("declineReservation", () => {
    it("refuse une réservation pending", async () => {
      req.params = { id: 1 };
      req.user.dbUser.id = 2;

      const mockConversation = createMockConversation({ voyager_id: 1, local_id: 2 });
      const mockReservation = createMockReservation({
        id: 1,
        creator_id: 1,
        status: "pending",
        Conversation: mockConversation,
      });

      Reservation.findByPk.mockResolvedValue(mockReservation);

      await declineReservation(req, res);

      expect(mockReservation.status).toBe("declined");
      expect(mockReservation.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(mockReservation);
    });

    it("rejette si créateur tente de refuser sa propre réservation", async () => {
      req.params = { id: 1 };
      req.user.dbUser.id = 1;

      const mockConversation = createMockConversation({ voyager_id: 1, local_id: 2 });
      const mockReservation = createMockReservation({
        creator_id: 1,
        status: "pending",
        Conversation: mockConversation,
      });

      Reservation.findByPk.mockResolvedValue(mockReservation);

      await declineReservation(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
