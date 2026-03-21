import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

/**
 * GET /api/health
 *
 * Health check endpoint. Pings MongoDB to verify the connection is alive.
 * Useful for Docker HEALTHCHECK, Kubernetes probes, and uptime monitors.
 *
 * Returns:
 *   200 — { status: "healthy", db: "connected", timestamp }
 *   503 — { status: "unhealthy", db: "disconnected", error, timestamp }
 */
export async function GET() {
  try {
    const client = await clientPromise;
    await client.db().command({ ping: 1 });

    return NextResponse.json({
      status: "healthy",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        status: "unhealthy",
        db: "disconnected",
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
