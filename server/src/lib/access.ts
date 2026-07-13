import { prisma } from "./prisma";
import { forbidden, notFound } from "./errors";

export type AccessRole = "owner" | "edit" | "view";

export async function getDocumentWithAccess(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { shares: true },
  });
  if (!document) throw notFound("Document");

  if (document.ownerId === userId) {
    return { document, role: "owner" as AccessRole };
  }

  const share = document.shares.find((s) => s.userId === userId);
  if (!share) throw forbidden();

  return { document, role: (share.permission === "edit" ? "edit" : "view") as AccessRole };
}
