// app/routes/conversations/index.js
import express from "express";
import { Conversation, Message, User } from "../../models/index.js";
import { Op } from "sequelize";

const router = express.Router();

// GET /conversations - Récupérer toutes les conversations de l'utilisateur
router.get("/", async (req, res) => {
  try {
    const userFirebaseUID = req.user.uid;

    // Trouver l'utilisateur dans la DB
    const user = await User.findOne({ where: { firebaseUid: userFirebaseUID } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Récupérer toutes les conversations où l'utilisateur est voyager ou local
    const conversations = await Conversation.findAll({
      where: {
        [Op.or]: [{ voyagerID: user.id }, { localID: user.id }],
      },
      include: [
        {
          model: User,
          as: "Voyager",
          attributes: ["id", "name", "email", "firebaseUid"],
        },
        {
          model: User,
          as: "Local",
          attributes: ["id", "name", "email", "firebaseUid"],
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
    const userFirebaseUID = req.user.uid;

    // Trouver l'utilisateur dans la DB
    const user = await User.findOne({ where: { firebaseUid: userFirebaseUID } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Récupérer la conversation
    const conversation = await Conversation.findByPk(id, {
      include: [
        {
          model: User,
          as: "Voyager",
          attributes: ["id", "name", "email", "firebaseUid"],
        },
        {
          model: User,
          as: "Local",
          attributes: ["id", "name", "email", "firebaseUid"],
        },
      ],
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Vérifier que l'utilisateur a accès
    if (conversation.voyagerID !== user.id && conversation.localID !== user.id) {
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
    const userFirebaseUID = req.user.uid;

    // Trouver l'utilisateur dans la DB
    const user = await User.findOne({ where: { firebaseUid: userFirebaseUID } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Vérifier que la conversation existe et que l'utilisateur y a accès
    const conversation = await Conversation.findByPk(id);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (conversation.voyagerID !== user.id && conversation.localID !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Récupérer les messages
    const messages = await Message.findAll({
      where: { convID: id },
      include: [
        {
          model: User,
          as: "Sender",
          attributes: ["id", "name", "email", "firebaseUid"],
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
    const userFirebaseUID = req.user.uid;

    if (!otherUserId) {
      return res.status(400).json({ error: "otherUserId is required" });
    }

    // Trouver l'utilisateur actuel
    const currentUser = await User.findOne({ where: { firebaseUid: userFirebaseUID } });

    if (!currentUser) {
      return res.status(404).json({ error: "Current user not found" });
    }

    // Vérifier que l'autre utilisateur existe
    const otherUser = await User.findByPk(otherUserId);

    if (!otherUser) {
      return res.status(404).json({ error: "Other user not found" });
    }

    // Vérifier que l'utilisateur actuel est un voyageur
    if (currentUser.role !== "voyageur") {
      return res.status(403).json({ error: "Only travelers (voyageur) can initiate conversations" });
    }

    // Vérifier que l'autre utilisateur est un local
    if (otherUser.role !== "local") {
      return res.status(403).json({ error: "You can only contact local users" });
    }

    // Vérifier qu'une conversation n'existe pas déjà (voyageur → local)
    let conversation = await Conversation.findOne({
      where: {
        voyagerID: currentUser.id,
        localID: otherUserId,
      },
    });

    // Si la conversation existe déjà, la retourner
    if (conversation) {
      conversation = await Conversation.findByPk(conversation.id, {
        include: [
          {
            model: User,
            as: "Voyager",
            attributes: ["id", "name", "email", "firebaseUid"],
          },
          {
            model: User,
            as: "Local",
            attributes: ["id", "name", "email", "firebaseUid"],
          },
        ],
      });
      return res.json({ conversation, existed: true });
    }

    // Créer la conversation
    conversation = await Conversation.create({
      voyagerID: currentUser.id,
      localID: otherUserId,
    });

    // Recharger avec les relations
    conversation = await Conversation.findByPk(conversation.id, {
      include: [
        {
          model: User,
          as: "Voyager",
          attributes: ["id", "name", "email", "firebaseUid"],
        },
        {
          model: User,
          as: "Local",
          attributes: ["id", "name", "email", "firebaseUid"],
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
    const userFirebaseUID = req.user.uid;

    // Trouver l'utilisateur
    const user = await User.findOne({ where: { firebaseUid: userFirebaseUID } });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Vérifier que la conversation existe et que l'utilisateur y a accès
    const conversation = await Conversation.findByPk(id);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    if (conversation.voyagerID !== user.id && conversation.localID !== user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Récupérer le message
    const message = await Message.findByPk(messageId);

    if (!message) {
      return res.status(404).json({ error: "Message not found" });
    }

    if (message.convID !== parseInt(id)) {
      return res.status(400).json({ error: "Message does not belong to this conversation" });
    }

    // Ne peut pas marquer ses propres messages comme lus
    if (message.userID === user.id) {
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
