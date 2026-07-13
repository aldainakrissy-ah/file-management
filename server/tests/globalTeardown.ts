import fs from "fs";
import path from "path";

module.exports = async () => {
  const dbPath = path.join(__dirname, "test.db");
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
};
