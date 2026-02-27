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
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      setFetchError(error.message);
    } else {
      setDocuments((data as Document[]) ?? []);
    }
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
        />
      </div>
    </div>
  );
}
