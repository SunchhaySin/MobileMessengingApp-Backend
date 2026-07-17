import express from "express";
import prisma from "../config/prisma.ts";
import { verifyToken, AuthRequest } from "../middleware/auth.js";

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

// Updating your Username
router.post("/name", verifyToken, async(req: AuthRequest, res) => {
  try{
    const {newUsername} = req.body;
    const data = await prisma.user.update({
      where: { id: req.userId! },
      data: { username: newUsername },
      select: {username: true}
    });

    const history = await prisma.profileHistory.create({
      data: {
        userID: req.userId!,
        message: `You updated your username to ${newUsername}`,
      }
    })

    return res.json({message: "Updated Display Name", newUsername: data.username, history: history});
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
      
      const history = await prisma.profileHistory.create({
        data: {
          userID: req.userId!,
          message: `You changed your contacts details, ${contacts}`,
        }
      })

      return res.json({message: "Updated Contacts",  contact: result.contacts, history: history});
    }

    const result = await prisma.profile.create({
      data: {
        userID: req.userId!,
        contacts,
      },
      select:{contacts: true}
    });

    const history = await prisma.profileHistory.create({
      data: {
        userID: req.userId!,
        message: `You added to your contacts details, ${contacts}`,
      }
    })

    return res.json({message: "Added New Contact", contact: result.contacts, history: history});
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

      const history = await prisma.profileHistory.create({
        data: {
          userID: req.userId!,
          message: `You updated your Bio, ${newBio}`,
        }
      })

      return res.json({message: "Updated Contacts", bio: result.bio, history: history});
    } else {
      
    }

    const result = await prisma.profile.create({
      data: {
        userID: req.userId!,
        bio: newBio,
      },
      select: {bio: true},
    });
    
    const history = await prisma.profileHistory.create({
      data: {
        userID: req.userId!,
        message: `You added to your Bio, ${newBio}`,
      }
    })

    return res.json({message: "Added New Contact", bio: result.bio, history: history});
  } catch(e) {
    console.error(e)
    return res.status(500).json({ message: "Server Error" });
  }
})

// Password Reset
router.post("/reset/password", verifyToken, async(req: AuthRequest, res) => {
  try{
    const { oldPassword } = req.body


  } catch(e) {
    console.error(e)
    return res.status(500).json({ message: "Server Error" });
  }
})

// Fetch Profile History
router.get("/history", verifyToken, async(req:AuthRequest, res) => {
  try {
    const historyList = await prisma.profileHistory.findMany({
      where: {userID: req.userId!},
      orderBy: {createdAt: "desc"}
    })
    
    if(historyList.length === 0 ) {
      return res.status(404).json({message: "History Not Found"})
    }

    return res.json(historyList)
  } catch(e) {
    console.error(e)
    return res.status(500).json({ message: "Server Error" });
  }
})

export default router