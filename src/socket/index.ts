import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "../prisma.js";

interface AuthSocket extends Socket {
  userId?: string;
}

// Middleware to verify JWT on socket connection
const authenticateSocket = (socket: AuthSocket, next: (err?: Error) => void) => {
  const token = socket.handshake.auth["token"] as string;

  if (!token) {
    return next(new Error("No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as unknown as {
      userId: string;
    };
    socket.userId = decoded.userId;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
};

export const initSocket = (io: Server) => {
  // Apply auth middleware
  io.use(authenticateSocket);

  io.on("connection", (socket: AuthSocket) => {
    const userId = socket.userId as string;
    console.log(`User connected: ${userId}`);

    // Join personal room
    socket.join(`user:${userId}`);

    // Join a conversation room
    socket.on("join_conversation", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${userId} joined conversation ${conversationId}`);
    });

    // Send a message
    socket.on("send_message", async (data: { conversationId: string; content: string }) => {
      try {
        // Save message to database
        const message = await prisma.message.create({
          data: {
            content: data.content,
            senderId: userId,
            conversationId: data.conversationId,
          },
          include: { sender: true },
        });

        // Broadcast to everyone in the conversation
        io.to(`conversation:${data.conversationId}`).emit("new_message", message);
      } catch (error) {
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Typing indicator
    socket.on("typing", (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit("user_typing", {
        userId,
        conversationId,
      });
    });

    // Stop typing
    socket.on("stop_typing", (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit("user_stop_typing", {
        userId,
        conversationId,
      });
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${userId}`);
    });
  });
};