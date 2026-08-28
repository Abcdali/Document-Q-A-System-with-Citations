import { embedText } from "./embeddings";
import { supabase } from "./supabase";
import { RetrievedChunk } from "./types";

export async function retrieveChunks(query: string, matchCount = 5): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedText(query);
  const { data, error } = await supabase.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
  });
  if (error) throw error;
  return data as RetrievedChunk[];
}

export async function hybridSearch(query: string, matchCount = 8): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedText(query);
  const { data, error } = await supabase.rpc("hybrid_search", {
    query_text: query,
    query_embedding: queryEmbedding,
    match_count: matchCount,
  });
  if (error) throw error;
  return data as RetrievedChunk[];
}

// Cosine similarity helper (MMR ke liye chahiye)
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// MMR retrieval — similarity + diversity balance karta hai
export async function mmrRetrieve(
  query: string,
  matchCount = 5,
  fetchK = 20,
  lambda = 0.5 // 1 = pure similarity, 0 = pure diversity
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedText(query);

  const { data, error } = await supabase.rpc("match_documents_with_embedding", {
    query_embedding: queryEmbedding,
    match_count: fetchK,
  });
  if (error) throw error;

  const candidates = data as (RetrievedChunk & { embedding: number[] })[];
  if (candidates.length === 0) return [];

  const selected: typeof candidates = [];
  const remaining = [...candidates];

  // Sabse pehla: sabse zyada query-similar chunk
  selected.push(remaining.shift()!);

  while (selected.length < matchCount && remaining.length > 0) {
    let bestScore = -Infinity;
    let bestIdx = 0;

    for (let i = 0; i < remaining.length; i++) {
      const relevance = remaining[i].similarity;
      const maxSimToSelected = Math.max(
        ...selected.map((s) => cosineSimilarity(remaining[i].embedding, s.embedding))
      );
      const mmrScore = lambda * relevance - (1 - lambda) * maxSimToSelected;

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }

    selected.push(remaining.splice(bestIdx, 1)[0]);
  }

  return selected;
}