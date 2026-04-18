import { Webhook } from "svix";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  createUser,
  updateUserByClerkId,
  deleteUserByClerkId,
} from "@/models/User";



export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  const body = await req.text();

  let event: { type: string; data: Record<string, unknown> };

  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 401 }
    );
  }

  const { type: eventType, data } = event;

  try {
    switch (eventType) {
      case "user.created": {
        const clerkId = data.id as string;
        const emailAddresses = data.email_addresses as
          | { email_address: string }[]
          | undefined;
        const email = emailAddresses?.[0]?.email_address || "";
        const name = `${(data.first_name as string) || ""} ${(data.last_name as string) || ""}`.trim();

        await createUser({
          clerkId,
          email,
          name,
          username: (data.username as string) || email.split("@")[0] || clerkId,
          imageUrl: (data.image_url as string) || undefined,
        });

        console.log(`✓ User created in MongoDB: ${data.id}`);
        break;
      }

      case "user.updated": {
        const emailAddresses = data.email_addresses as
          | { email_address: string }[]
          | undefined;

        await updateUserByClerkId(data.id as string, {
          email: emailAddresses?.[0]?.email_address || "",
          name: `${(data.first_name as string) || ""} ${(data.last_name as string) || ""}`.trim(),
          imageUrl: (data.image_url as string) || undefined,
        });

        console.log(`✓ User updated in MongoDB: ${data.id}`);
        break;
      }

      case "user.deleted": {
        const deleted = await deleteUserByClerkId(data.id as string);
        console.log(
          deleted
            ? `✓ User deleted from MongoDB: ${data.id}`
            : `⚠ User not found for deletion: ${data.id}`
        );
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`Webhook handler failed for ${eventType}:`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
