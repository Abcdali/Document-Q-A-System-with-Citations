"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";

interface DocRecord {
  filename: string;
  chunkCount: number;
  uploadedAt: string;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function fetchDocs() {
    setLoading(true);
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocs(data.documents || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDocs();
  }, []);

  async function handleDelete(filename: string) {
    setDeletingId(filename);
    setConfirmingId(null);
    try {
      await fetch(`/api/documents/${encodeURIComponent(filename)}`, {
        method: "DELETE",
      });
      setDocs((d) => d.filter((doc) => doc.filename !== filename));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <Logo />
        <Link
          href="/"
          className="text-sm text-[var(--accent-blue)] hover:underline font-[family-name:var(--font-mono)]"
        >
          ← back to chat
        </Link>
      </div>

      <h2 className="font-[family-name:var(--font-serif)] text-xl font-semibold mb-4">
        Indexed Documents
      </h2>

      {loading && (
        <div className="text-sm text-[var(--ink-soft)] font-[family-name:var(--font-mono)]">
          Loading...
        </div>
      )}

      {!loading && docs.length === 0 && (
        <div className="text-sm text-[var(--ink-soft)] font-[family-name:var(--font-mono)] text-center py-12">
          No documents indexed yet.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {docs.map((doc) => (
          <div
            key={doc.filename}
            className="paper-card rounded-lg px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{doc.filename}</div>
                <div className="text-xs text-[var(--ink-soft)] font-[family-name:var(--font-mono)] mt-1">
                  {doc.chunkCount} chunks · uploaded{" "}
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </div>
              </div>

              {confirmingId !== doc.filename && (
                <button
                  onClick={() => setConfirmingId(doc.filename)}
                  disabled={deletingId === doc.filename}
                  className="text-xs px-3 py-1.5 rounded border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 font-[family-name:var(--font-mono)]"
                >
                  delete
                </button>
              )}
            </div>

            {confirmingId === doc.filename && (
              <div className="mt-3 pt-3 border-t border-[var(--line)] flex items-center justify-between gap-2">
                <span className="text-xs text-[var(--ink-soft)]">
                  Delete this document and all its chunks?
                </span>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setConfirmingId(null)}
                    className="text-xs px-3 py-1.5 rounded border border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--paper)] font-[family-name:var(--font-mono)]"
                  >
                    cancel
                  </button>
                  <button
                    onClick={() => handleDelete(doc.filename)}
                    disabled={deletingId === doc.filename}
                    className="text-xs px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 font-[family-name:var(--font-mono)]"
                  >
                    {deletingId === doc.filename ? "deleting..." : "confirm delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}