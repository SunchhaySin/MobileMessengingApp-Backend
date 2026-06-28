import express from "express";
import prisma from "../prisma.ts";
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

// router.post("/add", verifyToken, async (req: AuthRequest, res) => {
//   try {
//     const senderID = req.userId!;
//     const { recipientID } = req.body;

//     if (senderID === recipientID) {
//       return res.status(400).json({
//         message: "You cannot add yourself.",
//       });
//     }

//     const recipient = await prisma.user.findUnique({
//       where: {
//         id: recipientID,
//       },
//     });

//     if (!recipient) {
//       return res.status(404).json({
//         message: "User not found",
//       });
//     }

//     const existing = await prisma.request.findFirst({
//       where: {
//         OR: [
//           {
//             requesterID: senderID,
//             userID: recipientID,
//           },
//           {
//             requesterID: recipientID,
//             userID: senderID,
//           },
//         ],
//       },
//     });

//     if (existing) {
//       return res.status(400).json({
//         message: "Request is previouly sent",
//       });
//     }

//     const alreadyFriends = await prisma.friend.findFirst({
//       where: {
//         OR: [
//           {
//             userId: senderID,
//             friendId: recipientID,
//           },
//           {
//             userId: recipientID,
//             friendId: senderID,
//           },
//         ],
//       },
//     });

//     if (alreadyFriends) {
//       return res.status(400).json({
//         message: "Already Friends with this person.",
//       });
//     }

//     await prisma.request.create({
//       data: {
//         requesterID: senderID,
//         userID: recipientID,
//       },
//     });

//     res.status(201).json({
//       message: "Friends Request Sent",
//     });
//   } catch (e) {
//     res.status(500).json({
//       message: "Server error",
//     });
//   }
// });

// router.post("/accept/:requestId", verifyToken, async (req: AuthRequest, res) => {
//     try {
//       const { requestId } = req.params;
//       const request = await prisma.request.findUnique({
//         where: {
//           id: requestId as string,
//         },
//         include: {
//           requestFrom: {
//             select: {
//               id: true,
//               username: true,
//             },
//           },
//         },
//       });

//       if (!request) {
//         return res.status(404).json({ message: "Request not found" });
//       }

//       const existing = await prisma.request.findFirst({
//         where: {
//           id: requestId as string,
//           status: "Accepted",
//         },
//       });

//       if (existing) {
//         return res.status(400).json({ message: "Request already accepted" });
//       }

//       await prisma.request.update({
//         where: { id: requestId as string },
//         data: { status: "Accepted" },
//       });

//       await prisma.friend.create({
//         data: {
//           userId: req.userId!,
//           friendId: request.requesterID,
//         },
//       });

//       return res.json({ message: "Request Accepted" });
//     } catch (e) {
//       res.status(500).json({
//         message: "Server error",
//       });
//     }
//   },
// );

// // Reject another user friend request 
// router.post("/reject/:requestId", verifyToken, async (req:AuthRequest, res) => {
//   try{
//     const { requestId } = req.params;
//       const request = await prisma.request.findUnique({
//         where: {
//           id: requestId as string,
//         },
//         include: {
//           requestFrom: {
//             select: {
//               id: true,
//               username: true,
//             },
//           },
//         },
//       });

//       if (!request) {
//         return res.status(404).json({ message: "Request not found" });
//       }
      
//       const accepted = await prisma.request.findFirst({
//         where: {
//           id: requestId as string,
//           status: "Accepted",
//         },
//       });

//       if (accepted) {
//         return res.status(400).json({ message: "Cannot undo request acception" });
//       }

//       await prisma.request.update({
//         where: { id: requestId as string },
//         data: { status: "Rejected" },
//       });

//       res.json({message: "Request Rejected"})
//   } catch(e) {
//     res.status(500).json({
//         message: "Server error",
//     });
//   }
// })

// // Sender Removes their own request to another user
// router.delete("/remove/:requestId", verifyToken, async (req:AuthRequest, res) => {

// })

router.get("/fetch", verifyToken, async (req: AuthRequest, res) => {
  try {
    const friends = await prisma.friend.findMany({
      where: {
        OR: [{ userId: req.userId! }, { friendId: req.userId! }],
      },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
        friend: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    const result = friends.map((f) => {
      return f.userId === req.userId ? f.friend : f.user;
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
          },
        },
      },
    });

    res.json({
      sentRequests: sentRequests,
      receivedRequests: receivedRequests,
    });
  } catch (e) {
    res.status(500).json({
      message: "Server error",
    });
  }
});;

export default router
