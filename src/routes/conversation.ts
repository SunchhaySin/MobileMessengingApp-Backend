// import express from "express";
// import prisma from "../prisma.js";
// import { verifyToken, AuthRequest } from "../middleware/auth.js";

// const router = express.Router();

// // Create or get existing conversation between two users
// router.post("/", verifyToken, async (req: AuthRequest, res) => {
//   try {
//     const { targetUserId } = req.body;
//     const userId = req.userId as string;

//     // Check if conversation already exists between these two users
//     const existing = await prisma.conversation.findFirst({
//       where: {
//         members: {
//           every: {
//             userId: { in: [userId, targetUserId] },
//           },
//         },
//       },
//       include: { members: true },
//     });

//     if (existing && existing.members.length === 2) {
//       res.status(200).json(existing);
//       return;
//     }

//     // Create new conversation
//     const conversation = await prisma.conversation.create({
//       data: {
//         members: {
//           create: [{ userId }, { userId: targetUserId }],
//         },
//       },
//       include: { members: true },
//     });

//     res.status(201).json(conversation);
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Get all conversations for current user
// router.get("/", verifyToken, async (req: AuthRequest, res) => {
//   try {
//     const userId = req.userId as string;

//     const conversations = await prisma.conversation.findMany({
//       where: {
//         members: {
//           some: { userId },
//         },
//       },
//       include: {
//         members: {
//           include: { user: true },
//         },
//         messages: {
//           orderBy: { createdAt: "desc" },
//           take: 1, // last message preview
//         },
//       },
//     });

//     res.status(200).json(conversations);
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// });

// // Get messages for a conversation
// router.get("/:id/messages", verifyToken, async (req: AuthRequest, res) => {
//   try {
//     const id = req.params["id"] as string;

//     const messages = await prisma.message.findMany({
//       where: { conversationId: id },
//       orderBy: { createdAt: "asc" },
//       include: { sender: true },
//     });

//     res.status(200).json(messages);
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// });

// export default router;