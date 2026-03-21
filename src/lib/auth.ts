import { auth } from "@clerk/nextjs/server";
import { findUserByClerkId, type UserDocument } from "@/models/User";
import type { WithId } from "mongodb";

/**
 * Get the current authenticated user's document from MongoDB.
 *
 * Grabs the Clerk ID from the active session and queries MongoDB
 * for the corresponding user document. Use this in server components
 * and server actions to get the full DB user profile.
 *
 * @returns The user document from MongoDB, or `null` if not found / not signed in.
 *
 * @example
 * ```tsx
 * // In a Server Component
 * import { getCurrentDbUser } from "@/lib/auth";
 *
 * export default async function ProfilePage() {
 *   const user = await getCurrentDbUser();
 *
 *   if (!user) {
 *     return <p>Please sign in.</p>;
 *   }
 *
 *   return <p>Hello, {user.name}!</p>;
 * }
 * ```
 */
export async function getCurrentDbUser(): Promise<WithId<UserDocument> | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  return findUserByClerkId(userId);
}
