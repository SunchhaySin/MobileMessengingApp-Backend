import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

interface AuthSocket extends Socket {
  userId?: string;
}

// Module-level reference so other files (like REST routes) can access the same io instance
let ioInstance: Server;

export const getIO = () => {
  if (!ioInstance) throw new Error("Socket.io not initialized");
  return ioInstance;
};

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
  ioInstance = io; // <-- store the reference as soon as initSocket runs
  // Apply auth middleware
  io.use(authenticateSocket);

  io.on("connection", (socket: AuthSocket) => {
    const userId = socket.userId;
    console.log(`User connected: ${userId}`);

    // Join personal room
    socket.join(`user:${userId}`);

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
            requestFrom: {
              select: {
                id: true,
                username: true,
                email: true,
                profile: { select: { profileUrl: true } },
              },
            },
            requestTo: {
              select: {
                id: true,
                username: true,
                email: true,
                profile: { select: { profileUrl: true } },
              },
            },
          },
        });

        const newAlert = await prisma.alert.create({
          data: {
            senderId: userId!,
            receiverId: recipientId,
            message: ` Friend Request Sent`,
            type: "Send_Request",
          },
          include: {
            sender: {
              select: {
                username: true,
                id: true,
                profile: { select: { profileUrl: true } },
              },
            },
            receiver: {
              select: {
                username: true,
                id: true,
                profile: { select: { profileUrl: true } },
              },
            },
          },
        });

        // notify sender
        socket.emit("friend:add:success", {
          message: "Friend Request Sent",
          request: newRequest,
          // alert: newAlert,
        });

        // notify recipient in real time
        io.to(`user:${recipientId}`).emit("friend:new:request", {
          // message: "You have a new friend request",
          request: newRequest,
          alert: newAlert,
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
      });

      const newFriend = await prisma.friend.create({
        data: { userId: userId!, friendId: request.requesterID },
        include: {
          user: {
            select: {
              username: true,
              id:true,
              email: true,
              profile: {
                select: {
                  profileUrl: true
                }
              }
            }
          },
          friend:{
            select: {
              username: true,
              id:true,
              email: true,
              profile: {
                select: {
                  profileUrl: true
                }
              }
            }
          }
        }
      });

      const newAlert = await prisma.alert.create({
        data: {
          senderId: userId!,
          receiverId: request.requestFrom.id,
          message: "Friend Request Accepted",
          type: "Accept_Request",
        },
        include: {
          sender: {
            select: {
              username: true,
              id: true,
              profile: { select: { profileUrl: true } },
            },
          },
          receiver: {
            select: {
              username: true,
              id: true,
              profile: { select: { profileUrl: true } },
            },
          },
        },
      });

      // notify acceptor
      socket.emit("friend:accept:success", {
        message: "Friend Request Accepted",
        updatedStatus: updatedStatus,
        friend: newFriend,
        // alert: newAlert,
      });
      // notify the sender in real time
      io.to(`user:${request.requesterID}`).emit("friend:request:accepted", {
        // message: "Your friend request was accepted",
        updatedStatus: updatedStatus,
        friend: newFriend,
        alert: newAlert,
      });
    });


    // Rejecting Friend Requests
    socket.on("friend:reject", async ({ requestId }) => {
      const request = await prisma.request.findUnique({
        where: { id: requestId },
        include: { requestFrom: { select: { id: true, username: true } } },
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

      const newAlert = await prisma.alert.create({
        data: {
          senderId: userId!,
          receiverId: request.requestFrom.id,
          message: "Friend Request Rejected",
          type: "Reject_Request"
        },
        include: {
          sender: {
            select: {
              username: true,
              id: true,
              profile: { select: { profileUrl: true } },
            },
          },
          receiver: {
            select: {
              username: true,
              id: true,
              profile: { select: { profileUrl: true } },
            },
          },
        },
      });

      socket.emit("friend:reject:success", {
        message: "Friend Request Rejected",
        updatedStatus: updatedStatus,
        // alert: newAlert,
      });

      io.to(`user:${request.requesterID}`).emit("friend:request:rejected", {
        // message: "Your friend request was rejected",
        updatedStatus: updatedStatus,
        alert: newAlert,
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


    // Connect to a conversation 
    socket.on("join_conversation", async (conversationId: string) => {
      try {
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });

        const isParticipant =
          conversation &&
          (conversation.user1Id === userId || conversation.user2Id === userId);

        if (!isParticipant) {
          socket.emit("error", {
            message: "Not authorized for this conversation",
          });
          return;
        }

        socket.join(`conversation:${conversationId}`);
        console.log(`User ${userId} joined conversation ${conversationId}`);

      } catch (error) {
        console.error(error);
        socket.emit("error", { message: "Failed to join conversation" });
      }
    });


    // Send a message
    socket.on("send:message", async (data: {tempId: string, conversationId: string; content: string }) => {
        try {
          if (!socket.rooms.has(`conversation:${data.conversationId}`)) {
            socket.emit("error", {
              message: "You must join the conversation first",
            });
            return;
          }

          const conversation = await prisma.conversation.findUnique({
            where: { id: data.conversationId },
          });

          if (!conversation) {
            socket.emit("error", { message: "Conversation not found" });
            return;
          }

          const otherUserId = conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id;
          const stillFriends = await prisma.friend.findFirst({
            where: {
              OR: [
                { userId: userId!, friendId: otherUserId },
                { userId: otherUserId, friendId: userId! },
              ],
            },
          });

          if (!stillFriends) {
            socket.emit("error", { message: "You are no longer friends with this user" });
            return;
          }

          if (!data.content || data.content.trim().length === 0) {
            socket.emit("error", { message: "Message content is required" });
            return;
          }

          const message = await prisma.message.create({
            data: {
              content: data.content.trim(),
              senderId: userId!,
              conversationId: data.conversationId,
            },
            include: { sender: { select: {id: true, username: true, email: true}}},
          });

          // Broadcast to the whole converstation (2 participants)
          io.to(`conversation:${data.conversationId}`).emit(
            "new:message",
            {...message, tempId: data.tempId,}
          );

        } catch (error) {
          socket.emit("error", { message: "Failed to send message" });
        }
      },
    );
    
    // Unfriending a user
    socket.on("friend:remove", async ({ friendId }) => {
      try {
        if (!friendId) {
          return socket.emit("friend:remove:error", {
            message: "No friend specified",
          });
        }

        const existingFriendship = await prisma.friend.findFirst({
          where: {
            OR: [
              { userId: userId!, friendId: friendId },
              { userId: friendId, friendId: userId! },
            ],
          },
        });

        if (!existingFriendship) {
          return socket.emit("friend:remove:error", {
            message: "Restricted Permission",
          });
        }

        await prisma.friend.delete({
          where: { id: existingFriendship.id },
        });

        socket.emit("friend:remove:success", {
          message: "Unfriended successfully",
          friendId: friendId,
        });

        io.to(`user:${friendId}`).emit("friend:removed", {
          removedBy: userId,
        });
      } catch (e) {
        console.error(e);
        socket.emit("friend:remove:error", { message: "Server error" });
      }
    });

    // Displose the socket connection in the conversation
    socket.on("leave_conversation", (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${userId} left conversation ${conversationId}`);
    });


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
