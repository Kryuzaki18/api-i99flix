

import { type FastifyInstance, type FastifyPluginAsync, type FastifyReply } from "fastify";
import { Type } from "@sinclair/typebox";

import { requireAuth }       from "../hooks/auth.hook.js";
import { createTmdbService } from "../services/tmdb.service.js";
import { ErrorBody }         from "../schemas/shared.schema.js";

import { ROUTES } from "../config/app-routes.js";

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

const tmdbRateLimit = { max: 50, timeWindow: "1 minute" };

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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type TmdbListResponse = { results: Record<string, unknown>[]; [k: string]: unknown };

function filterFutureMovies(data: TmdbListResponse): TmdbListResponse {
  const t = todayIso();
  return { ...data, results: data.results.filter((m) => m["release_date"] && (m["release_date"] as string) <= t) };
}

function filterFutureTv(data: TmdbListResponse): TmdbListResponse {
  const t = todayIso();
  return { ...data, results: data.results.filter((m) => m["first_air_date"] && (m["first_air_date"] as string) <= t) };
}

function filterFutureMulti(data: TmdbListResponse): TmdbListResponse {
  const t = todayIso();
  return {
    ...data,
    results: data.results.filter((m) => {
      if (m["media_type"] === "movie") return m["release_date"] && (m["release_date"] as string) <= t;
      if (m["media_type"] === "tv")    return m["first_air_date"] && (m["first_air_date"] as string) <= t;
      return true;
    }),
  };
}

function capDateLte(query: Record<string, unknown>, field: string): Record<string, unknown> {
  const t = todayIso();
  const clientLte = query[field] as string | undefined;
  return { ...query, [field]: clientLte && clientLte < t ? clientLte : t };
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

  fastify.get(ROUTES.TMDB_SHOWCASE, {
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
      const data = await tmdb.movies.trending(request.query as Record<string, unknown>) as TmdbListResponse;
      return reply.send(filterFutureMovies(data));
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_MOVIES_POPULAR, {
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
      const data = await tmdb.movies.popular(request.query as Record<string, unknown>) as TmdbListResponse;
      return reply.send(filterFutureMovies(data));
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_MOVIES_TOP_RATED, {
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
      const data = await tmdb.movies.topRated(request.query as Record<string, unknown>) as TmdbListResponse;
      return reply.send(filterFutureMovies(data));
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_MOVIES_NOW_PLAYING, {
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
      const data = await tmdb.movies.nowPlaying(request.query as Record<string, unknown>) as TmdbListResponse;
      return reply.send(filterFutureMovies(data));
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_MOVIES_UPCOMING, {
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
      const data = await tmdb.movies.upcoming(request.query as Record<string, unknown>) as TmdbListResponse;
      return reply.send(filterFutureMovies(data));
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_MOVIES_TRENDING, {
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
      const data = await tmdb.movies.trending(request.query as Record<string, unknown>) as TmdbListResponse;
      return reply.send(filterFutureMovies(data));
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_MOVIES_DISCOVER, {
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
      const params = capDateLte(request.query as Record<string, unknown>, "primary_release_date.lte");
      const data = await tmdb.movies.discover(params);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_MOVIES_SEARCH, {
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
      ) as TmdbListResponse;
      return reply.send(filterFutureMovies(data));
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_MOVIE_BY_ID, {
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
      const data = await tmdb.movies.detail(id) as Record<string, unknown>;
      const releaseDate = data["release_date"] as string | undefined;
      if (!releaseDate || releaseDate > todayIso()) {
        return reply.code(404).send({ error: "Movie not found" });
      }
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_MOVIE_VIDEOS, {
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

  fastify.get(ROUTES.TMDB_MOVIE_CREDITS, {
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

  fastify.get(ROUTES.TMDB_MOVIE_SIMILAR, {
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
      const data = await tmdb.movies.similar(id, request.query as Record<string, unknown>) as TmdbListResponse;
      return reply.send(filterFutureMovies(data));
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_MOVIE_RECOMMENDATIONS, {
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
      const data = await tmdb.movies.recommendations(id, request.query as Record<string, unknown>) as TmdbListResponse;
      return reply.send(filterFutureMovies(data));
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_TV_POPULAR, {
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
      const data = await tmdb.tv.popular(request.query as Record<string, unknown>) as TmdbListResponse;
      return reply.send(filterFutureTv(data));
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_TV_TOP_RATED, {
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
      const data = await tmdb.tv.topRated(request.query as Record<string, unknown>) as TmdbListResponse;
      return reply.send(filterFutureTv(data));
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_TV_ON_THE_AIR, {
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
      const data = await tmdb.tv.onTheAir(request.query as Record<string, unknown>) as TmdbListResponse;
      return reply.send(filterFutureTv(data));
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_TV_AIRING_TODAY, {
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
      const data = await tmdb.tv.airingToday(request.query as Record<string, unknown>) as TmdbListResponse;
      return reply.send(filterFutureTv(data));
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_TV_TRENDING, {
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
      const data = await tmdb.tv.trending(request.query as Record<string, unknown>) as TmdbListResponse;
      return reply.send(filterFutureTv(data));
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_TV_DISCOVER, {
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
      const params = capDateLte(request.query as Record<string, unknown>, "first_air_date.lte");
      const data = await tmdb.tv.discover(params);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_TV_SEARCH, {
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
      ) as TmdbListResponse;
      return reply.send(filterFutureTv(data));
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_TV_BY_ID, {
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
      const data = await tmdb.tv.detail(id) as Record<string, unknown>;
      const firstAirDate = data["first_air_date"] as string | undefined;
      if (!firstAirDate || firstAirDate > todayIso()) {
        return reply.code(404).send({ error: "TV series not found" });
      }
      const seasons = data["seasons"] as { episode_count: number }[] | undefined;
      if (Array.isArray(seasons)) {
        data["seasons"] = seasons.filter((s) => s.episode_count > 0);
      }
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_TV_VIDEOS, {
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

  fastify.get(ROUTES.TMDB_TV_CREDITS, {
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

  fastify.get(ROUTES.TMDB_TV_SIMILAR, {
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
      const data = await tmdb.tv.similar(id, request.query as Record<string, unknown>) as TmdbListResponse;
      return reply.send(filterFutureTv(data));
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_TV_RECOMMENDATIONS, {
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
      const data = await tmdb.tv.recommendations(id, request.query as Record<string, unknown>) as TmdbListResponse;
      return reply.send(filterFutureTv(data));
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_SEARCH_MULTI, {
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
      ) as TmdbListResponse;
      return reply.send(filterFutureMulti(data));
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_GENRES_MOVIE, {
    schema: {
      description: "Get the list of official movie genres.",
      tags: SHARED_TAG,
      querystring: Type.Object({
        language: Type.Optional(Type.String({ default: "en-US" })),
      }),
      response: { 200: Type.Any(), 502: ErrorBody },
    },
    config: { rateLimit: tmdbRateLimit },
  }, async (request, reply) => {
    try {
      const data = await tmdb.shared.genresMovie(request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });

  fastify.get(ROUTES.TMDB_GENRES_TV, {
    schema: {
      description: "Get the list of official TV series genres.",
      tags: SHARED_TAG,
      querystring: Type.Object({
        language: Type.Optional(Type.String({ default: "en-US" })),
      }),
      response: { 200: Type.Any(), 502: ErrorBody },
    },
    config: { rateLimit: tmdbRateLimit },
  }, async (request, reply) => {
    try {
      const data = await tmdb.shared.genresTv(request.query as Record<string, unknown>);
      return reply.send(data);
    } catch (e) { return handleTmdbError(e, reply); }
  });
};

export default tmdbRoutes;
