const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

require('dotenv').config();

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '12345678901234567890123456789012', 'utf8');

function decrypt(text) {
  const [ivHex, authTagHex, encryptedHex] = text.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function main() {
  const prisma = new PrismaClient();
  const bot = await prisma.bot.findFirst({ where: { status: 'ACTIVE' } });
  if (!bot) { console.log('No active bot'); return; }

  const username = bot.karotterUsername;
  const password = decrypt(bot.karotterPasswordEnc);

  console.log('Logging in as', username);
  const loginRes = await fetch('https://api.karotter.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'KaroBot/1.0' },
    body: JSON.stringify({ identifier: username, password, gender: 'other' })
  });

  const tokenData = await loginRes.json();
  const token = tokenData.accessToken;
  console.log('Login status:', loginRes.status, !!token);

  if (!token) return;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'User-Agent': 'KaroBot/1.0'
  };

  // Test reaction on Karotter (we'll just read first to get a real post ID)
  const feedRes = await fetch('https://api.karotter.com/api/posts?limit=1', { headers });
  const feed = await feedRes.json();
  const postId = feed[0]?.id || feed.posts?.[0]?.id;
  
  if (postId) {
    console.log('Testing on Post:', postId);
    const reactRes = await fetch(`https://api.karotter.com/api/posts/${postId}/react`, {
      method: 'POST', headers, body: JSON.stringify({ emoji: '❤️' })
    });
    console.log('React result:', reactRes.status, await reactRes.text());

    const rekarotRes = await fetch('https://api.karotter.com/api/posts', {
      method: 'POST', headers, body: JSON.stringify({ repostId: postId })
    });
    console.log('Rekarot result:', rekarotRes.status, await rekarotRes.text());
  }

  await prisma.$disconnect();
}

main().catch(console.error);
