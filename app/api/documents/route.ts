import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("metadata");

    if (error) throw error;

    const grouped: Record<string, { filename: string; chunkCount: number; uploadedAt: string }> = {};

    for (const row of data) {
      const meta = row.metadata as { filename: string; uploadedAt: string };
      if (!grouped[meta.filename]) {
        grouped[meta.filename] = {
          filename: meta.filename,
          chunkCount: 0,
          uploadedAt: meta.uploadedAt,
        };
      }
      grouped[meta.filename].chunkCount += 1;
    }

    const documents = Object.values(grouped).sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

    return NextResponse.json({ documents });
  } catch (err: any) {
    console.error("List documents error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}