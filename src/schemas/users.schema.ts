import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name:             string;
  email:            string;
  password:         string;
  resetToken?:      string;
  resetTokenExpiry?: Date;
  createdAt:        Date;
  updatedAt:        Date;
}

const UserSchema: Schema = new Schema(
  {
    name: {
      type:      String,
      required:  [true, "Name is required"],
      trim:      true,
      minlength: [2,   "Name must be at least 2 characters"],
      maxlength: [100, "Name must be at most 100 characters"],
    },
    email: {
      type:      String,
      required:  [true, "Email is required"],
      unique:    true,
      lowercase: true,
      trim:      true,
      minlength: [10,  "Email must be at least 10 characters"],
      maxlength: [100, "Email must be at most 100 characters"],
    },
    password: {
      type:      String,
      required:  [true, "Password is required"],
      minlength: [7,   "Password must be at least 7 characters"],
    },
    resetToken: {
      type:    String,
      default: undefined,
    },
    resetTokenExpiry: {
      type:    Date,
      default: undefined,
    },
  },
  { timestamps: true },
);

UserSchema.index({ email: 1 });

export default mongoose.model<IUser>("Users", UserSchema);
