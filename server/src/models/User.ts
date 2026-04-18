import { ObjectId, type WithId } from "mongodb";
import { getDatabase } from "../db.js";

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

async function getUsersCollection() {
  const db = await getDatabase();
  return db.collection<UserDocument>("users");
}

export async function findUserById(
  id: string
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  return collection.findOne({ _id: new ObjectId(id) });
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

export async function addJoinedRoom(
  userId: string,
  roomId: ObjectId
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  const oid = new ObjectId(userId);

  await collection.updateOne(
    { _id: oid, joinedRoomIds: { $exists: false } },
    { $set: { joinedRoomIds: [] } }
  );

  const result = await collection.findOneAndUpdate(
    {
      _id: oid,
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
  const oid = new ObjectId(userId);

  await collection.updateOne(
    { _id: oid, createdRoomIds: { $exists: false } },
    { $set: { createdRoomIds: [] } }
  );

  const result = await collection.findOneAndUpdate(
    {
      _id: oid,
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

export async function setActiveRoom(
  userId: string,
  roomId: ObjectId
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    {
      $set: { activeRoomId: roomId, updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );
  return result;
}

export async function clearActiveRoom(
  userId: string
): Promise<WithId<UserDocument> | null> {
  const collection = await getUsersCollection();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(userId) },
    {
      $set: { activeRoomId: null, updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );
  return result;
}
