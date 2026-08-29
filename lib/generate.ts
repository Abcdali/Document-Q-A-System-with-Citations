import OpenAI from "openai";
import { RetrievedChunk, AnswerResponse } from "./types";

let groq: OpenAI | null = null;

function getGroqClient(): OpenAI {
  if (!groq) {
    groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return groq;
}

const SYSTEM_PROMPT = [
  "You are a document Q&A assistant. Answer strictly based on the provided context chunks.",
  "",
  "Rules:",
  "- Only use information present in the context below. Never make up facts.",
  "- If the answer is not in the context, say \"I don't have enough information in the documents to answer this.\"",
  "- Cite sources as [filename, page X] for every claim you make.",
  "- If you cannot answer from the context, the citations array MUST be empty ([]).",
  "- Respond ONLY with valid JSON in this exact shape, no extra text, no markdown fences:",
  '{"answer": "your answer text with inline citations like [filename, page X]", "citations": [{"filename": "string", "page": number, "quote": "a VERBATIM substring copied EXACTLY character-for-character from the context above"}]}',
  "",
  "CRITICAL: The quote field must be text that literally appears in the context, word-for-word. If you cannot find an exact matching sentence, choose the closest short verbatim phrase from the context instead of paraphrasing.",
].join("\n");

export async function generateAnswer(
  question: string,
  chunks: RetrievedChunk[]
): Promise<AnswerResponse> {
  const context = chunks
    .map(
      (c, i) =>
        `[Chunk ${i + 1}] (filename: ${c.metadata.filename}, page: ${c.metadata.pageNumber})\n${c.content}`
    )
    .join("\n\n---\n\n");

  const userPrompt = `Context:\n${context}\n\nQuestion: ${question}`;

  const response = await getGroqClient().chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const raw = response.choices[0].message.content || "{}";
  const cleaned = raw.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as AnswerResponse;

    const isUnknownAnswer = /don't have enough information|not.*in.*document|cannot find/i.test(
      parsed.answer
    );
    if (isUnknownAnswer) {
      parsed.citations = [];
      return parsed;
    }

    const fullContext = chunks.map((c) => c.content).join(" ");
    parsed.citations = parsed.citations
      .map((citation) => {
        const isExact = fullContext.includes(citation.quote);
        if (isExact) return citation;

        const matchingChunk = chunks.find(
          (c) =>
            c.metadata.filename === citation.filename &&
            c.metadata.pageNumber === citation.page
        );
        if (matchingChunk) {
          const firstSentence = matchingChunk.content.split(/(?<=[.!?])\s/)[0];
          return { ...citation, quote: firstSentence };
        }
        return citation;
      })
      .filter((c) => c.quote && c.quote.length > 0);

    return parsed;
  } catch (e) {
    console.error("Failed to parse structured output:", raw);
    return { answer: raw, citations: [] };
  }
}