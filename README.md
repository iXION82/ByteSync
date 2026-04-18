<div align="center">

# ⚡ ByteSync

**Real-time collaborative code editor with multi-file support, session replay, and live chat.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-white?logo=socket.io&logoColor=black)](https://socket.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.1-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?logo=clerk)](https://clerk.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

</div>

---

## Overview

ByteSync is a full-stack collaborative code editor that enables developers to write, run, and debug code together in real-time. Create password-protected rooms, invite collaborators, and code simultaneously with live cursor tracking, integrated chat, and automatic session replay.

### Key Features

- **Real-Time Collaboration** — Live code synchronization across all participants with zero-flicker updates via imperative Monaco editor model pushes
- **Multi-File Projects** — Create up to 10 files per room with a full file tree sidebar (create, rename, delete, switch)
- **Session Replay** — Time-travel through your coding history with automatic snapshot capture and a dedicated replay interface
- **Code Execution** — Run code in 8 languages via Piston and Judge0 CE engines with stdout/stderr output
- **Live Chat** — Persistent in-room messaging with real-time delivery and chat history
- **Authentication** — Clerk-powered auth with webhook-based user sync to MongoDB
- **Collaborative Cursors** — See where other participants are editing with color-coded cursor indicators

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS v4, Framer Motion |
| **Editor** | Monaco Editor (`@monaco-editor/react`) — uncontrolled component pattern |
| **Backend** | Node.js, Express, Socket.IO |
| **Database** | MongoDB (native driver, no Mongoose) |
| **Auth** | Clerk (middleware + webhooks) |
| **Code Execution** | Piston API, Judge0 CE (dual-engine fallback) |
| **Validation** | Zod, React Hook Form |

---

## Project Structure

```
ByteSync/
├── src/                          # Next.js frontend
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── dashboard/page.tsx    # Room management dashboard
│   │   ├── (auth)/               # Auth layout (sign-in / sign-up)
│   │   ├── room/
│   │   │   ├── session/[[...roomId]]/page.tsx   # Live coding session
│   │   │   └── replay/[roomId]/page.tsx         # Session replay viewer
│   │   └── api/
│   │       ├── execute/route.ts  # Code execution proxy
│   │       └── webhooks/clerk/   # Clerk webhook handler
│   ├── components/
│   │   ├── editor/
│   │   │   ├── CodeEditor.tsx    # Monaco editor (imperative handle)
│   │   │   ├── CodeRunner.tsx    # Output panel
│   │   │   ├── FileTree.tsx      # Multi-file sidebar
│   │   │   └── SessionReplay.tsx # Replay component
│   │   ├── auth/                 # SignInForm, SignUpForm
│   │   └── Navbar.tsx
│   ├── hooks/
│   │   └── useSocket.ts          # Socket.IO client hook
│   ├── lib/
│   │   ├── auth.ts               # Clerk helpers
│   │   ├── editorConstants.ts    # Language definitions & configs
│   │   ├── ensureUser.ts         # User provisioning
│   │   └── mongodb.ts            # MongoDB client (singleton)
│   └── models/                   # MongoDB document models (frontend)
│       ├── Room.ts
│       ├── User.ts
│       └── Chat.ts
│
├── server/                       # Express + Socket.IO backend
│   └── src/
│       ├── index.ts              # Server entry point
│       ├── db.ts                 # MongoDB connection
│       ├── models/
│       │   ├── Room.ts           # Room CRUD + multi-file ops
│       │   ├── User.ts           # User CRUD + room tracking
│       │   ├── Chat.ts           # Chat message CRUD
│       │   └── SessionReplay.ts  # Snapshots & edit events
│       ├── routes/
│       │   ├── room.ts           # Room + replay REST endpoints
│       │   ├── user.ts           # User room management
│       │   └── chat.ts           # Chat history
│       └── socket/
│           └── handlers.ts       # Real-time event handlers
│
├── public/                       # Static assets
├── Dockerfile                    # Production Docker build
└── docker-compose.yml            # Docker Compose config
```

---

## Architecture

### Real-Time Sync

ByteSync uses an **uncontrolled editor** pattern for flicker-free collaboration:

1. Local edits update React state and are debounced (150ms) before emitting via Socket.IO
2. Remote code updates bypass React re-renders entirely — they push directly to the Monaco editor model via `useImperativeHandle`
3. An `isRemoteUpdate` ref flag prevents echo loops (remote updates don't trigger re-emission)

### Multi-File System

Each room supports up to **10 files** with a `files[]` array in the Room document:

```
Room → files: [{ filename, content, language }]
     → activeFile: "main.js"
     → code / codeLanguage (backward-compat mirrors)
```

File operations (create, rename, delete, switch) are persisted to MongoDB and broadcast to all room participants via Socket.IO.

### Session Replay

A two-tier recording system captures coding sessions:

| Tier | What | When | Storage |
|------|------|------|---------|
| **Snapshots** | Full room state (all files, active file, language) | Every 3 min, on save, join/leave, file/language change | Permanent |
| **Edit Events** | Per-keystroke content snapshots | On every code change (buffered, batch-flushed) | 7-day TTL |

The replay viewer provides a snapshot timeline with keyboard navigation (↑/↓ or j/k), file tabs, and crossfade transitions.

### Auto-Save System

- **In-memory buffer** tracks dirty state per room
- **3-minute interval** flushes modified files to MongoDB
- **Explicit save** via the SAVE button or `save-code` socket event
- **Leave/disconnect** triggers a final flush with a `"leave"` snapshot

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **MongoDB** (local or Atlas)
- **Clerk** account ([clerk.com](https://clerk.com))

### 1. Clone the repository

```bash
git clone https://github.com/your-username/ByteSync.git
cd ByteSync
```

### 2. Install dependencies

```bash
# Frontend
npm install

# Backend
cd server
npm install
cd ..
```

### 3. Configure environment variables

**Frontend** — create `.env.local` in the root:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

MONGODB_URI=mongodb://localhost:27017/ByteSync

NEXT_PUBLIC_SERVER_URL=http://localhost:4000
```

**Backend** — create `server/.env`:

```env
PORT=4000
CORS_ORIGIN=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/ByteSync
```

### 4. Configure Clerk Webhooks

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → **Webhooks**
2. Add endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Subscribe to events: `user.created`, `user.updated`, `user.deleted`
4. Copy the signing secret to `CLERK_WEBHOOK_SECRET`

### 5. Start development servers

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
npm run dev
```

The frontend runs on `http://localhost:3000` and the backend on `http://localhost:4000`.

---

## Supported Languages

| Language | Editor | Execution |
|----------|--------|-----------|
| JavaScript | ✅ | ✅ Piston / Judge0 |
| TypeScript | ✅ | ✅ Piston / Judge0 |
| Python | ✅ | ✅ Piston / Judge0 |
| Java | ✅ | ✅ Piston / Judge0 |
| C++ | ✅ | ✅ Piston / Judge0 |
| C | ✅ | ✅ Piston / Judge0 |
| Go | ✅ | ✅ Piston / Judge0 |
| Rust | ✅ | ✅ Piston / Judge0 |
| HTML | ✅ | — |
| CSS | ✅ | — |
| JSON | ✅ | — |
| Markdown | ✅ | — |

---

## Room System

- **Create** — Owner sets a password and chooses a language. A unique 6-character room code is generated.
- **Join** — Enter the room code + password. Max **5 participants** per room.
- **Roles** — Owner can change language; all editors can modify code and files.
- **Limits** — Each user can create up to **3 rooms** and join up to **3 rooms**.
- **Active Room** — One active room at a time per user; switching auto-leaves the previous room.

---

## Docker Deployment

```bash
docker-compose up --build
```

The `docker-compose.yml` orchestrates the frontend and backend services. Configure environment variables in the compose file or via `.env` files.

---

## API Endpoints

### Room Routes (`/api/rooms`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/create` | Create a new room |
| `POST` | `/join` | Join an existing room |
| `POST` | `/leave` | Leave a room |
| `GET` | `/details/:roomId` | Get room details with participants |
| `GET` | `/:roomCode` | Get room by code |
| `GET` | `/user/:clerkId` | Get rooms owned by user |
| `DELETE` | `/:roomId` | Delete (deactivate) a room |

### Replay Routes (`/api/rooms`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/:roomId/replay/snapshots` | Get snapshot timeline |
| `GET` | `/:roomId/replay/snapshot/:seq` | Get snapshot + subsequent edits |
| `GET` | `/:roomId/replay/events` | Get edit events after a sequence |

### User Routes (`/api/users`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/:clerkId/rooms` | Get user's created + joined rooms |
| `POST` | `/set-active` | Set active room |
| `POST` | `/clear-active` | Clear active room |

### Chat Routes (`/api/chats`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/:roomId` | Get chat history for a room |

---

## Socket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `join-room` | `{ roomId, userId?, clerkId? }` | Join a coding room |
| `code-change` | `{ code, codeLanguage?, filename? }` | Broadcast code edit |
| `language-change` | `{ codeLanguage, code }` | Change room language |
| `create-file` | `{ filename, language, content? }` | Create a new file |
| `delete-file` | `{ filename }` | Delete a file |
| `rename-file` | `{ oldFilename, newFilename }` | Rename a file |
| `switch-file` | `{ filename }` | Switch active file |
| `send-message` | `{ message }` | Send chat message |
| `cursor-move` | `{ line, column }` | Broadcast cursor position |
| `save-code` | — | Trigger manual save |
| `leave-room` | — | Leave current room |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `room-state` | `{ code, codeLanguage, users, files, activeFile }` | Initial room state |
| `code-update` | `{ code, codeLanguage?, filename? }` | Remote code change |
| `language-update` | `{ codeLanguage, code }` | Language changed |
| `file-created` | `{ filename, language, files, activeFile }` | File created |
| `file-deleted` | `{ filename, files, activeFile }` | File deleted |
| `file-renamed` | `{ oldFilename, newFilename, files, activeFile }` | File renamed |
| `file-switched` | `{ filename, content, language }` | Active file changed |
| `user-joined` | `{ userId, username, users }` | User joined |
| `user-left` | `{ userId, users }` | User left |
| `new-message` | `{ _id, senderId, message, createdAt }` | Chat message |
| `cursor-update` | `{ userId, line, column }` | Remote cursor position |
| `code-saved` | `{ timestamp }` | Save confirmed |

---

## License

This project is for educational and personal use.
