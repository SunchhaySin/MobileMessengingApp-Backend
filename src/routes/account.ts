import express from "express";
import prisma from "../config/prisma.ts";
import { verifyToken, AuthRequest } from "../middleware/auth.js";

const router = express.Router();

router.get("/password", verifyToken, async (req: AuthRequest, res) => {
    try{
        const password = await prisma.user.findUnique({
            where: {id: req.userId!},
            select: {password: true}
        })
        if(password === null) {
            return res.status(404).json({message: "No Data"});
        }
        return res.json({data: password})
    } catch(e) {
        console.error(e)
        return res.status(500).json({message: "Server Error"})
    }
}) // Unfinished Endpoint

router.delete("/delete", verifyToken, async(req: AuthRequest, res) => {
    try{
        await prisma.user.delete({
            where: {id: req.userId!}
        })
        return res.json({message: "Account Deactivated"});
    } catch(e) {
        console.error(e)
        return res.status(500).json({message: "Server Error"})
    }
})