import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const filename = decodeURIComponent(id);

    const { error, count } = await supabase
      .from("documents")
      .delete({ count: "exact" })
      .eq("metadata->>filename", filename);

    if (error) throw error;

    return NextResponse.json({ success: true, deletedChunks: count });
  } catch (err: any) {
    console.error("Delete document error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}