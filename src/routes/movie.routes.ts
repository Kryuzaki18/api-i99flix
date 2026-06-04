import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { ROUTES } from "../config/app-routes.js";
import { ErrorBody } from "../schemas/shared.schema.js";
import Movie from "../schemas/movie.schema.js";
import { requireAuth } from "../hooks/auth.hook.js";
import { parsePagination, paginate } from "../utils/pagination.js";

const MovieBody = Type.Object({
  title:         Type.String({ minLength: 1, maxLength: 200 }),
  originalTitle: Type.Optional(Type.String({ maxLength: 200 })),
  description:   Type.String({ minLength: 1, maxLength: 2000 }),
  genre:         Type.Array(Type.String(), { minItems: 1 }),
  rating:        Type.Optional(Type.Number({ minimum: 0, maximum: 10 })),
  year:          Type.Number({ minimum: 1888 }),
  duration:      Type.Optional(Type.String()),
  thumbnail:     Type.Optional(Type.String()),
  backdrop:      Type.Optional(Type.String()),
  featured:      Type.Optional(Type.Boolean()),
  trending:      Type.Optional(Type.Boolean()),
  newRelease:    Type.Optional(Type.Boolean()),
});

const MovieResponse = Type.Object({
  _id:           Type.String(),
  title:         Type.String(),
  originalTitle: Type.Optional(Type.String()),
  description:   Type.String(),
  genre:         Type.Array(Type.String()),
  rating:        Type.Number(),
  year:          Type.Number(),
  duration:      Type.String(),
  thumbnail:     Type.String(),
  backdrop:      Type.String(),
  featured:      Type.Boolean(),
  trending:      Type.Boolean(),
  newRelease:    Type.Boolean(),
  createdAt:     Type.String(),
  updatedAt:     Type.String(),
});

const PaginatedMoviesResponse = Type.Object({
  data: Type.Array(MovieResponse),
  total: Type.Number(),
  page: Type.Number(),
  limit: Type.Number(),
  totalPages: Type.Number(),
});

const ListMoviesSchema = {
  description: "List movies with optional filters and pagination.",
  tags: ["Movies"],
  querystring: Type.Object({
    page: Type.Optional(Type.Number({ minimum: 1, default: 1 })),
    limit: Type.Optional(
      Type.Number({ minimum: 1, maximum: 100, default: 20 }),
    ),
    genre: Type.Optional(Type.String()),
    year: Type.Optional(Type.Number()),
    search: Type.Optional(Type.String({ maxLength: 100 })),
    featured: Type.Optional(Type.Boolean()),
    trending: Type.Optional(Type.Boolean()),
    newRelease: Type.Optional(Type.Boolean()),
    sortBy: Type.Optional(Type.String({ default: "createdAt" })),
    order: Type.Optional(
      Type.Union([Type.Literal("asc"), Type.Literal("desc")], {
        default: "desc",
      }),
    ),
  }),
  response: {
    200: PaginatedMoviesResponse,
    500: ErrorBody,
  },
};

const GetMovieSchema = {
  description: "Get a single movie by ID.",
  tags: ["Movies"],
  params: Type.Object({ id: Type.String() }),
  response: {
    200: MovieResponse,
    404: ErrorBody,
    500: ErrorBody,
  },
};

const CreateMovieSchema = {
  description: "Create a new movie. Requires authentication.",
  tags: ["Movies"],
  security: [{ cookieAuth: [] }],
  body: MovieBody,
  response: {
    201: MovieResponse,
    400: ErrorBody,
    401: ErrorBody,
    500: ErrorBody,
  },
};

const UpdateMovieSchema = {
  description: "Update an existing movie. Requires authentication.",
  tags: ["Movies"],
  security: [{ cookieAuth: [] }],
  params: Type.Object({ id: Type.String() }),
  body: MovieBody,
  response: {
    200: MovieResponse,
    400: ErrorBody,
    401: ErrorBody,
    404: ErrorBody,
    500: ErrorBody,
  },
};

const DeleteMovieSchema = {
  description: "Delete a movie. Requires authentication.",
  tags: ["Movies"],
  security: [{ cookieAuth: [] }],
  params: Type.Object({ id: Type.String() }),
  response: {
    200: Type.Object({ message: Type.String() }),
    401: ErrorBody,
    404: ErrorBody,
    500: ErrorBody,
  },
};

const movieRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get(
    ROUTES.MOVIES,
    { schema: ListMoviesSchema },
    async (request, reply) => {
      try {
        const q = request.query as {
          page?: number;
          limit?: number;
          genre?: string;
          year?: number;
          search?: string;
          featured?: boolean;
          trending?: boolean;
          newRelease?: boolean;
          sortBy?: string;
          order?: "asc" | "desc";
        };

        const { page, limit } = parsePagination(q.page, q.limit);

        const filter: Record<string, unknown> = {};

        if (q.genre) filter["genre"] = q.genre;
        if (q.year) filter["year"] = Number(q.year);
        if (q.featured !== undefined) filter["featured"] = q.featured;
        if (q.trending !== undefined) filter["trending"] = q.trending;
        if (q.newRelease !== undefined) filter["newRelease"] = q.newRelease;

        if (q.search) {
          const safe = q.search.trim().slice(0, 100);
          filter["$text"] = { $search: safe };
        }

        const ALLOWED_SORT = new Set([
          "title",
          "rating",
          "year",
          "createdAt",
          "updatedAt",
        ]);
        const sortField = ALLOWED_SORT.has(q.sortBy ?? "")
          ? q.sortBy!
          : "createdAt";
        const sortOrder = q.order === "asc" ? 1 : -1;

        const [movies, total] = await Promise.all([
          Movie.find(filter)
            .sort({ [sortField]: sortOrder })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
          Movie.countDocuments(filter),
        ]);

        return reply.code(200).send(paginate(movies, total, { page, limit }));
      } catch (error: any) {
        request.log.error(error);
        return reply
          .code(500)
          .send({ error: "Failed to fetch movies", details: error.message });
      }
    },
  );

  fastify.get(
    ROUTES.MOVIE_BY_ID,
    { schema: GetMovieSchema },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const movie = await Movie.findById(id).lean();

        if (!movie) {
          return reply.code(404).send({ error: "Movie not found" });
        }

        return reply.code(200).send(movie);
      } catch (error: any) {
        if (error.name === "CastError") {
          return reply.code(404).send({ error: "Movie not found" });
        }
        request.log.error(error);
        return reply
          .code(500)
          .send({ error: "Failed to fetch movie", details: error.message });
      }
    },
  );

  fastify.post(
    ROUTES.MOVIES,
    { schema: CreateMovieSchema, preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const body = request.body as {
          title: string;
          description: string;
          genre: string[];
          rating?: number;
          year: number;
          duration?: string;
          thumbnail?: string;
          backdrop?: string;
          featured?: boolean;
          trending?: boolean;
          newRelease?: boolean;
        };

        const movie = await Movie.create(body);
        return reply.code(201).send(movie.toObject());
      } catch (error: any) {
        if (error.name === "ValidationError") {
          return reply
            .code(400)
            .send({ error: "Validation failed", details: error.errors });
        }
        request.log.error(error);
        return reply
          .code(500)
          .send({ error: "Failed to create movie", details: error.message });
      }
    },
  );

  fastify.put(
    ROUTES.MOVIE_BY_ID,
    { schema: UpdateMovieSchema, preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = request.body as Record<string, unknown>;

        const movie = await Movie.findByIdAndUpdate(
          id,
          { $set: body },
          { new: true, runValidators: true },
        ).lean();

        if (!movie) {
          return reply.code(404).send({ error: "Movie not found" });
        }

        return reply.code(200).send(movie);
      } catch (error: any) {
        if (error.name === "CastError") {
          return reply.code(404).send({ error: "Movie not found" });
        }
        if (error.name === "ValidationError") {
          return reply
            .code(400)
            .send({ error: "Validation failed", details: error.errors });
        }
        request.log.error(error);
        return reply
          .code(500)
          .send({ error: "Failed to update movie", details: error.message });
      }
    },
  );

  fastify.delete(
    ROUTES.MOVIE_BY_ID,
    { schema: DeleteMovieSchema, preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const movie = await Movie.findByIdAndDelete(id).lean();

        if (!movie) {
          return reply.code(404).send({ error: "Movie not found" });
        }

        return reply.code(200).send({ message: "Movie deleted successfully" });
      } catch (error: any) {
        if (error.name === "CastError") {
          return reply.code(404).send({ error: "Movie not found" });
        }
        request.log.error(error);
        return reply
          .code(500)
          .send({ error: "Failed to delete movie", details: error.message });
      }
    },
  );
};

export default movieRoutes;
