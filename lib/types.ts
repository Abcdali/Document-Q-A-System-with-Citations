export interface ChunkMetadata {
  filename: string;
  pageNumber: number;
  uploadedAt: string;
}

export interface RetrievedChunk {
  id: number;
  content: string;
  metadata: ChunkMetadata;
  similarity: number;
}

export interface Citation {
  filename: string;
  page: number;
  quote: string;
}

export interface AnswerResponse {
  answer: string;
  citations: Citation[];
}