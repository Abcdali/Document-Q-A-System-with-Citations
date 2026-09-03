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
  "General rules:",
  "- Only use information present in the context below. Never make up facts.",
  "- If the answer is not in the context, say \"I don't have enough information in the documents to answer this.\"",
  "- Cite sources as [filename, page X] for every claim you make.",
  "- If you cannot answer from the context, the citations array MUST be empty ([]).",
  "",
  "Matching answer length/detail to the question:",
  "- Read the question itself to decide how much detail to give — do not always default to a long or a short answer.",
  "- If the question is simple, direct, or asks for a specific fact (e.g. \"what is the course name\", \"who is the student\", \"what is the deadline\"), answer concisely — a short sentence or a direct value is enough. Do not pad it with unrelated context.",
  "- If the question asks for an explanation, a process, a comparison, a list, reasoning, or uses words like \"explain\", \"describe\", \"how does\", \"walk me through\", \"in detail\", \"summarize\", give a fuller, well-structured answer that covers the relevant points from the context.",
  "- If the question is ambiguous about how much detail is wanted, prefer a moderate-length answer: cover the key point directly, then briefly add the most relevant supporting detail from the context — without over-explaining.",
  "- Never artificially lengthen an answer just to seem thorough, and never artificially shorten an answer that genuinely needs multiple points to be correct and complete.",
  "",
  "Handling tables, forms, and structured data extracted from PDFs:",
  "- PDF text extraction often loses visual table layout. A table's headers may appear together on one line, followed by all the corresponding values on a separate line, in the same left-to-right order as the headers.",
  "- Example: if the context shows \"Name Age City\" followed later by \"John 25 Lahore\", infer that Name=John, Age=25, City=Lahore, by matching position/order — even though there is no explicit label-value pairing like \"Name: John\".",
  "- Apply the same positional-matching logic to any row of labels followed by a row of values, form fields, key-value pairs, or table-like structures, regardless of the document's subject matter.",
  "- If a value cannot be confidently matched to a label — because the order is ambiguous, values are missing, or the structure is unclear — say you don't have enough information rather than guessing.",
  "- This positional-matching rule applies only to genuinely table-like or form-like content. For normal prose, do not force a table structure that isn't there.",
  "",
  "Response format:",
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