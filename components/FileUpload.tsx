"use client";

import { useRef, useState } from "react";

export default function FileUpload({ onUploaded }: { onUploaded: (filename: string, chunks: number) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      setStatus("error");
      setMessage("Only PDF files are supported.");
      return;
    }

    setStatus("uploading");
    setMessage(`Reading ${file.name}...`);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/ingest", { method: "POST", body: formData });
      const data = await res.json();

      if (data.error) {
        setStatus("error");
        setMessage(data.error);
      } else {
        setStatus("done");
        setMessage(`${data.filename} indexed — ${data.chunksInserted} chunks.`);
        onUploaded(data.filename, data.chunksInserted);
      }
    } catch {
      setStatus("error");
      setMessage("Upload failed. Try again.");
    }
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      className="paper-card rounded-lg px-4 py-3 cursor-pointer flex items-center justify-between hover:border-[var(--accent-blue)] transition-colors"
    >
      <div>
        <div className="text-sm font-medium">
          {status === "idle" && "Drop a PDF here, or click to upload"}
          {status === "uploading" && message}
          {status === "done" && message}
          {status === "error" && message}
        </div>
        <div className="text-xs text-[var(--ink-soft)] font-[family-name:var(--font-mono)] mt-0.5">
          pdf → chunk → embed → index
        </div>
      </div>
      <span
        className={`text-xs px-2 py-1 rounded font-[family-name:var(--font-mono)] ${
          status === "done"
            ? "bg-[var(--highlighter-soft)] text-[var(--ink)]"
            : status === "error"
            ? "bg-red-100 text-red-700"
            : "bg-[var(--paper)] text-[var(--ink-soft)] border border-[var(--line)]"
        }`}
      >
        {status === "idle" && "select"}
        {status === "uploading" && "working"}
        {status === "done" && "indexed"}
        {status === "error" && "error"}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
    </div>
  );
}