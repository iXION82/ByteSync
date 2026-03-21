# Next.js Starter Template

A production-ready Next.js 16 starter with **Clerk authentication**, **MongoDB integration**, **Docker support**, and **custom auth pages** — clone, configure, and ship.

## ✨ Features

- **Clerk Authentication** — Sign-in, sign-up, email verification, session management
- **Custom Auth Pages** — Beautiful glassmorphism forms (no default Clerk UI)
- **MongoDB with Cached Connection** — `globalThis` pattern prevents connection leaks during dev hot-reloads
- **User Data Sync** — Clerk webhook with Svix signature verification syncs users to MongoDB
- **Current User Helper** — `getCurrentDbUser()` bridges Clerk sessions to MongoDB documents
- **Form Ready** — Zod + React Hook Form + resolvers pre-installed
- **Dark Mode UI** — Premium design system with gradient accents and micro-animations
- **Error & Loading States** — Global `error.tsx` / `loading.tsx` are included out of the box
- **Health Endpoint** — `/api/health` for container readiness probes
- **Dockerized** — Multi-stage Dockerfile + Docker Compose for one-command deploys
- **TypeScript** — Full type safety throughout
- **Tailwind CSS v4** — Utility-first styling

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx               # Auth group layout
│   │   ├── sign-in/page.tsx         # Custom sign-in page
│   │   └── sign-up/page.tsx         # Custom sign-up page
│   ├── api/
│   │   ├── health/route.ts          # Health-check endpoint
│   │   └── webhooks/clerk/route.ts  # Clerk → MongoDB webhook (Svix verified)
│   ├── dashboard/page.tsx           # Protected dashboard
│   ├── error.tsx                    # Global error boundary
│   ├── globals.css                  # Design system
│   ├── layout.tsx                   # Root layout with ClerkProvider
│   ├── loading.tsx                  # Global loading state
│   └── page.tsx                     # Landing page
├── components/
│   ├── auth/
│   │   ├── SignInForm.tsx           # Custom sign-in form (Clerk v7 hooks)
│   │   └── SignUpForm.tsx           # Custom sign-up form + email verification
│   └── Navbar.tsx                   # Auth-aware navigation bar
├── lib/
│   ├── auth.ts                      # getCurrentDbUser() helper
│   └── mongodb.ts                   # Cached MongoDB connection
├── models/
│   └── User.ts                      # User document interface + CRUD helpers
└── proxy.ts                         # Clerk route middleware
```

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd web
npm install
```

### 2. Configure Environment

Copy the example and fill in your keys:

```bash
cp .env.example .env.local
```

```env
# Clerk (get from https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx

# Routes
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard

# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/mydb

# Clerk Webhook (optional, for user sync)
CLERK_WEBHOOK_SECRET=whsec_xxxxx
```

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 🗄️ MongoDB Connection

The connection utility at `src/lib/mongodb.ts` caches the client on `globalThis` to survive Next.js hot-reloads in development:

```typescript
import clientPromise, { getDatabase } from "@/lib/mongodb";

// Option 1: Use the client directly
const client = await clientPromise;
const db = client.db("myDatabase");

// Option 2: Use the helper
const db = await getDatabase("myDatabase");
const users = await db.collection("users").find({}).toArray();
```

## 👤 Getting the Current User

Use `getCurrentDbUser()` in any **server component** or **server action** to get the MongoDB user document for the signed-in user:

```typescript
import { getCurrentDbUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await getCurrentDbUser();

  if (!user) {
    return <p>Please sign in.</p>;
  }

  return <p>Hello, {user.name}! Email: {user.email}</p>;
}
```

## 🔗 Clerk Webhook Setup

To sync users to MongoDB automatically:

1. Go to [Clerk Dashboard → Webhooks](https://dashboard.clerk.com)
2. Add endpoint: `https://your-domain.com/api/webhooks/clerk`
3. Subscribe to: `user.created`, `user.updated`, `user.deleted`
4. Copy the **Signing Secret** to `CLERK_WEBHOOK_SECRET` in `.env.local`

The webhook verifies signatures with Svix — unsigned requests are rejected with `401`.

> **Local development**: Use [ngrok](https://ngrok.com) to expose your local server to Clerk webhooks:
> ```bash
> ngrok http 3000
> ```

## 🐳 Docker

### With Docker Compose (recommended)

Make sure your `.env.local` has all required keys, then:

```bash
docker compose up --build
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Standalone Docker Build

```bash
# Build the image (pass public keys as build args)
docker build \
  --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx \
  -t nextjs-starter .

# Run (pass runtime secrets as env vars)
docker run -p 3000:3000 \
  -e CLERK_SECRET_KEY=sk_test_xxxxx \
  -e MONGODB_URI=mongodb+srv://... \
  -e CLERK_WEBHOOK_SECRET=whsec_xxxxx \
  nextjs-starter
```

> **Key distinction**: `NEXT_PUBLIC_*` vars are baked in at **build time** (via `--build-arg`). Server-only secrets (`CLERK_SECRET_KEY`, `MONGODB_URI`) are passed at **runtime** (via `-e`).

### Docker Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build (deps → build → minimal Alpine runner) |
| `docker-compose.yml` | One-command setup, reads from `.env.local` |
| `.dockerignore` | Keeps image lean (~150 MB vs ~1 GB) |

## 📦 Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16 | React framework |
| `react` | 19 | UI library |
| `@clerk/nextjs` | 7 | Authentication provider |
| `mongodb` | 7 | MongoDB Node.js driver |
| `svix` | 1 | Webhook signature verification |
| `zod` | 4 | Schema validation |
| `react-hook-form` | 7 | Form state management |
| `@hookform/resolvers` | 5 | Zod integration for react-hook-form |
| `framer-motion` | 12 | Animations |
| `lucide-react` | — | Icon library |
| `clsx` | — | Conditional class names |
| `tailwindcss` | 4 | Utility-first CSS |

## 🛠️ Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `docker compose up --build` | Build & run via Docker |

## 📄 License

MIT
