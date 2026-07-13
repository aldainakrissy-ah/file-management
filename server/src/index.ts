import "dotenv/config";
import { createApp } from "./app";

const PORT = Number(process.env.PORT) || 4000;

createApp().listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
