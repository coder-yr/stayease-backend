import compression from "compression";
import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { rateLimit } from "express-rate-limit";
import * as helmet from "helmet";
import type { NextFunction, Request, Response } from "express";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";
import { apiRouter } from "./routes/index.js";
import { logger } from "./utils/logger.js";

export const buildApp = async () => {
  const app = express();
  const allowedOrigins = env.FRONTEND_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const helmetFactory = (helmet as any).default ?? (helmet as any);
  const defaultHelmet = helmetFactory({
    crossOriginResourcePolicy: {
      policy: "cross-origin"
    }
  });

  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (origin === "null" && env.NODE_ENV !== "production") {
          callback(null, true);
          return;
        }
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true
    })
  );

  app.use(defaultHelmet);
  app.use(compression());
  app.use("/uploads", express.static("public/uploads"));

  app.use(cookieParser());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();
    res.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      const payload = {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs
      };

      if (res.statusCode >= 500) logger.error(payload, "HTTP request");
      else if (res.statusCode >= 400) logger.warn(payload, "HTTP request");
      else logger.info(payload, "HTTP request");
    });

    next();
  });

  app.get("/health", (_req, res) => {
    res.status(200).json({ success: true, status: "ok" });
  });

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  
  app.use("/api", apiRouter);


  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

let appInstance: express.Express | null = null;

export default async function handler(req: Request, res: Response) {
  if (!appInstance) {
    appInstance = await buildApp();
  }
  return appInstance(req, res);
}
