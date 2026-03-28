import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

/**
 * POST /api/users
 * Ensures a user exists in MongoDB with the correct clerkId.
 * Uses upsert to handle all edge cases (new user, mismatched clerkId, missing fields).
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clerkId, email, name, imageUrl } = body;

    if (!clerkId || !email) {
      return NextResponse.json(
        { error: "clerkId and email are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection("users");

    // Upsert: find by email, update clerkId and missing fields
    const result = await collection.findOneAndUpdate(
      { email },
      [
        {
          $set: {
            clerkId: clerkId,
            email: email,
            name: name || "",
            imageUrl: imageUrl || null,
            updatedAt: new Date(),
            // Ensure arrays exist (use existing value if present, else default)
            username: { $ifNull: ["$username", email.split("@")[0] || clerkId] },
            joinedRoomIds: { $ifNull: ["$joinedRoomIds", []] },
            createdRoomIds: { $ifNull: ["$createdRoomIds", []] },
            activeRoomId: { $ifNull: ["$activeRoomId", null] },
            createdAt: { $ifNull: ["$createdAt", new Date()] },
          },
        },
      ],
      { upsert: true, returnDocument: "after" }
    );

    console.log(`✓ User synced to MongoDB: ${clerkId}`);
    return NextResponse.json(
      { message: "User synced", user: result },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to sync user to MongoDB:", error);
    return NextResponse.json(
      { error: "Failed to sync user" },
      { status: 500 }
    );
  }
}
