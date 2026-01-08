// app/services/token/tokenService.js
import { Wallet, TokenTransaction, User } from "../../models/index.js";
import { sequelize } from "../../config/database.js";

class TokenService {
  /**
   * Crée un wallet pour un utilisateur (appelé automatiquement lors de l'inscription)
   * @param {number} userId - ID de l'utilisateur
   * @param {number} initialBalance - Solde initial (par défaut: 0)
   * @returns {Promise<Wallet>} Wallet créé
   */
  async createWallet(userId, initialBalance = 0) {
    try {
      const wallet = await Wallet.create({
        user_id: userId,
        balance: initialBalance,
      });

      // Si un solde initial est fourni, créer une transaction
      if (initialBalance > 0) {
        await TokenTransaction.create({
          user_id: userId,
          amount: initialBalance,
          type: "SIGNUP_BONUS",
          reason: "Bonus d'inscription",
          balance_before: 0,
          balance_after: initialBalance,
        });
      }

      return wallet;
    } catch (error) {
      throw new Error(`Erreur lors de la création du wallet: ${error.message}`);
    }
  }

  /**
   * Récupère le solde actuel d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<number>} Solde actuel
   */
  async getBalance(userId) {
    try {
      const wallet = await Wallet.findOne({ where: { user_id: userId } });

      if (!wallet) {
        throw new Error("Wallet introuvable pour cet utilisateur");
      }

      return wallet.balance;
    } catch (error) {
      throw new Error(`Erreur lors de la récupération du solde: ${error.message}`);
    }
  }

  /**
   * Vérifie si un utilisateur a suffisamment de tokens
   * @param {number} userId - ID de l'utilisateur
   * @param {number} amount - Montant requis
   * @returns {Promise<boolean>} True si le solde est suffisant
   */
  async hasSufficientBalance(userId, amount) {
    const balance = await this.getBalance(userId);
    return balance >= amount;
  }

  /**
   * Crédite des tokens à un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {number} amount - Montant à créditer (positif)
   * @param {string} type - Type de transaction (ENUM)
   * @param {string} reason - Raison de la transaction
   * @param {object} metadata - Données additionnelles (optionnel)
   * @returns {Promise<TokenTransaction>} Transaction créée
   */
  async credit(userId, amount, type, reason = null, metadata = null) {
    if (amount <= 0) {
      throw new Error("Le montant doit être positif");
    }

    const transaction = await sequelize.transaction();

    try {
      // Récupérer le wallet avec un lock pour éviter les race conditions
      const wallet = await Wallet.findOne({
        where: { user_id: userId },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!wallet) {
        throw new Error("Wallet introuvable pour cet utilisateur");
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore + amount;

      // Mettre à jour le solde
      wallet.balance = balanceAfter;
      await wallet.save({ transaction });

      // Créer la transaction
      const tokenTransaction = await TokenTransaction.create(
        {
          user_id: userId,
          amount: amount,
          type: type,
          reason: reason,
          metadata: metadata,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
        },
        { transaction }
      );

      await transaction.commit();

      return tokenTransaction;
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Erreur lors du crédit de tokens: ${error.message}`);
    }
  }

  /**
   * Débite des tokens d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {number} amount - Montant à débiter (positif)
   * @param {string} type - Type de transaction (ENUM)
   * @param {string} reason - Raison de la transaction
   * @param {object} metadata - Données additionnelles (optionnel)
   * @returns {Promise<TokenTransaction>} Transaction créée
   */
  async debit(userId, amount, type, reason = null, metadata = null) {
    if (amount <= 0) {
      throw new Error("Le montant doit être positif");
    }

    const transaction = await sequelize.transaction();

    try {
      // Récupérer le wallet avec un lock pour éviter les race conditions
      const wallet = await Wallet.findOne({
        where: { user_id: userId },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });

      if (!wallet) {
        throw new Error("Wallet introuvable pour cet utilisateur");
      }

      const balanceBefore = wallet.balance;
      const balanceAfter = balanceBefore - amount;

      // Vérifier que le solde ne devient pas négatif
      if (balanceAfter < 0) {
        throw new Error("Solde insuffisant");
      }

      // Mettre à jour le solde
      wallet.balance = balanceAfter;
      await wallet.save({ transaction });

      // Créer la transaction (montant négatif pour débit)
      const tokenTransaction = await TokenTransaction.create(
        {
          user_id: userId,
          amount: -amount,
          type: type,
          reason: reason,
          metadata: metadata,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
        },
        { transaction }
      );

      await transaction.commit();

      return tokenTransaction;
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Erreur lors du débit de tokens: ${error.message}`);
    }
  }

  /**
   * Récupère l'historique des transactions d'un utilisateur
   * @param {number} userId - ID de l'utilisateur
   * @param {object} options - Options de pagination et filtrage
   * @returns {Promise<{transactions: Array, total: number}>} Liste des transactions
   */
  async getHistory(userId, options = {}) {
    const { limit = 50, offset = 0, type = null } = options;

    try {
      const whereClause = { user_id: userId };
      if (type) {
        whereClause.type = type;
      }

      const { count, rows } = await TokenTransaction.findAndCountAll({
        where: whereClause,
        order: [["created_at", "DESC"]],
        limit: limit,
        offset: offset,
      });

      return {
        transactions: rows,
        total: count,
        limit: limit,
        offset: offset,
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération de l'historique: ${error.message}`);
    }
  }

  /**
   * Récupère les détails complets du wallet avec statistiques
   * @param {number} userId - ID de l'utilisateur
   * @returns {Promise<object>} Détails du wallet
   */
  async getWalletDetails(userId) {
    try {
      const wallet = await Wallet.findOne({
        where: { user_id: userId },
        include: [
          {
            model: User,
            attributes: ["id", "name", "email", "role"],
          },
        ],
      });

      if (!wallet) {
        throw new Error("Wallet introuvable pour cet utilisateur");
      }

      // Récupérer les statistiques
      const totalCredits = await TokenTransaction.sum("amount", {
        where: {
          user_id: userId,
          amount: { [sequelize.Sequelize.Op.gt]: 0 },
        },
      });

      const totalDebits = await TokenTransaction.sum("amount", {
        where: {
          user_id: userId,
          amount: { [sequelize.Sequelize.Op.lt]: 0 },
        },
      });

      const transactionCount = await TokenTransaction.count({
        where: { user_id: userId },
      });

      return {
        wallet,
        statistics: {
          total_credits: totalCredits || 0,
          total_debits: Math.abs(totalDebits || 0),
          transaction_count: transactionCount,
        },
      };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des détails du wallet: ${error.message}`);
    }
  }

  /**
   * Ajustement manuel par un admin
   * @param {number} userId - ID de l'utilisateur
   * @param {number} amount - Montant à ajouter (peut être négatif)
   * @param {string} reason - Raison de l'ajustement
   * @returns {Promise<TokenTransaction>} Transaction créée
   */
  async adminAdjustment(userId, amount, reason) {
    if (amount === 0) {
      throw new Error("Le montant ne peut pas être zéro");
    }

    if (amount > 0) {
      return await this.credit(userId, amount, "ADMIN_ADJUSTMENT", reason);
    } else {
      return await this.debit(userId, Math.abs(amount), "ADMIN_ADJUSTMENT", reason);
    }
  }
}

export default new TokenService();
