import pdfParse from "pdf-parse";

const CHUNK_SIZE = 1600;    // ~400 tokens
const CHUNK_OVERLAP = 200;  // ~50 tokens

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}

export function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  const filtered = chunks.filter((c) => c.trim().length > 0);
  return filtered.length > 0 ? filtered : [text];
}
