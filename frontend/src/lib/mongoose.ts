import mongoose from "mongoose";

declare global {
  var _mongoose:
    | {
        conn: typeof mongoose | null;
        promise: Promise<typeof mongoose> | null;
      }
    | undefined;
}

const cached = global._mongoose || { conn: null, promise: null };

export async function connectMongoose() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    // Not: Pool değerlerini serverless'a uygun tut
    cached.promise = mongoose.connect(
      process.env.MONGO_URI ||
        "mongodb://127.0.0.1:27017/validator-timeline-test-v7",
      {
        maxPoolSize: 10,
        minPoolSize: 0,
        maxIdleTimeMS: 30_000,
        serverSelectionTimeoutMS: 5_000,
        // bufferCommands: false, // istersen bu da
        // dbName: 'mydb',       // gerekiyorsa belirt
      }
    );

    console.log("Connected to MongoDB");
  }

  cached.conn = await cached.promise;
  global._mongoose = cached;
  return cached.conn;
}
