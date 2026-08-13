import Redis from 'ioredis';

let client;

export function getRedis() {
  if (!client) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('REDIS_URL is not set in .env');

    client = new Redis(url);

    client.on('connect', () => console.log('[redis] connected'));
    client.on('error', (err) => console.error('[redis] error:', err.message));
  }
  return client;
}