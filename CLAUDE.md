# MayHapotTabi — Claude Code Reference

## Project
AI-powered PDF document assistant. Monorepo: frontend/ + backend/

## Stack
- Frontend: React + Vite + TypeScript → Vercel (localhost:5173)
- Backend: Express + TypeScript + Docker → Railway (localhost:3000)
- Database: Supabase (PostgreSQL + pgvector + Auth + Storage)
- AI: Anthropic API (claude-haiku-4-5-20251001 for chat, Voyage AI voyage-3 for embeddings, 1024 dimensions)
- Auth: Supabase Auth → JWT sent as Bearer token to backend

## Key Rules
1. TypeScript strict mode, no any types
2. Never expose SUPABASE_SERVICE_ROLE_KEY to frontend
3. All backend routes except /health require verifyAuth middleware
4. Use morph-mcp for all edits to existing files — never rewrite whole files
5. Use context7 before any Supabase or Anthropic SDK integration work
6. One task per session — complete fully before moving on
7. Run npm run build and confirm zero errors after every task

## Design Rules (frontend only)
1. Brutalist minimal — borders over shadows, no gradients
2. No blue/purple anywhere — accent is inverted black/white
3. Geist Sans for body, Geist Mono for metadata/filenames/timestamps
4. Phosphor icons only — never lucide-react
5. rounded-md maximum — no pill shapes
6. Light/dark toggle via .dark class on <html>
7. No emojis in UI

## File Structure
backend/src/
  routes/        upload.ts, chat.ts
  services/      pdf.ts, embeddings.ts, vectorSearch.ts, anthropic.ts
  middleware/    auth.ts
  lib/           supabase.ts
  types/         index.ts

frontend/src/
  components/    ui/ layout/ auth/ document/ chat/
  pages/         Login.tsx, Dashboard.tsx, Chat.tsx
  lib/           supabase.ts, api.ts
  hooks/         useAuth.ts
  types/         index.ts

## Current Status
- Phase 1 complete: backend RAG pipeline working end-to-end
- Phase 2 in progress: frontend scaffold done, Login page next
- Vector dimensions: 1024 (voyage-3)
