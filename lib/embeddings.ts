export async function embedText(text: string): Promise<number[]> {
  const result = await embedBatch([text]);
  return result[0];
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await fetch("https://api.cohere.com/v1/embed", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.COHERE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      texts,
      model: "embed-english-light-v3.0",
      input_type: "search_document",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cohere embedding failed: ${errorText}`);
  }

  const data = await response.json();
  return data.embeddings;
}