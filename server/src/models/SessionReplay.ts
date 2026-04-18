import { ObjectId, type WithId } from "mongodb";
import { getDatabase } from "../db.js";

export interface SnapshotFile {
  filename: string;
  content: string;
  language: string;
}

export interface SessionSnapshot {
  roomId: ObjectId;
  timestamp: Date;
  files: SnapshotFile[];
  activeFile: string;
  codeLanguage: string;
  userId?: ObjectId;
  username?: string;
  trigger: "auto" | "manual" | "join" | "leave" | "file-change" | "language-change";
  seq: number;
}

export interface EditEvent {
  roomId: ObjectId;
  timestamp: Date;
  filename: string;
  content: string;
  afterSnapshotSeq: number;
  userId?: ObjectId;
  username?: string;
}

let indexesEnsured = false;

async function getSnapshotsCollection() {
  const db = await getDatabase();
  const collection = db.collection<SessionSnapshot>("session_snapshots");

  if (!indexesEnsured) {
    await collection.createIndex({ roomId: 1, seq: 1 });
    await collection.createIndex({ roomId: 1, timestamp: 1 });
    indexesEnsured = true;
  }

  return collection;
}

async function getEditEventsCollection() {
  const db = await getDatabase();
  const collection = db.collection<EditEvent>("edit_events");

  if (!indexesEnsured) {
    await collection.createIndex({ roomId: 1, afterSnapshotSeq: 1, timestamp: 1 });
    await collection.createIndex({ roomId: 1, timestamp: 1 });
    await collection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
    indexesEnsured = true;
  }

  return collection;
}

export async function getNextSnapshotSeq(roomId: string): Promise<number> {
  const collection = await getSnapshotsCollection();
  const latest = await collection.findOne(
    { roomId: new ObjectId(roomId) },
    { sort: { seq: -1 }, projection: { seq: 1 } }
  );
  return (latest?.seq ?? -1) + 1;
}

export async function createSnapshot(
  data: Omit<SessionSnapshot, "seq">
): Promise<WithId<SessionSnapshot>> {
  const collection = await getSnapshotsCollection();
  const seq = await getNextSnapshotSeq(data.roomId.toString());

  const doc: SessionSnapshot = { ...data, seq };
  const result = await collection.insertOne(doc);

  return { _id: result.insertedId, ...doc };
}

export async function getSnapshotsByRoom(
  roomId: string,
  limit = 500
): Promise<WithId<SessionSnapshot>[]> {
  const collection = await getSnapshotsCollection();
  return collection
    .find({ roomId: new ObjectId(roomId) })
    .sort({ seq: 1 })
    .limit(limit)
    .toArray();
}

export async function getSnapshotBySeq(
  roomId: string,
  seq: number
): Promise<WithId<SessionSnapshot> | null> {
  const collection = await getSnapshotsCollection();
  return collection.findOne({ roomId: new ObjectId(roomId), seq });
}

export async function getLatestSnapshot(
  roomId: string
): Promise<WithId<SessionSnapshot> | null> {
  const collection = await getSnapshotsCollection();
  return collection.findOne(
    { roomId: new ObjectId(roomId) },
    { sort: { seq: -1 } }
  );
}

export async function getSnapshotCount(roomId: string): Promise<number> {
  const collection = await getSnapshotsCollection();
  return collection.countDocuments({ roomId: new ObjectId(roomId) });
}

export async function createEditEvent(
  data: EditEvent
): Promise<WithId<EditEvent>> {
  const collection = await getEditEventsCollection();
  const result = await collection.insertOne(data);
  return { _id: result.insertedId, ...data };
}

export async function createEditEventsBatch(
  events: EditEvent[]
): Promise<number> {
  if (events.length === 0) return 0;
  const collection = await getEditEventsCollection();
  const result = await collection.insertMany(events);
  return result.insertedCount;
}

export async function getEditEventsBetweenSnapshots(
  roomId: string,
  afterSnapshotSeq: number,
  limit = 5000
): Promise<WithId<EditEvent>[]> {
  const collection = await getEditEventsCollection();
  return collection
    .find({
      roomId: new ObjectId(roomId),
      afterSnapshotSeq,
    })
    .sort({ timestamp: 1 })
    .limit(limit)
    .toArray();
}

export async function getEditEventsInTimeRange(
  roomId: string,
  from: Date,
  to: Date,
  limit = 10000
): Promise<WithId<EditEvent>[]> {
  const collection = await getEditEventsCollection();
  return collection
    .find({
      roomId: new ObjectId(roomId),
      timestamp: { $gte: from, $lte: to },
    })
    .sort({ timestamp: 1 })
    .limit(limit)
    .toArray();
}

export async function deleteReplayData(roomId: string): Promise<void> {
  const snapshotsCol = await getSnapshotsCollection();
  const editsCol = await getEditEventsCollection();
  const oid = new ObjectId(roomId);
  await Promise.all([
    snapshotsCol.deleteMany({ roomId: oid }),
    editsCol.deleteMany({ roomId: oid }),
  ]);
}
