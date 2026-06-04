import { type FastifyInstance, type FastifyPluginAsync } from "fastify";

import authRoutes      from "./auth.routes.js";
import movieRoutes     from "./movie.routes.js";
import healthRoutes    from "./health.routes.js";
import tmdbRoutes      from "./tmdb.routes.js";
import watchlistRoutes from "./watchlist.routes.js";
import watchRoutes     from "./watch.routes.js";
import userRoutes      from "./user.routes.js";
import devRoutes       from "./dev.routes.js";

const API_PREFIX = "/api/v1";

const appRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  await fastify.register(healthRoutes,    { prefix: API_PREFIX });
  await fastify.register(authRoutes,      { prefix: API_PREFIX });
  await fastify.register(movieRoutes,     { prefix: API_PREFIX });
  await fastify.register(tmdbRoutes,      { prefix: API_PREFIX });
  await fastify.register(watchlistRoutes, { prefix: API_PREFIX });
  await fastify.register(watchRoutes,     { prefix: API_PREFIX });
  await fastify.register(userRoutes,      { prefix: API_PREFIX });

  if (process.env.NODE_ENV !== "production") {
    await fastify.register(devRoutes);
  }
};

export default appRoutes;
