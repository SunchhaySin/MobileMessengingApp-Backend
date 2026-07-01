import express from "express";
import prisma from "../prisma.ts";
import { verifyToken, AuthRequest } from "../middleware/auth.js";

const router = express.Router();

router.get("/fetch", verifyToken, async (req: AuthRequest, res) => {
  try {
    const alerts = await prisma.alert.findMany({
      where: {
        OR: [{ senderId: req.userId! }, { receiverId: req.userId! }],
      },
      include: {
        sender: {
          select: { id: true, username: true, email: true },
        },
        receiver: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });


    res.json({ data: alerts });
  } catch (e) {
    res.status(500).json({
      message: "Server error",
    });
  }
});

export default router;
