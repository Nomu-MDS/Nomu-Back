// app/routes/conversations/index.js
import express from "express";
import { Conversation, Message, User } from "../../models/index.js";
import { Op } from "sequelize";

const router = express.Router();

// GET /conversations - Récupérer toutes les conversations de l'utilisateur
router.get("/", async (req, res) => {
  try {
    const currentUser = req.user?.dbUser;
    if (!currentUser) return res.status(401).json({ error: "Utilisateur non authentifié" });

    // Récupérer toutes les conversations où l'utilisateur est voyager ou local
    const conversations = await Conversation.findAll({
      where: {
        [Op.or]: [{ voyager_id: currentUser.id }, { local_id: currentUser.id }],
      },
      include: [
        {
          model: User,
          as: "Voyager",
          attributes: ["id", "name", "email"],
        },
        {
          model: User,
          as: "Local",
          attributes: ["id", "name", "email"],
        },
        {
          model: Message,
          as: "Messages",
          limit: 1,
          order: [["createdAt", "DESC"]],
          separate: true,
          include: [
            {
              model: User,
              as: "Sender",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      order: [["updatedAt", "DESC"]],
    });

    res.json({ conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// GET /conversations/:id - Récupérer une conversation spécifique
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user?.dbUser;
    if (!currentUser) return res.status(401).json({ error: "Utilisateur non authentifié" });

    // Récupérer la conversation
    const conversation = await Conversation.findByPk(id, {
      include: [
        {
          model: User,
          as: "Voyager",
          attributes: ["id", "name", "email"],
        },
        {
          model: User,
          as: "Local",
          attributes: ["id", "name", "email"],
        },
      ],
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Vérifier que l'utilisateur a accès
    if (conversation.voyager_id !== currentUser.id && conversation.local_id !== currentUser.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({ conversation });
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

// GET /conversations/:id/messages - Récupérer l'historique des messages d'une conversation
router.get("/:id/messages", async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const currentUser = req.user?.dbUser;
    if (!currentUser) return res.status(401).json({ error: "Utilisateur non authentifié" });

    // Vérifier que la conversation existe et que l'utilisateur y a accès
    const conversation = await Conversation.findByPk(id);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (conversation.voyager_id !== currentUser.id && conversation.local_id !== currentUser.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Récupérer les messages
    const messages = await Message.findAll({
      where: { conversation_id: id },
      include: [
        {
          model: User,
          as: "Sender",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// POST /conversations - Créer une nouvelle conversation
router.post("/", async (req, res) => {
  try {
    const { otherUserId } = req.body;
    const currentUser = req.user?.dbUser;

    if (!otherUserId) {
      return res.status(400).json({ error: "otherUserId is required" });
    }

    if (!currentUser) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    // Vérifier que l'autre utilisateur existe
    const otherUser = await User.findByPk(otherUserId);

    if (!otherUser) {
      return res.status(404).json({ error: "Other user not found" });
    }

    // Vérifier qu'on ne crée pas une conversation avec soi-même
    if (currentUser.id === otherUser.id) {
      return res.status(400).json({ error: "Cannot create a conversation with yourself" });
    }

    // Vérifier qu'une conversation n'existe pas déjà (dans les deux sens)
    let conversation = await Conversation.findOne({
      where: {
        [Op.or]: [
          { voyager_id: currentUser.id, local_id: otherUserId },
          { voyager_id: otherUserId, local_id: currentUser.id },
        ],
      },
    });

    // Si la conversation existe déjà, la retourner
    if (conversation) {
      conversation = await Conversation.findByPk(conversation.id, {
        include: [
          {
            model: User,
            as: "Voyager",
            attributes: ["id", "name", "email"],
          },
          {
            model: User,
            as: "Local",
            attributes: ["id", "name", "email"],
          },
        ],
      });
      return res.json({ conversation, existed: true });
    }

    // Créer la conversation
    conversation = await Conversation.create({
      voyager_id: currentUser.id,
      local_id: otherUserId,
    });

    // Recharger avec les relations
    conversation = await Conversation.findByPk(conversation.id, {
      include: [
          {
            model: User,
            as: "Voyager",
            attributes: ["id", "name", "email"],
          },
          {
            model: User,
            as: "Local",
            attributes: ["id", "name", "email"],
          },
      ],
    });

    res.status(201).json({ conversation, existed: false });
  } catch (error) {
    console.error("Error creating conversation:", error);
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// PATCH /conversations/:id/messages/:messageId/read - Marquer un message comme lu
router.patch("/:id/messages/:messageId/read", async (req, res) => {
  try {
    const { id, messageId } = req.params;
    const user = req.user?.dbUser;

    if (!user) {
      return res.status(401).json({ error: "Utilisateur non authentifié" });
    }

    // Vérifier que la conversation existe et que l'utilisateur y a accès
    const conversation = await Conversation.findByPk(id);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (conversation.voyager_id !== user.id && conversation.local_id !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Récupérer le message
    const message = await Message.findByPk(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.conversation_id !== parseInt(id)) {
      return res.status(400).json({ error: "Message does not belong to this conversation" });
    }

    // Ne peut pas marquer ses propres messages comme lus
    if (message.user_id === user.id) {
      return res.status(400).json({ error: "Cannot mark your own message as read" });
    }

    // Mettre à jour
    await message.update({ read: true });

    res.json({ message: "Message marked as read", messageId });
  } catch (error) {
    console.error("Error marking message as read:", error);
    res.status(500).json({ error: "Failed to mark message as read" });
  }
});

export default router;
