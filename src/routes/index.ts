import { type FastifyInstance, type FastifyPluginAsync } from "fastify";

import authRoutes   from "./auth.routes.js";
import movieRoutes  from "./movie.routes.js";
import healthRoutes from "./health.routes.js";
import tmdbRoutes   from "./tmdb.routes.js";

const API_PREFIX = "/api/v1";

const appRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  await fastify.register(healthRoutes, { prefix: API_PREFIX });
  await fastify.register(authRoutes,   { prefix: API_PREFIX });
  await fastify.register(movieRoutes,  { prefix: API_PREFIX });
  await fastify.register(tmdbRoutes,   { prefix: API_PREFIX });
};

export default appRoutes;
