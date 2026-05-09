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
  PORT:          Type.Number({ default: 5555 }),
  JWT_SECRET:    Type.String({ minLength: 16 }),
  COOKIE_SECRET: Type.String({ minLength: 16 }),
  CLIENT_ORIGIN: Type.String({ default: "http://localhost:1234" }),
  MONGODB_URI:   Type.String({ default: "mongodb://localhost:27017/moviedb" }),
});

declare module "fastify" {
  interface FastifyInstance {
    config: {
      PORT:          number;
      JWT_SECRET:    string;
      COOKIE_SECRET: string;
      CLIENT_ORIGIN: string;
      MONGODB_URI:   string;
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
