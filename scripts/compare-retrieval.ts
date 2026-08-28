import { config } from "dotenv";
config({ path: ".env.local" });
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function main() {
  const { retrieveChunks, mmrRetrieve } = await import("../lib/retrieve");
  const { generateAnswer } = await import("../lib/generate");

  const testQuestions = [
    "What is Week 1 Project — Job Application Intelligence Pipeline?",
    "What is  Week 2 Project — Conversational Research Agent with Live Tools?",
    "What is Week 3 Project — Document Q&A System with Citations?",
    "What is Week 4 Project — Multi-Agent Content Factory?",
    "What is Week 5 Project — Production n8n Infrastructure?",
    "What is Week 6 Project — AI Lead Enrichment Pipeline with Full CI/CD?",
    "What is Week 7 Project — AI-Powered HubSpot Lead Scoring System?",
    "What is Week 8 Project — AI Follow-Up Sequence Engine (Dual CRM)?",
    "what is Week 9 Project — Full Observability Stack?",
    "What is  Week 10 Capstone — Autonomous Sales Intelligence Platform?",
  ];

  for (const question of testQuestions) {
  console.log(`\n=== Q: ${question} ===`);

  const plainChunks = await retrieveChunks(question, 5);
  const mmrChunks = await mmrRetrieve(question, 5);

  const plainAnswer = await generateAnswer(question, plainChunks);
  await sleep(3000); 

  const mmrAnswer = await generateAnswer(question, mmrChunks);
  await sleep(3000); 

  console.log("--- Plain similarity ---");
  console.log("Chunks from pages:", plainChunks.map((c: any) => c.metadata.pageNumber));
  console.log("Answer:", plainAnswer.answer);

  console.log("--- MMR ---");
  console.log("Chunks from pages:", mmrChunks.map((c: any) => c.metadata.pageNumber));
  console.log("Answer:", mmrAnswer.answer);
}
}

main();