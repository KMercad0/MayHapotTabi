# MayHapotTabi — Current Status

## Phase 1: Backend RAG Pipeline — COMPLETE
- POST /upload: PDF → Supabase Storage → document row → chunk → Voyage embed → document_chunks
- POST /chat: embed query → pgvector match_chunks RPC → Anthropic SSE stream
- GET /health: unauthenticated health check
- All routes except /health protected by verifyAuth

## Phase 2: Frontend — IN PROGRESS
- Scaffold: complete (Vite + React + TS + Tailwind v3 + shadcn neutral)
- Login page: complete (sign in + create account, useAuth hook, sonner toasts)
- Dashboard page: TODO stub
- Chat page: TODO stub

## Next Tasks
- Dashboard: list user's uploaded documents, upload new PDF
- Chat: SSE streaming chat UI with document context
- useAuth signOut: wire up to header/nav
