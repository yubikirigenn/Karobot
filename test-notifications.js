require('dotenv').config();

async function main() {
  const username = process.env.TEST_USERNAME || 'yudetamagobot';
  const password = process.env.TEST_PASSWORD || '@3756437564';

  console.log(`Logging in as ${username}...`);
  const loginRes = await fetch('https://api.karotter.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: username, password, gender: 'other' })
  });

  if (!loginRes.ok) {
    console.error('Login failed!', await loginRes.text());
    return;
  }
  
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  console.log('Login success! Got token.');

  console.log('Fetching notifications...');
  const notifRes = await fetch('https://api.karotter.com/api/notifications?limit=20', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });

  if (!notifRes.ok) {
    console.error('Failed to fetch notifications!', notifRes.status, await notifRes.text());
    return;
  }

  const notifData = await notifRes.json();
  console.log('Notifications fetched successfully.');
  console.log('Data type:', typeof notifData);
  console.log('Is Array?', Array.isArray(notifData));
  if (!Array.isArray(notifData)) {
    console.log('Keys:', Object.keys(notifData));
  }
  
  const items = Array.isArray(notifData) ? notifData : notifData.notifications || [];
  console.log(`Extracted ${items.length} items`);
  
  if (items.length > 0) {
    console.log('First notification sample:');
    console.log(JSON.stringify(items[0], null, 2));
  }
}

main().catch(console.error);
