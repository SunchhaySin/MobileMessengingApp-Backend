import express from "express";
import prisma from "../config/prisma.js";
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
          select: {
            id: true,
            username: true,
            email: true,
            profile: { select: { profileUrl: true } },
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: { select: { profileUrl: true } },
          },
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

router.delete("/delete/:alertId", verifyToken, async(req:AuthRequest, res) => {
  try{
    const alertId = req.params.alertId as string;
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    if (alert.receiverId !== req.userId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await prisma.alert.delete({
      where: { id: alertId },
    });

    return res.json({ message: "Alert Deleted Successfully"});
  } catch(e) {
    console.error(e);
    return res.status(500).json({message: "Server Error"})
  }
})

export default router;
