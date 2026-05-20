

import fp from "fastify-plugin";
import fastifyEnv from "@fastify/env";
import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";

const schema = Type.Object({
  PORT:          Type.Number({ default: 4321 }),
  JWT_SECRET:    Type.String({ minLength: 16 }),
  CLIENT_ORIGIN: Type.String({ default: "http://localhost:1234" }),
  LOGO_URL:      Type.String({ default: "http://localhost:1234/i99flix-logo.png" }),
  MONGODB_URI:   Type.String({ default: "mongodb://localhost:27017/moviedb" }),
  TMDB_KEY:      Type.String({ default: "" }),
  TMDB_READ_ACCESS_TOKEN: Type.String({ default: "" }),

  RESEND_API_KEY: Type.String({ default: "" }),
  EMAIL_FROM:     Type.String({ default: "i99flix <onboarding@resend.dev>" }),
});

declare module "fastify" {
  interface FastifyInstance {
    config: {
      PORT:                     number;
      JWT_SECRET:               string;
      CLIENT_ORIGIN:            string;
      LOGO_URL:                 string;
      MONGODB_URI:              string;
      TMDB_KEY:                 string;
      TMDB_READ_ACCESS_TOKEN:   string;
      RESEND_API_KEY:           string;
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
