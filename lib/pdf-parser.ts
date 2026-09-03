import { getDocumentProxy } from "unpdf";

if (typeof globalThis !== "undefined") {
  (globalThis as any).pdfjsWorker = undefined;
}

export interface PageContent {
  pageNumber: number;
  text: string;
}

interface PositionedItem {
  str: string;
  x: number;
  y: number;
}

// Ek page ke text items ko visual reading order (top-to-bottom, left-to-right)
// mein sort karke lines mein group karta hai — isse tables/forms ka positional
// structure (jo pehle scrambled aa raha tha) preserve hota hai.
function itemsToReadingOrderText(items: PositionedItem[]): string {
  if (items.length === 0) return "";

  // Y-coordinate ke hisaab se descending sort (PDF mein y upar se neeche ulta hota hai
  // — top of page = higher y). Same line ke items thoda y-tolerance ke sath group honge.
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  const LINE_TOLERANCE = 3; // px tolerance — isse zyada y-diff ho to nayi line
  const lines: PositionedItem[][] = [];

  for (const item of sorted) {
    const lastLine = lines[lines.length - 1];
    if (lastLine && Math.abs(lastLine[0].y - item.y) <= LINE_TOLERANCE) {
      lastLine.push(item);
    } else {
      lines.push([item]);
    }
  }

  // Har line ke andar x ke hisaab se left-to-right sort, phir join
  return lines
    .map((line) =>
      line
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(" ")
    )
    .join("\n");
}

export async function parsePdfByPages(buffer: Buffer): Promise<PageContent[]> {
  const uint8Array = new Uint8Array(buffer);
  const pdf = await getDocumentProxy(uint8Array, { useWorkerFetch: false } as any);

  const numPages = pdf.numPages;
  const pages: PageContent[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items: PositionedItem[] = (textContent.items as any[])
      .filter((item) => typeof item.str === "string" && item.str.trim().length > 0)
      .map((item) => ({
        str: item.str,
        // transform = [scaleX, skewX, skewY, scaleY, x, y]
        x: item.transform[4],
        y: item.transform[5],
      }));

    const text = itemsToReadingOrderText(items);

    pages.push({ pageNumber: pageNum, text });
  }

  return pages;
}

// Ingest ke baad sanity-check karta hai ke koi page silently empty/suspicious
// to nahi reh gaya — production mein isse ingest response ke andar warnings
// bhej sakte hain taake user ko pata chale kuch missing hai, bina SQL khole.
export interface PageValidationResult {
  pageNumber: number;
  textLength: number;
  isEmpty: boolean;
  isSuspiciouslyShort: boolean; // baaki pages ke average se bohat kam
}

export function validatePages(pages: PageContent[]): {
  results: PageValidationResult[];
  warnings: string[];
} {
  const lengths = pages.map((p) => p.text.trim().length);
  const nonEmptyLengths = lengths.filter((l) => l > 0);
  const avgLength =
    nonEmptyLengths.length > 0
      ? nonEmptyLengths.reduce((a, b) => a + b, 0) / nonEmptyLengths.length
      : 0;

  const results: PageValidationResult[] = pages.map((page, i) => {
    const len = lengths[i];
    return {
      pageNumber: page.pageNumber,
      textLength: len,
      isEmpty: len === 0,
      // 20% se kam average ka matlab ye page baaki se bohat kam text de raha —
      // shayad scanned image page, ya extraction partially fail hui
      isSuspiciouslyShort: len > 0 && avgLength > 0 && len < avgLength * 0.2,
    };
  });

  const warnings: string[] = [];
  const emptyPages = results.filter((r) => r.isEmpty).map((r) => r.pageNumber);
  const shortPages = results.filter((r) => r.isSuspiciouslyShort).map((r) => r.pageNumber);

  if (emptyPages.length > 0) {
   warnings.push(
  `Page(s) ${shortPages.join(", ")} extracted significantly less text than the other pages — check if some content is missing.`
);
  }
  if (shortPages.length > 0) {
   warnings.push(
  `Page(s) ${shortPages.join(", ")} extracted significantly less text compared to the other pages — check if some content is missing.`
);
  }

  return { results, warnings };
}