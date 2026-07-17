  import express from "express";
  import { createServer } from "http";
  import { Server } from "socket.io";
  import cors from "cors";
  import dotenv from "dotenv";
  import prisma from "./config/prisma.ts";
  import authRoutes from "./routes/auth.js";
  import friendRoutes from "./routes/friend.ts";
  import alertRoutes from "./routes/alert.ts";
  import conversationRoutes from "./routes/conversation.js";
  import profileRoutes from "./routes/profile.ts";
  import profileImageRoutes from "./routes/upload.ts"
  import accountRoutes from "./routes/account.ts";
  import { initSocket } from "./socket/index.js";


  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Middleware
  app.use(cors());
  dotenv.config();

  // Mount ProfileImage route above express.json()
  app.use("/profile/upload", profileImageRoutes);

  app.use(express.json());
  
  // Routes
  app.use("/auth", authRoutes);
  app.use("/friend", friendRoutes);
  app.use("/alert", alertRoutes);
  app.use("/conversation", conversationRoutes);
  app.use("/profile", profileRoutes);
  app.use("/account", accountRoutes)

  // Test route
  app.get("/", (req, res) => {
    res.json({ message: "Server is running" });
  });

  // Fetch All Users
  app.get("/users", async (req, res) => {
    try {
      const user = await prisma.user.findMany();
      res.status(200).json({ message: "Fetch Success", data: user});
    } catch (e) {
      if (e instanceof Error) {
        res.status(500).json({
          message: e.message,
        });
      }
    }
  });

  // Delete All Users
  app.delete("/users", async (req, res) => {
    try{
      const result = await prisma.user.deleteMany()
      if (result.count === 0 ) {
         res.status(404).json({ message: "No users to delete" })
        return
      }
      res.status(200).json({message: `Deleted ${result.count} users` })
    } catch (e) {
      if (e instanceof Error) {
        res.status(500).json({
          message: e.message,
        });
      }
    }
  })

  // Fetch All Requests
  app.get('/request', async (req, res) => {
    try{
      const result = await prisma.request.findMany()
      if (result.length === 0 ) {
         res.status(404).json({ message: "No Request Found" })
        return
      }
      res.status(200).json({message: `${result.length} Requests found`, data: result })
    } catch (e) {
      if (e instanceof Error) {
        res.status(500).json({
          message: e.message,
        });
      }
    }
  })

  // Socket.io
  // io.on("connection", (socket) => {
  //   console.log("User connected:", socket.id);

  //   socket.on("disconnect", () => {
  //     console.log("User disconnected:", socket.id);
  //   });

  //   // Test Case 
  //   socket.on("sayhi", (message: string) => {
  //     console.log("User Request", message)
  //   })
  // });
  initSocket(io);

  const PORT = process.env.PORT ?? 3000;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });