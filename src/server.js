import 'dotenv/config';
import express from 'express';
import { connectMongo } from './config/db.js';
import { getRedis } from './config/redis.js';
import documentsRouter from './routes/documents.js';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/documents', documentsRouter);

app.use((err, req, res, next) => {
  console.error(err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large (max 20MB)' });
  }

  if (err.message === 'Only PDF files are accepted') {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: err.message || 'Internal server error' });
});

const port = process.env.PORT || 3000;

async function start() {
  await connectMongo();
  getRedis();
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

start();