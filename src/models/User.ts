import { ObjectId, type WithId, type Document } from "mongodb";
import { getDatabase } from "@/lib/mongodb";

export interface UserDocument {
  clerkId: string;
  username: string;
  email: string;
  name: string;
  imageUrl?: string;
  joinedRoomIds: ObjectId[];
  createdRoomIds: ObjectId[];
  activeRoomId: ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

let indexesEnsured = false;

async function getUsersCollection() {
  const db = await getDatabase();
  const collection = db.collection<UserDocument>("users");

  if (!indexesEnsured) {
    await collection.createIndex({ clerkId: 1 }, { unique: true });
    await collection.createIndex({ email: 1 }, { unique: true });
    await collection.createIndex({ username: 1 }, { unique: true });
    indexesEnsured = true;
  }

  return collection;
}

export async function createUser(
  data: Omit<UserDocument, "createdAt" | "updatedAt" | "joinedRoomIds" | "createdRoomIds" | "activeRoomId">
): Promise<WithId<UserDocument>> {
  const collection = await getUsersCollection();
  const now = new Date();

  const doc: UserDocument = {
    ...data,
    joinedRoomIds: [],
    createdRoomIds: [],
    activeRoomId: null,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);

  return {
    _id: result.insertedId,
    ...doc,
  };
}

export async function findUserByClerkId(
  clerkId: string
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  return collection.findOne({ clerkId });
}

export async function findUserByUsername(
  username: string
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  return collection.findOne({ username });
}

export async function findUserByEmail(
  email: string
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  return collection.findOne({ email });
}

export async function findUserById(
  id: string
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

export async function updateUserByClerkId(
  clerkId: string,
  data: Partial<Omit<UserDocument, "clerkId" | "createdAt" | "updatedAt">>
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  const result = await collection.findOneAndUpdate(
    { clerkId },
    { $set: { ...data, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  return result;
}

export async function addJoinedRoom(
  userId: string,
  roomId: ObjectId
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();

  const result = await collection.findOneAndUpdate(
    {
      _id: new ObjectId(userId),
      $expr: { $lt: [{ $size: "$joinedRoomIds" }, 3] },
    },
    {
      $addToSet: { joinedRoomIds: roomId },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );
  return result;
}

export async function removeJoinedRoom(
  userId: string,
  roomId: ObjectId
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    {
      $pull: { joinedRoomIds: roomId },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );
  return result;
}

export async function addCreatedRoom(
  userId: string,
  roomId: ObjectId
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();

  const result = await collection.findOneAndUpdate(
    {
      _id: new ObjectId(userId),
      $expr: { $lt: [{ $size: "$createdRoomIds" }, 3] },
    },
    {
      $addToSet: { createdRoomIds: roomId },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );
  return result;
}

export async function removeCreatedRoom(
  userId: string,
  roomId: ObjectId
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    {
      $pull: { createdRoomIds: roomId },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );
  return result;
}

export async function deleteUserByClerkId(clerkId: string): Promise<boolean> {
  const collection = await getUsersCollection();
  const result = await collection.deleteOne({ clerkId });
  return result.deletedCount === 1;
}
