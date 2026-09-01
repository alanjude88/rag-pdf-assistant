export function chunkText(text, {chunkSize = 500, overlap = 50} = {}) {
    const words = text.split(/\s+/).filter(Boolean); // Split by whitespace and filter out empty strings
    const chunks = [];
    let start = 0;

    while (start < words.length) {
        const end = start + chunkSize;
        const chunkWords = words.slice(start, end);
        chunks.push(chunkWords.join(' ')); // Join the words back into a string and add to chunks
        start += chunkSize - overlap; // Move start index forward by chunkSize minus overlap
    }
    return chunks;
}