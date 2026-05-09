import mongoose from "mongoose";

let isConnected = false;

export async function connectDB(uri: string): Promise<void> {
  if (isConnected) return;

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log("[MongoDB] Connected to Atlas");
  } catch (error) {
    console.error("[MongoDB] Connection failed:", error);
    throw error;
  }
}

export default mongoose;
