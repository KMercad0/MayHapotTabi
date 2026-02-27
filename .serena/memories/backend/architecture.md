# Backend Architecture

## Entry Point
`backend/src/index.ts` — Express app, cors+json middleware, mounts routes

## Routes
- `GET /health` — { status, timestamp }, no auth
- `POST /upload` — verifyAuth → multer (10MB, PDF only) → storage → DB → embed → chunks
- `POST /chat` — verifyAuth → validate body → ownership check → embed → vector search → SSE stream

## Services
- `pdf.ts`: extractTextFromPdf(buffer), chunkText(text) — 1600 chars/chunk, 200 overlap
- `embeddings.ts`: generateEmbedding(text), embedQuery(text), storeChunks(chunks, docId, userId, client)
  - Voyage API: POST https://api.voyageai.com/v1/embeddings, model: voyage-3
- `vectorSearch.ts`: searchChunks(embedding, docId, userId) — supabase.rpc("match_chunks", {..., match_count:5})
- `anthropic.ts`: exports `anthropic` client instance

## Middleware
- `verifyAuth`: reads Bearer token → supabase.auth.getUser(token) → sets req.user = {id, email}

## Types (src/types/index.ts)
- AuthUser, DocumentRow, ChunkRow, ChunkResult
- Express.Request global augmentation (user?: AuthUser)

## Key Patterns
- Storage rollback: if anything fails after file upload → supabase.storage.from("uploads").remove([path])
- SSE headers set AFTER embed+search succeed (so JSON errors still possible before streaming)
- req.user! non-null assertion is safe after verifyAuth runs

## Env Vars
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (throw at startup if missing)
- ANTHROPIC_API_KEY (throw at startup if missing)
- VOYAGE_API_KEY (throw at startup if missing)
- PORT (default 3000)
