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
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id",
        },
      },
      conversation_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "conversations",
          key: "id",
        },
      },
      attachment: {
        type: DataTypes.STRING,
        allowNull: true
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      },
    },
    {
      tableName: 'messages',
      timestamps: true,
      underscored: true,
      indexes: [
        {
          fields: ["conversation_id", "created_at"],
        },
        {
          fields: ["user_id"],
        },
      ],
    }
  );

  return Message;
};
