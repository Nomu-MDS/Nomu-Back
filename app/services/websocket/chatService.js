// app/services/websocket/chatService.js
import { Conversation, Message, User } from "../../models/index.js";

// Allowed file extensions for attachments (excluding SVG for security)
const ALLOWED_EXTENSIONS = [
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'ico',
  // Documents
  'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt',
  // Audio
  'mp3', 'wav', 'ogg', 'm4a', 'aac',
  // Video
  'mp4', 'webm', 'avi', 'mov', 'mkv',
  // Archives
  'zip', 'rar', '7z', 'tar', 'gz'
];

// Helper function to extract file extension from path or URL
const extractFileExtension = (str) => {
  const match = str.match(/\.([^./?#]+)(?:[?#]|$)/);
  return match ? match[1].toLowerCase() : null;
};

// Validation helper for attachment field
const validateAttachment = (attachment) => {
  if (!attachment) {
    return { valid: true };
  }

  // Check if attachment is a string
  if (typeof attachment !== 'string') {
    return { valid: false, error: "Attachment must be a string" };
  }

  // Check maximum length to prevent abuse
  const MAX_LENGTH = 2048;
  if (attachment.length > MAX_LENGTH) {
    return { valid: false, error: `Attachment URL/path exceeds maximum length of ${MAX_LENGTH} characters` };
  }

  // Try to validate as URL
  try {
    const url = new URL(attachment);
    
    // Check protocol (only http and https allowed)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, error: "Only HTTP and HTTPS protocols are allowed" };
    }

    // Extract and validate file extension from URL pathname
    const pathname = url.pathname;
    const extension = extractFileExtension(pathname);
    
    if (!extension) {
      return { valid: false, error: "Attachment URL must include a file extension" };
    }

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return { valid: false, error: `File type '.${extension}' is not allowed` };
    }

    return { valid: true };
  } catch (urlError) {
    // Not a valid URL, try to validate as file path
    const extension = extractFileExtension(attachment);
    
    if (!extension) {
      return { valid: false, error: "Attachment must be a valid URL or file path with an extension" };
    }

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return { valid: false, error: `File type '.${extension}' is not allowed` };
    }

    // Validate file path format (prevent directory traversal including encoded variants)
    const pathLower = attachment.toLowerCase();
    let pathDecoded;
    
    try {
      pathDecoded = decodeURIComponent(attachment).toLowerCase();
    } catch (e) {
      // If decoding fails, treat as potentially malicious
      return { valid: false, error: "Invalid attachment format" };
    }
    
    if (pathLower.includes('../') || pathLower.includes('..\\') ||
        pathDecoded.includes('../') || pathDecoded.includes('..\\')) {
      return { valid: false, error: "Directory traversal is not allowed in file paths" };
    }

    return { valid: true };
  }
};

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

    if (!convID) {
      return socket.emit("error", { message: "convID is required" });
    }

    socket.leave(`conversation_${convID}`);
    console.log(`User ${socket.userId} left conversation ${convID}`);
  });

  // Envoyer un message
  socket.on("send_message", async (data) => {
    try {
      const { convID, content, attachment } = data;

      if (!convID || !content) {
        return socket.emit("error", { message: "convID and content are required" });
      }

      // Validate attachment if provided
      if (attachment) {
        const validation = validateAttachment(attachment);
        if (!validation.valid) {
          return socket.emit("error", { message: validation.error });
        }
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
        attachment: attachment || null,
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

      // Vérifier que la conversation existe et que l'utilisateur y a accès
      const conversation = await Conversation.findByPk(convID);

      if (!conversation) {
        return socket.emit("error", { message: "Conversation not found" });
      }

      if (conversation.voyagerID !== user.id && conversation.localID !== user.id) {
        return socket.emit("error", { message: "Access denied to this conversation" });
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
