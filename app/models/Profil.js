import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Profil = sequelize.define("Profil", {
    ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Lastname: DataTypes.STRING,
    Firstname: DataTypes.STRING,
    Age: DataTypes.INTEGER,
    Biography: DataTypes.TEXT,
    Country: DataTypes.STRING,
    City: DataTypes.STRING,
    ImgUrl: DataTypes.STRING,
  });

  return Profil;
};
