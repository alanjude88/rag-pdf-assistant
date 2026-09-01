import { Router } from 'express';
import multer from 'multer';
import { embedText } from '../utils/embedText.js';
import { searchChunks } from '../utils/searchChunks.js';
import { Document } from '../models/Document.js';
import { getRedis } from '../config/redis.js';
import { streamAnswer } from '../utils/generateAnswer.js';

const router = Router();
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: (Number(process.env.MAX_FILE_SIZE_MB) || 20) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are accepted'));
    }
    cb(null, true);
  },
});

const QUEUE_NAME = 'pdf-processing-queue';

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded (field name must be "file")' });
    }

    const doc = await Document.create({
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSizeBytes: req.file.size,
      status: 'pending',
    });

    const redis = getRedis();
    await redis.lpush(QUEUE_NAME, JSON.stringify({ documentId: doc._id.toString() }));

    return res.status(202).json({
      documentId: doc._id,
      status: doc.status,
      message: 'Upload accepted, processing in background',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /documents/:id/status — poll processing status
router.get('/:id/status', async (req, res) => {
  const doc = await Document.findById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  return res.json({
    documentId: doc._id,
    status: doc.status,
    pageCount: doc.pageCount,
    textPreview: doc.textPreview,
    error: doc.error,
    chunkCount: doc.chunkCount,
  });
});


// POST /documents/:id/query — ask a question about a document
router.post('/:id/query', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: 'question is required' });

    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    if (doc.status !== 'complete') {
      return res.status(409).json({ error: `Document is not ready (status: ${doc.status})` });
    }

    const queryEmbedding = await embedText(question, 'RETRIEVAL_QUERY');
    const matches = await searchChunks(doc._id, queryEmbedding);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    if (matches.length === 0) {
      res.write(`data: ${JSON.stringify({ text: "I couldn't find anything relevant to that question in this document." })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    for await (const token of streamAnswer(question, matches)) {
      res.write(`data: ${JSON.stringify({ text: token })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

export default router;