import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import clientPromise from "./db.js";
import roomRoutes from "./routes/room.js";
import chatRoutes from "./routes/chat.js";
import { registerSocketHandlers } from "./socket/handlers.js";

const PORT = parseInt(process.env.PORT || "4000", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

// ─── Express App ────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// ─── Health Check ───────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── REST Routes ────────────────────────────────────────────────
app.use("/api/rooms", roomRoutes);
app.use("/api/chats", chatRoutes);

// ─── HTTP + Socket.IO Server ────────────────────────────────────
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Register socket event handlers
registerSocketHandlers(io);

// ─── Start Server ───────────────────────────────────────────────
async function start() {
  try {
    // Verify MongoDB connection
    const client = await clientPromise;
    await client.db("ByteSync").command({ ping: 1 });
    console.log("✅ MongoDB connected");

    httpServer.listen(PORT, () => {
      console.log(`🚀 ByteSync server listening on port ${PORT}`);
      console.log(`   CORS origin: ${CORS_ORIGIN}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

start();
