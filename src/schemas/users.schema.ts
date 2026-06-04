import mongoose, { Schema, Document } from "mongoose";

export interface IWatchlistItem {
  movieId: string;
  title: string;
  description: string;
  genre: string[];
  rating: number;
  year: number;
  releaseDate?: string;
  duration: string;
  thumbnail: string;
  backdrop: string;
  mediaType?: "movie" | "tv";
  addedAt: Date;
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  social: string[];
  isVerified: boolean;
  verifiedAt?: Date;
  lastLoginAt?: Date;
  avatarUrl?: string;
  verificationToken?: string;
  verificationTokenExpiry?: Date;
  resetToken?: string;
  resetTokenExpiry?: Date;
  watchlist:   IWatchlistItem[];
  isDeleted:   boolean;
  deletedAt?:  Date;
  createdAt:   Date;
  updatedAt:   Date;
}

const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [4, "Name must be at least 4 characters"],
      maxlength: [50, "Name must be at most 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [10, "Email must be at least 10 characters"],
      maxlength: [100, "Email must be at most 100 characters"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [7, "Password must be at least 7 characters"],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
      default: undefined,
    },
    lastLoginAt: {
      type: Date,
      default: undefined,
    },
    verificationToken: {
      type: String,
      default: undefined,
    },
    verificationTokenExpiry: {
      type: Date,
      default: undefined,
    },
    resetToken: {
      type: String,
      default: undefined,
    },
    resetTokenExpiry: {
      type: Date,
      default: undefined,
    },
    social: {
      type: [{ type: String, enum: ['google', 'x'] }],
      default: [],
    },
    avatarUrl: {
      type: String,
      default: undefined,
    },
    watchlist: {
      type: [
        {
          movieId:     { type: String, required: true },
          title:       { type: String, required: true },
          description: { type: String, default: "" },
          genre:       { type: [String], default: [] },
          rating:      { type: Number, default: 0 },
          year:        { type: Number, default: 0 },
          releaseDate: { type: String, default: undefined },
          duration:    { type: String, default: "" },
          thumbnail:   { type: String, default: "" },
          backdrop:    { type: String, default: "" },
          mediaType:   { type: String, enum: ["movie", "tv"], default: undefined },
          addedAt:     { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    isDeleted: {
      type:    Boolean,
      default: false,
    },
    deletedAt: {
      type:    Date,
      default: undefined,
    },
  },
  { timestamps: true },
);

UserSchema.index({ email: 1 });

export default mongoose.model<IUser>("Users", UserSchema);
