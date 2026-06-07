import 'dotenv/config';
import { KarotterClient } from './src/lib/karotter/client.ts';
import { getNotifications, classifyNotification } from './src/lib/karotter/notifications.ts';

async function main() {
  const username = process.env.TEST_USERNAME || 'yudetamagobot';
  const password = process.env.TEST_PASSWORD || '@3756437564';

  const client = new KarotterClient({ username, password });
  await client.login();
  
  const notifs = await getNotifications(client);
  
  for (const n of notifs) {
    if (n.type === 'QUOTE') {
      console.log('--- QUOTE NOTIFICATION ---');
      console.log(JSON.stringify(n, null, 2));
    }
  }
}

main().catch(console.error);
