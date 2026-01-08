// app/models/Wallet.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Wallet = sequelize.define("Wallet", {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    balance: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0 // Empêche les soldes négatifs
      }
    }
  }, {
    tableName: 'wallets',
    underscored: true,
    timestamps: true
  });

  return Wallet;
};
