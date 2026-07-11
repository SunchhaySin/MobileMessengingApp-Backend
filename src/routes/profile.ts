import express from "express";
import prisma from "../config/prisma.ts";
import { verifyToken, AuthRequest } from "../middleware/auth.js";
import { upload } from "../config/multer.ts";
import { uploadProfileImage } from "../service/bucket_service.ts"

const router = express.Router();

// Fetching your own profile 
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

// For Viewing other user's profile
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

// Adding or Updating Profile Image
router.post("/image", verifyToken, upload.single("image"), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Image required",
        });
      }

      const imageKey = await uploadProfileImage(req.userId!, req.file);
      const profileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${imageKey}`;

      await prisma.profile.upsert({
        where: {
          userID: req.userId!,
        },
        update: {
          imageKey,
          profileUrl,
        },
        create: {
          userID: req.userId!,
          imageKey,
          profileUrl,
        },
      });

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

// Updating your Username
router.post("/name", verifyToken, async(req: AuthRequest, res) => {
  try{
    const {newUsername} = req.body;
    const data = await prisma.user.update({
      where: { id: req.userId! },
      data: { username: newUsername },
      select: {username: true}
    });
    return res.json({message: "Updated Display Name", newUsername: data.username});
  } catch(e) {
    console.error(e)
    return res.status(500).json({ message: "Server Error" });
  }
})

// Adding or Editing your Contacts
router.post("/contacts", verifyToken, async(req: AuthRequest, res) => {
  try{
    const {contacts} = req.body;
  
    const existingProfile = await prisma.profile.findUnique({
      where: { userID: req.userId! }, select: {userID:true, contacts: true}
    });
    
    if (existingProfile) {
      const result = await prisma.profile.update({
        where: { userID: req.userId! },
        data: { contacts },
        select: {contacts: true}
      });

      return res.json({message: "Updated Contacts",  contact: result.contacts});
    }

    const result = await prisma.profile.create({
      data: {
        userID: req.userId!,
        contacts,
      },
      select:{contacts: true}
    });

    return res.json({message: "Added New Contact", contact: result.contacts});
  } catch(e) {
    console.error(e)
    return res.status(500).json({ message: "Server Error" });
  }
})

// Adding or Editing your Bio
router.post("/bio", verifyToken, async(req: AuthRequest, res) => {
  try{
    const {newBio} = req.body;
  
    const existingProfile = await prisma.profile.findUnique({
      where: { userID: req.userId! }, select: {userID:true, bio: true}
    });
    
    if (existingProfile) {
      const result = await prisma.profile.update({
        where: { userID: req.userId! },
        data: { bio: newBio },
        select: {bio: true},
      });

      return res.json({message: "Updated Contacts", bio: result.bio});
    }

    const result = await prisma.profile.create({
      data: {
        userID: req.userId!,
        bio: newBio,
      },
      select: {bio: true},
    });
    
    return res.json({message: "Added New Contact", bio: result.bio});
  } catch(e) {
    console.error(e)
    return res.status(500).json({ message: "Server Error" });
  }
})

export default router