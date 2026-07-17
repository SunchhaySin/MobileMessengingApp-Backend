import express from "express";
import prisma from "../config/prisma.js";
import { verifyToken, AuthRequest } from "../middleware/auth.js";

const router = express.Router()

router.get("/search", verifyToken, async (req: AuthRequest, res) => {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({
        message: "No input provided",
      });
    }

    const users = await prisma.user.findMany({
      where: {
        id: {
          not: req.userId!,
        },
        username: {
          contains: query,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        username: true,
        email: true,
        profile : {
          select: {
            profileUrl: true
          }
        }
      },
    });

    if(users.length === 0 ) {
      return res.status(400).json({
        message: "No users found",
      });
    }

    res.json(users);
  } catch (e) {
    res.status(500).json({
      message: "Server error",
    });
  }
});

router.get("/fetch", verifyToken, async (req: AuthRequest, res) => {
  try {
    const friends = await prisma.friend.findMany({
      where: {
        OR: [{ userId: req.userId! }, { friendId: req.userId! }],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: { profileUrl: true, contacts: true, bio: true },
            },
          },
        },
        friend: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: { profileUrl: true, contacts: true, bio: true },
            },
          },
        },
      },
    });

    const result = friends.map((f) => {
      const otherUser = f.userId === req.userId ? f.friend : f.user;
      return {
        friendshipId: f.id,  // this is not the friend's ID, its the friendship Id
        createdAt: f.createdAt,
        ...otherUser,
      };
    });

    res.json({data: result});
  } catch (e) {
    res.status(500).json({
      message: "Server error",
    });
  }
});

router.get("/fetch/requests", verifyToken, async (req: AuthRequest, res) => {
  try {
    const sentRequests = await prisma.request.findMany({
      where: {
        requesterID: req.userId!,
      },
      include: {
        requestTo: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                profileUrl: true
              }
            }
          },
        },
      },
    });

    const receivedRequests = await prisma.request.findMany({
      where: {
        userID: req.userId!,
      },
      include: {
        requestFrom: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                profileUrl: true
              }
            }
          },
        },
      },
    });

    res.json({
      sentRequests: sentRequests,
      receivedRequests: receivedRequests,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Server error",
    });
  }
});

router.post("/unfriend", verifyToken, async (req: AuthRequest, res) => {
  try {
    const { friendId } = req.body;
    const isFriend = await prisma.friend.findFirst({
      where: {
        OR: [
          { userId: req.userId!, friendId: friendId },
          { userId: friendId, friendId: req.userId! },
        ],
      },
    });
    
    if(!isFriend) {
      return res.status(404).json({ message: "Restricted Permission" });
    }

    await prisma.friend.delete({
      where: { id: isFriend.id },
    });
    
  } catch (e) {
    console.error(e);
    res.status(500).json({
      message: "Server error",
    });
  }
});

export default router
