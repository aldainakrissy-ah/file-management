import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/lib/prisma";

const app = createApp();

async function loginAs(userId: string) {
  const res = await request(app).post("/auth/login").send({ userId });
  return res.body.token as string;
}

describe("Documents API", () => {
  let alice: { id: string; email: string };
  let bob: { id: string; email: string };

  beforeAll(async () => {
    await prisma.documentShare.deleteMany();
    await prisma.document.deleteMany();
    await prisma.user.deleteMany();

    alice = await prisma.user.create({ data: { name: "Alice", email: "alice@test.dev" } });
    bob = await prisma.user.create({ data: { name: "Bob", email: "bob@test.dev" } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a document owned by the authenticated user", async () => {
    const token = await loginAs(alice.id);
    const res = await request(app)
      .post("/documents")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "My Doc" });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("My Doc");
    expect(res.body.ownerId).toBe(alice.id);
    expect(res.body.role).toBe("owner");
  });

  it("does not let an unrelated user access a document", async () => {
    const aliceToken = await loginAs(alice.id);
    const createRes = await request(app)
      .post("/documents")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ title: "Private Doc" });
    const docId = createRes.body.id;

    const bobToken = await loginAs(bob.id);
    const getRes = await request(app)
      .get(`/documents/${docId}`)
      .set("Authorization", `Bearer ${bobToken}`);

    expect(getRes.status).toBe(403);
  });

  it("lets an owner share a document, and the recipient sees it under shared documents", async () => {
    const aliceToken = await loginAs(alice.id);
    const createRes = await request(app)
      .post("/documents")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ title: "Shared Doc" });
    const docId = createRes.body.id;

    const shareRes = await request(app)
      .post(`/documents/${docId}/share`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ userEmail: bob.email, permission: "edit" });
    expect(shareRes.status).toBe(201);

    const bobToken = await loginAs(bob.id);
    const listRes = await request(app)
      .get("/documents")
      .set("Authorization", `Bearer ${bobToken}`);

    expect(listRes.status).toBe(200);
    const sharedIds = listRes.body.shared.map((d: { id: string }) => d.id);
    expect(sharedIds).toContain(docId);

    const getRes = await request(app)
      .get(`/documents/${docId}`)
      .set("Authorization", `Bearer ${bobToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.role).toBe("edit");
  });

  it("blocks a view-only collaborator from editing content", async () => {
    const aliceToken = await loginAs(alice.id);
    const createRes = await request(app)
      .post("/documents")
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ title: "View Only Doc" });
    const docId = createRes.body.id;

    await request(app)
      .post(`/documents/${docId}/share`)
      .set("Authorization", `Bearer ${aliceToken}`)
      .send({ userEmail: bob.email, permission: "view" });

    const bobToken = await loginAs(bob.id);
    const patchRes = await request(app)
      .patch(`/documents/${docId}`)
      .set("Authorization", `Bearer ${bobToken}`)
      .send({ content: { type: "doc", content: [] } });

    expect(patchRes.status).toBe(403);
  });

  it("rejects requests without a valid token", async () => {
    const res = await request(app).get("/documents");
    expect(res.status).toBe(401);
  });
});
