import 'dotenv/config';
import { KarotterClient } from './src/lib/karotter/client.ts';
import { getNotifications, classifyNotification } from './src/lib/karotter/notifications.ts';

async function main() {
  const username = process.env.TEST_USERNAME || 'yudetamagobot';
  const password = process.env.TEST_PASSWORD || '@3756437564';

  const client = new KarotterClient({ username, password });
  await client.login();
  
  const notifs = await getNotifications(client);
  console.log(`Fetched ${notifs.length} notifications`);
  
  const aiPostedIds = new Set<string>(); // Dummy empty set
  
  for (const n of notifs) {
    const c = classifyNotification(n, username, aiPostedIds);
    if (c.type !== 'ignore' && c.type !== 'follow') {
      console.log(`[${c.type}] Post: ${c.postId} | Author: ${c.authorUsername} | Content: ${c.content.substring(0, 50)}`);
    } else {
      console.log(`[${c.type}] Type: ${n.type}`);
    }
  }
}

main().catch(console.error);
