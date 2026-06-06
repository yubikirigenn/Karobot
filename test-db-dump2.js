const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();
  const res = await client.query('SELECT id, name, "karotterUsername", status, "postMode" FROM bots');
  for (const row of res.rows) {
    console.log(row);
  }
}

main().finally(() => client.end());
