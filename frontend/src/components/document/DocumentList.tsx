import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Trash } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Document } from "@/types/index";

interface DocumentListProps {
  documents: Document[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  onDelete: (documentId: string) => Promise<void>;
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function DocumentList({ documents, loading, error, onRetry, onDelete }: DocumentListProps) {
  const navigate = useNavigate();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <span className="font-mono text-sm text-muted-foreground uppercase tracking-wider">
        Your documents
      </span>

      {loading && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Failed to load documents</p>
          {onRetry && (
            <button onClick={onRetry} className="text-sm underline text-left w-fit">
              Retry
            </button>
          )}
        </div>
      )}

      {!loading && !error && documents.length === 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-sm">No documents yet</p>
          <p className="text-muted-foreground text-xs">Upload a PDF to get started</p>
        </div>
      )}

      {!loading && !error && documents.length > 0 && (
        <div className="flex flex-col">
          {documents.map((doc, i) => (
            <div
              key={doc.id}
              className={`relative group flex items-center w-full ${
                i < documents.length - 1 ? "border-b border-border" : ""
              }`}
            >
              {confirmingId === doc.id ? (
                <div className="flex items-center gap-1.5 py-3 w-full min-w-0">
                  <span className="font-mono text-sm truncate max-w-[200px]">
                    Delete {doc.name}?
                  </span>
                  <button
                    onClick={() => {
                      void onDelete(doc.id);
                      setConfirmingId(null);
                    }}
                    className="text-sm text-red-500 underline cursor-pointer shrink-0"
                  >
                    Yes, delete
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
                    className="text-sm text-muted-foreground underline cursor-pointer shrink-0"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => navigate(`/chat/${doc.id}`)}
                    className="flex-1 flex items-center justify-between py-3 text-left hover:bg-surface transition-colors rounded-none min-w-0"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-mono text-sm text-foreground truncate">
                        {doc.name}
                      </span>
                      <span className="text-muted-foreground text-xs font-mono">
                        {formatDate(doc.created_at)}
                      </span>
                    </div>
                    <ArrowRight size={16} className="text-muted-foreground shrink-0 ml-3 mr-2" />
                  </button>
                  <button
                    onClick={() => setConfirmingId(doc.id)}
                    className="shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition text-muted-foreground hover:text-red-500"
                  >
                    <Trash size={16} />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
