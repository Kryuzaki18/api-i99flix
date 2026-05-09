import { type FastifyInstance, type FastifyPluginAsync } from "fastify";

import authRoutes from "./auth.routes.js";
import movieRoutes from "./movie.routes.js";

const API_PREFIX = "/api/v1";

const appRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  await fastify.register(authRoutes, { prefix: API_PREFIX });
  await fastify.register(movieRoutes, { prefix: API_PREFIX });
};

export default appRoutes;
