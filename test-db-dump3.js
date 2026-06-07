const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();
  const res = await client.query(`
    SELECT * FROM bot_logs 
    ORDER BY "createdAt" DESC 
    LIMIT 10
  `);
  for (const row of res.rows) {
    console.log(row);
  }
}

main().finally(() => client.end());
