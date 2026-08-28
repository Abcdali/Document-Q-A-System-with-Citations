"use client";

import { useState, useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import { Citation } from "@/lib/types";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleAsk() {
    const question = input.trim();
    if (!question || loading) return;

    setMessages((m) => [...m, { role: "user", content: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.error ? `Error: ${data.error}` : data.answer,
          citations: data.citations,
        },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[70vh] paper-card rounded-lg overflow-hidden">
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="text-sm text-[var(--ink-soft)] font-[family-name:var(--font-mono)] text-center mt-12">
            Upload a document above, then ask it something.
          </div>
        )}
        {messages.map((m, i) => (
          <ChatMessage key={i} role={m.role} content={m.content} citations={m.citations} />
        ))}
        {loading && (
          <div className="text-xs text-[var(--ink-soft)] font-[family-name:var(--font-mono)]">
            retrieving chunks, drafting answer…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-[var(--line)] p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder="Ask about your documents..."
          className="flex-1 bg-transparent outline-none text-sm px-2"
        />
        <button
          onClick={handleAsk}
          disabled={loading}
          className="bg-[var(--accent-blue)] text-white text-sm px-4 py-1.5 rounded-md disabled:opacity-50"
        >
          Ask
        </button>
      </div>
    </div>
  );
}