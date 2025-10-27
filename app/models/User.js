// app/models/User.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const User = sequelize.define("User", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, allowNull: false },
    actif: { type: DataTypes.BOOLEAN, defaultValue: true },
    bio: { type: DataTypes.TEXT },
    location: { type: DataTypes.STRING },
  });

  return User;
};

