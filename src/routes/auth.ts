import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  try {
    const { email, username, password, confirmPassword } = req.body;

    if (!email || !username || !password || !confirmPassword) {
        res.status(409).json({ message: "Enter your credentials" });
    }
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email }
    });

    if (existingUser) {
      res.status(400).json({ message: "Email already registered" });
      return;
    }

    if(password != confirmPassword) {
      res.status(401).json({ message: "Password aren't matched" });
      return;
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email,
        username: username,
        password: hashedPassword,
      },
    });

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    res.status(201).json({ token: token, data: user, message: "Register Success"});
  } catch (e) {
    if (e instanceof Error) {
      res.status(500).json({ message: "Server error", error: e.message});
    }

  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        res.status(409).json({ message: "Enter your credentials" });
        return;
    }
    // Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier },
        ],
      },
      
    });

    if (!user) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      res.status(400).json({ message: "Invalid credentials" });
      return;
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET as string,
      { expiresIn: "7d" }
    );

    res.status(200).json({ token: token, data: user, message: " Login Success" });
    console.log(user)
  } catch (e) {
    if(e instanceof Error) {
      res.status(500).json({ message: "Server error", error: e.message});
    }
  }
});

export default router;