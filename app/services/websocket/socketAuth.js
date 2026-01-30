// app/services/websocket/socketAuth.js
import { User } from "../../models/index.js";
import jwt from "jsonwebtoken";

export const socketAuthMiddleware = async (socket, next) => {
  try {
    // 1) Try session-based user attached by sessionMiddleware
    const session = socket.request.session;
    const passportData = session?.passport;
    const userId = passportData?.user;

    if (userId) {
      const user = await User.findByPk(userId);
      if (!user) return next(new Error("User not found"));

      socket.dbUser = user;
      socket.userId = user.id;
      socket.userEmail = user.email;
      return next();
    }

    // 2) Fallback to JWT provided in handshake.auth.token
    const token = socket.handshake?.auth?.token;
    if (token && typeof token === "string") {
      try {
        const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET || "secret";
        const payload = jwt.verify(token, secret);
        const idFromToken = payload.id || payload.userId || payload.sub;
        if (!idFromToken) return next(new Error("Invalid token"));

        const user = await User.findByPk(idFromToken);
        if (!user) return next(new Error("User not found"));

        socket.dbUser = user;
        socket.userId = user.id;
        socket.userEmail = user.email;
        return next();
      } catch (err) {
        console.error("Socket JWT verify error:", err.message);
        return next(new Error("Authentication failed"));
      }
    }

    return next(new Error("Authentication required"));
  } catch (err) {
    console.error("Socket authentication error:", err.message);
    next(new Error("Authentication failed"));
  }
};
