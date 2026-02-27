import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatInput } from "@/components/chat/ChatInput";
import { parseSSEChunk } from "@/lib/stream";
import type { Message } from "@/types";

export function Chat() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [docName, setDocName] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    if (!docId) {
      navigate("/dashboard", { replace: true });
      return;
    }
    async function fetchDoc() {
      const { data, error } = await supabase
        .from("documents")
        .select("name, created_at")
        .eq("id", docId!)
        .single();
      if (error || !data) {
        navigate("/dashboard", { replace: true });
        return;
      }
      setDocName(data.name as string);
    }
    async function fetchMessages() {
      const { data } = await supabase
        .from("chat_messages")
        .select("role, content")
        .eq("document_id", docId!)
        .order("created_at", { ascending: true });
      if (data && data.length > 0) {
        setMessages(data as Message[]);
      }
    }
    fetchDoc();
    fetchMessages();
  }, [docId, navigate]);

  async function handleSubmit(text: string) {
    if (!docId || isStreaming) return;

    // snapshot history before state mutation
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);
    setIsStreaming(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        await signOut();
        return;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL as string;
      const response = await fetch(`${backendUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentId: docId, message: text, history }),
      });

      if (!response.ok || !response.body) {
        let errorMsg = "Failed to get a response. Please try again.";
        try {
          const errData = (await response.json()) as { error?: string };
          if (errData.error) errorMsg = errData.error;
        } catch {
          /* ignore parse failure */
        }
        toast.error(errorMsg);
        setMessages((prev) => prev.slice(0, -1));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullResponse = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) break;
        const chunk = decoder.decode(value, { stream: true });
        const items = parseSSEChunk(chunk);
        for (const item of items) {
          if (item.error) throw new Error(item.error);
          if (item.done) {
            done = true;
            break;
          }
          if (item.token) {
            fullResponse += item.token;
            setMessages((prev) => {
              const next = [...prev];
              next[next.length - 1] = {
                role: "assistant",
                content: next[next.length - 1].content + item.token,
              };
              return next;
            });
          }
        }
      }

      // If stream ended without a done:true signal, mark as interrupted
      if (!done) {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = {
              ...last,
              content: last.content + " [response interrupted]",
            };
          }
          return next;
        });
      }

      // Persist the exchange to the database
      const userId = sessionData.session?.user.id;
      if (userId && fullResponse) {
        await supabase.from("chat_messages").insert([
          { document_id: docId, user_id: userId, role: "user", content: text },
          { document_id: docId, user_id: userId, role: "assistant", content: fullResponse },
        ]);
      }
    } catch {
      toast.error("Failed to get a response. Please try again.");
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content === "") {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="fixed top-12 inset-x-0 bottom-0 flex flex-col bg-background">
      {/* Document header bar */}
      <div className="shrink-0 border-b border-border bg-background h-12 flex items-center px-4 gap-3">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors min-w-[44px] min-h-[44px]"
        >
          <ArrowLeft size={16} />
          <span className="hidden sm:inline">Back</span>
        </button>
        <span className="font-mono text-sm truncate flex-1 max-w-[150px] sm:max-w-[300px]">{docName}</span>
      </div>

      {/* Message list */}
      <ChatWindow
        messages={messages}
        isStreaming={isStreaming}
        documentName={docName}
      />

      {/* Input bar */}
      <ChatInput onSubmit={handleSubmit} isStreaming={isStreaming} />
    </div>
  );
}
