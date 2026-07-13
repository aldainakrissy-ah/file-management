import { execSync } from "child_process";
import path from "path";
import fs from "fs";

module.exports = async () => {
  const dbPath = path.join(__dirname, "test.db");
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  execSync("npx prisma migrate deploy", {
    cwd: path.join(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: "file:./tests/test.db" },
    stdio: "inherit",
  });
};
