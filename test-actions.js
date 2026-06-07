
async function testActions() {
  const loginRes = await fetch('https://api.karotter.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'karobot_test', password: 'test', gender: 'other' })
  });
  
  const tokenData = await loginRes.json();
  const token = tokenData.accessToken;
  console.log('Login:', loginRes.status, !!token);

  if (!token) return;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // test react on post 1048439
  const reactRes = await fetch('https://api.karotter.com/api/posts/1048439/react', {
    method: 'POST',
    headers,
    body: JSON.stringify({ emoji: '❤️' })
  });
  console.log('React 1048439:', reactRes.status, await reactRes.text());

  // test rekarot on post 1048439
  const rekarotRes = await fetch('https://api.karotter.com/api/posts', {
    method: 'POST',
    headers,
    body: JSON.stringify({ repostId: '1048439' })
  });
  console.log('Rekarot 1048439:', rekarotRes.status, await rekarotRes.text());
}

testActions().catch(console.error);
