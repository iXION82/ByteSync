import { MongoClient, type Db } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

const uri: string = process.env.MONGODB_URI;
const options = {};

// In development mode, Next.js hot-reloads constantly.
// We cache the MongoClient promise on `globalThis` so it persists
// across module re-evaluations and we don't leak connections.
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Extend globalThis to hold our cached promise
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  // In dev, use a global variable so the client is preserved across hot-reloads
  if (!globalThis._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalThis._mongoClientPromise = client.connect();
  }
  clientPromise = globalThis._mongoClientPromise;
} else {
  // In production, create a new client for each cold start
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

/**
 * Returns a cached MongoDB client promise.
 * Use this in API routes and server components.
 *
 * @example
 * ```ts
 * import clientPromise from "@/lib/mongodb";
 *
 * const client = await clientPromise;
 * const db = client.db("myDatabase");
 * const users = await db.collection("users").find({}).toArray();
 * ```
 */
export default clientPromise;

/**
 * Helper to get the database instance directly.
 * Uses the default database from the connection string, or pass a name.
 */
export async function getDatabase(dbName?: string): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}
