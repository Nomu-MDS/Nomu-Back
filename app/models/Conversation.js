import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Conversation = sequelize.define(
    "Conversation",
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      voyagerID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
      },
      localID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
      },
    },
    {
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["voyagerID", "localID"],
        },
      ],
      validate: {
        voyagerNotSameAsLocal() {
          if (this.voyagerID === this.localID) {
            throw new Error("Un utilisateur ne peut pas créer une conversation avec lui-même");
          }
        },
      },
    }
  );

  return Conversation;
};