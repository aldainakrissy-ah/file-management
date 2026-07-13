import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../lib/asyncHandler";
import { AuthedRequest } from "../middleware/auth";
import { badRequest, forbidden, notFound } from "../lib/errors";
import { getDocumentWithAccess } from "../lib/access";

export const documentsRouter = Router();

const DEFAULT_CONTENT = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph" }],
});

function serializeDocument(
  doc: { id: string; title: string; content: string; ownerId: string; createdAt: Date; updatedAt: Date },
  role: "owner" | "edit" | "view",
  ownerName?: string
) {
  return {
    id: doc.id,
    title: doc.title,
    content: JSON.parse(doc.content),
    ownerId: doc.ownerId,
    ownerName,
    role,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

documentsRouter.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const [owned, sharedShares] = await Promise.all([
      prisma.document.findMany({ where: { ownerId: userId }, orderBy: { updatedAt: "desc" } }),
      prisma.documentShare.findMany({
        where: { userId },
        include: { document: { include: { owner: true } } },
        orderBy: { document: { updatedAt: "desc" } },
      }),
    ]);

    const ownedSerialized = owned.map((d) => serializeDocument(d, "owner"));
    const sharedSerialized = sharedShares.map((s) =>
      serializeDocument(
        s.document,
        s.permission === "edit" ? "edit" : "view",
        s.document.owner.name
      )
    );

    res.json({ owned: ownedSerialized, shared: sharedSerialized });
  })
);

documentsRouter.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const schema = z.object({ title: z.string().min(1).max(200).optional() });
    const { title } = schema.parse(req.body ?? {});
    const doc = await prisma.document.create({
      data: {
        title: title || "Untitled Document",
        content: DEFAULT_CONTENT,
        ownerId: userId,
      },
    });
    res.status(201).json(serializeDocument(doc, "owner"));
  })
);

documentsRouter.get(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { document, role } = await getDocumentWithAccess(req.params.id, userId);
    const owner = await prisma.user.findUnique({ where: { id: document.ownerId } });
    res.json(serializeDocument(document, role, owner?.name));
  })
);

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.any().optional(),
});

documentsRouter.patch(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { title, content } = patchSchema.parse(req.body ?? {});
    const { document, role } = await getDocumentWithAccess(req.params.id, userId);

    if (role === "view") throw forbidden("You only have view access to this document");
    if (title !== undefined && role !== "owner") {
      throw forbidden("Only the owner can rename this document");
    }
    if (title === undefined && content === undefined) {
      throw badRequest("Nothing to update");
    }

    const updated = await prisma.document.update({
      where: { id: document.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(content !== undefined ? { content: JSON.stringify(content) } : {}),
      },
    });
    res.json(serializeDocument(updated, role));
  })
);

documentsRouter.delete(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { document, role } = await getDocumentWithAccess(req.params.id, userId);
    if (role !== "owner") throw forbidden("Only the owner can delete this document");
    await prisma.document.delete({ where: { id: document.id } });
    res.status(204).send();
  })
);

const shareSchema = z.object({
  userEmail: z.string().email(),
  permission: z.enum(["view", "edit"]).default("view"),
});

documentsRouter.post(
  "/:id/share",
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { userEmail, permission } = shareSchema.parse(req.body ?? {});
    const { document, role } = await getDocumentWithAccess(req.params.id, userId);
    if (role !== "owner") throw forbidden("Only the owner can share this document");

    const targetUser = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!targetUser) throw notFound("User");
    if (targetUser.id === document.ownerId) {
      throw badRequest("Cannot share a document with its owner");
    }

    const share = await prisma.documentShare.upsert({
      where: { documentId_userId: { documentId: document.id, userId: targetUser.id } },
      update: { permission },
      create: { documentId: document.id, userId: targetUser.id, permission },
    });

    res.status(201).json({
      id: share.id,
      userId: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      permission: share.permission,
    });
  })
);

documentsRouter.get(
  "/:id/shares",
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { document, role } = await getDocumentWithAccess(req.params.id, userId);
    if (role !== "owner") throw forbidden("Only the owner can view sharing settings");
    const shares = await prisma.documentShare.findMany({
      where: { documentId: document.id },
      include: { user: true },
    });
    res.json(
      shares.map((s) => ({
        id: s.id,
        userId: s.userId,
        name: s.user.name,
        email: s.user.email,
        permission: s.permission,
      }))
    );
  })
);

documentsRouter.delete(
  "/:id/share/:userId",
  asyncHandler(async (req: AuthedRequest, res) => {
    const userId = req.userId!;
    const { document, role } = await getDocumentWithAccess(req.params.id, userId);
    if (role !== "owner") throw forbidden("Only the owner can revoke access");
    await prisma.documentShare.deleteMany({
      where: { documentId: document.id, userId: req.params.userId },
    });
    res.status(204).send();
  })
);
