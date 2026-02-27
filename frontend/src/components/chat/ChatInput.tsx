import { useState, useRef } from "react";
import type { KeyboardEvent, ChangeEvent } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";

interface ChatInputProps {
  onSubmit: (text: string) => void;
  isStreaming: boolean;
}

const MAX_CHARS = 2000;

export function ChatInput({ onSubmit, isStreaming }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const tooLong = value.length > MAX_CHARS;
  const disabled = !value.trim() || isStreaming || tooLong;

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || tooLong) return;
    onSubmit(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  return (
    <div className="border-t border-border bg-background p-4 flex flex-col gap-1 shrink-0">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question..."
          className="flex-1 resize-none bg-transparent text-sm font-sans placeholder:text-muted-foreground outline-none border border-border rounded-md px-3 py-2 leading-6"
          style={{ maxHeight: "6rem" }}
        />
        <button
          onClick={submit}
          disabled={disabled}
          className={`shrink-0 p-2 rounded-md transition-colors ${
            disabled
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-accent text-background hover:opacity-90"
          }`}
        >
          <PaperPlaneTilt size={18} weight="fill" />
        </button>
      </div>
      {value.length > 1800 && (
        <span
          className={`text-xs self-end ${tooLong ? "text-red-500" : "text-muted-foreground"}`}
        >
          {value.length}/2000
        </span>
      )}
    </div>
  );
}
