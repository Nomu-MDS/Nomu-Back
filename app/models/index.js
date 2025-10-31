// app/models/index.js
import { sequelize } from "../config/database.js";
import UserModel from "./User.js";
import ProfilModel from "./Profil.js";
import InteretModel from "./Interet.js";

const User = UserModel(sequelize);
const Profil = ProfilModel(sequelize);
const Interet = InteretModel(sequelize);

// Relations
User.hasOne(Profil, { foreignKey: "userId" });
Profil.belongsTo(User, { foreignKey: "userId" });

Profil.belongsToMany(Interet, { through: "ProfilInterets" });
Interet.belongsToMany(Profil, { through: "ProfilInterets" });

export { sequelize, User, Profil, Interet };
