import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Conversation = sequelize.define(
    "Conversation",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      voyager_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      local_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
    },
    {
      tableName: 'conversations',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ["voyager_id", "local_id"],
        },
      ],
      validate: {
        voyagerNotSameAsLocal() {
          if (this.voyager_id === this.local_id) {
            throw new Error("Un utilisateur ne peut pas créer une conversation avec lui-même");
          }
        },
      },
    }
  );

  return Conversation;
};