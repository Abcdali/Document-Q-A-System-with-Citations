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
  lambda = 0.75 // relevance ko priority — pehle 0.4 diversity-heavy tha
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embedText(query);

  // Pure vector candidates
  const { data: vectorData, error: vectorError } = await supabase.rpc(
    "match_documents_with_embedding",
    {
      query_embedding: queryEmbedding,
      match_count: fetchK,
    }
  );
  if (vectorError) throw vectorError;

  // NAYA: keyword/full-text candidates bhi le rahe hain taake exact terms
  // (jaise "Week 10", "capstone") jo embeddings kabhi miss kar dete hain,
  // wo bhi candidate pool mein guaranteed shamil hon.
  let hybridData: any[] = [];
  try {
    const { data, error } = await supabase.rpc("hybrid_search", {
      query_text: query,
      query_embedding: queryEmbedding,
      match_count: Math.min(fetchK, 15),
    });
    if (!error && data) hybridData = data;
  } catch {
    // hybrid_search fail ho to bhi silently ignore — vector search se kaam chalta rahega
  }

  // Dono lists ko merge karo, id ke basis par duplicates hatao
  const mergedMap = new Map<string, any>();
  for (const item of [...vectorData, ...hybridData]) {
    if (!mergedMap.has(item.id)) mergedMap.set(item.id, item);
  }
  const candidates = Array.from(mergedMap.values()) as (RetrievedChunk & {
    embedding: number[];
  })[];

  if (candidates.length === 0) return [];

  // Explicitly sort by similarity desc — SQL ordering pe blindly depend nahi karna
  candidates.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0));

  const selected: typeof candidates = [];
  const remaining = [...candidates];

  selected.push(remaining.shift()!);

  while (selected.length < matchCount && remaining.length > 0) {
    let bestScore = -Infinity;
    let bestIdx = 0;

    for (let i = 0; i < remaining.length; i++) {
      const relevance = remaining[i].similarity ?? 0;
      const maxSimToSelected = Math.max(
        ...selected.map((s) =>
          remaining[i].embedding && s.embedding
            ? cosineSimilarity(remaining[i].embedding, s.embedding)
            : 0
        )
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