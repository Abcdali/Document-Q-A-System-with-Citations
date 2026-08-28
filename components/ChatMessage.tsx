"use client";

import { useState } from "react";
import { Citation } from "@/lib/types";
import CitationCard from "./CitationCard";

export default function ChatMessage({
  role,
  content,
  citations,
}: {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}) {
  const [open, setOpen] = useState(false);

  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="bg-[var(--accent-blue)] text-white rounded-lg rounded-tr-sm px-4 py-2 max-w-[75%] text-sm">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 max-w-[85%]">
      <div className="paper-card rounded-lg rounded-tl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
        {content}
      </div>

      {citations && citations.length > 0 && (
        <div className="w-full">
          <button
            onClick={() => setOpen(!open)}
            className="text-xs font-[family-name:var(--font-mono)] text-[var(--accent-blue)] hover:underline"
          >
            {open ? "▾ hide sources" : "▸ show sources"} ({citations.length})
          </button>
          {open && (
            <div className="mt-2 flex flex-col gap-2">
              {citations.map((c, i) => (
                <CitationCard key={i} citation={c} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}