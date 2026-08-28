import { Citation } from "@/lib/types";

export default function CitationCard({ citation }: { citation: Citation }) {
  return (
    <div className="citation-tab rounded-r px-3 py-2 rounded-l-sm">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-[family-name:var(--font-mono)] font-medium text-[var(--ink)]">
          {citation.filename}
        </span>
        <span className="text-xs font-[family-name:var(--font-mono)] text-[var(--ink-soft)]">
          p. {citation.page}
        </span>
      </div>
      <p className="text-sm text-[var(--ink-soft)] mt-1 italic">&ldquo;{citation.quote}&rdquo;</p>
    </div>
  );
}