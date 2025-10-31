// app/models/index.js
import { sequelize } from "../config/database.js";
import UserModel from "./User.js";
import ProfilModel from "./Profil.js";
import InteretModel from "./Interet.js";
import ConversationModel from "./Conversation.js";

const User = UserModel(sequelize);
const Profil = ProfilModel(sequelize);
const Interet = InteretModel(sequelize);
const Conversation = ConversationModel(sequelize);

// Relations
User.hasOne(Profil, { foreignKey: "userId" });
Profil.belongsTo(User, { foreignKey: "userId" });

Profil.belongsToMany(Interet, { through: "ProfilInterets" });
Interet.belongsToMany(Profil, { through: "ProfilInterets" });

// Relations Conversation
User.hasMany(Conversation, { as: "ConversationsAsVoyager", foreignKey: "voyagerID" });
User.hasMany(Conversation, { as: "ConversationsAsLocal", foreignKey: "localID" });
Conversation.belongsTo(User, { as: "Voyager", foreignKey: "voyagerID" });
Conversation.belongsTo(User, { as: "Local", foreignKey: "localID" });

export { sequelize, User, Profil, Interet, Conversation };
