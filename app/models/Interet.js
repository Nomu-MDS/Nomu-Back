import { DataTypes } from "sequelize";

export default (sequelize) => {
  const Interet = sequelize.define("Interet", {
    ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    Name: DataTypes.STRING,
    Icon: DataTypes.STRING,
    Actif: { type: DataTypes.BOOLEAN, defaultValue: true },
  });

  return Interet;
};
