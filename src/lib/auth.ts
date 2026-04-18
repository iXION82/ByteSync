import { auth } from "@clerk/nextjs/server";
import { findUserByClerkId, type UserDocument } from "@/models/User";
import type { WithId } from "mongodb";

export async function getCurrentDbUser(): Promise<WithId<UserDocument> | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  return findUserByClerkId(userId);
}
