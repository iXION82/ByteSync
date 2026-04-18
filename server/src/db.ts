import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI!;

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoServerClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!globalThis._mongoServerClientPromise) {
    client = new MongoClient(uri);
    globalThis._mongoServerClientPromise = client.connect();
  }
  clientPromise = globalThis._mongoServerClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;

export async function getDatabase(dbName: string = "ByteSync"): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}
