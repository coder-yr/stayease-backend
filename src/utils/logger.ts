import pino from "pino";
import { env } from "../config/env.js";

const isLocalDev = env.NODE_ENV === "development" && process.env.VERCEL !== "1";

export const logger = pino({
  level: isLocalDev ? "debug" : "info",
  transport:
    isLocalDev
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname"
          }
        }
      : undefined
});
