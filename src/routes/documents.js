import { Router } from 'express';
import multer from 'multer';
import { Document } from '../models/Document.js';
import { getRedis } from '../config/redis.js';

const router = Router();
const upload = multer({ dest: 'uploads/' });

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
  });
});

export default router;