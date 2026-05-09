import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import mongoose from "mongoose";

import { ROUTES } from "../config/app-routes.js";

// Mongoose readyState values:
//   0 = disconnected  1 = connected  2 = connecting  3 = disconnecting
const DB_STATES: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

const HealthSchema = {
  description: "Returns the health status of the API and its dependencies.",
  tags: ["System"],
  response: {
    200: Type.Object({
      status:    Type.Literal("ok"),
      version:   Type.String(),
      uptime:    Type.Number({ description: "Process uptime in seconds" }),
      timestamp: Type.String({ description: "ISO 8601 UTC timestamp" }),
      db:        Type.Object({
        status: Type.String(),
      }),
    }),
    503: Type.Object({
      status:    Type.Literal("degraded"),
      version:   Type.String(),
      uptime:    Type.Number(),
      timestamp: Type.String(),
      db:        Type.Object({
        status: Type.String(),
      }),
    }),
  },
};

const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get(ROUTES.HEALTH, { schema: HealthSchema }, async (_request, reply) => {
    const dbState   = mongoose.connection.readyState;
    const dbStatus  = DB_STATES[dbState] ?? "unknown";
    const isHealthy = dbState === 1;

    const body = {
      status:    isHealthy ? ("ok" as const) : ("degraded" as const),
      version:   "1.0.0",
      uptime:    Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      db: {
        status: dbStatus,
      },
    };

    return reply.code(isHealthy ? 200 : 503).send(body);
  });
};

export default healthRoutes;
