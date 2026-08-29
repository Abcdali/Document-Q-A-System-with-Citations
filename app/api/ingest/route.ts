export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { parsePdfByPages } from "@/lib/pdf-parser";
import { chunkPages } from "@/lib/chunker";
import { embedBatch } from "@/lib/embeddings";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pages = await parsePdfByPages(buffer);

    if (pages.length === 0) {
      return NextResponse.json({ error: "Could not extract text from PDF" }, { status: 400 });
    }

    const chunks = await chunkPages(pages);

    if (chunks.length === 0) {
      return NextResponse.json({ error: "No content to index after chunking" }, { status: 400 });
    }

    const uploadedAt = new Date().toISOString();

    // Cohere ek call mein max ~96 texts leta hai, isliye batches mein todo
    const BATCH_SIZE = 90;
    const rows: any[] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batchChunks = chunks.slice(i, i + BATCH_SIZE);
      const embeddings = await embedBatch(batchChunks.map((c) => c.content));

      batchChunks.forEach((chunk, idx) => {
        rows.push({
          content: chunk.content,
          metadata: {
            filename: file.name,
            pageNumber: chunk.pageNumber,
            uploadedAt,
          },
          embedding: embeddings[idx],
        });
      });
    }

    const { error } = await supabase.from("documents").insert(rows);
    if (error) throw error;

    return NextResponse.json({
      success: true,
      filename: file.name,
      pagesProcessed: pages.length,
      chunksInserted: rows.length,
    });
  } catch (err: any) {
    console.error("Ingest error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}