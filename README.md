# Ajaia Docs

A lightweight, Google-Docs-inspired collaborative document editor: create, edit, rename, and share rich-text documents, with `.txt`/`.md` file import and autosave.

**Live demo:** _add link after deployment_

## Stack

- **Server**: Node + Express + TypeScript, Prisma ORM, SQLite, JWT auth (mocked login), Jest + Supertest.
- **Client**: React + Vite + TypeScript, MUI, Tiptap (rich text), TanStack Query, React Router.

## Local setup

### 1. Server

```bash
cd server
npm install
cp .env.example .env        # defaults work out of the box for local dev
npx prisma migrate dev      # creates server/dev.db and applies the schema
npm run seed                # seeds 3 users + sample documents
npm run dev                 # starts on http://localhost:4000
```

Seeded login accounts (no password — pick from a list in the UI):

| Name | Email |
|---|---|
| Alice Nguyen | alice@ajaia.dev |
| Bob Martinez | bob@ajaia.dev |
| Carla Okafor | carla@ajaia.dev |

### 2. Client

```bash
cd client
npm install
cp .env.example .env        # VITE_API_URL defaults to http://localhost:4000
npm run dev                 # starts on http://localhost:5173
```

Open http://localhost:5173, pick a seeded user, and log in.

## Local setup with Docker

Alternative to the manual npm setup above — builds both services with multi-stage Dockerfiles (Docker layer caching makes repeat builds fast since `npm ci` only reruns when `package.json`/`package-lock.json` change).

```bash
docker compose build
docker compose up -d
```

The server container seeds itself automatically on first boot (only when the `User` table is empty) — no manual step needed. Subsequent restarts detect existing data and skip seeding, so your documents are never wiped.

Server: http://localhost:4000, Client: http://localhost:5173. SQLite data persists in the `server-data` named volume across restarts (`docker compose down -v` to wipe it). Stop with `docker compose down`.

## Supported file import types

Only `.txt` and `.md` files (max 2MB) can be imported. Markdown headings, bold/italic, and bullet/numbered lists are converted to the equivalent rich-text formatting; plain text is imported as one paragraph per line. Any other file type is rejected with an error message in the UI.

## API testing (Postman)

Import [`ajaia-docs.postman_collection.json`](./ajaia-docs.postman_collection.json) into Postman. It covers every route (`auth`, `users`, `documents` CRUD, import, sharing). Workflow:

1. Run **Auth → List Users** — saves the first two seeded users' ids into `userId` / `otherUserId` collection variables.
2. Run **Auth → Login** — saves the returned JWT into the `token` variable; every other request is pre-configured to send it as a Bearer token.
3. Run **Documents → Create Document** — saves the new id into `documentId`, used by the rest of the Documents/Sharing requests.

`baseUrl` defaults to `http://localhost:4000` — change the collection variable to point at a deployed backend.

## Running tests

```bash
cd server
npm test
```

Covers document CRUD, cross-user access denial, sharing, and permission enforcement (view-only collaborators cannot edit content).

## Architecture & AI workflow notes

See [ARCHITECTURE.md](./ARCHITECTURE.md) and [AI_WORKFLOW.md](./AI_WORKFLOW.md).
