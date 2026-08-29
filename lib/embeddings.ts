import { pipeline, env } from "@huggingface/transformers";

if (env.backends.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
}
env.allowLocalModels = false;

let embedder: any = null;

export async function getEmbedder() {
  if (!embedder) {
    console.log("Loading embedding model...");
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      device: "cpu",
    });
    console.log("Embedding model loaded!");
  }
  return embedder;
}

export async function embedText(text: string): Promise<number[]> {
  const model = await getEmbedder();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}