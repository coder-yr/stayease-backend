import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { logger } from "./utils/logger.js";

const start = async () => {
  const app = await buildApp();

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "StayEase backend running");
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down gracefully");
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
};

start().catch(async (error) => {
  logger.error({ err: error }, "Failed to start server");
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
