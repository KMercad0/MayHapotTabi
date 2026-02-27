export interface SSEParsedItem {
  token?: string;
  done?: boolean;
  error?: string;
}

export function parseSSEChunk(chunk: string): SSEParsedItem[] {
  const results: SSEParsedItem[] = [];
  const parts = chunk.split("\n\n");
  for (const part of parts) {
    if (!part.startsWith("data: ")) continue;
    const json = part.slice("data: ".length);
    try {
      const parsed = JSON.parse(json) as SSEParsedItem;
      results.push(parsed);
    } catch {
      // partial chunk — skip
    }
  }
  return results;
}
