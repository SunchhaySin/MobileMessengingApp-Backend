import express from "express";
import prisma from "../config/prisma.ts";
import { verifyToken, AuthRequest } from "../middleware/auth.js";
import { getIO } from "../socket/index.ts";

const router = express.Router();

// Create or get existing conversation between two users
router.post("/open", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { friendId } = req.body;

    // Check if conversation already exists between these two users
    const existing = await prisma.conversation.findFirst({
      where: {
        OR :[
            {user1Id: req.userId!, user2Id: friendId},
            {user1Id: friendId, user2Id: req.userId!}]
      },
      include: {
        user1: {
          select: { username: true, id: true }, 
        },
        user2: {
          select: { username: true, id: true },
        },
      },
    });

    if (existing) {
      return res.status(200).json({message:"Chat Exists", data: existing});
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        user1Id: req.userId!,
        user2Id: friendId,
      },
      include: {
        user1: {
          select: { username: true, id: true },
        },
        user2: {
          select: { username: true, id: true },
        },
      },
    });

    return res.status(201).json({message: "Opened new chat", data: conversation});
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

// Fetches all conversation and seperates archvied one and checking frieship status
router.get("/fetch", verifyToken, async(req: AuthRequest, res) => {
  try{
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: req.userId! }, { user2Id: req.userId! }],
      },
      include: {
        user1: { select: { username: true, id: true } },
        user2: { select: { username: true, id: true } },
        messages: {
          orderBy: {
            sentAt: "desc",
          },
          take: 1,
        },
      },
    });

    // Pull all friendships involving this user in one query,
    // instead of querying per-conversation (avoids N+1)
    const friendships = await prisma.friend.findMany({
      where: {
        OR: [{ userId: req.userId! }, { friendId: req.userId! }],
      },
    });

    // Build a set of userIds this user is still friends with
    const friendIds = new Set(
      friendships.map((f) =>
        f.userId === req.userId ? f.friendId : f.userId
      )
    );

    const conversationsWithStatus = conversations.map((c) => {
      const otherUserId = c.user1Id === req.userId ? c.user2Id : c.user1Id;
      return {
        ...c,
        isArchived: !friendIds.has(otherUserId),
      };
    });
    
    return res.status(200).json({data: conversationsWithStatus})
  } catch(error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
})

// Fetches Messages inside a conversation
router.get("/fetch/messages/:conversationId", verifyToken, async (req: AuthRequest, res) => {
    try {
      const conversationId = req.params.conversationId as string;
      const messages = await prisma.message.findMany({
        where: {
          conversationId: conversationId,
        },
        include: {
          sender: {
            select: {username:true, id: true}
          },
        }
      });

      if(messages.length === 0) {
        return res.status(404).json({message: "no messages found"})
      }

      return res.json(messages)
    } catch (e) {
      return res.status(500).json({ message: "Server error" });
    }
  },
);

// Delete Coversation between two people, 1 person delete also affects the other person in the conversation
router.delete("/delete/:conversationId", verifyToken, async(req:AuthRequest, res) => {
  try{
    const conversationId = req.params.conversationId as string;

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{user1Id: req.userId!}, {user2Id: req.userId!}]
      }
    })

    if(!conversation){
      return res.status(404).json({message: "You're not a member of this conversation"})
    } 

    const otherUserId =
      conversation.user1Id === req.userId ? conversation.user2Id : conversation.user1Id;

    // remove messages first before deleting the conversation
    await prisma.message.deleteMany({ where: { conversationId } });

    await prisma.conversation.delete({
      where:{ id: conversationId}
    })

    getIO().to(`user:${otherUserId}`).emit("conversation:deleted", {
      conversationId,
      deletedBy: req.userId,
    });

    return res.json({message: "Conversation deleted successfully"})
  } catch(e) {
    console.error(e)
    return res.status(500).json({ message: "Server error" });
  }
})

export default router;