// app/services/websocket/socketAuth.js
import admin from "firebase-admin";

export const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication token missing"));
    }

    // Vérifier le token Firebase
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Attacher l'utilisateur au socket
    socket.userId = decodedToken.uid;
    socket.userEmail = decodedToken.email;

    next();
  } catch (error) {
    console.error("Socket authentication error:", error.message);
    next(new Error("Authentication failed"));
  }
};
