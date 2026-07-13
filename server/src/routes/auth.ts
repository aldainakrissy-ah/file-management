import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { notFound } from "../lib/errors";

export const authRouter = Router();

const loginSchema = z.object({
  userId: z.string().min(1, "userId is required"),
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { userId } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound("User");
    const token = signToken(user.id);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  })
);
