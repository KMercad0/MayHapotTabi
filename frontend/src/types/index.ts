export interface User {
  id: string;
  email: string;
}

export interface Document {
  id: string;
  user_id: string;
  name: string;
  storage_path: string;
  created_at: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}
