import express from "express";
import prisma from "../config/prisma.ts";
import bcrypt from "bcrypt";
import { verifyToken, AuthRequest } from "../middleware/auth.js";

const router = express.Router();

//Reset Password
router.post("/password/reset", verifyToken, async (req: AuthRequest, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword) {
            return res.status(400).json({ message: "Old password is required" });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.userId! },
            select: { password: true }
        });

        if (!user) {
            return res.status(404).json({ message: "No Data" });
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Old password is incorrect" });
        }

        // Step 1 only: just confirming the old password, nothing to update yet
        if (!newPassword) {
            return res.json({ message: "Password Match" });
        }

        // Step 2: old password confirmed AND new password provided → do the update
        const isSame = await bcrypt.compare(newPassword, user.password);
        if (isSame) {
            return res.status(400).json({ message: "New password must be different" });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: req.userId! },
            data: { password: hashedNewPassword }
        });

        return res.json({ message: "Password updated successfully" });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Server Error" });
    }
});


// Deactivate/Delete Account : CURRENT NOT USED
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

export default router