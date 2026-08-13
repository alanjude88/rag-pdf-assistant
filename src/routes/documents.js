import { Router } from 'express';
import multer from 'multer';
import { readFile } from 'node:fs/promises';
import { PDFParse } from 'pdf-parse';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded (field name must be "file")' });
    }

    const buffer = await readFile(req.file.path);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();

    return res.json({
      originalName: req.file.originalname,
      pageCount: result.pages?.length ?? result.numpages,
      textPreview: result.text.slice(0, 500),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;