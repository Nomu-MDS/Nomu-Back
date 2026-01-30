// app/models/index.js
import { sequelize } from "../config/database.js";
import UserModel from "./User.js";
import ProfileModel from "./Profile.js";
import InterestModel from "./Interest.js";
import ConversationModel from "./Conversation.js";
import ReservationModel from "./Reservation.js";
import MessageModel from "./Message.js";
import WalletModel from "./Wallet.js";
import TokenTransactionModel from "./TokenTransaction.js";
import ReportModel from "./Report.js";

const User = UserModel(sequelize);
const Profile = ProfileModel(sequelize);
const Interest = InterestModel(sequelize);
const Conversation = ConversationModel(sequelize);
const Reservation = ReservationModel(sequelize);
const Message = MessageModel(sequelize);
const Wallet = WalletModel(sequelize);
const TokenTransaction = TokenTransactionModel(sequelize);
const Report = ReportModel(sequelize);

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

// Relations Message
User.hasMany(Message, { foreignKey: "user_id", as: "SentMessages" });
Message.belongsTo(User, { foreignKey: "user_id", as: "Sender" });

Conversation.hasMany(Message, { foreignKey: "conversation_id", as: "Messages" });
Message.belongsTo(Conversation, { foreignKey: "conversation_id", as: "Conversation" });

// Relations Wallet & TokenTransaction
User.hasOne(Wallet, { foreignKey: "user_id", as: "Wallet" });
Wallet.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(TokenTransaction, { foreignKey: "user_id", as: "TokenTransactions" });
TokenTransaction.belongsTo(User, { foreignKey: "user_id", as: "User" });

// Relations Report
User.hasMany(Report, { as: "ReportsCreated", foreignKey: "reporterId" });
User.hasMany(Report, { as: "ReportsReceived", foreignKey: "reportedUserId" });
Report.belongsTo(User, { as: "Reporter", foreignKey: "reporterId" });
Report.belongsTo(User, { as: "ReportedUser", foreignKey: "reportedUserId" });
Report.belongsTo(User, { as: "Reviewer", foreignKey: "reviewedBy" });

export { sequelize, User, Profile, Interest, Conversation, Reservation, Message, Wallet, TokenTransaction, Report };
