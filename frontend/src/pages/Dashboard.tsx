import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { UploadZone } from "@/components/document/UploadZone";
import { DocumentList } from "@/components/document/DocumentList";
import type { Document } from "@/types/index";

export function Dashboard() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { signOut } = useAuth();

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    const [{ data: docsData, error: docsError }, { data: chatData }] =
      await Promise.all([
        supabase.from("documents").select("*").order("created_at", { ascending: false }),
        supabase
          .from("chat_messages")
          .select("document_id, created_at")
          .order("created_at", { ascending: false }),
      ]);

    if (docsError) {
      setFetchError(docsError.message);
      setLoading(false);
      return;
    }

    const docs = (docsData as Document[]) ?? [];

    // Build map: document_id → latest chat timestamp (first hit is newest due to DESC order)
    const latestChat = new Map<string, string>();
    for (const row of chatData ?? []) {
      if (!latestChat.has(row.document_id)) {
        latestChat.set(row.document_id, row.created_at as string);
      }
    }

    // Sort: recently chatted first, fall back to upload date
    const sorted = [...docs].sort((a, b) => {
      const aTime = latestChat.get(a.id) ?? a.created_at;
      const bTime = latestChat.get(b.id) ?? b.created_at;
      return bTime.localeCompare(aTime);
    });

    setDocuments(sorted);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchDocuments();
  }, [fetchDocuments]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-end mb-6">
        <button
          onClick={() => void signOut()}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex flex-col">
          <UploadZone onUploadSuccess={fetchDocuments} />
        </div>
        <DocumentList
          documents={documents}
          loading={loading}
          error={fetchError}
          onRetry={fetchDocuments}
        />
      </div>
    </div>
  );
}
