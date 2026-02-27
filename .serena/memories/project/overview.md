# MayHapotTabi — Project Overview

## Root
`C:\Users\LarkLarkLark\Desktop\Workwork\Claude Projects\MayHapotTabi\MayHapotTabi\`

## Stack
- Frontend: React + Vite + TypeScript (localhost:5173) → Vercel
- Backend: Express + TypeScript + Docker (localhost:3000) → Railway
- DB: Supabase (PostgreSQL + pgvector + Auth + Storage)
- AI: claude-haiku-4-5-20251001 (chat), Voyage AI voyage-3 (embeddings, 1024 dims)
- Auth: Supabase Auth → JWT Bearer token to backend

## Rules (from CLAUDE.md)
1. TypeScript strict mode, no any types
2. Never expose SUPABASE_SERVICE_ROLE_KEY to frontend
3. All backend routes except /health require verifyAuth middleware
4. Use morph-mcp for all edits to existing files
5. Use context7 before any Supabase or Anthropic SDK integration work
6. One task per session — complete fully before moving on
7. Run npm run build and confirm zero errors after every task

## Design Rules (frontend)
1. Brutalist minimal — borders over shadows, no gradients
2. No blue/purple — accent is inverted black/white
3. Geist Sans body, Geist Mono for metadata/filenames/timestamps
4. Phosphor icons only (never lucide-react)
5. rounded-md maximum — no pill shapes
6. Light/dark toggle via .dark class on html element
7. No emojis in UI
