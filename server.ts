import dotenv from "dotenv";
import app = require("./app");
import { connectPostgres } from "./config/postgres";

dotenv.config({ path: "config.env" });

const startServer = async (): Promise<void> => {
  await connectPostgres();

  const port = Number(process.env.PORT ?? 3000);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

void startServer().catch((error: unknown) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
