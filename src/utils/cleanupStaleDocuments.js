import { Document } from '../models/Document.js';
import { Chunk } from '../models/Chunk.js';

const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export async function cleanupStaleDocuments() {
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);

  const staleDocs = await Document.find({
    status: { $in: ['pending', 'processing'] },
    updatedAt: { $lt: cutoff },
  });

  for (const doc of staleDocs) {
    console.log(`[cleanup] marking stale document ${doc._id} as failed (stuck in "${doc.status}")`);

    // Remove any partial chunks left behind by a worker that crashed mid-embedding
    await Chunk.deleteMany({ documentId: doc._id });

    doc.status = 'failed';
    doc.error = 'Processing timed out or worker crashed before completion';
    await doc.save();
  }

  return staleDocs.length;
}