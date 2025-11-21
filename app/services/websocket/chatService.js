// app/services/websocket/chatService.js
import { Conversation, Message, User } from "../../models/index.js";

export const setupChatHandlers = (io, socket) => {
  console.log(`✅ User connected: ${socket.userId}`);

  // Rejoindre une conversation
  socket.on("join_conversation", async (data) => {
    try {
      const { convID } = data;

      if (!convID) {
        return socket.emit("error", { message: "convID is required" });
      }

      // Vérifier que la conversation existe et que l'utilisateur y a accès
      const conversation = await Conversation.findByPk(convID);

      if (!conversation) {
        return socket.emit("error", { message: "Conversation not found" });
      }

      // Vérifier que l'utilisateur fait partie de la conversation
      const user = await User.findOne({ where: { firebaseUid: socket.userId } });

      if (!user) {
        return socket.emit("error", { message: "User not found" });
      }

      if (conversation.voyagerID !== user.id && conversation.localID !== user.id) {
        return socket.emit("error", { message: "Access denied to this conversation" });
      }

      // Rejoindre la room
      socket.join(`conversation_${convID}`);
      console.log(`User ${socket.userId} joined conversation ${convID}`);

      socket.emit("joined_conversation", { convID });
    } catch (error) {
      console.error("Error joining conversation:", error);
      socket.emit("error", { message: "Failed to join conversation" });
    }
  });

  // Quitter une conversation
  socket.on("leave_conversation", (data) => {
    const { convID } = data;
    socket.leave(`conversation_${convID}`);
    console.log(`User ${socket.userId} left conversation ${convID}`);
  });

  // Envoyer un message
  socket.on("send_message", async (data) => {
    try {
      const { convID, content, attachement } = data;

      if (!convID || !content) {
        return socket.emit("error", { message: "convID and content are required" });
      }

      // Récupérer l'utilisateur
      const user = await User.findOne({ where: { firebaseUid: socket.userId } });

      if (!user) {
        return socket.emit("error", { message: "User not found" });
      }

      // Vérifier que la conversation existe et que l'utilisateur y a accès
      const conversation = await Conversation.findByPk(convID);

      if (!conversation) {
        return socket.emit("error", { message: "Conversation not found" });
      }

      if (conversation.voyagerID !== user.id && conversation.localID !== user.id) {
        return socket.emit("error", { message: "Access denied to this conversation" });
      }

      // Créer le message en DB
      const message = await Message.create({
        userID: user.id,
        convID,
        content,
        attachement: attachement || null,
        read: false,
      });

      // Charger le message complet avec les relations
      const fullMessage = await Message.findByPk(message.id, {
        include: [
          {
            model: User,
            as: "Sender",
            attributes: ["id", "name", "email", "firebaseUid"],
          },
        ],
      });

      // Émettre le message à tous les participants de la conversation
      io.to(`conversation_${convID}`).emit("new_message", {
        message: fullMessage,
      });

      // Confirmer l'envoi à l'émetteur
      socket.emit("message_sent", {
        message: fullMessage,
      });

      console.log(`Message sent in conversation ${convID} by user ${user.id}`);
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Indicateur "en train d'écrire"
  socket.on("typing", async (data) => {
    try {
      const { convID, isTyping } = data;

      if (!convID) {
        return socket.emit("error", { message: "convID is required" });
      }

      // Récupérer l'utilisateur
      const user = await User.findOne({ where: { firebaseUid: socket.userId } });

      if (!user) {
        return socket.emit("error", { message: "User not found" });
      }

      // Émettre à tous les autres participants (sauf l'émetteur)
      socket.to(`conversation_${convID}`).emit("user_typing", {
        convID,
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
      const { messageID } = data;

      if (!messageID) {
        return socket.emit("error", { message: "messageID is required" });
      }

      // Récupérer le message
      const message = await Message.findByPk(messageID, {
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

      // Récupérer l'utilisateur
      const user = await User.findOne({ where: { firebaseUid: socket.userId } });

      if (!user) {
        return socket.emit("error", { message: "User not found" });
      }

      // Vérifier que l'utilisateur a accès à la conversation
      const conversation = message.Conversation;
      if (conversation.voyagerID !== user.id && conversation.localID !== user.id) {
        return socket.emit("error", { message: "Access denied" });
      }

      // L'utilisateur ne peut pas marquer ses propres messages comme lus
      if (message.userID === user.id) {
        return socket.emit("error", { message: "Cannot mark your own message as read" });
      }

      // Mettre à jour le statut de lecture
      await message.update({ read: true });

      // Notifier tous les participants
      io.to(`conversation_${conversation.id}`).emit("message_read_update", {
        messageID,
        convID: conversation.id,
        readBy: user.id,
      });

      console.log(`Message ${messageID} marked as read by user ${user.id}`);
    } catch (error) {
      console.error("Error marking message as read:", error);
      socket.emit("error", { message: "Failed to mark message as read" });
    }
  });

  // Déconnexion
  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.userId}`);
  });
};
