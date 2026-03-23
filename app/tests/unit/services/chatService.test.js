// app/tests/unit/services/chatService.test.js
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock des modèles
vi.mock("../../../models/index.js", () => ({
  Conversation: {
    findByPk: vi.fn(),
  },
  Message: {
    create: vi.fn(),
    findByPk: vi.fn(),
  },
  User: {},
}));

import { Conversation, Message } from "../../../models/index.js";
import { setupChatHandlers } from "../../../services/websocket/chatService.js";

describe("chatService", () => {
  let io, socket, handlers;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock socket
    socket = {
      emit: vi.fn(),
      join: vi.fn(),
      leave: vi.fn(),
      to: vi.fn(() => socket),
      on: vi.fn((event, handler) => {
        handlers[event] = handler;
      }),
      rooms: new Set(),
      dbUser: { id: 1, name: "Test User" },
    };

    // Mock io
    io = {
      to: vi.fn(() => ({
        emit: vi.fn(),
      })),
    };

    handlers = {};

    // Setup handlers
    setupChatHandlers(io, socket);
  });

  // ─── join_conversation ─────────────────────────────────────────────────────

  describe("join_conversation", () => {
    it("rejoint une conversation avec succès", async () => {
      const mockConversation = { id: 1, voyager_id: 1, local_id: 2 };
      Conversation.findByPk.mockResolvedValue(mockConversation);

      await handlers.join_conversation({ conversation_id: 1 });

      expect(Conversation.findByPk).toHaveBeenCalledWith(1);
      expect(socket.join).toHaveBeenCalledWith("conversation_1");
      expect(socket.emit).toHaveBeenCalledWith("joined_conversation", { conversation_id: 1 });
    });

    it("erreur si conversation_id manquant", async () => {
      await handlers.join_conversation({});

      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "conversation_id is required"
      });
    });

    it("erreur si conversation non trouvée", async () => {
      Conversation.findByPk.mockResolvedValue(null);

      await handlers.join_conversation({ conversation_id: 999 });

      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "Conversation not found"
      });
    });

    it("erreur si utilisateur non autorisé", async () => {
      const mockConversation = { id: 1, voyager_id: 2, local_id: 3 }; // User 1 pas dedans
      Conversation.findByPk.mockResolvedValue(mockConversation);

      await handlers.join_conversation({ conversation_id: 1 });

      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "Access denied to this conversation"
      });
      expect(socket.join).not.toHaveBeenCalled();
    });

    it("autorise le local_id", async () => {
      socket.dbUser.id = 2;
      const mockConversation = { id: 1, voyager_id: 1, local_id: 2 };
      Conversation.findByPk.mockResolvedValue(mockConversation);

      await handlers.join_conversation({ conversation_id: 1 });

      expect(socket.join).toHaveBeenCalled();
    });
  });

  // ─── leave_conversation ────────────────────────────────────────────────────

  describe("leave_conversation", () => {
    it("quitte une conversation", () => {
      handlers.leave_conversation({ conversation_id: 1 });

      expect(socket.leave).toHaveBeenCalledWith("conversation_1");
    });

    it("erreur si conversation_id manquant", () => {
      handlers.leave_conversation({});

      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "conversation_id is required"
      });
    });
  });

  // ─── send_message ──────────────────────────────────────────────────────────

  describe("send_message", () => {
    it("envoie un message avec succès", async () => {
      const mockConversation = { id: 1, voyager_id: 1, local_id: 2 };
      const mockMessage = { id: 1, content: "Hello", user_id: 1 };
      const mockFullMessage = { ...mockMessage, Sender: { id: 1, name: "Test" } };

      Conversation.findByPk.mockResolvedValue(mockConversation);
      Message.create.mockResolvedValue(mockMessage);
      Message.findByPk.mockResolvedValue(mockFullMessage);

      const emitMock = vi.fn();
      io.to.mockReturnValue({ emit: emitMock });

      await handlers.send_message({
        conversation_id: 1,
        content: "Hello",
      });

      expect(Message.create).toHaveBeenCalledWith({
        user_id: 1,
        conversation_id: 1,
        content: "Hello",
        attachment: null,
        read: false,
      });
      expect(io.to).toHaveBeenCalledWith("conversation_1");
      expect(emitMock).toHaveBeenCalledWith("new_message", { message: mockFullMessage });
      expect(socket.emit).toHaveBeenCalledWith("message_sent", { message: mockFullMessage });
    });

    it("envoie un message avec attachment", async () => {
      const mockConversation = { id: 1, voyager_id: 1, local_id: 2 };
      const mockMessage = { id: 1 };

      Conversation.findByPk.mockResolvedValue(mockConversation);
      Message.create.mockResolvedValue(mockMessage);
      Message.findByPk.mockResolvedValue(mockMessage);

      io.to.mockReturnValue({ emit: vi.fn() });

      await handlers.send_message({
        conversation_id: 1,
        content: "Photo",
        attachment: "http://localhost:9000/messages/photo.jpg",
      });

      expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({
        attachment: "http://localhost:9000/messages/photo.jpg",
      }));
    });

    it("erreur si champs requis manquants", async () => {
      await handlers.send_message({ conversation_id: 1 });

      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "conversation_id and content or attachment are required"
      });
    });

    it("erreur si message trop long", async () => {
      const longContent = "a".repeat(2001);

      await handlers.send_message({
        conversation_id: 1,
        content: longContent,
      });

      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "Message exceeds 2000 characters limit"
      });
    });

    it("erreur si URL attachment invalide", async () => {
      await handlers.send_message({
        conversation_id: 1,
        content: "Test",
        attachment: "http://malicious-site.com/file.jpg",
      });

      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "Invalid attachment URL. Must be uploaded via /upload/message-attachment first."
      });
    });

    it("erreur si conversation non trouvée", async () => {
      Conversation.findByPk.mockResolvedValue(null);

      await handlers.send_message({
        conversation_id: 999,
        content: "Hello",
      });

      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "Conversation not found"
      });
    });

    it("erreur si utilisateur non autorisé", async () => {
      const mockConversation = { id: 1, voyager_id: 2, local_id: 3 };
      Conversation.findByPk.mockResolvedValue(mockConversation);

      await handlers.send_message({
        conversation_id: 1,
        content: "Hello",
      });

      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "Access denied to this conversation"
      });
    });
  });

  // ─── typing ────────────────────────────────────────────────────────────────

  describe("typing", () => {
    it("émet l'événement typing", () => {
      socket.rooms.add("conversation_1");

      handlers.typing({ conversation_id: 1, isTyping: true });

      expect(socket.to).toHaveBeenCalledWith("conversation_1");
    });

    it("erreur si conversation_id manquant", () => {
      handlers.typing({});

      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "conversation_id is required"
      });
    });

    it("erreur si pas dans la room", () => {
      // socket.rooms est vide

      handlers.typing({ conversation_id: 1, isTyping: true });

      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "Not joined to this conversation"
      });
    });
  });

  // ─── message_read ──────────────────────────────────────────────────────────

  describe("message_read", () => {
    it("marque un message comme lu", async () => {
      const mockMessage = {
        id: 1,
        user_id: 2, // Autre utilisateur
        Conversation: { id: 1, voyager_id: 1, local_id: 2 },
        update: vi.fn(),
      };

      Message.findByPk.mockResolvedValue(mockMessage);

      const emitMock = vi.fn();
      io.to.mockReturnValue({ emit: emitMock });

      await handlers.message_read({ message_id: 1 });

      expect(mockMessage.update).toHaveBeenCalledWith({ read: true });
      expect(io.to).toHaveBeenCalledWith("conversation_1");
      expect(emitMock).toHaveBeenCalledWith("message_read_update", {
        message_id: 1,
        conversation_id: 1,
        read: true,
      });
    });

    it("erreur si message_id manquant", async () => {
      await handlers.message_read({});

      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "message_id is required"
      });
    });

    it("erreur si message non trouvé", async () => {
      Message.findByPk.mockResolvedValue(null);

      await handlers.message_read({ message_id: 999 });

      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "Message not found"
      });
    });

    it("erreur si utilisateur non autorisé", async () => {
      const mockMessage = {
        id: 1,
        user_id: 2,
        Conversation: { id: 1, voyager_id: 3, local_id: 4 }, // User 1 pas dedans
      };

      Message.findByPk.mockResolvedValue(mockMessage);

      await handlers.message_read({ message_id: 1 });

      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "Access denied"
      });
    });

    it("erreur si on marque son propre message", async () => {
      const mockMessage = {
        id: 1,
        user_id: 1, // Même utilisateur
        Conversation: { id: 1, voyager_id: 1, local_id: 2 },
      };

      Message.findByPk.mockResolvedValue(mockMessage);

      await handlers.message_read({ message_id: 1 });

      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "Cannot mark your own message as read"
      });
    });
  });

  // ─── validateAttachmentUrl (via send_message) ──────────────────────────────

  describe("attachment URL validation", () => {
    beforeEach(() => {
      const mockConversation = { id: 1, voyager_id: 1, local_id: 2 };
      Conversation.findByPk.mockResolvedValue(mockConversation);
    });

    it("accepte URL localhost:9000", async () => {
      Message.create.mockResolvedValue({ id: 1 });
      Message.findByPk.mockResolvedValue({ id: 1 });
      io.to.mockReturnValue({ emit: vi.fn() });

      await handlers.send_message({
        conversation_id: 1,
        content: "Test",
        attachment: "http://localhost:9000/messages/file.jpg",
      });

      expect(Message.create).toHaveBeenCalled();
    });

    it("accepte URL minio-nomu:9000", async () => {
      Message.create.mockResolvedValue({ id: 1 });
      Message.findByPk.mockResolvedValue({ id: 1 });
      io.to.mockReturnValue({ emit: vi.fn() });

      await handlers.send_message({
        conversation_id: 1,
        content: "Test",
        attachment: "http://minio-nomu:9000/messages/file.jpg",
      });

      expect(Message.create).toHaveBeenCalled();
    });

    it("accepte null attachment", async () => {
      Message.create.mockResolvedValue({ id: 1 });
      Message.findByPk.mockResolvedValue({ id: 1 });
      io.to.mockReturnValue({ emit: vi.fn() });

      await handlers.send_message({
        conversation_id: 1,
        content: "Test",
        attachment: null,
      });

      expect(Message.create).toHaveBeenCalled();
    });

    it("rejette URL externe", async () => {
      await handlers.send_message({
        conversation_id: 1,
        content: "Test",
        attachment: "https://external-site.com/file.jpg",
      });

      expect(socket.emit).toHaveBeenCalledWith("error", expect.objectContaining({
        message: expect.stringContaining("Invalid attachment URL")
      }));
      expect(Message.create).not.toHaveBeenCalled();
    });

    it("rejette URL mal formatée", async () => {
      await handlers.send_message({
        conversation_id: 1,
        content: "Test",
        attachment: "not-a-valid-url",
      });

      expect(socket.emit).toHaveBeenCalledWith("error", {
        message: "Invalid attachment URL format"
      });
    });
  });
});
