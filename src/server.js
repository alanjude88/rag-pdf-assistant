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

const port = process.env.PORT || 3000;

async function start() {
  await connectMongo();
  getRedis();
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

start();