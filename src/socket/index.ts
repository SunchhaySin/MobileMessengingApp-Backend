import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "../prisma.js";

interface AuthSocket extends Socket {
  userId?: string;
}

// Middleware to verify JWT on socket connection
const authenticateSocket = (
  socket: AuthSocket,
  next: (err?: Error) => void,
) => {
  const token = socket.handshake.auth["token"] as string;

  if (!token) {
    return next(new Error("No token provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
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
    const userId = socket.userId;
    console.log(`User connected: ${userId}`);

    // Join personal room
    socket.join(`user:${userId}`);

    // Join a conversation room
    socket.on("join_conversation", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${userId} joined conversation ${conversationId}`);
    });


    // Sending Friend Request
    socket.on("friend:add", async ({ recipientId }) => {
      try {
        if (userId === recipientId) {
          return socket.emit("friend:add:error", {
            message: "You cannot add yourself",
          });
        }

        const recipient = await prisma.user.findUnique({
          where: { id: recipientId },
        });

        if (!recipient) {
          return socket.emit("friend:add:error", { message: "User not found" });
        }

        const existing = await prisma.request.findFirst({
          where: {
            OR: [
              { requesterID: userId!, userID: recipientId },
              { requesterID: recipientId, userID: userId! },
            ],
          },
        });

        if (existing) {
          return socket.emit("friend:add:error", {
            message: "Request already sent",
          });
        }

        const alreadyFriends = await prisma.friend.findFirst({
          where: {
            OR: [
              { userId: userId!, friendId: recipientId },
              { userId: recipientId, friendId: userId! },
            ],
          },
        });

        if (alreadyFriends) {
          return socket.emit("friend:add:error", {
            message: "Already friends",
          });
        }

        const newRequest = await prisma.request.create({
          data: { requesterID: userId!, userID: recipientId },
          include: { 
              requestFrom: { select: { id: true, username: true, email: true }},
              requestTo: { select: { id: true, username: true, email: true }}
            }
        });

        // notify sender
        socket.emit("friend:add:success", { message: "Friend Request Sent", request: newRequest });

        // notify recipient in real time
        io.to(`user:${recipientId}`).emit("friend:new:request", {
          message: "You have a new friend request",
          request: newRequest
        });
      } catch (e) {
        socket.emit("friend:add:error", { message: "Server error" });
      }
    });


    // Accepting Friend Requests
    socket.on("friend:accept", async ({ requestId }) => {
      const request = await prisma.request.findUnique({
        where: { id: requestId },
        include: { requestFrom: { select: { id: true, username: true } } },
      });

      if (!request)
        return socket.emit("friend:accept:error", {
          message: "Request not found",
        });

      const existing = await prisma.request.findFirst({
        where: { id: requestId, status: "Accepted" },
      });

      if (existing)
        return socket.emit("friend:accept:error", {
          message: "Request already accepted",
        });

      const updatedStatus = await prisma.request.update({
        where: { id: requestId },
        data: { status: "Accepted" },
        select: {
          status:true
        }
      });

      const newFriend = await prisma.friend.create({
        data: { userId: userId!, friendId: request.requesterID },
        include: {
          user: {
            select: {
              username: true,
              id:true,
              email: true,
            }
          },
          friend:{
            select: {
              username: true,
              id:true,
              email: true,
            }
          }
        }
      });

      // notify acceptor
      socket.emit("friend:accept:success", { message: "Request Accepted", updatedStatus: updatedStatus, friend: newFriend });
      // notify the sender in real time
      io.to(`user:${request.requesterID}`).emit("friend:request:accepted", {
        message: "Your friend request was accepted",
        friend: newFriend
      });
    });


    // Rejecting Friend Requests
    socket.on("friend:reject", async ({ requestId }) => {
      const request = await prisma.request.findUnique({
        where: { id: requestId },
      });

      if (!request)
        return socket.emit("friend:reject:error", {
          message: "Request not found",
        });

      const accepted = await prisma.request.findFirst({
        where: { id: requestId, status: "Accepted" },
      });

      if (accepted)
        return socket.emit("friend:reject:error", {
          message: "Cannot undo request acception",
        });

      const updatedStatus = await prisma.request.update({
        where: { id: requestId },
        data: { status: "Rejected" },
      });

      socket.emit("friend:reject:success", { message: "Request Rejected", updatedStatus: updatedStatus });
      io.to(`user:${request.requesterID}`).emit("friend:request:rejected", {
        message: "Your friend request was rejected",
        requestId: requestId
      });
    });


    // Removing friend request sent by a user from database record
    socket.on("request:remove", async ({ requestId, requestIds }) => {
      // normalize input into a single array of ids
      const ids: string[] = requestIds ?? (requestId ? [requestId] : []);

      if (ids.length === 0) {
        return socket.emit("request:remove:error", {
          message: "No Request Selected",
        });
      }

      const requests = await prisma.request.findMany({
        where: { id: { in: ids } },
      });

      if (requests.length === 0) {
        return socket.emit("request:remove:error", {
          message: "Request(s) not found",
        });
      }

      // make sure the user is allowed to delete every request found
      const unauthorized = requests.some(
        (r) => r.requesterID !== userId && r.userID !== userId,
      );

      if (unauthorized) {
        return socket.emit("request:remove:error", {
          message: "Unauthorized to delete",
        });
      }

      const foundIds = requests.map((r) => r.id);

      await prisma.request.deleteMany({
        where: { id: { in: foundIds } },
      });

      socket.emit("request:remove:success", {
        message: `${foundIds.length} request(s) removed`,
        removedIds: foundIds,
      });
    });

    // // Send a message
    // socket.on("send_message", async (data: { conversationId: string; content: string }) => {
    //   try {
    //     // Save message to database
    //     const message = await prisma.messages.create({
    //       data: {
    //         content: data.content,
    //         senderId: userId,
    //         conversationId: data.conversationId,
    //       },
    //       include: { sender: true },
    //     });

    //     // Broadcast to everyone in the conversation
    //     io.to(`conversation:${data.conversationId}`).emit("new_message", message);
    //   } catch (error) {
    //     socket.emit("error", { message: "Failed to send message" });
    //   }
    // });

    // // Typing indicator
    // socket.on("typing", (conversationId: string) => {
    //   socket.to(`conversation:${conversationId}`).emit("user_typing", {
    //     userId,
    //     conversationId,
    //   });
    // });

    // // Stop typing
    // socket.on("stop_typing", (conversationId: string) => {
    //   socket.to(`conversation:${conversationId}`).emit("user_stop_typing", {
    //     userId,
    //     conversationId,
    //   });
    // });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${userId}`);
    });
  });
};
