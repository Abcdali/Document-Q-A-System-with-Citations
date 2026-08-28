import { config } from "dotenv";
config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";
import { Client } from "langsmith";
import { evaluate } from "langsmith/evaluation";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface TestCase {
  question: string;
  expectedAnswer: string;
  expectedSource: string;
}

async function main() {
  const { retrieveChunks } = await import("../lib/retrieve");
  const { generateAnswer } = await import("../lib/generate");

  const client = new Client();

  const testSet: TestCase[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, "test-set.json"), "utf-8")
  );

  const datasetName = "document-qa-eval-v1";

  let dataset;
  try {
    dataset = await client.readDataset({ datasetName });
    console.log("Existing dataset use ho raha hai.");
  } catch {
    dataset = await client.createDataset(datasetName, {
      description: "15 Q&A pairs for Document Q&A RAG eval",
    });
    for (const tc of testSet) {
      await client.createExample(
        { question: tc.question },
        { expectedAnswer: tc.expectedAnswer, expectedSource: tc.expectedSource },
        { datasetId: dataset.id }
      );
    }
    console.log("Naya dataset bana diya.");
  }

  async function ragPipeline(input: { question: string }) {
    const chunks = await retrieveChunks(input.question, 5);
    const result = await generateAnswer(input.question, chunks);
    await sleep(2500); 
    return {
      answer: result.answer,
      citations: result.citations,
      retrievedPages: chunks.map((c) => c.metadata.pageNumber),
      retrievedFilenames: chunks.map((c) => c.metadata.filename),
    };
  }

async function faithfulnessEvaluator({ run, example }: any) {
  const answer = run.outputs?.answer || "";
  const expected = example.outputs?.expectedAnswer || "";

  if (expected === "NOT_IN_DOCUMENT") {
    const saidUnknown = /don't have enough information|not.*in.*document|cannot find/i.test(answer);
    return { key: "faithfulness", score: saidUnknown ? 1 : 0 };
  }

  try {
    await new Promise((resolve) => setTimeout(resolve, 4000)); // rate limit se bachne ke liye extra wait

    const judgePrompt = `You are grading whether a generated answer matches the expected answer in meaning (not exact wording).

Expected answer: "${expected}"
Generated answer: "${answer}"

Does the generated answer convey the same key facts as the expected answer? Respond with ONLY a number between 0 and 1 (e.g. "0.8"), no other text.`;

    const OpenAI = (await import("openai")).default;
    const groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY,
      baseURL: "https://api.groq.com/openai/v1",
    });

    const res = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: judgePrompt }],
    });

    const raw = res.choices[0].message.content?.trim() || "0";
    const score = parseFloat(raw.match(/[\d.]+/)?.[0] || "0");

    return { key: "faithfulness", score: isNaN(score) ? 0.5 : Math.min(Math.max(score, 0), 1) };
  } catch (err) {
    console.error("Judge call failed, falling back to keyword match:", err);

    // Fallback: purana keyword-matching method (jo pehle kaam kar raha tha)
    const expectedWords = expected.toLowerCase().split(/\W+/).filter((w: string) => w.length > 4);
    const answerLower = answer.toLowerCase();
    const matched = expectedWords.filter((w: string) => answerLower.includes(w));
    const score = expectedWords.length > 0 ? matched.length / expectedWords.length : 0.5;

    return { key: "faithfulness", score: Math.min(score, 1) };
  }
}

  async function recallEvaluator({ run, example }: any) {
    const expectedSource = example.outputs?.expectedSource || "";
    const retrievedFiles: string[] = run.outputs?.retrievedFilenames || [];

    if (expectedSource === "none") {
      return { key: "recall", score: 1 }; 
    }

    const found = retrievedFiles.some((f) => f === expectedSource);
    return { key: "recall", score: found ? 1 : 0 };
  }

  console.log("Eval chal raha hai...");
  const results = await evaluate(ragPipeline, {
    data: datasetName,
    evaluators: [faithfulnessEvaluator, recallEvaluator],
    experimentPrefix: "doc-qa-rag",
     maxConcurrency: 1, 
  });

  console.log("\n Eval complete. LangSmith dashboard mein dekho:");
  console.log(`https://smith.langchain.com`);
}

main().catch(console.error);