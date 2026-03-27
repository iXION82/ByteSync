import { NextResponse } from "next/server";
import { createUser, findUserByClerkId } from "@/models/User";

/**
 * POST /api/users
 * Saves user details (clerkId, email, name) to MongoDB.
 * Called directly from the sign-up form after successful registration.
 * In production, this can be replaced/supplemented by Clerk webhooks.
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

    // Check if user already exists (prevent duplicates)
    const existingUser = await findUserByClerkId(clerkId);
    if (existingUser) {
      return NextResponse.json(
        { message: "User already exists", user: existingUser },
        { status: 200 }
      );
    }

    const user = await createUser({
      clerkId,
      email,
      name: name || "",
      username: email.split("@")[0] || clerkId,
      imageUrl: imageUrl || undefined,
    });

    console.log(`✓ User saved to MongoDB: ${clerkId}`);
    return NextResponse.json({ message: "User created", user }, { status: 201 });
  } catch (error) {
    console.error("Failed to save user to MongoDB:", error);
    return NextResponse.json(
      { error: "Failed to save user" },
      { status: 500 }
    );
  }
}
