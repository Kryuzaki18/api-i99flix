import { type FastifyInstance, type FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";

import { ROUTES } from "../config/app-routes.js";
import { ErrorBody } from "../schemas/shared.schema.js";
import User from "../schemas/users.schema.js";
import WatchHistory from "../schemas/watchHistory.schema.js";

const WatchEpisodeSchema = Type.Object({
  _id:       Type.String(),
  season:    Type.Number(),
  episode:   Type.Number(),
  watchedAt: Type.String(),
});

const WatchEntrySchema = Type.Object({
  movieId:   Type.String(),
  title:     Type.String(),
  mediaType: Type.Union([Type.Literal("movie"), Type.Literal("tv")]),
  thumbnail: Type.String(),
  episodes:  Type.Array(WatchEpisodeSchema),
  watchedAt: Type.String(),
});

const GetWatchHistorySchema = {
  description: "Returns the authenticated user's watch history, most recent first.",
  tags: ["Watch History"],
  security: [{ cookieAuth: [] }],
  response: {
    200: Type.Object({ history: Type.Array(WatchEntrySchema) }),
    401: Type.Object({ error: Type.String() }),
  },
};

const RecordWatchSchema = {
  description:
    "Records or updates a watch entry. For TV series, season and episode are required; " +
    "each unique episode is tracked in the episodes array with its own watchedAt timestamp.",
  tags: ["Watch History"],
  security: [{ cookieAuth: [] }],
  body: Type.Object({
    movieId:   Type.String({ minLength: 1 }),
    title:     Type.String({ minLength: 1 }),
    mediaType: Type.Union([Type.Literal("movie"), Type.Literal("tv")]),
    thumbnail: Type.Optional(Type.String()),
    season:    Type.Optional(Type.Number({ minimum: 1 })),
    episode:   Type.Optional(Type.Number({ minimum: 1 })),
  }),
  response: {
    200: Type.Object({ entry: WatchEntrySchema }),
    400: ErrorBody,
    401: Type.Object({ error: Type.String() }),
  },
};

function serializeEntry(e: {
  movieId:   string;
  title:     string;
  mediaType: "movie" | "tv";
  thumbnail: string;
  episodes:  { _id: unknown; season: number; episode: number; watchedAt: Date }[];
  watchedAt: Date;
}) {
  return {
    movieId:   e.movieId,
    title:     e.title,
    mediaType: e.mediaType,
    thumbnail: e.thumbnail,
    episodes:  e.episodes.map((ep) => ({
      _id:       String(ep._id),
      season:    ep.season,
      episode:   ep.episode,
      watchedAt: ep.watchedAt.toISOString(),
    })),
    watchedAt: e.watchedAt.toISOString(),
  };
}

const watchRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {

  fastify.get(
    ROUTES.WATCH,
    { schema: GetWatchHistorySchema },
    async (request, reply) => {
      try {
        await request.jwtVerify();
        const { email } = request.user;

        const user = await User.findOne({ email }).select("_id").lean();
        if (!user) return reply.code(401).send({ error: "Unauthorized" });

        const entries = await WatchHistory.find({ userId: user._id })
          .sort({ watchedAt: -1 })
          .lean();

        return reply.code(200).send({ history: entries.map(serializeEntry) });
      } catch (err) {
        if ((err as { statusCode?: number }).statusCode === 401) {
          return reply.code(401).send({ error: "Unauthorized" });
        }
        fastify.log.error(err, "watch GET error");
        return reply.code(500).send({ error: "Failed to fetch watch history" });
      }
    },
  );

  fastify.post(
    ROUTES.WATCH,
    { schema: RecordWatchSchema },
    async (request, reply) => {
      try {
        await request.jwtVerify();
        const { email } = request.user;

        const user = await User.findOne({ email }).select("_id").lean();
        if (!user) return reply.code(401).send({ error: "Unauthorized" });

        const body = request.body as {
          movieId:   string;
          title:     string;
          mediaType: "movie" | "tv";
          thumbnail?: string;
          season?:   number;
          episode?:  number;
        };

        if (body.mediaType === "tv" && (!body.season || !body.episode)) {
          return reply.code(400).send({
            error:   "season and episode are required for TV series",
            details: undefined,
          });
        }

        const now       = new Date();
        const thumbnail = body.thumbnail ?? "";
        let entry: Awaited<ReturnType<typeof WatchHistory.findOneAndUpdate>>;

        const baseSet = {
          title:     body.title,
          mediaType: body.mediaType,
          thumbnail,
          watchedAt: now,
        };

        if (body.mediaType === "tv") {
          // Try to update watchedAt on an existing episode entry
          entry = await WatchHistory.findOneAndUpdate(
            {
              userId:             user._id,
              movieId:            body.movieId,
              "episodes.season":  body.season,
              "episodes.episode": body.episode,
            },
            {
              $set: {
                ...baseSet,
                "episodes.$.watchedAt": now,
              },
            },
            { new: true },
          );

          // Episode not yet in array (or document doesn't exist) — push it
          if (!entry) {
            entry = await WatchHistory.findOneAndUpdate(
              { userId: user._id, movieId: body.movieId },
              {
                $set:  baseSet,
                $push: { episodes: { season: body.season, episode: body.episode, watchedAt: now } },
              },
              { upsert: true, new: true },
            );
          }
        } else {
          // Movie — just upsert the document, no episode tracking
          entry = await WatchHistory.findOneAndUpdate(
            { userId: user._id, movieId: body.movieId },
            { $set: baseSet },
            { upsert: true, new: true },
          );
        }

        return reply.code(200).send({ entry: serializeEntry(entry!.toObject()) });
      } catch (err) {
        fastify.log.error(err, "watch POST error");
        return reply.code(500).send({ error: "Failed to record watch history" });
      }
    },
  );
};

export default watchRoutes;
