import { supabase } from "../lib/supabase";
import { ChunkResult } from "../types";

export async function searchChunks(
  embedding: number[],
  documentId: string,
  userId: string
): Promise<ChunkResult[]> {
  const { data, error } = await supabase.rpc("match_chunks", {
    query_embedding: embedding,
    match_user_id: userId,
    match_document_id: documentId,
    match_count: 5,
  });

  if (error) throw new Error(`Vector search failed: ${error.message}`);

  return data as ChunkResult[];
}
