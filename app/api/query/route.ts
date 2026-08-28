import { NextRequest, NextResponse } from "next/server";
import { mmrRetrieve } from "@/lib/retrieve";
import { generateAnswer } from "@/lib/generate";

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

   const chunks = await mmrRetrieve(question, 12, 40, 0.4);

    if (chunks.length === 0) {
      return NextResponse.json({
        answer: "No document has been ingested yet, or no relevant chunk was found.",
        citations: [],
      });
    }

    const result = await generateAnswer(question, chunks);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Query error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}