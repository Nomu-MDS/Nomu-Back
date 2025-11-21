// app/models/index.js
import { sequelize } from "../config/database.js";
import UserModel from "./User.js";
import ProfileModel from "./Profile.js";
import InterestModel from "./Interest.js";
import ConversationModel from "./Conversation.js";
import ReservationModel from "./Reservation.js";

const User = UserModel(sequelize);
const Profile = ProfileModel(sequelize);
const Interest = InterestModel(sequelize);
const Conversation = ConversationModel(sequelize);
const Reservation = ReservationModel(sequelize);

// Relations
User.hasOne(Profile, { foreignKey: "user_id" });
Profile.belongsTo(User, { foreignKey: "user_id" });

Profile.belongsToMany(Interest, { through: "profile_interests" });
Interest.belongsToMany(Profile, { through: "profile_interests" });

// Relations Conversation
User.hasMany(Conversation, { as: "ConversationsAsVoyager", foreignKey: "voyager_id" });
User.hasMany(Conversation, { as: "ConversationsAsLocal", foreignKey: "local_id" });
Conversation.belongsTo(User, { as: "Voyager", foreignKey: "voyager_id" });
Conversation.belongsTo(User, { as: "Local", foreignKey: "local_id" });

// Relations Reservation
Conversation.hasMany(Reservation, { foreignKey: "conversation_id" });
Reservation.belongsTo(Conversation, { foreignKey: "conversation_id" });

export { sequelize, User, Profile, Interest, Conversation, Reservation };
