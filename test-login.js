fetch('https://api.karotter.com/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identifier: 'test', password: 'test', gender: 'other' })
}).then(res => res.text()).then(console.log).catch(console.error);
