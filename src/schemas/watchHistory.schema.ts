import mongoose, { Schema, Document } from "mongoose";

export interface IWatchEpisode {
  _id:       mongoose.Types.ObjectId;
  season:    number;
  episode:   number;
  watchedAt: Date;
}

export interface IWatchEntry extends Document {
  userId:    mongoose.Types.ObjectId;
  movieId:   string;
  title:     string;
  mediaType: "movie" | "tv";
  thumbnail: string;
  episodes:  IWatchEpisode[];
  watchedAt: Date;
}

const WatchEpisodeSchema = new Schema<IWatchEpisode>({
  season:    { type: Number, required: true },
  episode:   { type: Number, required: true },
  watchedAt: { type: Date, default: Date.now },
});

const WatchHistorySchema: Schema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: "Users", required: true },
  movieId:   { type: String, required: true },
  title:     { type: String, required: true },
  mediaType: { type: String, enum: ["movie", "tv"], required: true },
  thumbnail: { type: String, default: "" },
  episodes:  { type: [WatchEpisodeSchema], default: [] },
  watchedAt: { type: Date, default: Date.now },
});

WatchHistorySchema.index({ userId: 1, movieId: 1 }, { unique: true });

export default mongoose.model<IWatchEntry>("WatchHistory", WatchHistorySchema);
