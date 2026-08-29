export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { parsePdfByPages } from "@/lib/pdf-parser";
import { chunkPages } from "@/lib/chunker";
import { embedText } from "@/lib/embeddings";
import { supabase } from "@/lib/supabase";
export const runtime = "nodejs";
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
    const rows = [];

    for (const chunk of chunks) {
      const embedding = await embedText(chunk.content);
      rows.push({
        content: chunk.content,
        metadata: {
          filename: file.name,
          pageNumber: chunk.pageNumber,
          uploadedAt,
        },
        embedding,
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