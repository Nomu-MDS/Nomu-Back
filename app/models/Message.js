import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Message = sequelize.define(
    "Message",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      userID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
      },
      convID: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "Conversations",
          key: "id",
        },
      },
      attachement: {
        type: DataTypes.STRING,
        allowNull: true
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      },
    },
    {
      timestamps: true,
      indexes: [
        {
          fields: ["convID", "createdAt"],
        },
        {
          fields: ["userID"],
        },
      ],
    }
  );

  return Message;
};
