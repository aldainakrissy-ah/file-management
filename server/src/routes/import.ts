import path from "path";
import { Router } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { AuthedRequest } from "../middleware/auth";
import { badRequest } from "../lib/errors";
import { markdownToTiptapDoc, plainTextToTiptapDoc } from "../lib/importParser";

export const importRouter = Router();

const ALLOWED_EXTENSIONS = new Set([".txt", ".md"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      cb(badRequest("Only .txt and .md files are supported"));
      return;
    }
    cb(null, true);
  },
});

importRouter.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    if (!req.file) throw badRequest("No file uploaded");

    const ext = path.extname(req.file.originalname).toLowerCase();
    const text = req.file.buffer.toString("utf-8");
    const doc = ext === ".md" ? markdownToTiptapDoc(text) : plainTextToTiptapDoc(text);
    const title = path.basename(req.file.originalname, ext) || "Imported Document";

    const created = await prisma.document.create({
      data: {
        title,
        content: JSON.stringify(doc),
        ownerId: userId,
      },
    });

    res.status(201).json({
      id: created.id,
      title: created.title,
      content: doc,
      ownerId: created.ownerId,
      role: "owner",
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  })
);
