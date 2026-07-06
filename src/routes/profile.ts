import express from "express";
import prisma from "../config/prisma.ts";
import { verifyToken, AuthRequest } from "../middleware/auth.js";
import { upload } from "../config/multer.ts";
import { uploadProfileImage } from "../service/bucket_service.ts"

const router = express.Router();

router.get('/', verifyToken, async(req: AuthRequest, res) => {
    try{
        const profile = await prisma.profile.findUnique({
            where: {userID: req.userId!}
        })

        if(!profile) {
            return res.status(404).json({message: "No Profile"})
        }

        return res.json({data: profile})
    } catch(e) {
        console.error(e)
        return res.status(500).json({message: "Server Error"})
    }
})

router.get('/:userId', verifyToken, async(req: AuthRequest, res) => {
    try{
        const userId = req.params.userId as string;
        const profile = await prisma.profile.findUnique({
            where: {userID: userId}
        })

        if(!profile) {
            return res.status(404).json({message: "No Profile"})
        }

        return res.json({data: profile})
    } catch(e) {
        console.error(e)
        return res.status(500).json({message: "Server Error"})
    }
})

router.post("/create", verifyToken, upload.single("image"), async (req: AuthRequest, res) => {
    try {
      const existingProfile = await prisma.profile.findUnique({
        where: { userID: req.userId! },
      });

      if (existingProfile) {
        return res.status(409).json({
          message: "Profile already exists",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "Image required",
        });
      }
      const { bio, contacts } = req.body;
      const imageKey = await uploadProfileImage(req.userId!, req.file);
      const profileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${imageKey}`;

      await prisma.profile.create({
        data: {
          userID: req.userId!,
          profileUrl, // Short hand => profileUrl: profileUrl
          imageKey,
          bio,
          contacts,
        },
      });

      return res.status(201).json({
        message: "Profile created",
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Server Error" });
    }
  },
);


export default router