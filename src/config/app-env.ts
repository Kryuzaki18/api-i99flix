/**
 * Environment configuration plugin using @fastify/env.
 *
 * Validates and coerces all required environment variables at startup.
 * The app will refuse to start if any required variable is missing.
 *
 * Augments FastifyInstance with `app.config` so all plugins and routes
 * can access env vars in a type-safe way.
 */

import fp from "fastify-plugin";
import fastifyEnv from "@fastify/env";
import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";

const schema = Type.Object({
  PORT:          Type.Number({ default: 4321 }),
  JWT_SECRET:    Type.String({ minLength: 16 }),
  COOKIE_SECRET: Type.String({ minLength: 16 }),
  CLIENT_ORIGIN: Type.String({ default: "http://localhost:1234" }),
  MONGODB_URI:   Type.String({ default: "mongodb://localhost:27017/moviedb" }),
  TMDB_KEY:      Type.String({ default: "" }),
  TMDB_READ_ACCESS_TOKEN: Type.String({ default: "" }),
  // ── Nodemailer / SMTP ──────────────────────────────────────────────────────
  SMTP_HOST:     Type.String({ default: "smtp.gmail.com" }),
  SMTP_PORT:     Type.Number({ default: 587 }),
  SMTP_SECURE:   Type.Boolean({ default: false }), // true = port 465 (TLS), false = STARTTLS
  SMTP_USER:     Type.String({ default: "" }),
  SMTP_PASS:     Type.String({ default: "" }),
  EMAIL_FROM:    Type.String({ default: "i99flix <noreply@i99flix.com>" }),
});

declare module "fastify" {
  interface FastifyInstance {
    config: {
      PORT:                     number;
      JWT_SECRET:               string;
      COOKIE_SECRET:            string;
      CLIENT_ORIGIN:            string;
      MONGODB_URI:              string;
      TMDB_KEY:                 string;
      TMDB_READ_ACCESS_TOKEN:   string;
      SMTP_HOST:                string;
      SMTP_PORT:                number;
      SMTP_SECURE:              boolean;
      SMTP_USER:                string;
      SMTP_PASS:                string;
      EMAIL_FROM:               string;
    };
  }
}

export default fp(async function appEnv(fastify: FastifyInstance) {
  await fastify.register(fastifyEnv, {
    schema,
    dotenv: true,
    confKey: "config",
  });
});
