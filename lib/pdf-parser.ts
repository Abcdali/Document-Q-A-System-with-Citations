import { extractText, getDocumentProxy } from "unpdf";

// pdfjs-dist ko worker use karne se rokna — Node.js/serverless mein worker files load nahi hoti
if (typeof globalThis !== "undefined") {
  (globalThis as any).pdfjsWorker = undefined;
}

export interface PageContent {
  pageNumber: number;
  text: string;
}

export async function parsePdfByPages(buffer: Buffer): Promise<PageContent[]> {
  const uint8Array = new Uint8Array(buffer);
  const pdf = await getDocumentProxy(uint8Array, { useWorkerFetch: false } as any);
  const result = await extractText(pdf, { mergePages: false });

  const textArray = result.text as string[];

  const pages: PageContent[] = textArray.map((pageText, index) => ({
    pageNumber: index + 1,
    text: pageText || "",
  }));

  return pages;
}