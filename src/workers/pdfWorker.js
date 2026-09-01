import 'dotenv/config';
import Redis from 'ioredis';
import { chunkText } from '../utils/chunkText.js';
import { embedText } from '../utils/embedText.js';
import { Chunk } from '../models/Chunk.js';
import { readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';
import { connectMongo } from '../config/db.js';
import { Document } from '../models/Document.js';

const QUEUE_NAME = 'pdf-processing-queue';

async function processJob(documentId) {
  console.log(`[worker] picked up job for document ${documentId}`);

  const doc = await Document.findById(documentId);
  if (!doc) {
    console.error(`[worker] document ${documentId} not found — skipping`);
    return;
  }

    try {
    doc.status = 'processing';
    await doc.save();

    const buffer = await readFile(doc.filePath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();

    const chunks = chunkText(result.text);
    console.log(`[worker] document ${documentId} split into ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      const embedding = await embedText(chunks[i], 'RETRIEVAL_DOCUMENT');

      await Chunk.create({
        documentId: doc._id,
        text: chunks[i],
        chunkIndex: i,
        embedding,
      });

      console.log(`[worker] embedded chunk ${i + 1}/${chunks.length}`);

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    doc.status = 'complete';
    doc.pageCount = result.pages?.length ?? result.numpages;
    doc.textPreview = result.text.slice(0, 500);
    doc.chunkCount = chunks.length;
    await doc.save();

    console.log(`[worker] document ${documentId} completed successfully`);
  } catch (err) {
    console.error(`[worker] document ${documentId} failed:`, err.message);
    doc.status = 'failed';
    doc.error = err.message;
    await doc.save();
  }
}

async function main() {
  await connectMongo();

  // Dedicated connection just for this worker — separate from the Express app's.
  const redisClient = new Redis(process.env.REDIS_URL);

  console.log('[worker] waiting for jobs...');

  while (true) {
    // BRPOP blocks here until a job appears. The 0 means "wait forever".
    const result = await redisClient.brpop(QUEUE_NAME, 0);
    // result is [queueName, jobPayloadString]
    const [, payload] = result;
    const { documentId } = JSON.parse(payload);

    await processJob(documentId);
  }
}

main().catch((err) => {
  console.error('[worker] fatal error:', err);
  process.exit(1);
});