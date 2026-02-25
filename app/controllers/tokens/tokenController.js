// app/controllers/tokens/tokenController.js
import tokenService from "../../services/token/tokenService.js";

// Récupérer le solde de l'utilisateur connecté
export const getBalance = async (req, res) => {
  try {
    const userId = req.user.dbUser.id;
    const balance = await tokenService.getBalance(userId);

    res.json({ balance });
  } catch (error) {
    console.error("Erreur getBalance:", error);
    res.status(500).json({ error: error.message });
  }
};

// Récupérer les détails complets du wallet avec statistiques
export const getWalletDetails = async (req, res) => {
  try {
    const userId = req.user.dbUser.id;
    const details = await tokenService.getWalletDetails(userId);

    res.json(details);
  } catch (error) {
    console.error("Erreur getWalletDetails:", error);
    res.status(500).json({ error: error.message });
  }
};

// Récupérer l'historique des transactions
export const getHistory = async (req, res) => {
  try {
    const userId = req.user.dbUser.id;
    const { limit, offset, type } = req.query;

    const options = {
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      type: type || null,
    };

    const history = await tokenService.getHistory(userId, options);

    res.json(history);
  } catch (error) {
    console.error("Erreur getHistory:", error);
    res.status(500).json({ error: error.message });
  }
};

// Créditer des tokens (admin ou système)
export const creditTokens = async (req, res) => {
  try {
    const { userId, amount, type, reason, metadata } = req.body;

    if (!userId || !amount || !type) {
      return res.status(400).json({ error: "userId, amount et type sont requis" });
    }

    const transaction = await tokenService.credit(userId, amount, type, reason, metadata);

    res.status(201).json({
      message: "Tokens crédités avec succès",
      transaction
    });
  } catch (error) {
    console.error("Erreur creditTokens:", error);
    res.status(500).json({ error: error.message });
  }
};

// Débiter des tokens (admin ou système)
export const debitTokens = async (req, res) => {
  try {
    const { userId, amount, type, reason, metadata } = req.body;

    if (!userId || !amount || !type) {
      return res.status(400).json({ error: "userId, amount et type sont requis" });
    }

    const transaction = await tokenService.debit(userId, amount, type, reason, metadata);

    res.status(201).json({
      message: "Tokens débités avec succès",
      transaction
    });
  } catch (error) {
    console.error("Erreur debitTokens:", error);

    // Retourner 402 Payment Required si solde insuffisant
    if (error.message.includes("Solde insuffisant")) {
      return res.status(402).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
};

// Ajustement admin
export const adminAdjustment = async (req, res) => {
  try {
    const { userId, amount, reason } = req.body;

    if (!userId || amount === undefined || !reason) {
      return res.status(400).json({ error: "userId, amount et reason sont requis" });
    }

    const transaction = await tokenService.adminAdjustment(userId, amount, reason);

    res.status(201).json({
      message: "Ajustement effectué avec succès",
      transaction
    });
  } catch (error) {
    console.error("Erreur adminAdjustment:", error);
    res.status(500).json({ error: error.message });
  }
};
