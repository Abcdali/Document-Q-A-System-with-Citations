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

  const allChunks: Chunk[] = [];

  for (const page of pages) {
    if (!page.text.trim()) continue; 

    const pieces = await splitter.splitText(page.text);

    for (const piece of pieces) {
      allChunks.push({
        content: piece,
        pageNumber: page.pageNumber,
      });
    }
  }

  return allChunks;
}