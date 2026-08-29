import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pdf-parse",
    "@xenova/transformers",
    "onnxruntime-node",
    "sharp",
  ],
};

export default nextConfig;