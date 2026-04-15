import { ObjectId, type WithId } from "mongodb";
import { getDatabase } from "../db.js";

// ─── Snapshot: Full room state captured at key moments ──────────
// Stored every 3-min flush, on join/leave, on file create/delete,
// and on manual save. Allows coarse-grained "jump to any point."

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
  userId?: ObjectId;      // who triggered this snapshot
  username?: string;      // display name
  trigger: "auto" | "manual" | "join" | "leave" | "file-change" | "language-change";
  /** Sequential index within the room's replay timeline */
  seq: number;
}

// ─── EditEvent: Granular code diffs between snapshots ───────────
// Captured on every code-change (debounced). Enables smooth
// character-by-character playback between two snapshots.

export interface EditEvent {
  roomId: ObjectId;
  timestamp: Date;
  filename: string;
  /** The full code after this edit (simple approach — avoids diff algorithm complexity) */
  content: string;
  /** Which snapshot this edit falls after (for seeking) */
  afterSnapshotSeq: number;
  userId?: ObjectId;
  username?: string;
}

// ─── Collection Helpers ─────────────────────────────────────────

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
    // Compound index for seeking: "all edits in room X after snapshot Y"
    await collection.createIndex({ roomId: 1, afterSnapshotSeq: 1, timestamp: 1 });
    await collection.createIndex({ roomId: 1, timestamp: 1 });
    // TTL index: auto-expire edit events after 7 days to keep storage manageable
    await collection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });
    indexesEnsured = true;
  }

  return collection;
}

// ─── Snapshot CRUD ──────────────────────────────────────────────

/**
 * Get the next sequence number for a room's snapshots
 */
export async function getNextSnapshotSeq(roomId: string): Promise<number> {
  const collection = await getSnapshotsCollection();
  const latest = await collection.findOne(
    { roomId: new ObjectId(roomId) },
    { sort: { seq: -1 }, projection: { seq: 1 } }
  );
  return (latest?.seq ?? -1) + 1;
}

/**
 * Create a snapshot of the room's current state
 */
export async function createSnapshot(
  data: Omit<SessionSnapshot, "seq">
): Promise<WithId<SessionSnapshot>> {
  const collection = await getSnapshotsCollection();
  const seq = await getNextSnapshotSeq(data.roomId.toString());

  const doc: SessionSnapshot = { ...data, seq };
  const result = await collection.insertOne(doc);

  return { _id: result.insertedId, ...doc };
}

/**
 * Get all snapshots for a room, ordered by sequence
 */
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

/**
 * Get a specific snapshot by room + seq
 */
export async function getSnapshotBySeq(
  roomId: string,
  seq: number
): Promise<WithId<SessionSnapshot> | null> {
  const collection = await getSnapshotsCollection();
  return collection.findOne({ roomId: new ObjectId(roomId), seq });
}

/**
 * Get the latest snapshot for a room
 */
export async function getLatestSnapshot(
  roomId: string
): Promise<WithId<SessionSnapshot> | null> {
  const collection = await getSnapshotsCollection();
  return collection.findOne(
    { roomId: new ObjectId(roomId) },
    { sort: { seq: -1 } }
  );
}

/**
 * Get the total number of snapshots for a room
 */
export async function getSnapshotCount(roomId: string): Promise<number> {
  const collection = await getSnapshotsCollection();
  return collection.countDocuments({ roomId: new ObjectId(roomId) });
}

// ─── EditEvent CRUD ─────────────────────────────────────────────

/**
 * Record a code edit event
 */
export async function createEditEvent(
  data: EditEvent
): Promise<WithId<EditEvent>> {
  const collection = await getEditEventsCollection();
  const result = await collection.insertOne(data);
  return { _id: result.insertedId, ...data };
}

/**
 * Batch-insert multiple edit events (more efficient for buffered writes)
 */
export async function createEditEventsBatch(
  events: EditEvent[]
): Promise<number> {
  if (events.length === 0) return 0;
  const collection = await getEditEventsCollection();
  const result = await collection.insertMany(events);
  return result.insertedCount;
}

/**
 * Get all edit events between two snapshot sequences
 */
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

/**
 * Get all edit events for a room within a time range
 */
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

/**
 * Delete all replay data for a room (cleanup)
 */
export async function deleteReplayData(roomId: string): Promise<void> {
  const snapshotsCol = await getSnapshotsCollection();
  const editsCol = await getEditEventsCollection();
  const oid = new ObjectId(roomId);
  await Promise.all([
    snapshotsCol.deleteMany({ roomId: oid }),
    editsCol.deleteMany({ roomId: oid }),
  ]);
}
