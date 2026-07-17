import express from "express";
import prisma from "../config/prisma.js";
import { verifyToken, AuthRequest } from "../middleware/auth.js";
import { upload } from "../config/multer.js";
import { uploadProfileImage, deleteProfileImage } from "../service/bucket_service.js"

const router = express.Router();
router.post("/image", verifyToken, upload.single("image"), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Image required",
        });
      }

      if (!req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "Invalid file type" });
      }
  
      if (req.file.size > 5 * 1024 * 1024) { // 5MB cap
        return res.status(400).json({ message: "Image too large" });
      }
    
      // Get the existing profile to find the old image key
      const existingProfile = await prisma.profile.findUnique({
        where: { userID: req.userId! },
        select: { imageKey: true },
      });

      const imageKey = await uploadProfileImage(req.userId!, req.file);
      const profileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${imageKey}`;

      await prisma.profile.upsert({
        where: {userID: req.userId!},
        update: { imageKey, profileUrl},
        create: { userID: req.userId!, imageKey, profileUrl},
      });

      // Delete old image after the new one is safely uploaded + saved
        if (existingProfile?.imageKey) {
        await deleteProfileImage(existingProfile.imageKey).catch((e) =>
          console.error("Failed to delete old profile image:", e)
        );
      }

      return res.json({
        message: "Profile Picture Updated",
        profileUrl,
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Server Error" });
    }
  },
);

export default router