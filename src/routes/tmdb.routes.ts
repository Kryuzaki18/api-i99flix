

import { type FastifyInstance, type FastifyPluginAsync, type FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";

import { requireAuth }       from "../hooks/auth.hook.js";
import { createTmdbService } from "../services/tmdb.service.js";
import { ErrorBody }         from "../schemas/shared.schema.js";

const PageQuery = Type.Object({
  page:     Type.Optional(Type.Number({ minimum: 1, default: 1 })),
  language: Type.Optional(Type.String({ default: "en-US" })),
});

const SearchQuery = Type.Object({
  query:    Type.String({ minLength: 1, maxLength: 200 }),
  page:     Type.Optional(Type.Number({ minimum: 1, default: 1 })),
  language: Type.Optional(Type.String({ default: "en-US" })),
});

const DiscoverMovieQuery = Type.Object({
  page:                        Type.Optional(Type.Number({ minimum: 1, default: 1 })),
  language:                    Type.Optional(Type.String({ default: "en-US" })),
  sort_by:                     Type.Optional(Type.String()),
  with_genres:                 Type.Optional(Type.String()),
  primary_release_year:        Type.Optional(Type.Number()),
  "primary_release_date.gte":  Type.Optional(Type.String()),
  "primary_release_date.lte":  Type.Optional(Type.String()),
  "vote_average.gte":          Type.Optional(Type.Number()),
  "vote_average.lte":          Type.Optional(Type.Number()),
  include_adult:               Type.Optional(Type.Boolean({ default: false })),
  with_original_language:      Type.Optional(Type.String()),
});

const DiscoverTvQuery = Type.Object({
  page:                   Type.Optional(Type.Number({ minimum: 1, default: 1 })),
  language:               Type.Optional(Type.String({ default: "en-US" })),
  sort_by:                Type.Optional(Type.String()),
  with_genres:            Type.Optional(Type.String()),
  "first_air_date.gte":   Type.Optional(Type.String()),
  "first_air_date.lte":   Type.Optional(Type.String()),
  "vote_average.gte":     Type.Optional(Type.Number()),
  "vote_average.lte":     Type.Optional(Type.Number()),
  with_original_language: Type.Optional(Type.String()),
});

const IdParam = Type.Object({
  id: Type.Number({ minimum: 1 }),
});

const tmdbRateLimit = { max: 30, timeWindow: "1 minute" };

const MOVIE_TAG = ["TMDB — Movies"];
const TV_TAG    = ["TMDB — TV Series"];
const SHARED_TAG = ["TMDB — Shared"];

function pickParams(
  query: Record<string, unknown>,
  ...keys: string[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (query[k] !== undefined) out[k] = query[k];
  }
  return out;
}

const tmdbRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const tmdb = createTmdbService(fastify.config.TMDB_KEY);

  function handleTmdbError(error: unknown, reply: FastifyReply) {
    const err = error as { statusCode?: number; message?: string };
    const status = err.statusCode ?? 500;

    const code = status === 404 ? 404 : status >= 400 && status < 500 ? 400 : 502;
    return reply.code(code).send({
      error:   err.message ?? "TMDB request failed",
      details: `TMDB responded with status ${status}`,
    });
  }

  fastify.get("/tmdb/showcase", {
    schema: {
      description: "Public endpoint — returns trending movies for the login/signup page showcase. No authentication required.",
      tags: ["TMDB — Public"],
      querystring: Type.Object({
        language: Type.Optional(Type.String({ default: "en-US" })),
      }),
      response: { 200: Type.Any(), 502: ErrorBody },
    },
    config: { rateLimit: { max: 60, timeWindow: "1 minute" } },

  }, async (request, reply) => {
    try {
      const data = await tmdb.movies.trending(request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/movies/popular", {
    schema: {
      description: "Get a list of movies ordered by popularity.",
      tags: MOVIE_TAG,
      security: [{ cookieAuth: [] }],
      querystring: PageQuery,
      response: { 200: Type.Any(), 401: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const data = await tmdb.movies.popular(request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/movies/top-rated", {
    schema: {
      description: "Get a list of movies ordered by rating.",
      tags: MOVIE_TAG,
      security: [{ cookieAuth: [] }],
      querystring: PageQuery,
      response: { 200: Type.Any(), 401: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const data = await tmdb.movies.topRated(request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/movies/now-playing", {
    schema: {
      description: "Get a list of movies currently in theatres.",
      tags: MOVIE_TAG,
      security: [{ cookieAuth: [] }],
      querystring: PageQuery,
      response: { 200: Type.Any(), 401: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const data = await tmdb.movies.nowPlaying(request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/movies/upcoming", {
    schema: {
      description: "Get a list of movies that are being released soon.",
      tags: MOVIE_TAG,
      security: [{ cookieAuth: [] }],
      querystring: PageQuery,
      response: { 200: Type.Any(), 401: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const data = await tmdb.movies.upcoming(request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/movies/trending", {
    schema: {
      description: "Get the weekly trending movies.",
      tags: MOVIE_TAG,
      security: [{ cookieAuth: [] }],
      querystring: PageQuery,
      response: { 200: Type.Any(), 401: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const data = await tmdb.movies.trending(request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/movies/discover", {
    schema: {
      description: "Discover movies by different types of data like average rating, number of votes, genres and certifications.",
      tags: MOVIE_TAG,
      security: [{ cookieAuth: [] }],
      querystring: DiscoverMovieQuery,
      response: { 200: Type.Any(), 401: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const data = await tmdb.movies.discover(request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/movies/search", {
    schema: {
      description: "Search for movies by title.",
      tags: MOVIE_TAG,
      security: [{ cookieAuth: [] }],
      querystring: SearchQuery,
      response: { 200: Type.Any(), 400: ErrorBody, 401: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const q = request.query as { query: string; page?: number; language?: string };
      const data = await tmdb.movies.search(
        pickParams(q as Record<string, unknown>, "query", "page", "language"),
      );
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/movies/:id", {
    schema: {
      description: "Get the primary information about a movie.",
      tags: MOVIE_TAG,
      security: [{ cookieAuth: [] }],
      params: IdParam,
      response: { 200: Type.Any(), 401: ErrorBody, 404: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: number };
      const data = await tmdb.movies.detail(id);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/movies/:id/videos", {
    schema: {
      description: "Get the videos (trailers, teasers, etc.) for a movie.",
      tags: MOVIE_TAG,
      security: [{ cookieAuth: [] }],
      params: IdParam,
      response: { 200: Type.Any(), 401: ErrorBody, 404: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: number };
      const data = await tmdb.movies.videos(id);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/movies/:id/credits", {
    schema: {
      description: "Get the cast and crew for a movie.",
      tags: MOVIE_TAG,
      security: [{ cookieAuth: [] }],
      params: IdParam,
      response: { 200: Type.Any(), 401: ErrorBody, 404: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: number };
      const data = await tmdb.movies.credits(id);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/movies/:id/similar", {
    schema: {
      description: "Get a list of similar movies.",
      tags: MOVIE_TAG,
      security: [{ cookieAuth: [] }],
      params: IdParam,
      querystring: PageQuery,
      response: { 200: Type.Any(), 401: ErrorBody, 404: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: number };
      const data = await tmdb.movies.similar(id, request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/movies/:id/recommendations", {
    schema: {
      description: "Get a list of recommended movies for a movie.",
      tags: MOVIE_TAG,
      security: [{ cookieAuth: [] }],
      params: IdParam,
      querystring: PageQuery,
      response: { 200: Type.Any(), 401: ErrorBody, 404: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: number };
      const data = await tmdb.movies.recommendations(id, request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/tv/popular", {
    schema: {
      description: "Get a list of TV series ordered by popularity.",
      tags: TV_TAG,
      security: [{ cookieAuth: [] }],
      querystring: PageQuery,
      response: { 200: Type.Any(), 401: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const data = await tmdb.tv.popular(request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/tv/top-rated", {
    schema: {
      description: "Get a list of TV series ordered by rating.",
      tags: TV_TAG,
      security: [{ cookieAuth: [] }],
      querystring: PageQuery,
      response: { 200: Type.Any(), 401: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const data = await tmdb.tv.topRated(request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/tv/on-the-air", {
    schema: {
      description: "Get a list of TV series that air in the next 7 days.",
      tags: TV_TAG,
      security: [{ cookieAuth: [] }],
      querystring: PageQuery,
      response: { 200: Type.Any(), 401: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const data = await tmdb.tv.onTheAir(request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/tv/airing-today", {
    schema: {
      description: "Get a list of TV series that are airing today.",
      tags: TV_TAG,
      security: [{ cookieAuth: [] }],
      querystring: PageQuery,
      response: { 200: Type.Any(), 401: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const data = await tmdb.tv.airingToday(request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/tv/trending", {
    schema: {
      description: "Get the weekly trending TV series.",
      tags: TV_TAG,
      security: [{ cookieAuth: [] }],
      querystring: PageQuery,
      response: { 200: Type.Any(), 401: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const data = await tmdb.tv.trending(request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/tv/discover", {
    schema: {
      description: "Discover TV series by different types of data.",
      tags: TV_TAG,
      security: [{ cookieAuth: [] }],
      querystring: DiscoverTvQuery,
      response: { 200: Type.Any(), 401: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const data = await tmdb.tv.discover(request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/tv/search", {
    schema: {
      description: "Search for TV series by name.",
      tags: TV_TAG,
      security: [{ cookieAuth: [] }],
      querystring: SearchQuery,
      response: { 200: Type.Any(), 400: ErrorBody, 401: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const q = request.query as { query: string; page?: number; language?: string };
      const data = await tmdb.tv.search(
        pickParams(q as Record<string, unknown>, "query", "page", "language"),
      );
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/tv/:id", {
    schema: {
      description: "Get the primary information about a TV series.",
      tags: TV_TAG,
      security: [{ cookieAuth: [] }],
      params: IdParam,
      response: { 200: Type.Any(), 401: ErrorBody, 404: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: number };
      const data = await tmdb.tv.detail(id);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/tv/:id/videos", {
    schema: {
      description: "Get the videos (trailers, teasers, etc.) for a TV series.",
      tags: TV_TAG,
      security: [{ cookieAuth: [] }],
      params: IdParam,
      response: { 200: Type.Any(), 401: ErrorBody, 404: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: number };
      const data = await tmdb.tv.videos(id);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/tv/:id/credits", {
    schema: {
      description: "Get the cast and crew for a TV series.",
      tags: TV_TAG,
      security: [{ cookieAuth: [] }],
      params: IdParam,
      response: { 200: Type.Any(), 401: ErrorBody, 404: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: number };
      const data = await tmdb.tv.credits(id);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/tv/:id/similar", {
    schema: {
      description: "Get a list of similar TV series.",
      tags: TV_TAG,
      security: [{ cookieAuth: [] }],
      params: IdParam,
      querystring: PageQuery,
      response: { 200: Type.Any(), 401: ErrorBody, 404: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: number };
      const data = await tmdb.tv.similar(id, request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/tv/:id/recommendations", {
    schema: {
      description: "Get a list of recommended TV series.",
      tags: TV_TAG,
      security: [{ cookieAuth: [] }],
      params: IdParam,
      querystring: PageQuery,
      response: { 200: Type.Any(), 401: ErrorBody, 404: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: number };
      const data = await tmdb.tv.recommendations(id, request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/search", {
    schema: {
      description: "Search across movies, TV series, and people in a single request.",
      tags: SHARED_TAG,
      security: [{ cookieAuth: [] }],
      querystring: SearchQuery,
      response: { 200: Type.Any(), 400: ErrorBody, 401: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const q = request.query as { query: string; page?: number; language?: string };
      const data = await tmdb.shared.searchMulti(
        pickParams(q as Record<string, unknown>, "query", "page", "language"),
      );
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/genres/movie", {
    schema: {
      description: "Get the list of official movie genres.",
      tags: SHARED_TAG,
      security: [{ cookieAuth: [] }],
      querystring: Type.Object({
        language: Type.Optional(Type.String({ default: "en-US" })),
      }),
      response: { 200: Type.Any(), 401: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const data = await tmdb.shared.genresMovie(request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get("/tmdb/genres/tv", {
    schema: {
      description: "Get the list of official TV series genres.",
      tags: SHARED_TAG,
      security: [{ cookieAuth: [] }],
      querystring: Type.Object({
        language: Type.Optional(Type.String({ default: "en-US" })),
      }),
      response: { 200: Type.Any(), 401: ErrorBody, 502: ErrorBody },
    },
    config:     { rateLimit: tmdbRateLimit },
    preHandler: [requireAuth],
  }, async (request, reply) => {
    try {
      const data = await tmdb.shared.genresTv(request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });
};

export default tmdbRoutes;
