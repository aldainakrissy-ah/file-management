import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { documentsRouter } from "./routes/documents";
import { importRouter } from "./routes/import";
import { requireAuth } from "./middleware/auth";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  const allowedOrigins = process.env.CLIENT_ORIGIN?.split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  app.use(
    cors({
      origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : "*",
    })
  );
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/documents/import", requireAuth, importRouter);
  app.use("/documents", requireAuth, documentsRouter);

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));
  app.use(errorHandler);

  return app;
}
