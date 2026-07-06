import express from "express";
import prisma from "../config/prisma.ts";
import { verifyToken, AuthRequest } from "../middleware/auth.js";

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

router.get("/fetch", verifyToken, async(req: AuthRequest, res) => {
  try{
    const coversations = await prisma.conversation.findMany({
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
    
    return res.status(200).json({data: coversations})
  } catch(error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
})

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

export default router;