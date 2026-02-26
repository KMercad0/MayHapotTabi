export interface AuthUser {
  id: string;
  email: string;
}

export interface DocumentRow {
  id: string;
  user_id: string;
  name: string;
  storage_path: string;
  created_at?: string;
}

export interface ChunkRow {
  document_id: string;
  user_id: string;
  content: string;
  embedding: string; // pgvector expects "[x,y,z,...]" string literal
  chunk_index: number;
}

export interface ChunkResult {
  id: string;
  content: string;
  chunk_index: number;
  similarity: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
