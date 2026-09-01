const EMBED_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent';

export async function embedText(text, taskType = 'RETRIEVAL_DOCUMENT', retries = 3) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(`${EMBED_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
        task_type: taskType,
        output_dimensionality: 768,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.embedding.values;
    }

    if (response.status === 429 && attempt < retries) {
      const waitMs = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s...
      console.log(`[embedText] rate limited, retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }

    const errorBody = await response.text();
    throw new Error(`Embedding API error (${response.status}): ${errorBody}`);
  }
}