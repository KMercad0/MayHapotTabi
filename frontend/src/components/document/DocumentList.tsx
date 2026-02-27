import { useNavigate } from "react-router-dom";
import { ArrowRight } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Document } from "@/types/index";

interface DocumentListProps {
  documents: Document[];
  loading: boolean;
  error: string | null;
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function DocumentList({ documents, loading, error }: DocumentListProps) {
  const navigate = useNavigate();

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
        <p className="text-sm text-muted-foreground">Failed to load documents</p>
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
            <button
              key={doc.id}
              onClick={() => navigate(`/chat/${doc.id}`)}
              className={`flex items-center justify-between w-full px-0 py-3 text-left hover:bg-surface transition-colors rounded-none ${
                i < documents.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-mono text-sm text-foreground truncate">
                  {doc.name}
                </span>
                <span className="text-muted-foreground text-xs font-mono">
                  {formatDate(doc.created_at)}
                </span>
              </div>
              <ArrowRight size={16} className="text-muted-foreground shrink-0 ml-3" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
