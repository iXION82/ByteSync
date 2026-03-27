/**
 * Ensure the current Clerk user exists in MongoDB.
 * Calls the Next.js /api/users endpoint which creates the user if they don't exist.
 * Should be called before any backend API call that requires the user to be in MongoDB.
 */
export async function ensureUserInDb(user: {
  id: string;
  emailAddresses: { emailAddress: string }[];
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
}) {
  try {
    await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clerkId: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        name: user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        imageUrl: user.imageUrl,
      }),
    });
  } catch (err) {
    console.error("Failed to sync user to MongoDB:", err);
  }
}
