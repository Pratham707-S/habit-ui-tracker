import mongoose from "mongoose"

// Force reload on env change
const _mongodbUri = process.env.MONGODB_URI

type MongooseGlobal = typeof globalThis & {
  _mongoose?: {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
  }
}

const g = globalThis as MongooseGlobal

if (!g._mongoose) {
  g._mongoose = { conn: null, promise: null }
}

export async function connectToDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI

  if (!MONGODB_URI) {
    throw new Error("Missing env var: MONGODB_URI")
  }

  if (g._mongoose!.conn) return g._mongoose!.conn

  if (!g._mongoose!.promise) {
    g._mongoose!.promise = mongoose
      .connect(MONGODB_URI, {
        bufferCommands: false,
      })
      .then((m) => m)
  }

  g._mongoose!.conn = await g._mongoose!.promise
  return g._mongoose!.conn
}

