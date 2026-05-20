import mongoose, { Schema, Document } from "mongoose";

export interface IMovie extends Document {
  title:       string;
  description: string;
  genre:       string[];
  rating:      number;
  year:        number;
  duration:    string;
  thumbnail:   string;
  backdrop:    string;
  featured:    boolean;
  trending:    boolean;
  newRelease:  boolean;
  createdAt:   Date;
  updatedAt:   Date;
}

const MovieSchema: Schema = new Schema(
  {
    title: {
      type:      String,
      required:  [true, "Title is required"],
      trim:      true,
      minlength: [1,   "Title must not be empty"],
      maxlength: [200, "Title must be at most 200 characters"],
    },
    description: {
      type:      String,
      required:  [true, "Description is required"],
      trim:      true,
      maxlength: [2000, "Description must be at most 2000 characters"],
    },
    genre: {
      type:     [String],
      required: [true, "At least one genre is required"],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message:   "At least one genre is required",
      },
    },
    rating: {
      type:    Number,
      default: 0,
      min:     [0,  "Rating must be at least 0"],
      max:     [10, "Rating must be at most 10"],
    },
    year: {
      type:     Number,
      required: [true, "Year is required"],
      min:      [1888, "Year must be 1888 or later"],
      max:      [new Date().getFullYear() + 5, "Year is too far in the future"],
    },
    duration: {
      type:    String,
      default: "N/A",
      trim:    true,
    },
    thumbnail: {
      type:    String,
      default: "",
      trim:    true,
    },
    backdrop: {
      type:    String,
      default: "",
      trim:    true,
    },
    featured:   { type: Boolean, default: false },
    trending:   { type: Boolean, default: false },
    newRelease: { type: Boolean, default: false },
  },
  { timestamps: true },
);

MovieSchema.index({ title: "text", description: "text" }); 
MovieSchema.index({ genre: 1 });
MovieSchema.index({ year: 1 });
MovieSchema.index({ rating: -1 });
MovieSchema.index({ featured: 1 });
MovieSchema.index({ trending: 1 });
MovieSchema.index({ newRelease: 1 });

export default mongoose.model<IMovie>("Movie", MovieSchema);
