import { pipeline, env } from "@huggingface/transformers";

// Native binaries ki bajaye WASM backend force karo — serverless-safe
env.backends.onnx.wasm.numThreads = 1;
env.allowLocalModels = false;

let embedder: any = null;

export async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      device: "wasm",
    });
  }
  return embedder;
}

export async function embedText(text: string): Promise<number[]> {
  const model = await getEmbedder();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}