import fastify, { type FastifyInstance } from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyHelmet from "@fastify/helmet";
import { type TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

import appEnv from "./config/app-env.js";
import { connectDB } from "./config/db.js";
import appRoutes from "./routes/index.js";
import { COOKIE_NAME } from "./constants/auth.constant.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      email?: string;
    };
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();

  // ── 1. Environment config (must be first — other plugins depend on it) ──
  await app.register(appEnv);

  // ── 2. Security middleware ──────────────────────────────────────────────
  await app.register(fastifyHelmet, { contentSecurityPolicy: false });
  await app.register(fastifyRateLimit, { global: false });

  await app.register(fastifyCors, {
    origin: app.config.CLIENT_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  // ── 3. Cookie + JWT ─────────────────────────────────────────────────────
  await app.register(fastifyCookie, {
    secret: app.config.COOKIE_SECRET,
    hook: "onRequest",
    parseOptions: {},
  });

  await app.register(fastifyJwt, {
    secret: app.config.JWT_SECRET,
    cookie: {
      cookieName: COOKIE_NAME,
      signed: false,
    },
  });

  // ── 4. OpenAPI / Swagger ────────────────────────────────────────────────
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "LoremFlix Movie API",
        description: "REST API for the LoremFlix movie streaming platform",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: COOKIE_NAME,
          },
        },
      },
    },
  });

  await app.register(fastifySwaggerUi, { routePrefix: "/docs" });
  app.get("/swagger.json", async () => app.swagger());

  // ── 5. Database ─────────────────────────────────────────────────────────
  await connectDB(app.config.MONGODB_URI);

  // ── 6. Application routes ───────────────────────────────────────────────
  await app.register(appRoutes);

  return app;
}
