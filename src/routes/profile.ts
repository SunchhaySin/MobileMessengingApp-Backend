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

router.post("/image", verifyToken, upload.single("image"), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Image required",
        });
      }

      const imageKey = await uploadProfileImage(req.userId!, req.file);
      const profileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${imageKey}`;

      const existingProfile = await prisma.profile.findUnique({
        where: { userID: req.userId! }, select: {userID:true, profileUrl: true}
      });

      if (existingProfile) {
        await prisma.profile.update({
          where: { userID: req.userId!},
          data : {
            imageKey: imageKey,
            profileUrl: profileUrl,
          }
        })
        return res.json({message: "Profile Picture Changed"});
      }

      await prisma.profile.create({
        data: {
          userID: req.userId!,
          profileUrl, // Short hand => profileUrl: profileUrl
          imageKey,
        },
      });

      return res.status(201).json({
        message: "Profile Picture Added",
      });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ message: "Server Error" });
    }
  },
);

router.post("/name", verifyToken, async(req: AuthRequest, res) => {
  try{
    const newUsername = req.body;
    await prisma.user.update({
      where: {id: req.userId!},
      data: { username : newUsername },
    })
    return res.json({message: "Updated Display Name"});
  } catch(e) {
    console.error(e)
    return res.status(500).json({ message: "Server Error" });
  }
})

router.post("/contacts", verifyToken, async(req: AuthRequest, res) => {
  try{
    const newContacts = req.body;
  
    const existingProfile = await prisma.profile.findUnique({
      where: { userID: req.userId! }, select: {userID:true, contacts: true}
    });
    
    if (existingProfile) {
      await prisma.profile.update({
        where: { id: req.userId! },
        data: { contacts: newContacts },
      });

      return res.json({message: "Updated Contacts"});
    }

    await prisma.profile.create({
      data: {
        userID: req.userId!,
        contacts: newContacts,
      },
    });

    return res.json({message: "Added New Contact"});
  } catch(e) {
    console.error(e)
    return res.status(500).json({ message: "Server Error" });
  }
})

router.post("/bio", verifyToken, async(req: AuthRequest, res) => {
  try{
    const newBio = req.body;
  
    const existingProfile = await prisma.profile.findUnique({
      where: { userID: req.userId! }, select: {userID:true, bio: true}
    });
    
    if (existingProfile) {
      await prisma.profile.update({
        where: { id: req.userId! },
        data: { bio: newBio },
      });

      return res.json({message: "Updated Contacts"});
    }

    await prisma.profile.create({
      data: {
        userID: req.userId!,
        bio: newBio,
      },
    });
    
    return res.json({message: "Added New Contact"});
  } catch(e) {
    console.error(e)
    return res.status(500).json({ message: "Server Error" });
  }
})

export default router