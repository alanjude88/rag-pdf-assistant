const GENERATE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:streamGenerateContent';

  
export async function* streamAnswer(question, contextChunks) {
  const context = contextChunks
    .map((c, i) => `[Excerpt ${i + 1}]\n${c.text}`)
    .join('\n\n');

  const prompt = `You are a helpful assistant answering questions about a document. Use ONLY the context below to answer — do not use outside knowledge. If the answer isn't in the context, say so clearly instead of guessing.

Context:
${context}

Question: ${question}

Answer:`;

  const response = await fetch(
    `${GENERATE_URL}?alt=sse&key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Generation API error (${response.status}): ${errorBody}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // last line may be incomplete, hold it for next round

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const jsonStr = line.slice(6).trim();
      if (!jsonStr) continue;

      const parsed = JSON.parse(jsonStr);
      const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) yield text;
    }
  }
}