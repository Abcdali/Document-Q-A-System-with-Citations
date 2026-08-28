import * as fs from "fs";
import * as path from "path";

async function main() {
  const { parsePdfByPages } = await import("../lib/pdf-parser");

  const pdfPath = "D:\\D\\AI Roadmap\\Advanced_AI_Automation_Roadmap.pdf";

  if (!fs.existsSync(pdfPath)) {
    console.log("File nahi mili is path pe:", pdfPath);
    console.log("Project folder mein PDF files:");
    const files = fs.readdirSync(process.cwd()).filter((f) => f.endsWith(".pdf"));
    console.log(files);
    return;
  }

  const buffer = fs.readFileSync(pdfPath);
  const pages = await parsePdfByPages(buffer);

  console.log("Total pages parsed:", pages.length);
  console.log("---");

  for (const p of pages) {
    if (p.text.includes("HubSpot Lead Scoring") || p.text.includes("Week 7")) {
      console.log(`Page ${p.pageNumber}:`);
      console.log(p.text.slice(0, 200));
      console.log("---");
    }
  }
}

main().catch((err) => console.error("Error:", err));