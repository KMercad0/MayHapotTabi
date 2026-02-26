import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "../lib/supabase";
import { embedQuery } from "../services/embeddings";
import { searchChunks } from "../services/vectorSearch";
import { anthropic } from "../services/anthropic";
import { ChunkResult } from "../types";

const SYSTEM_MESSAGE =
  "You are a helpful assistant. Answer the user's question based only on " +
  "the provided document context. If the answer is not in the context, " +
  "say so honestly. Do not make up information.";

const router = Router();

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { documentId, message, history } = req.body as {
    documentId?: string;
    message?: string;
    history?: Anthropic.MessageParam[];
  };

  // 1. Validate required fields
  if (!documentId || !message || !Array.isArray(history)) {
    res.status(400).json({
      error: "Missing required fields: documentId, message, history",
    });
    return;
  }

  const userId = req.user!.id;

  // 2. Verify document belongs to this user
  const { data: doc } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .eq("user_id", userId)
    .single();

  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }

  // 3 & 4. Embed query + vector search — must complete before committing to SSE
  let chunks: ChunkResult[];
  try {
    const queryEmbedding = await embedQuery(message);
    chunks = await searchChunks(queryEmbedding, documentId, userId);
  } catch (err) {
    console.error("RAG pipeline error:", err);
    res.status(500).json({ error: "Failed to process query" });
    return;
  }

  // 5. Build prompt
  const context = chunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n");
  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: `Context:\n${context}\n\nQuestion: ${message}` },
  ];

  // 6. Commit to SSE — no JSON errors after this point
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const stream = anthropic.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_MESSAGE,
      messages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        res.write(`data: ${JSON.stringify({ token: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    console.error("Stream error:", err);
    res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
  } finally {
    res.end();
  }
});

export default router;
