import { ObjectId, type WithId } from "mongodb";
import { getDatabase } from "../db.js";
import crypto from "crypto";

export interface AllowedUser {
  userId: ObjectId;
  role: "editor" | "viewer";
}

export interface RoomFile {
  filename: string;
  content: string;
  language: string;
}

export interface RoomDocument {
  ownerId: ObjectId;
  roomCode: string;
  passwordHash: string;
  codeLanguage: string;
  code: string;
  files: RoomFile[];
  activeFile: string;
  allowedUsers: AllowedUser[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

let indexesEnsured = false;

async function getRoomsCollection() {
  const db = await getDatabase();
  const collection = db.collection<RoomDocument>("rooms");

  if (!indexesEnsured) {
    await collection.createIndex({ roomCode: 1 }, { unique: true });
    await collection.createIndex({ ownerId: 1 });
    await collection.createIndex({ createdAt: -1 });
    indexesEnsured = true;
  }

  return collection;
}

export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

export async function createRoom(
  data: Pick<RoomDocument, "ownerId" | "passwordHash" | "codeLanguage" | "code"> & { filename?: string }
): Promise<WithId<RoomDocument>> {
  const collection = await getRoomsCollection();
  const now = new Date();

  let roomCode = generateRoomCode();
  let attempts = 0;
  while (attempts < 5) {
    const existing = await collection.findOne({ roomCode });
    if (!existing) break;
    roomCode = generateRoomCode();
    attempts++;
  }

    const defaultFilename = data.filename || `main.${getExtensionForLanguage(data.codeLanguage)}`;

  const doc: RoomDocument = {
    ownerId: data.ownerId,
    roomCode,
    passwordHash: data.passwordHash,
    codeLanguage: data.codeLanguage,
    code: data.code,
    files: [
      {
        filename: defaultFilename,
        content: data.code,
        language: data.codeLanguage,
      },
    ],
    activeFile: defaultFilename,
    allowedUsers: [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const result = await collection.insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

export async function findRoomByCode(
  roomCode: string
): Promise<WithId<RoomDocument> | null> {
  const collection = await getRoomsCollection();
  return collection.findOne({ roomCode, isActive: true });
}

export async function findRoomById(
  id: string
): Promise<WithId<RoomDocument> | null> {
  const collection = await getRoomsCollection();
  return collection.findOne({ _id: new ObjectId(id) });
}

export async function findRoomsByOwner(
  ownerId: string
): Promise<WithId<RoomDocument>[]> {
  const collection = await getRoomsCollection();
  return collection
    .find({ ownerId: new ObjectId(ownerId), isActive: true })
    .sort({ createdAt: -1 })
    .toArray();
}

export async function addUserToRoom(
  roomId: string,
  userId: ObjectId,
  role: "editor" | "viewer" = "viewer"
): Promise<WithId<RoomDocument> | null> {
  const collection = await getRoomsCollection();
  const result = await collection.findOneAndUpdate(
    {
      _id: new ObjectId(roomId),
      isActive: true,
      $expr: { $lt: [{ $size: "$allowedUsers" }, 5] },
      "allowedUsers.userId": { $ne: userId },
    },
    {
      $push: { allowedUsers: { userId, role } },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );
  return result;
}

export async function removeUserFromRoom(
  roomId: string,
  userId: ObjectId
): Promise<WithId<RoomDocument> | null> {
  const collection = await getRoomsCollection();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(roomId) },
    {
      $pull: { allowedUsers: { userId } },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );
  return result;
}

export async function updateRoomCode(
  roomId: string,
  code: string,
  codeLanguage?: string
): Promise<WithId<RoomDocument> | null> {
  const collection = await getRoomsCollection();

  const updateFields: Record<string, unknown> = {
    code,
    updatedAt: new Date(),
  };
  if (codeLanguage) {
    updateFields.codeLanguage = codeLanguage;
  }

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(roomId) },
    { $set: updateFields },
    { returnDocument: "after" }
  );

  if (result?.activeFile) {
    await collection.updateOne(
      { _id: new ObjectId(roomId), "files.filename": result.activeFile },
      { $set: { "files.$.content": code } }
    );
  }

  return result;
}

export async function deactivateRoom(
  roomId: string
): Promise<WithId<RoomDocument> | null> {
  const collection = await getRoomsCollection();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(roomId) },
    { $set: { isActive: false, updatedAt: new Date() } },
    { returnDocument: "after" }
  );
  return result;
}

export async function deleteRoom(roomId: string): Promise<boolean> {
  const collection = await getRoomsCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(roomId) });
  return result.deletedCount === 1;
}

export async function updateFileContent(
  roomId: string,
  filename: string,
  content: string
): Promise<WithId<RoomDocument> | null> {
  const collection = await getRoomsCollection();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(roomId), "files.filename": filename },
    {
      $set: {
        "files.$.content": content,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );
  return result;
}

export async function addFileToRoom(
  roomId: string,
  file: RoomFile
): Promise<WithId<RoomDocument> | null> {
  const collection = await getRoomsCollection();
  const result = await collection.findOneAndUpdate(
    {
      _id: new ObjectId(roomId),
      "files.filename": { $ne: file.filename },
      $expr: { $lt: [{ $size: "$files" }, 10] },
    },
    {
      $push: { files: file },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );
  return result;
}

export async function removeFileFromRoom(
  roomId: string,
  filename: string
): Promise<WithId<RoomDocument> | null> {
  const collection = await getRoomsCollection();
  const result = await collection.findOneAndUpdate(
    {
      _id: new ObjectId(roomId),
      $expr: { $gt: [{ $size: "$files" }, 1] },
    },
    {
      $pull: { files: { filename } },
      $set: { updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );
  return result;
}

export async function renameFileInRoom(
  roomId: string,
  oldFilename: string,
  newFilename: string
): Promise<WithId<RoomDocument> | null> {
  const collection = await getRoomsCollection();
  const result = await collection.findOneAndUpdate(
    {
      _id: new ObjectId(roomId),
      "files.filename": oldFilename,
    },
    {
      $set: {
        "files.$.filename": newFilename,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );
  return result;
}

export async function setActiveFile(
  roomId: string,
  filename: string
): Promise<WithId<RoomDocument> | null> {
  const collection = await getRoomsCollection();

  const room = await collection.findOne({ _id: new ObjectId(roomId) });
  const file = room?.files?.find(f => f.filename === filename);

  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(roomId) },
    {
      $set: {
        activeFile: filename,
        ...(file ? { code: file.content, codeLanguage: file.language } : {}),
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );
  return result;
}

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  javascript: "js",
  typescript: "ts",
  python: "py",
  java: "java",
  "c++": "cpp",
  c: "c",
  go: "go",
  rust: "rs",
  html: "html",
  css: "css",
  json: "json",
  markdown: "md",
};

export function getExtensionForLanguage(language: string): string {
  return LANGUAGE_EXTENSIONS[language] || "txt";
}
