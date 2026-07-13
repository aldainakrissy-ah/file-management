# Architecture Notes

## Priority

The goal was a coherent, fully working vertical slice — every core requirement (create/edit/rename/save, rich-text formatting, file import, sharing, persistence) working end-to-end and demonstrable live — rather than partial coverage of a larger feature set.

## Key decisions

- **Editor content as JSON, not HTML.** Tiptap's native document JSON is stored directly in `Document.content` (as a JSON string in SQLite via Prisma). This avoids lossy HTML round-tripping and keeps the import pipeline (`.md`/`.txt` → Tiptap JSON) and the editor using the same shape.
- **Mocked auth.** Login is "pick a seeded user, get a JWT" — no passwords. This is explicitly out of scope for the exercise; the JWT still gates every document route via `requireAuth` middleware, so the access-control logic (owner/edit/view) is real and tested.
- **SQLite + Prisma.** Zero external infra to stand up, trivial to seed and inspect, and sufficient for the single-writer, low-concurrency nature of this exercise. A production system with concurrent multi-user writes would want Postgres.
- **Split `/client` and `/server` folders**, not a monorepo tool (Nx/Turborepo). The two halves deploy to different targets (Vercel/Render) and don't share code, so the overhead of a monorepo tool wasn't justified.
- **Autosave over explicit save**, per the product goal of feeling like Google Docs — a ~1.5s debounce on content/title changes, with a visible Saved/Saving/Error indicator so the user always knows the state.

## What was deferred, and why

Given the timebox, the following were explicitly out of scope:

- **Real-time multi-cursor collaboration** (e.g. Yjs/CRDT sync). The exercise asked for a collaborative *editor* — the sharing/permission model is real and multi-user, but concurrent simultaneous editing of the same document by two people is not conflict-resolved; last write wins. This is the single biggest deferred feature and would be the next thing built with more time.
- **Granular permission tiers beyond view/edit.** No comment-only mode, no per-section permissions.
- **Additional import formats** (`.docx`, `.pdf`, `.rtf`). `.txt`/`.md` cover the "import existing content" requirement without needing a heavier parsing dependency.
- **Password-based auth, invite flows, email.** Sharing is by exact email match against the seeded user list, not an open invite system.
- **Offline support / conflict resolution on reconnect.**

## Data model

- `User` — seeded, no password.
- `Document` — owned by one `User`; `content` is Tiptap JSON (string), `title`, timestamps.
- `DocumentShare` — join table (`documentId`, `userId`, `permission`), unique per (document, user), cascades on document delete.

## Trickiest correctness surface

Sharing and permission enforcement is the part most likely to have subtle bugs (can a non-owner rename? can a viewer PATCH content? does a shared doc actually show up for the recipient?), so it's the area covered by the automated test suite (`server/tests/documents.test.ts`) rather than left to manual QA alone.
