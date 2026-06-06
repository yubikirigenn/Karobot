const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  await client.connect();
  const res = await client.query('SELECT id, name, "karotterUsername" FROM bots WHERE "karotterUsername" LIKE \'@%\'');
  let updatedCount = 0;
  for (const row of res.rows) {
    const newUsername = row.karotterUsername.replace(/^@/, '');
    await client.query('UPDATE bots SET "karotterUsername" = $1 WHERE id = $2', [newUsername, row.id]);
    console.log(`Updated bot ${row.name}: ${row.karotterUsername} -> ${newUsername}`);
    updatedCount++;
  }
  console.log(`Finished updating ${updatedCount} bots.`);
}

main()
  .catch(console.error)
  .finally(() => client.end());
