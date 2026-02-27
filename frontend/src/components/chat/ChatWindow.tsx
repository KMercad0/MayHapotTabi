import { useEffect, useRef } from "react";
import type { Message } from "@/types";

interface ChatWindowProps {
  messages: Message[];
  isStreaming: boolean;
  documentName: string;
}

export function ChatWindow({
  messages,
  isStreaming,
  documentName,
}: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-1">
        <span className="font-mono text-sm text-muted-foreground">
          {documentName}
        </span>
        <span className="text-xs text-muted-foreground">
          Ask anything about this document
        </span>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
      <style>{`
        @keyframes blink {
          0%, 80%, 100% { opacity: 0; }
          40% { opacity: 1; }
        }
      `}</style>
      {messages.map((msg, i) => {
        const isLastAssistant =
          i === messages.length - 1 && msg.role === "assistant";
        const isLoadingDot =
          isLastAssistant && msg.content === "" && isStreaming;

        if (msg.role === "user") {
          return (
            <div key={i} className="flex justify-end">
              <div className="bg-accent text-background rounded-md max-w-[85%] sm:max-w-[75%] px-4 py-2 font-sans text-sm whitespace-pre-wrap break-words">
                {msg.content}
              </div>
            </div>
          );
        }

        if (isLoadingDot) {
          return (
            <div key={i} className="flex justify-start">
              <div className="bg-surface border border-border rounded-md px-4 py-3 flex gap-1 items-center">
                {[0, 1, 2].map((j) => (
                  <span
                    key={j}
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: "currentColor",
                      animation: "blink 1.4s infinite",
                      animationDelay: `${j * 0.2}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          );
        }

        return (
          <div key={i} className="flex justify-start">
            <div className="bg-surface border border-border rounded-md max-w-[85%] sm:max-w-[75%] px-4 py-2 font-sans text-sm whitespace-pre-wrap break-words">
              {msg.content}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
