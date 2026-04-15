# ByteSync — Complete System Flowchart

> A real-time collaborative code editor built with **Next.js 16 + Clerk + Socket.IO + MongoDB**

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph "Client — Next.js 16 (React 19)"
        Browser["🌐 Browser"]
        Pages["Pages (App Router)"]
        Components["Components"]
        Hooks["useSocket Hook"]
        ClerkSDK["Clerk Auth SDK"]
    end

    subgraph "Next.js API Routes"
        UsersAPI["/api/users"]
        ExecuteAPI["/api/execute"]
        WebhooksAPI["/api/webhooks/clerk"]
    end

    subgraph "Backend — Express + Socket.IO (Port 4000)"
        Express["Express REST API"]
        SocketIO["Socket.IO Server"]
        RoomRoutes["/api/rooms/*"]
        UserRoutes["/api/users/*"]
        ChatRoutes["/api/chats/*"]
        Handlers["Socket Event Handlers"]
    end

    subgraph "External Services"
        ClerkAuth["Clerk (Auth Provider)"]
        Piston["Piston / Judge0 (Code Exec)"]
        MongoDB["MongoDB Atlas"]
    end

    Browser --> Pages
    Pages --> Components
    Components --> Hooks
    ClerkSDK --> ClerkAuth
    Pages --> UsersAPI
    Pages --> ExecuteAPI
    Pages --> Express
    Hooks --> SocketIO
    ExecuteAPI --> Piston
    Express --> RoomRoutes & UserRoutes & ChatRoutes
    SocketIO --> Handlers
    RoomRoutes & UserRoutes & ChatRoutes & Handlers --> MongoDB
    UsersAPI --> MongoDB
    WebhooksAPI --> ClerkAuth
```

---

## 2. Application Entry & Routing

```mermaid
graph TD
    A["User visits ByteSync"] --> B["RootLayout (layout.tsx)"]
    B --> C["ClerkProvider wraps app"]
    C --> D["Navbar renders (auth-aware)"]
    C --> E{Which Route?}

    E -->|"/"| F["Landing Page (page.tsx)"]
    E -->|"/sign-in"| G["Sign In (Clerk custom form)"]
    E -->|"/sign-up"| H["Sign Up (Clerk custom form)"]
    E -->|"/dashboard"| I["Dashboard Page"]
    E -->|"/room/create"| J["Create Room Page"]
    E -->|"/room/join"| K["Join Room Page"]
    E -->|"/room/solo"| L["Solo Room Page"]
    E -->|"/room/session/:id"| M["Collaborative Session Page"]

    style F fill:#0a150a,stroke:#00ff41,color:#00ff41
    style I fill:#0a150a,stroke:#00ff41,color:#00ff41
    style M fill:#0a150a,stroke:#00ff41,color:#00ff41
```

---

## 3. Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant C as Clerk SDK
    participant NF as Next.js Frontend
    participant NA as /api/users (Next.js)
    participant DB as MongoDB

    U->>NF: Visit /sign-up or /sign-in
    NF->>C: Render custom SignUpForm / SignInForm
    U->>C: Enter email + password
    C->>C: Validate credentials (Clerk hosted)
    C-->>NF: Auth session established

    Note over NF: User is now authenticated via Clerk

    NF->>NF: Redirect to /dashboard
    NF->>NA: POST /api/users (ensureUserInDb)
    NA->>DB: Upsert user by email
    Note over NA,DB: Sets clerkId, username, arrays for rooms
    DB-->>NA: User document
    NA-->>NF: User synced ✓

    NF->>NF: Fetch rooms from backend
```

### Key Auth Details
- **Provider**: Clerk (`@clerk/nextjs`)
- **Custom forms**: `SignInForm.tsx` and `SignUpForm.tsx` with retro terminal aesthetic
- **User sync**: `ensureUserInDb()` POSTs to `/api/users` to upsert user in MongoDB
- **Guard**: Dashboard & room pages redirect to `/sign-in` if unauthenticated

---

## 4. Room Creation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as /room/create (Frontend)
    participant BE as Backend /api/rooms/create
    participant DB as MongoDB

    U->>FE: Fill form (language, password)
    FE->>FE: ensureUserInDb(user)
    FE->>BE: POST /api/rooms/create
    Note right of FE: { clerkId, password, codeLanguage, code }

    BE->>DB: findUserByClerkId(clerkId)
    DB-->>BE: User document
    BE->>BE: Check createdRoomIds.length < 3
    BE->>BE: bcrypt.hash(password)
    BE->>BE: generateRoomCode() → 8-char code
    BE->>DB: insertOne(room)
    BE->>DB: addCreatedRoom(userId, roomId)
    DB-->>BE: Room created ✓

    BE-->>FE: { roomId, roomCode }
    FE->>FE: router.push("/room/session/{roomId}")
```

### Room Limits
| Constraint | Limit |
|---|---|
| Max rooms created per user | 3 |
| Max rooms joined per user | 3 |
| Max participants per room | 5 (+ owner) |
| Room code length | 8 characters (alphanumeric) |
| Password minimum | 4 characters |

---

## 5. Room Join Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as /room/join (Frontend)
    participant BE as Backend /api/rooms/join
    participant DB as MongoDB

    U->>FE: Enter room code + password
    FE->>FE: ensureUserInDb(user)
    FE->>BE: POST /api/rooms/join
    Note right of FE: { clerkId, roomCode, password }

    BE->>DB: findUserByClerkId(clerkId)
    BE->>DB: findRoomByCode(roomCode)
    DB-->>BE: Room document

    alt User is owner
        BE-->>FE: Rejoin own room → { roomId }
    else User already member
        BE-->>FE: Rejoin room → { roomId }
    else New member
        BE->>BE: bcrypt.compare(password, hash)
        alt Invalid password
            BE-->>FE: 401 Unauthorized
        else Valid + room not full
            BE->>DB: addUserToRoom(roomId, userId, "editor")
            BE->>DB: addJoinedRoom(userId, roomId)
            BE-->>FE: { roomId, roomCode }
        end
    end

    FE->>FE: router.push("/room/session/{roomId}")
```

---

## 6. Collaborative Session — The Core Flow

This is the heart of ByteSync. The session page (`/room/session/[roomId]`) integrates everything.

```mermaid
sequenceDiagram
    participant U as User Browser
    participant SP as Session Page
    participant REST as Backend REST API
    participant WS as Socket.IO Server
    participant DB as MongoDB
    participant Others as Other Users

    Note over U,Others: === INITIALIZATION ===
    SP->>REST: GET /api/rooms/details/{roomId}
    REST->>DB: findRoomById + resolve owner/participants
    DB-->>REST: Room details (code, language, users)
    REST-->>SP: RoomDetails

    SP->>REST: GET /api/chats/{roomId}?limit=50
    REST->>DB: getMessagesByRoom()
    DB-->>REST: Chat history
    REST-->>SP: Messages[]

    SP->>WS: connect (WebSocket)
    WS-->>SP: connected
    SP->>WS: emit("join-room", { roomId, clerkId })

    WS->>DB: findRoomById + findUserByClerkId
    WS->>WS: Track user in roomUsers Map
    WS->>WS: Initialize code buffer from DB
    WS->>WS: Start 3-min auto-save timer
    WS->>DB: setActiveRoom(userId, roomId)

    WS-->>SP: emit("room-state", { code, language, users })
    WS-->>Others: emit("user-joined", { userId, username, users })

    Note over U,Others: === REAL-TIME EDITING ===
    U->>SP: Types code in Monaco editor
    SP->>SP: handleCodeChange (debounce 150ms)
    SP->>WS: emit("code-change", { code })
    WS->>WS: Buffer code in memory (dirty=true)
    WS-->>Others: emit("code-update", { code, userId })
    Others->>Others: editorRef.setRemoteCode(code)

    Note over U,Others: === CURSOR SYNC ===
    U->>SP: Moves cursor
    SP->>WS: emit("cursor-move", { line, column })
    WS-->>Others: emit("cursor-update", { userId, line, col })
    Others->>Others: updateRemoteCursor() → colored decoration

    Note over U,Others: === CHAT ===
    U->>SP: Sends chat message
    SP->>WS: emit("send-message", { message })
    WS->>DB: createChatMessage()
    WS-->>SP: emit("new-message", { ... })
    WS-->>Others: emit("new-message", { ... })

    Note over U,Others: === AUTO-SAVE (every 3 min) ===
    WS->>WS: Timer fires → flushCodeToDb()
    WS->>DB: updateRoomCode(roomId, code)

    Note over U,Others: === DISCONNECT ===
    U->>SP: Leaves / closes tab
    SP->>WS: emit("leave-room")
    WS->>WS: flushCodeToDb() → final save
    WS->>DB: clearActiveRoom(userId)
    WS-->>Others: emit("user-left", { userId, users })
    WS->>WS: If room empty → stop timer, clear buffer
```

---

## 7. Code Execution Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Session / Solo Page
    participant API as /api/execute (Next.js)
    participant P as Piston API
    participant J as Judge0 CE

    U->>FE: Clicks RUN button
    FE->>FE: setIsRunning(true), start timer
    FE->>API: POST /api/execute
    Note right of FE: { language, code }

    API->>API: Map language → Piston format

    alt Try Piston first
        API->>P: POST emkc.org/api/v2/piston/execute
        Note right of API: 8s timeout
        alt Success
            P-->>API: { run: { stdout, stderr } }
            API-->>FE: { stdout, stderr }
        else Piston unavailable
            API->>J: POST judge0-ce/submissions?wait=true
            Note right of API: 15s timeout
            alt Success
                J-->>API: { stdout, stderr, compile_output }
                API-->>FE: { stdout, stderr }
            else All engines down
                API-->>FE: 503 Service Unavailable
            end
        end
    end

    FE->>FE: Display output in CodeRunner
    FE->>FE: TypewriterText animation on output
```

### Supported Languages
| Language | Piston ID | Judge0 ID |
|---|---|---|
| JavaScript | javascript | 63 |
| Python | python | 71 |
| TypeScript | typescript | 74 |
| C++ | c++ | 54 |
| Java | java | 62 |
| Go | go | 60 |
| Rust | rust | 73 |
| C | c | 50 |

---

## 8. Socket.IO Events Map

```mermaid
graph LR
    subgraph "Client → Server"
        A1["join-room"] --> S["Socket.IO Server"]
        A2["code-change"] --> S
        A3["language-change"] --> S
        A4["cursor-move"] --> S
        A5["send-message"] --> S
        A6["save-code"] --> S
        A7["leave-room"] --> S
    end

    subgraph "Server → Client"
        S --> B1["room-state"]
        S --> B2["code-update"]
        S --> B3["language-update"]
        S --> B4["cursor-update"]
        S --> B5["new-message"]
        S --> B6["user-joined"]
        S --> B7["user-left"]
        S --> B8["code-saved"]
        S --> B9["error"]
    end

    style S fill:#1a4d26,stroke:#00ff41,color:#00ff41
```

| Event | Direction | Payload | Purpose |
|---|---|---|---|
| `join-room` | C→S | `{roomId, clerkId}` | Join a room, receive state |
| `code-change` | C→S | `{code, codeLanguage?}` | Broadcast code edits |
| `language-change` | C→S | `{codeLanguage, code}` | Owner changes language |
| `cursor-move` | C→S | `{line, column}` | Sync cursor position |
| `send-message` | C→S | `{message}` | Send chat message |
| `save-code` | C→S | — | Manual save to DB |
| `leave-room` | C→S | — | Leave current room |
| `room-state` | S→C | `{code, codeLanguage, users}` | Initial room state |
| `code-update` | S→C | `{code, userId}` | Remote code change |
| `language-update` | S→C | `{codeLanguage, code, userId}` | Language changed |
| `cursor-update` | S→C | `{userId, line, column}` | Remote cursor |
| `new-message` | S→C | `{_id, senderId, message, createdAt}` | New chat message |
| `user-joined` | S→C | `{userId, username, users[]}` | User entered room |
| `user-left` | S→C | `{userId, users[]}` | User left room |
| `code-saved` | S→C | `{timestamp}` | Save confirmed |

---

## 9. Data Models (MongoDB)

```mermaid
erDiagram
    USERS {
        ObjectId _id PK
        string clerkId UK
        string username UK
        string email UK
        string name
        string imageUrl
        ObjectId[] joinedRoomIds "max 3"
        ObjectId[] createdRoomIds "max 3"
        ObjectId activeRoomId "nullable"
        Date createdAt
        Date updatedAt
    }

    ROOMS {
        ObjectId _id PK
        ObjectId ownerId FK
        string roomCode UK "8-char"
        string passwordHash
        string codeLanguage
        string code
        AllowedUser[] allowedUsers "max 5"
        boolean isActive
        Date createdAt
        Date updatedAt
    }

    CHATS {
        ObjectId _id PK
        ObjectId roomId FK
        ObjectId senderId FK
        string message
        Date createdAt
    }

    USERS ||--o{ ROOMS : "owns (createdRoomIds)"
    USERS }o--o{ ROOMS : "joins (joinedRoomIds)"
    ROOMS ||--o{ CHATS : "has messages"
    USERS ||--o{ CHATS : "sends"
```

---

## 10. Component Hierarchy

```mermaid
graph TD
    Root["RootLayout"]
    Root --> Clerk["ClerkProvider"]
    Clerk --> Nav["Navbar"]
    Clerk --> Page["Page Content"]

    subgraph "Landing (/)"
        LP["Home Page"]
        LP --> Hero["Hero Section"]
        LP --> Terminal["Terminal Preview"]
        LP --> Features["Feature Cards (×3)"]
        LP --> Footer["Footer"]
    end

    subgraph "Auth (/sign-in, /sign-up)"
        Auth["(auth) layout"]
        Auth --> SIF["SignInForm"]
        Auth --> SUF["SignUpForm"]
    end

    subgraph "Dashboard (/dashboard)"
        Dash["DashboardPage"]
        Dash --> Welcome["Welcome Card"]
        Dash --> Stats["Quick Stats (×3)"]
        Dash --> Rooms["Room Cards"]
        Dash --> RC["RoomCard Component"]
    end

    subgraph "Session (/room/session/:id)"
        Session["SessionPage"]
        Session --> Toolbar["Toolbar (lang, save, run)"]
        Session --> Editor["CodeEditor (Monaco)"]
        Session --> Runner["CodeRunner (output)"]
        Session --> Chat["Chat Panel"]
        Session --> BottomBar["Bottom Bar (participants)"]
        Editor --> MonacoE["Monaco Editor"]
        Editor --> Cursors["Remote Cursors (decorations)"]
        Runner --> TW["TypewriterText"]
    end

    subgraph "Solo (/room/solo)"
        Solo["SoloRoomPage"]
        Solo --> SE["CodeEditor"]
        Solo --> SR["CodeRunner"]
    end

    Page --> LP & Auth & Dash & Session & Solo

    style Session fill:#0a150a,stroke:#00ff41,color:#00ff41
```

---

## 11. REST API Endpoints

### Next.js API Routes (Frontend Server)

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/users` | Upsert Clerk user into MongoDB |
| `POST` | `/api/execute` | Execute code via Piston/Judge0 |
| `POST` | `/api/webhooks/clerk` | Clerk webhook handler |
| `GET` | `/api/health` | Health check |

### Backend Express API (Port 4000)

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/rooms/create` | Create a new room |
| `POST` | `/api/rooms/join` | Join a room by code + password |
| `POST` | `/api/rooms/leave` | Leave a room |
| `GET` | `/api/rooms/details/:roomId` | Get room with resolved participants |
| `GET` | `/api/rooms/:roomCode` | Get room info by code |
| `GET` | `/api/rooms/user/:clerkId` | Get rooms owned by user |
| `DELETE` | `/api/rooms/:roomId` | Soft-delete room (owner only) |
| `GET` | `/api/users/:clerkId/rooms` | Get user's created + joined rooms |
| `POST` | `/api/users/set-active` | Set user's active room |
| `POST` | `/api/users/clear-active` | Clear user's active room |
| `GET` | `/api/chats/:roomId` | Get chat history (paginated) |

---

## 12. Auto-Save & Code Persistence Strategy

```mermaid
graph TD
    A["User types code"] -->|"debounce 150ms"| B["emit code-change"]
    B --> C["Server buffers in memory"]
    C --> D{"dirty flag = true"}

    D -->|"Every 3 minutes"| E["flushCodeToDb()"]
    E --> F["updateRoomCode() → MongoDB"]
    F --> G["dirty = false"]

    D -->|"Manual SAVE button"| H["emit save-code"]
    H --> E

    D -->|"User leaves room"| I["handleLeaveRoom()"]
    I --> E
    I --> J["clearActiveRoom()"]
    I --> K{"Room empty?"}
    K -->|Yes| L["Stop timer, clear buffer"]
    K -->|No| M["Continue timer"]

    style E fill:#1a4d26,stroke:#00ff41,color:#00ff41
```

> [!IMPORTANT]
> Code is **never** written to MongoDB on every keystroke. It's buffered in-memory and flushed:
> 1. Every **3 minutes** via interval timer
> 2. On **manual save** (SAVE button)
> 3. When the **last user leaves** the room

---

## 13. Remote Cursor Sync Flow

```mermaid
graph LR
    A["User A moves cursor"] -->|"throttled 50ms"| B["emit cursor-move"]
    B --> C["Socket.IO Server"]
    C --> D["Broadcast to room"]
    D --> E["User B receives cursor-update"]
    E --> F["updateRemoteCursor()"]
    F --> G["ensureCursorCSS() — inject per-user styles"]
    F --> H["deltaDecorations() — Monaco decorations"]
    H --> I["Colored cursor line + label"]

    style I fill:#1a4d26,stroke:#00ff41,color:#00ff41
```

Each remote cursor has:
- **Colored vertical line** (2px border-left, pulsing animation)
- **Username label** above cursor (::after pseudo-element)
- **Highlighted line background** (subtle tint)
- **7 color palette** cycling per participant

---

## 14. Complete User Journey — End to End

```mermaid
graph TD
    Start(["🌐 User opens ByteSync"]) --> LP["Landing Page"]
    LP --> AuthCheck{Signed in?}

    AuthCheck -->|No| SignUp["Sign Up / Sign In"]
    SignUp --> AuthDone["Clerk authenticates"]
    AuthDone --> Sync["ensureUserInDb() → MongoDB"]
    Sync --> Dashboard

    AuthCheck -->|Yes| Dashboard["Dashboard"]

    Dashboard --> Action{What to do?}

    Action -->|"Create Room"| CR["Create Room Page"]
    CR --> SetLang["Pick language"]
    CR --> SetPwd["Set password"]
    CR --> CreateAPI["POST /api/rooms/create"]
    CreateAPI --> Session

    Action -->|"Join Room"| JR["Join Room Page"]
    JR --> EnterCode["Enter room code"]
    JR --> EnterPwd["Enter password"]
    JR --> JoinAPI["POST /api/rooms/join"]
    JoinAPI --> Session

    Action -->|"Solo Room"| Solo["Solo Room"]
    Solo --> SoloEdit["Edit code (local only)"]
    SoloEdit --> SoloRun["Run code → Piston/Judge0"]

    Action -->|"Quick Join"| Session

    Session["📟 Collaborative Session"]
    Session --> SocketConnect["WebSocket connects"]
    SocketConnect --> RoomState["Receive room-state"]

    Session --> Edit["Edit code in Monaco"]
    Edit --> Broadcast["Broadcast to all users"]
    Broadcast --> RemoteUpdate["Others see changes instantly"]

    Session --> RunCode["Run code"]
    RunCode --> Execute["/api/execute → Piston/Judge0"]
    Execute --> Output["See output (typewriter effect)"]

    Session --> ChatMsg["Send chat message"]
    ChatMsg --> ChatBroadcast["Broadcast to room"]

    Session --> Save["Save code (manual/auto)"]
    Save --> MongoDB["Persist to MongoDB"]

    Session --> Leave["Leave room"]
    Leave --> FinalSave["Flush code to DB"]
    Leave --> Dashboard

    style Session fill:#0a150a,stroke:#00ff41,color:#00ff41
    style Dashboard fill:#0a120a,stroke:#00cc33,color:#00cc33
```

---

## 15. Tech Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | Next.js 16, React 19, TailwindCSS 4 | App framework, UI |
| **Auth** | Clerk (`@clerk/nextjs`) | Authentication, user management |
| **Editor** | Monaco Editor (`@monaco-editor/react`) | Code editing with syntax highlighting |
| **Animations** | Framer Motion | UI transitions, chat bubbles, participant entrances |
| **Real-time** | Socket.IO (client + server) | WebSocket-based collaboration |
| **Backend** | Express.js + TypeScript | REST API server |
| **Database** | MongoDB (native driver) | User, Room, Chat persistence |
| **Code Execution** | Piston API + Judge0 CE | Remote code compilation & execution |
| **Validation** | Zod + React Hook Form | Form validation |
| **Styling** | CSS Variables + Dark/Light themes | Retro terminal aesthetic |
| **Fonts** | VT323 (mono display) + IBM Plex Mono | Terminal typography |
| **Deployment** | Docker + Vercel (FE) + Render (BE) | Production infrastructure |
