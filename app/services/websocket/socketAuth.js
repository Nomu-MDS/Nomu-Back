// app/services/websocket/socketAuth.js
import admin from "firebase-admin";
import { User } from "../../models/index.js";

export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication token missing"));
    }

    // Vérifier le token Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Récupérer et cacher l'utilisateur de la DB
    const user = await User.findOne({ where: { firebase_uid: decodedToken.uid } });

    if (!user) {
      return next(new Error("User not found"));
    }

    // Attacher l'utilisateur au socket
    socket.userId = decodedToken.uid;
    socket.userEmail = decodedToken.email;
    socket.dbUser = user; // Cacher l'objet utilisateur complet

    next();
  } catch (error) {
    console.error("Socket authentication error:", error.message);
    next(new Error("Authentication failed"));
  }
};
