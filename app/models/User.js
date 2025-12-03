// app/models/User.js
import { DataTypes } from "sequelize";

export default (sequelize) => {
  const User = sequelize.define("User", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: true },
    role: { type: DataTypes.STRING, allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    bio: { type: DataTypes.TEXT },
    location: { type: DataTypes.STRING },
    firebase_uid: { type: DataTypes.STRING, allowNull: true, unique: true },
  }, {
    tableName: 'users',
    underscored: true
  });

  // Ajout d'un hook pour exclure le mot de passe lors de la sérialisation
  User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    return values;
  };

  return User;
};
