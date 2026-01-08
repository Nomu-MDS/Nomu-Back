// app/models/TokenTransaction.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const TokenTransaction = sequelize.define("TokenTransaction", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Montant de la transaction (positif = crédit, négatif = débit)'
    },
    type: {
      type: DataTypes.ENUM(
        // Gains (+)
        'SIGNUP_BONUS',
        'RESERVATION_COMPLETED',
        'REFERRAL_BONUS',
        'DAILY_LOGIN',
        'PROFILE_COMPLETED',
        // Dépenses (-)
        'MESSAGE_SENT',
        'RESERVATION_CREATED',
        'PROFILE_BOOST',
        'UNLOCK_CONTACT',
        // Système
        'ADMIN_ADJUSTMENT',
        'REFUND'
      ),
      allowNull: false
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Description optionnelle de la transaction'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Données additionnelles (ex: { messageId: 123, reservationId: 456 })'
    },
    balance_before: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Solde avant la transaction'
    },
    balance_after: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Solde après la transaction'
    }
  }, {
    tableName: 'token_transactions',
    underscored: true,
    timestamps: true,
    updatedAt: false, // Les transactions ne sont jamais modifiées
    indexes: [
      {
        fields: ['user_id', 'created_at']
      },
      {
        fields: ['type']
      }
    ]
  });

  return TokenTransaction;
};
