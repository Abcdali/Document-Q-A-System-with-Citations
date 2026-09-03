import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PageContent } from "./pdf-parser"; 

export interface Chunk {
  content: string;
  pageNumber: number;
}

export async function chunkPages(pages: PageContent[]): Promise<Chunk[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 150,
  });

  // Sab pages ko join karo with markers taake page number track ho sake
  let fullText = "";
  const pageBoundaries: { offset: number; pageNumber: number }[] = [];

  for (const page of pages) {
    if (!page.text.trim()) continue;
    pageBoundaries.push({ offset: fullText.length, pageNumber: page.pageNumber });
    fullText += page.text + "\n\n";
  }

  const pieces = await splitter.splitText(fullText);
  const allChunks: Chunk[] = [];
  let searchOffset = 0;

  for (const piece of pieces) {
    const idx = fullText.indexOf(piece, searchOffset);
    searchOffset = idx >= 0 ? idx : searchOffset;
    let pageNumber = pageBoundaries[0].pageNumber;
    for (const b of pageBoundaries) {
      if (b.offset <= idx) pageNumber = b.pageNumber;
      else break;
    }
    allChunks.push({ content: piece, pageNumber });
  }

  return allChunks;
}