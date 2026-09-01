const EMBED_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent';

export async function embedText(text, taskType = 'RETRIEVAL_DOCUMENT') {
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

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Embedding API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.embedding.values;
}