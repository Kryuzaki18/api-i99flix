import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  isVerified: boolean;
  verifiedAt?: Date;
  lastLoginAt?: Date;
  avatarUrl?: string;
  verificationToken?: string;
  verificationTokenExpiry?: Date;
  resetToken?: string;
  resetTokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
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
    avatarUrl: {
      type: String,
      default: undefined,
    },
  },
  { timestamps: true },
);

UserSchema.index({ email: 1 });

export default mongoose.model<IUser>("Users", UserSchema);
