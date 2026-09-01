import * as fs from "fs";

async function main() {
  const { extractText, getDocumentProxy } = await import("unpdf");

  const files = fs.readdirSync(process.cwd()).filter((f) => f.endsWith(".pdf"));
  console.log("PDF files found:", files);

  if (files.length === 0) {
    console.log("Koi PDF file project folder mein nahi mili. Ek PDF copy karo yahan.");
    return;
  }

  const buffer = fs.readFileSync(files[0]);
  const uint8Array = new Uint8Array(buffer);

  const pdf = await getDocumentProxy(uint8Array);
  const result = await extractText(pdf, { mergePages: false });

  console.log("Result keys:", Object.keys(result));
  console.log("Full result:", JSON.stringify(result).slice(0, 500));
}

main().catch((err) => console.error("ERROR:", err));