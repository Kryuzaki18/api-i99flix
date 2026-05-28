import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { ROUTES } from "../config/app-routes.js";
import { ErrorBody } from "../schemas/shared.schema.js";
import User from "../schemas/users.schema.js";

const WatchlistItemSchema = Type.Object({
  movieId:     Type.String(),
  title:       Type.String(),
  description: Type.String(),
  genre:       Type.Array(Type.String()),
  rating:      Type.Number(),
  year:        Type.Number(),
  duration:    Type.String(),
  thumbnail:   Type.String(),
  backdrop:    Type.String(),
  mediaType:   Type.Optional(Type.Union([Type.Literal("movie"), Type.Literal("tv")])),
  addedAt:     Type.String(),
});

const GetWatchlistSchema = {
  description: "Returns the authenticated user's watchlist.",
  tags: ["Watchlist"],
  security: [{ cookieAuth: [] }],
  response: {
    200: Type.Object({ watchlist: Type.Array(WatchlistItemSchema) }),
    401: Type.Object({ error: Type.String() }),
  },
};

const AddWatchlistSchema = {
  description: "Adds a movie to the authenticated user's watchlist.",
  tags: ["Watchlist"],
  security: [{ cookieAuth: [] }],
  body: Type.Object({
    movieId:     Type.String({ minLength: 1 }),
    title:       Type.String({ minLength: 1 }),
    description: Type.Optional(Type.String()),
    genre:       Type.Optional(Type.Array(Type.String())),
    rating:      Type.Optional(Type.Number()),
    year:        Type.Optional(Type.Number()),
    duration:    Type.Optional(Type.String()),
    thumbnail:   Type.Optional(Type.String()),
    backdrop:    Type.Optional(Type.String()),
    mediaType:   Type.Optional(Type.Union([Type.Literal("movie"), Type.Literal("tv")])),
  }),
  response: {
    200: Type.Object({ watchlist: Type.Array(WatchlistItemSchema) }),
    400: ErrorBody,
    401: Type.Object({ error: Type.String() }),
    409: Type.Object({ error: Type.String() }),
  },
};

const RemoveWatchlistSchema = {
  description: "Removes a movie from the authenticated user's watchlist.",
  tags: ["Watchlist"],
  security: [{ cookieAuth: [] }],
  params: Type.Object({
    movieId: Type.String({ minLength: 1 }),
  }),
  response: {
    200: Type.Object({ watchlist: Type.Array(WatchlistItemSchema) }),
    401: Type.Object({ error: Type.String() }),
    404: Type.Object({ error: Type.String() }),
  },
};

const watchlistRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {

  fastify.get(
    ROUTES.WATCHLIST,
    { schema: GetWatchlistSchema },
    async (request, reply) => {
      try {
        await request.jwtVerify();
        const { email } = request.user;

        const user = await User.findOne({ email }).select("watchlist").lean();
        if (!user) return reply.code(401).send({ error: "Unauthorized" });

        const watchlist = (user.watchlist ?? []).map((item) => ({
          ...item,
          addedAt: (item.addedAt as Date).toISOString(),
        }));

        return reply.code(200).send({ watchlist });
      } catch {
        return reply.code(401).send({ error: "Unauthorized" });
      }
    },
  );

  fastify.post(
    ROUTES.WATCHLIST,
    { schema: AddWatchlistSchema },
    async (request, reply) => {
      try {
        await request.jwtVerify();
        const { email } = request.user;

        const body = request.body as {
          movieId: string;
          title: string;
          description?: string;
          genre?: string[];
          rating?: number;
          year?: number;
          duration?: string;
          thumbnail?: string;
          backdrop?: string;
          mediaType?: "movie" | "tv";
        };

        const user = await User.findOne({ email });
        if (!user) return reply.code(401).send({ error: "Unauthorized" });

        const alreadyAdded = user.watchlist.some((w) => w.movieId === body.movieId);
        if (alreadyAdded) {
          return reply.code(409).send({ error: "Movie already in watchlist" });
        }

        user.watchlist.push({
          movieId:     body.movieId,
          title:       body.title,
          description: body.description ?? "",
          genre:       body.genre ?? [],
          rating:      body.rating ?? 0,
          year:        body.year ?? 0,
          duration:    body.duration ?? "",
          thumbnail:   body.thumbnail ?? "",
          backdrop:    body.backdrop ?? "",
          mediaType:   body.mediaType,
          addedAt:     new Date(),
        });

        await user.save();

        const watchlist = user.watchlist.map((item) => ({
          movieId:     item.movieId,
          title:       item.title,
          description: item.description,
          genre:       item.genre,
          rating:      item.rating,
          year:        item.year,
          duration:    item.duration,
          thumbnail:   item.thumbnail,
          backdrop:    item.backdrop,
          mediaType:   item.mediaType,
          addedAt:     item.addedAt.toISOString(),
        }));

        return reply.code(200).send({ watchlist });
      } catch {
        return reply.code(401).send({ error: "Unauthorized" });
      }
    },
  );

  fastify.delete(
    ROUTES.WATCHLIST_ITEM,
    { schema: RemoveWatchlistSchema },
    async (request, reply) => {
      try {
        await request.jwtVerify();
        const { email } = request.user;
        const { movieId } = request.params as { movieId: string };

        const user = await User.findOne({ email });
        if (!user) return reply.code(401).send({ error: "Unauthorized" });

        const index = user.watchlist.findIndex((w) => w.movieId === movieId);
        if (index === -1) {
          return reply.code(404).send({ error: "Movie not found in watchlist" });
        }

        user.watchlist.splice(index, 1);
        await user.save();

        const watchlist = user.watchlist.map((item) => ({
          movieId:     item.movieId,
          title:       item.title,
          description: item.description,
          genre:       item.genre,
          rating:      item.rating,
          year:        item.year,
          duration:    item.duration,
          thumbnail:   item.thumbnail,
          backdrop:    item.backdrop,
          mediaType:   item.mediaType,
          addedAt:     item.addedAt.toISOString(),
        }));

        return reply.code(200).send({ watchlist });
      } catch {
        return reply.code(401).send({ error: "Unauthorized" });
      }
    },
  );
};

export default watchlistRoutes;
