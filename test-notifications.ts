import { KarotterClient } from './src/lib/karotter/client';
import { getNotifications } from './src/lib/karotter/notifications';
import { config } from 'dotenv';
config();

async function main() {
  const username = process.env.TEST_USERNAME || 'yudetamagobot';
  const password = process.env.TEST_PASSWORD || '@3756437564';

  const client = new KarotterClient({ username, password });
  console.log(`Logging in as ${username}...`);
  try {
    await client.login();
    console.log('Login success!');
  } catch(e) {
    console.error('Login failed!', e);
    return;
  }

  console.log('Fetching notifications...');
  const notifs = await getNotifications(client);
  console.log(`Got ${notifs.length} notifications`);
  
  if (notifs.length > 0) {
    console.log(JSON.stringify(notifs[0], null, 2));
  } else {
    // If getNotifications returned [], let's try calling it raw to see what happens
    console.log('Trying raw call...');
    const raw = await client.request('GET', '/notifications?limit=20');
    console.log('Raw status:', raw.status, raw.ok);
    console.log('Raw data:', JSON.stringify(raw.data).substring(0, 500));
  }
}

main().catch(console.error);
