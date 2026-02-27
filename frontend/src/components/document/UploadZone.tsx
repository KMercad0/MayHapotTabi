import { useCallback, useRef, useState } from "react";
import type { DragEvent, ChangeEvent, KeyboardEvent } from "react";
import { UploadSimple, CircleNotch } from "@phosphor-icons/react";
import { isAxiosError } from "axios";
import api from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

type UploadState = "idle" | "dragging" | "uploading" | "error" | "success";

interface UploadZoneProps {
  onUploadSuccess: () => void;
}

const MAX_BYTES = 10 * 1024 * 1024;

export function UploadZone({ onUploadSuccess }: UploadZoneProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { signOut } = useAuth();

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setError("Only PDF files are accepted.");
        setState("error");
        return;
      }
      if (file.size > MAX_BYTES) {
        setError("File exceeds the 10 MB limit.");
        setState("error");
        return;
      }

      setFilename(file.name);
      setState("uploading");

      const form = new FormData();
      form.append("file", file);

      try {
        await api.post("/upload", form);
        setState("success");
        onUploadSuccess();
        setTimeout(() => {
          setState("idle");
          setFilename("");
        }, 1500);
      } catch (err: unknown) {
        if (isAxiosError(err)) {
          if (err.response?.status === 401) {
            await signOut();
            return;
          }
          if (!err.response) {
            setError("Connection failed. Check your internet.");
          } else {
            const data = err.response.data as { error?: string } | undefined;
            setError(data?.error ?? "Upload failed. Please try again.");
          }
        } else {
          setError("Upload failed. Please try again.");
        }
        setState("error");
      }
    },
    [onUploadSuccess, signOut]
  );

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (state === "uploading") return;
    setState("dragging");
    if (state === "error") setError("");
  };

  const onDragLeave = () => {
    if (state === "dragging") setState("idle");
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (state === "uploading") return;
    setState("idle");
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  };

  const onClick = () => {
    if (state === "uploading") return;
    setState("idle");
    setError("");
    inputRef.current?.click();
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = "";
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") onClick();
  };

  const borderClass =
    state === "error"
      ? "border-red-500"
      : state === "dragging"
      ? "border-accent"
      : "border-border";

  const bgClass = state === "dragging" ? "bg-surface" : "";

  return (
    <div
      role="button"
      tabIndex={0}
      className={`flex-1 flex flex-col items-center justify-center w-full min-h-[200px] border-2 border-dashed rounded-md transition-colors ${borderClass} ${bgClass} ${
        state === "uploading" ? "cursor-not-allowed" : "cursor-pointer"
      }`}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={onInputChange}
        disabled={state === "uploading"}
      />

      {state === "uploading" && (
        <div className="flex flex-col items-center gap-2 select-none px-4 text-center">
          <CircleNotch size={24} className="text-muted-foreground animate-spin" />
          <span className="font-mono text-sm text-foreground truncate max-w-[220px]">
            {filename}
          </span>
          <span className="text-muted-foreground text-xs">Processing...</span>
        </div>
      )}

      {state === "success" && (
        <span className="font-mono text-sm text-foreground select-none">Done</span>
      )}

      {state === "error" && (
        <div className="flex flex-col items-center gap-2 select-none px-4 text-center">
          <UploadSimple size={24} className="text-red-500" />
          <span className="text-red-500 text-sm">{error}</span>
          <span className="text-muted-foreground text-xs">Click to try again</span>
        </div>
      )}

      {(state === "idle" || state === "dragging") && (
        <div className="flex flex-col items-center gap-2 select-none">
          <UploadSimple size={24} className="text-muted-foreground" />
          <span className="font-mono text-sm text-foreground">Drop a PDF here</span>
          <span className="text-muted-foreground text-xs">or click to browse</span>
        </div>
      )}
    </div>
  );
}
