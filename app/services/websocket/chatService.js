// app/services/websocket/chatService.js
import { Conversation, Message, User } from "../../models/index.js";
import minioService from "../storage/minioService.js";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * Valide un attachement base64
 * @param {string} attachment - Le string base64 avec le préfixe data:
 * @returns {{ valid: boolean, error?: string }}
 */
const validateAttachment = (attachment) => {
  if (!attachment) return { valid: true };

  // Vérifier le format data:image/xxx;base64,xxx
  const match = attachment.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return { valid: false, error: "Invalid attachment format" };
  }

  const mimeType = match[1];
  const base64Data = match[2];

  // Vérifier le type MIME
  if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return { valid: false, error: "Only images are allowed (jpeg, png, gif, webp)" };
  }

  // Calculer la taille approximative (base64 = ~4/3 de la taille originale)
  const sizeInBytes = (base64Data.length * 3) / 4;
  if (sizeInBytes > MAX_ATTACHMENT_SIZE) {
    return { valid: false, error: "Attachment exceeds 10MB limit" };
  }

  return { valid: true };
};

export const setupChatHandlers = (io, socket) => {

  // Rejoindre une conversation
  socket.on("join_conversation", async (data) => {
    try {
      const { conversation_id } = data;

      if (!conversation_id) {
        return socket.emit("error", { message: "conversation_id is required" });
      }

      // Vérifier que la conversation existe et que l'utilisateur y a accès
      const conversation = await Conversation.findByPk(conversation_id);

      if (!conversation) {
        return socket.emit("error", { message: "Conversation not found" });
      }

      // Utiliser l'utilisateur caché
      const user = socket.dbUser;

      if (conversation.voyager_id !== user.id && conversation.local_id !== user.id) {
        return socket.emit("error", { message: "Access denied to this conversation" });
      }

      // Rejoindre la room
      socket.join(`conversation_${conversation_id}`);

      socket.emit("joined_conversation", { conversation_id });
    } catch (error) {
      console.error("Error joining conversation:", error);
      socket.emit("error", { message: "Failed to join conversation" });
    }
  });

  // Quitter une conversation
  socket.on("leave_conversation", (data) => {
    const { conversation_id } = data;

    if (!conversation_id) {
      return socket.emit("error", { message: "conversation_id is required" });
    }

    socket.leave(`conversation_${conversation_id}`);
  });

  // Envoyer un message
  socket.on("send_message", async (data) => {
    try {
      const { conversation_id, content, attachment } = data;

      if (!conversation_id || !content) {
        return socket.emit("error", { message: "conversation_id and content are required" });
      }

      // Valider la longueur du message
      if (content.length > MAX_MESSAGE_LENGTH) {
        return socket.emit("error", { message: `Message exceeds ${MAX_MESSAGE_LENGTH} characters limit` });
      }

      // Valider l'attachement
      const attachmentValidation = validateAttachment(attachment);
      if (!attachmentValidation.valid) {
        return socket.emit("error", { message: attachmentValidation.error });
      }

      // Utiliser l'utilisateur caché
      const user = socket.dbUser;

      // Vérifier que la conversation existe et que l'utilisateur y a accès
      const conversation = await Conversation.findByPk(conversation_id);

      if (!conversation) {
        return socket.emit("error", { message: "Conversation not found" });
      }

      if (conversation.voyager_id !== user.id && conversation.local_id !== user.id) {
        return socket.emit("error", { message: "Access denied to this conversation" });
      }

      // Upload l'attachment vers Minio si présent
      let attachmentUrl = null;
      if (attachment) {
        try {
          const result = await minioService.uploadMessageAttachment(conversation_id, attachment);
          attachmentUrl = result.url;
        } catch (uploadError) {
          console.error("Error uploading attachment to Minio:", uploadError);
          return socket.emit("error", { message: "Failed to upload attachment" });
        }
      }

      // Créer le message en DB
      const message = await Message.create({
        user_id: user.id,
        conversation_id,
        content,
        attachment: attachmentUrl,
        read: false,
      });

      // Charger le message complet avec les relations
      const fullMessage = await Message.findByPk(message.id, {
        include: [
          {
            model: User,
            as: "Sender",
            attributes: ["id", "name", "email", "firebase_uid"],
          },
        ],
      });

      // Émettre le message à tous les participants de la conversation
      io.to(`conversation_${conversation_id}`).emit("new_message", {
        message: fullMessage,
      });

      // Confirmer l'envoi à l'émetteur
      socket.emit("message_sent", {
        message: fullMessage,
      });
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Indicateur "en train d'écrire"
  socket.on("typing", (data) => {
    try {
      const { conversation_id, isTyping } = data;

      if (!conversation_id) {
        return socket.emit("error", { message: "conversation_id is required" });
      }

      // Vérifier que le socket est dans la room (déjà rejoint et validé)
      if (!socket.rooms.has(`conversation_${conversation_id}`)) {
        return socket.emit("error", { message: "Not joined to this conversation" });
      }

      // Utiliser l'utilisateur caché
      const user = socket.dbUser;

      // Émettre à tous les autres participants (sauf l'émetteur)
      socket.to(`conversation_${conversation_id}`).emit("user_typing", {
        conversation_id,
        userId: user.id,
        userName: user.name,
        isTyping,
      });
    } catch (error) {
      console.error("Error handling typing event:", error);
    }
  });

  // Marquer un message comme lu
  socket.on("message_read", async (data) => {
    try {
      const { message_id } = data;

      if (!message_id) {
        return socket.emit("error", { message: "message_id is required" });
      }

      // Récupérer le message
      const message = await Message.findByPk(message_id, {
        include: [
          {
            model: Conversation,
            as: "Conversation",
          },
        ],
      });

      if (!message) {
        return socket.emit("error", { message: "Message not found" });
      }

      // Utiliser l'utilisateur caché
      const user = socket.dbUser;

      // Vérifier que l'utilisateur a accès à la conversation
      const conversation = message.Conversation;
      if (conversation.voyager_id !== user.id && conversation.local_id !== user.id) {
        return socket.emit("error", { message: "Access denied" });
      }

      // L'utilisateur ne peut pas marquer ses propres messages comme lus
      if (message.user_id === user.id) {
        return socket.emit("error", { message: "Cannot mark your own message as read" });
      }

      // Mettre à jour le statut de lecture
      await message.update({ read: true });

      // Notifier tous les participants
      io.to(`conversation_${conversation.id}`).emit("message_read_update", {
        message_id,
        conversation_id: conversation.id,
        read: true,
      });
    } catch (error) {
      console.error("Error marking message as read:", error);
      socket.emit("error", { message: "Failed to mark message as read" });
    }
  });

  // Déconnexion
  socket.on("disconnect", () => {});
};
