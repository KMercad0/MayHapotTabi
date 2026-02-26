import { SupabaseClient } from "@supabase/supabase-js";
import { ChunkRow } from "../types";

interface VoyageResponse {
  data: Array<{ embedding: number[] }>;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("Missing environment variable: VOYAGE_API_KEY");

  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "voyage-3", input: [text] }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Voyage API error ${response.status}: ${body}`);
  }

  const result = (await response.json()) as VoyageResponse;
  return result.data[0].embedding;
}

export async function storeChunks(
  chunks: string[],
  documentId: string,
  userId: string,
  supabaseClient: SupabaseClient
): Promise<void> {
  const rows: ChunkRow[] = await Promise.all(
    chunks.map(async (content, index) => {
      const embedding = await generateEmbedding(content);
      return {
        document_id: documentId,
        user_id: userId,
        content,
        embedding: `[${embedding.join(",")}]`,
        chunk_index: index,
      };
    })
  );

  const { error } = await supabaseClient.from("document_chunks").insert(rows);

  if (error) {
    throw new Error(`Failed to store chunks: ${error.message}`);
  }
}

export async function embedQuery(text: string): Promise<number[]> {
  return generateEmbedding(text);
}
