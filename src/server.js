import 'dotenv/config';
import express from 'express';
import { connectMongo } from './config/db.js';

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

const port = process.env.PORT || 3000;
async function start() {
  await connectMongo();
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}

start();