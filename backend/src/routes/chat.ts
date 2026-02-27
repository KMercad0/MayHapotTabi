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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const router = Router();

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { documentId, message, history } = req.body as {
    documentId?: string;
    message?: string;
    history?: Anthropic.MessageParam[];
  };

  // 1. Validate documentId
  if (!documentId || !UUID_RE.test(documentId)) {
    res.status(400).json({ error: "Invalid document ID" });
    return;
  }

  // 2. Validate message
  const trimmedMessage = message?.trim() ?? "";
  if (!trimmedMessage) {
    res.status(400).json({ error: "Message cannot be empty" });
    return;
  }
  if (trimmedMessage.length > 2000) {
    res.status(400).json({ error: "Message too long" });
    return;
  }

  if (!Array.isArray(history)) {
    res.status(400).json({ error: "Missing required fields: documentId, message, history" });
    return;
  }

  const userId = req.user!.id;

  // 3. Verify document belongs to this user
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

  // 4 & 5. Embed query + vector search — must complete before committing to SSE
  let chunks: ChunkResult[];
  try {
    const queryEmbedding = await embedQuery(trimmedMessage);
    chunks = await searchChunks(queryEmbedding, documentId, userId);
  } catch (err) {
    console.error("RAG pipeline error:", err);
    res.status(500).json({ error: "Failed to process query" });
    return;
  }

  // Set SSE headers — no JSON errors after this point
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  // 6. If no chunks found, return a helpful message without calling Anthropic
  if (chunks.length === 0) {
    const noContentMsg =
      "I couldn't find relevant content in this document to answer your question. Try rephrasing or asking something else.";
    res.write(`data: ${JSON.stringify({ token: noContentMsg })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
    return;
  }

  // 7. Build prompt
  const context = chunks.map((c, i) => `[${i + 1}] ${c.content}`).join("\n\n");
  const systemWithContext =
    SYSTEM_MESSAGE + "\n\nDocument context for this query:\n" + context;
  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: trimmedMessage },
  ];

  // 8. Stream Anthropic response
  try {
    const stream = anthropic.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemWithContext,
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
