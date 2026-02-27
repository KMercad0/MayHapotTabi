# MayHapotTabi — Project Planning Document

> AI-powered PDF document assistant. Upload a PDF, chat with it.
> **Status:** Phase 1 Complete — Backend RAG pipeline working end-to-end
> **Last Updated:** 2026-02-26

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Repository Structure](#repository-structure)
4. [Database Schema](#database-schema)
5. [API Routes](#api-routes)
6. [Frontend Structure](#frontend-structure)
7. [RAG Pipeline](#rag-pipeline)
8. [Auth Flow](#auth-flow)
9. [Environment Variables](#environment-variables)
10. [Deployment](#deployment)
11. [Phase Checklist](#phase-checklist)
12. [Claude Code Session Rules](#claude-code-session-rules)

---

## Project Overview

**Name:** MayHapotTabi  
**Tagline:** Ask anything. From any document.  
**Type:** Full-stack SaaS-style web app (portfolio project)  
**Purpose:** Bridge the experience gap — demonstrates RAG pipeline, AI integration, auth with RLS, Docker, CI/CD, and TypeScript in one deployable project.

### V1 Scope (do not expand until these are done)
- [ ] User authentication (email/password via Supabase Auth)
- [ ] PDF upload (stored in Supabase Storage)
- [ ] PDF text extraction + chunking + embedding
- [ ] Vector similarity search (Supabase pgvector)
- [ ] Chat interface with streaming responses (Anthropic API)
- [ ] Each user only sees their own documents (Row Level Security)

### Out of Scope for V1
- Document history UI (V2)
- n8n automation (V2)
- Multiple file formats (V2)
- Sharing documents with other users (V2)

---

## Tech Stack

### Frontend
| Layer | Choice | Reason |
|---|---|---|
| Framework | React + Vite | Familiar, fast dev server |
| Language | TypeScript | Required for resume gap |
| Styling | Tailwind CSS | Fast, no context switching |
| Auth UI | Supabase Auth UI | Pre-built, saves tokens |
| HTTP Client | axios | Simple, familiar |
| Deploy | Vercel | Free, GitHub integration |

### Backend
| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js | Familiar |
| Framework | Express | Simple, widely understood |
| Language | TypeScript | Consistent with frontend |
| PDF Parsing | pdf-parse | Lightweight, no external service |
| Embeddings | Anthropic API (voyage-3) | Same provider as chat |
| AI Chat | Anthropic API (claude-haiku-4-5) | Cheapest Claude model for chat |
| Container | Docker | Core skill gap to fill |
| Deploy | Railway | Free tier, Docker-native |

### Database & Storage
| Layer | Choice | Reason |
|---|---|---|
| Database | Supabase (PostgreSQL) | Free, pgvector built-in |
| Vector Search | pgvector extension | No separate vector DB needed |
| File Storage | Supabase Storage | Same project, free tier |
| Auth | Supabase Auth | Built-in RLS integration |

> **Why claude-haiku-4-5 for chat?** It's the cheapest Claude model. For a portfolio project, Haiku is fast and costs ~20x less than Sonnet. Switch to Sonnet only if output quality is visibly bad.

---

## Repository Structure

```
mayhapottabi/
├── frontend/                  # React + Vite app → deploys to Vercel
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── SignupForm.tsx
│   │   │   ├── Document/
│   │   │   │   ├── UploadZone.tsx
│   │   │   │   └── DocumentList.tsx
│   │   │   └── Chat/
│   │   │       ├── ChatWindow.tsx
│   │   │       ├── ChatMessage.tsx
│   │   │       └── ChatInput.tsx
│   │   ├── lib/
│   │   │   ├── supabase.ts       # Supabase client
│   │   │   └── api.ts            # axios instance pointing to backend
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx     # Upload + document list
│   │   │   └── Chat.tsx          # Chat with a specific document
│   │   ├── types/
│   │   │   └── index.ts          # Shared TypeScript types
│   │   └── App.tsx
│   ├── .env.local                # Frontend env vars (never commit)
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                   # Express API → deploys to Railway via Docker
│   ├── src/
│   │   ├── routes/
│   │   │   ├── upload.ts         # POST /upload
│   │   │   └── chat.ts           # POST /chat
│   │   ├── services/
│   │   │   ├── pdf.ts            # PDF extraction + chunking
│   │   │   ├── embeddings.ts     # Generate + store embeddings
│   │   │   ├── vectorSearch.ts   # Query pgvector
│   │   │   └── anthropic.ts      # Chat with context
│   │   ├── middleware/
│   │   │   └── auth.ts           # Verify Supabase JWT
│   │   ├── lib/
│   │   │   └── supabase.ts       # Supabase admin client
│   │   └── index.ts              # Express entry point
│   ├── Dockerfile
│   ├── .env                      # Backend env vars (never commit)
│   └── package.json
│
├── .github/
│   └── workflows/
│       └── deploy.yml            # CI/CD: push to main → deploy to Railway
│
├── PLANNING.md                   # This file — always keep updated
└── README.md                     # Public-facing project description
```

---

## Database Schema

Run these in Supabase SQL editor (or via Supabase MCP).

```sql
-- Enable pgvector extension
create extension if not exists vector;

-- Documents table
-- Each row = one uploaded PDF
create table documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,                    -- original filename
  storage_path text not null,                   -- path in Supabase Storage
  created_at  timestamptz default now()
);

-- Chunks table
-- Each row = one text chunk from a PDF + its embedding
create table document_chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  content     text not null,                    -- raw text of this chunk
  embedding   vector(1024),                     -- embedding vector
  chunk_index integer not null,                 -- order within document
  created_at  timestamptz default now()
);

-- Index for fast vector search
create index on document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Row Level Security: users only see their own data
alter table documents enable row level security;
alter table document_chunks enable row level security;

create policy "Users see own documents"
  on documents for all
  using (auth.uid() = user_id);

create policy "Users see own chunks"
  on document_chunks for all
  using (auth.uid() = user_id);

-- Vector search function (called from backend)
create or replace function match_chunks(
  query_embedding vector(1536),
  match_user_id   uuid,
  match_document_id uuid,
  match_count     int default 5
)
returns table (
  id          uuid,
  content     text,
  chunk_index integer,
  similarity  float
)
language sql stable
as $$
  select
    id,
    content,
    chunk_index,
    1 - (embedding <=> query_embedding) as similarity
  from document_chunks
  where user_id = match_user_id
    and document_id = match_document_id
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

---

## API Routes

### Backend (Express on Railway)

```
POST   /upload
  - Auth: required (JWT in Authorization header)
  - Body: multipart/form-data { file: PDF }
  - Action: store file → extract text → chunk → embed → store chunks
  - Returns: { documentId, name, chunkCount }

POST   /chat
  - Auth: required
  - Body: { documentId: string, message: string, history: Message[] }
  - Action: embed message → vector search → build prompt → stream response
  - Returns: SSE stream of text chunks

GET    /health
  - Auth: none
  - Returns: { status: "ok" }
```

### Frontend calls backend for:
- `/upload` — file upload + processing
- `/chat` — all AI interactions

### Frontend calls Supabase directly for:
- Auth (login, signup, session)
- Fetching document list (via Supabase client with RLS)

---

## Frontend Structure

### Pages
```
/login          → LoginForm + SignupForm tabs
/dashboard      → UploadZone + list of user's documents
/chat/:docId    → ChatWindow for a specific document
```

### Key Component Behaviors

**UploadZone.tsx**
- Drag-and-drop or click to upload
- Only accepts PDF (validate on frontend AND backend)
- Shows upload progress
- On success, refreshes document list

**ChatWindow.tsx**
- Renders message history
- Input at bottom
- Streams response token by token (SSE)
- Shows "thinking..." indicator while waiting

**Auth flow**
- Supabase handles session storage automatically
- On app load, check session → redirect to /login if none
- JWT from Supabase session is sent as `Authorization: Bearer <token>` to backend

---

## RAG Pipeline

This is the core of the app. Understand every step.

```
UPLOAD FLOW:
1. User uploads PDF via frontend
2. Frontend sends file to POST /upload with JWT
3. Backend verifies JWT (Supabase auth.getUser)
4. Backend stores file in Supabase Storage: uploads/{userId}/{docId}.pdf
5. Backend inserts row in documents table
6. Backend extracts text from PDF using pdf-parse
7. Backend splits text into chunks (~400 tokens, 50 token overlap)
8. For each chunk, backend calls Anthropic embeddings API → vector[1536]
9. Backend batch-inserts all chunks into document_chunks table
10. Backend returns { documentId, chunkCount } to frontend

CHAT FLOW:
1. User types a message in ChatWindow
2. Frontend sends { documentId, message, history } to POST /chat with JWT
3. Backend verifies JWT
4. Backend embeds the user's message (same embeddings model)
5. Backend calls match_chunks() Supabase function → top 5 similar chunks
6. Backend builds prompt:
   "You are a helpful assistant. Answer based only on the context below.
    Context: [chunk1] [chunk2] [chunk3] [chunk4] [chunk5]
    Question: [user message]"
7. Backend calls Anthropic API (claude-haiku-4-5) with streaming enabled
8. Backend pipes SSE stream back to frontend
9. Frontend renders tokens as they arrive
```

---

## Auth Flow

```
SIGNUP:
1. User submits email + password
2. Frontend calls supabase.auth.signUp()
3. Supabase sends confirmation email (configure in Supabase dashboard)
4. User confirms → session created → redirect to /dashboard

LOGIN:
1. User submits email + password
2. Frontend calls supabase.auth.signInWithPassword()
3. Session stored in localStorage by Supabase client automatically
4. Redirect to /dashboard

BACKEND AUTH:
1. Frontend reads session: supabase.auth.getSession()
2. Attaches JWT to every backend request: Authorization: Bearer <access_token>
3. Backend middleware calls supabase.auth.getUser(token)
4. If invalid → 401 Unauthorized
5. If valid → req.user = { id, email } → proceed to route handler

LOGOUT:
1. Frontend calls supabase.auth.signOut()
2. Redirect to /login
```

---

## Environment Variables

### Frontend (`frontend/.env.local`)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_BACKEND_URL=http://localhost:3000   # change to Railway URL after deploy
```

### Backend (`backend/.env`)
```
PORT=3000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=       # admin key — never expose to frontend
ANTHROPIC_API_KEY=
FRONTEND_URL=http://localhost:5173  # change to Vercel URL after deploy
VOYAGE_API_KEY=
```

> Get these values from:
> - Supabase: Project Settings → API
> - Anthropic: console.anthropic.com → API Keys
> - Railway: auto-injected after deploy setup

---

## Deployment

### Backend → Railway
1. Push code to GitHub
2. Railway connects to repo, detects Dockerfile
3. Set env vars in Railway dashboard (same as backend/.env)
4. Railway builds Docker image and deploys
5. Copy the Railway URL → update VITE_BACKEND_URL in Vercel

### Frontend → Vercel
1. Connect GitHub repo to Vercel
2. Set root directory to `frontend/`
3. Set env vars in Vercel dashboard (same as frontend/.env.local)
4. Vercel builds and deploys on every push to main

### CI/CD (GitHub Actions)
- On push to main → Railway auto-deploys backend via webhook
- On push to main → Vercel auto-deploys frontend (built-in)

### Docker (backend/Dockerfile)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

---

## Phase Checklist

### Phase 0 — Setup ✅ (in progress)
- [x] GitHub repo created
- [x] Supabase project created
- [x] Railway account created
- [x] Run database schema SQL in Supabase
- [x] Create Supabase Storage bucket named `uploads`
- [x] Add `.env` files (do not commit)
- [x] Add `.gitignore` (node_modules, .env, dist)

### Phase 1 — Backend (Week 1)
- [x] Express + TypeScript scaffold
- [x] Auth middleware working
- [x] POST /upload — file stored in Supabase Storage
- [x] PDF extraction + chunking working
- [x] Embeddings generated and stored
- [x] POST /chat — vector search + Anthropic streaming working
- [x] Test with Postman/curl

### Phase 2 — Frontend (Week 2)
- [x] React + Vite + TypeScript scaffold
- [x] Design system (Geist fonts, CSS variables, light/dark toggle)
- [x] Routing (App.tsx with protected routes)
- [x] Login/Signup pages
- [x] Dashboard with upload
- [x] Chat page with streaming UI
- [x] Auth tokens sent to backend correctly
- [x] End-to-end test: upload PDF → ask question → get answer

### Phase 3 — Docker + Deploy (Week 3)
- [ ] Dockerfile written and tested locally
- [ ] docker-compose for local dev (backend + any local services)
- [ ] Backend deployed to Railway
- [ ] Frontend deployed to Vercel
- [ ] GitHub Actions deploy workflow
- [ ] End-to-end test on production URLs

### Phase 4 — Polish (Week 4)
- [ ] README with live demo URL + screenshots
- [ ] Error handling (upload fails, API errors, auth errors)
- [ ] Loading states on all async actions
- [ ] Mobile responsive
- [ ] n8n automation (stretch goal)

---

## Claude Code Session Rules

**Read this at the start of every Claude Code session.**

1. This project is called MayHapotTabi
2. Monorepo: `frontend/` (React/Vite/TypeScript → Vercel) and `backend/` (Express/TypeScript → Railway/Docker)
3. Database: Supabase (PostgreSQL + pgvector + Storage + Auth)
4. AI: Anthropic API — embeddings for vectors, claude-haiku-4-5 for chat
5. Always use TypeScript strict mode
6. Never expose SUPABASE_SERVICE_ROLE_KEY to the frontend
7. All backend routes except /health require auth middleware
8. RLS is enabled — do not bypass it with the service role key in routes
9. Use the morph MCP for edits to existing files — do not rewrite whole files
10. Use context7 MCP before any Supabase or Anthropic API integration work
11. One task per session — complete it fully before moving on
12. Update this PLANNING.md when schema or routes change
