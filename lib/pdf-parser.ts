import { PDFParse } from "pdf-parse";

export interface PageContent {
  pageNumber: number;
  text: string;
}

export async function parsePdfByPages(buffer: Buffer): Promise<PageContent[]> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();

  const pages: PageContent[] = result.pages.map((page: any, index: number) => ({
    pageNumber: index + 1,
    text: page.text || "",
  }));

  return pages;
}