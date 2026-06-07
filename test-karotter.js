const fetch = require('node-fetch');
async function main() {
  const loginRes = await fetch('https://api.karotter.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'karobot_user', password: 'karobot_user_123', gender: 'other' })
  });
  const data = await loginRes.json();
  const token = data.accessToken;
  
  const res = await fetch('https://api.karotter.com/api/users/yudetamagobot/posts', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(res.status);
  console.log(await res.text());
}
main();
