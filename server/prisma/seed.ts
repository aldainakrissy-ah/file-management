import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.documentShare.deleteMany();
  await prisma.document.deleteMany();
  await prisma.user.deleteMany();

  const alice = await prisma.user.create({
    data: { name: "Alice Nguyen", email: "alice@ajaia.dev" },
  });
  const bob = await prisma.user.create({
    data: { name: "Bob Martinez", email: "bob@ajaia.dev" },
  });
  const carla = await prisma.user.create({
    data: { name: "Carla Okafor", email: "carla@ajaia.dev" },
  });

  const welcomeDoc = await prisma.document.create({
    data: {
      title: "Welcome to Ajaia Docs",
      ownerId: alice.id,
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "heading",
            attrs: { level: 1 },
            content: [{ type: "text", text: "Welcome to Ajaia Docs" }],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "This is a " },
              { type: "text", text: "sample", marks: [{ type: "bold" }] },
              { type: "text", text: " document with " },
              { type: "text", text: "formatting", marks: [{ type: "italic" }] },
              { type: "text", text: "." },
            ],
          },
          {
            type: "bulletList",
            content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Create and rename documents" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Import .txt or .md files" }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Share documents with teammates" }] }] },
            ],
          },
        ],
      }),
    },
  });

  await prisma.documentShare.create({
    data: { documentId: welcomeDoc.id, userId: bob.id, permission: "edit" },
  });

  await prisma.document.create({
    data: {
      title: "Bob's Draft Notes",
      ownerId: bob.id,
      content: JSON.stringify({
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Draft Notes" }] },
          { type: "paragraph", content: [{ type: "text", text: "Nothing here yet." }] },
        ],
      }),
    },
  });

  const carlaDoc = await prisma.document.create({
    data: {
      title: "Q3 Planning (view only for Alice)",
      ownerId: carla.id,
      content: JSON.stringify({
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Q3 Planning" }] },
          { type: "paragraph", content: [{ type: "text", text: "Read-only share example." }] },
        ],
      }),
    },
  });
  await prisma.documentShare.create({
    data: { documentId: carlaDoc.id, userId: alice.id, permission: "view" },
  });

  console.log("Seeded users:", { alice: alice.email, bob: bob.email, carla: carla.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
